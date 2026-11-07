<?php
// SPDX-License-Identifier: MIT
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method tidak diizinkan.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$email = trim(strtolower($input['email'] ?? ''));
$password = $input['password'] ?? '';
$role = $input['role'] ?? 'buyer';
$name = trim($input['name'] ?? '');
$company = trim($input['company'] ?? '');
$phone = trim($input['phone'] ?? '');
$location = trim($input['location'] ?? 'Indonesia');
$bankAccount = trim($input['bankAccount'] ?? '-');
$tierId = trim($input['tierId'] ?? 'tier_starter');
$termsAccepted = filter_var($input['termsAccepted'] ?? false, FILTER_VALIDATE_BOOLEAN);

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Alamat email tidak valid.']);
    exit;
}
if (!in_array($role, ['buyer', 'seller'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Pendaftaran mandiri hanya tersedia untuk akun pembeli atau penjual.']);
    exit;
}
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Kata sandi harus minimal 8 karakter.']);
    exit;
}
if ($name === '' || $phone === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nama lengkap dan nomor WhatsApp wajib diisi.']);
    exit;
}
if (!$termsAccepted) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Persetujuan Syarat dan Ketentuan diperlukan untuk mendaftar.']);
    exit;
}

try {
    $allowedTiers = ['tier_starter', 'tier_basic', 'tier_pro', 'tier_enterprise'];
    if (!in_array($tierId, $allowedTiers, true)) $tierId = 'tier_starter';
    $priceStmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1');
    $priceStmt->execute([$tierId . '_price']);
    $configuredPrice = $priceStmt->fetchColumn();
    $tierPrice = $tierId === 'tier_starter' ? 0 : (is_numeric($configuredPrice) ? max(0, (float)$configuredPrice) : null);
    if ($role === 'buyer' && $tierPrice === null) {
        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'Harga paket belum dikonfigurasi admin. Silakan pilih Paket Starter atau hubungi admin.']);
        exit;
    }
    // Paid memberships are created pending and cannot unlock features before manual QRIS review.
    $subscriptionActive = $role !== 'buyer' || $tierPrice === 0;
    // 1. Cek email sudah terdaftar
    $stmt = $pdo->prepare('SELECT id, role FROM users WHERE LOWER(email) = ?');
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing) {
        $roleLabel = $existing['role'] === 'buyer' ? 'Pembeli' : ($existing['role'] === 'seller' ? 'Penjual' : 'Pengelola');
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => "Email ini sudah terdaftar sebagai {$roleLabel}. Silakan langsung masuk."
        ]);
        exit;
    }

    // 2. Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $newId = 'user_' . $role . '_' . bin2hex(random_bytes(12));
    $defaultPhone = !empty($phone) ? $phone : '+62 812-' . mt_rand(10000000, 99999999);
    $emailPrefix = ucwords(preg_replace('/[^a-zA-Z0-9]/', ' ', explode('@', $email)[0]));
    $finalName = !empty($name) ? $name : ($role === 'seller' ? "{$emailPrefix} (Mitra Penjual)" : "{$emailPrefix} (Pembeli)");
    $finalCompany = !empty($company) ? $company : ($role === 'seller' ? "CV {$emailPrefix} Mandiri" : "PT {$emailPrefix} Daur Ulang");
    $expiry = date('Y-m-d', strtotime('+30 days'));
    $badge = $role === 'seller' ? 'Pemasok Baru' : 'Pembeli Baru';

    // 3. Insert ke database
    $insertSql = "INSERT INTO users (
        id, name, email, phone, company, role, password_hash, auth_provider,
        subscription_tier, subscription_active, subscription_expiry,
        identity_verified, verification_status, verified_badge,
        bank_account, location, balance
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', ?, ?, ?, 0, 'unverified', ?, ?, ?, 0.00)";

    $pdo->beginTransaction();
    $insertStmt = $pdo->prepare($insertSql);
    $insertStmt->execute([
        $newId, $finalName, $email, $defaultPhone, $finalCompany, $role,
        $passwordHash, $tierId, $subscriptionActive ? 1 : 0, $subscriptionActive ? $expiry : null, $badge, $bankAccount, $location
    ]);

    $termsVersionStmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'terms_version' LIMIT 1");
    $termsVersionStmt->execute();
    $acceptedTermsVersion = (string)($termsVersionStmt->fetchColumn() ?: ($input['termsVersion'] ?? '1.0'));
    $termsTitleStmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'terms_title' LIMIT 1");
    $termsTitleStmt->execute();
    $acceptedTermsTitle = (string)($termsTitleStmt->fetchColumn() ?: 'Syarat dan Ketentuan Penggunaan Bursa Limbah');
    $acceptanceStmt = $pdo->prepare('INSERT INTO user_terms_acceptances (id, user_id, terms_version, terms_title) VALUES (?, ?, ?, ?)');
    $acceptanceStmt->execute(['terms_' . bin2hex(random_bytes(12)), $newId, $acceptedTermsVersion, $acceptedTermsTitle]);
    $pdo->commit();

    // 4. Return data
    $fetchStmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $fetchStmt->execute([$newId]);
    $newUser = mapUserRow($fetchStmt->fetch());
    session_regenerate_id(true);
    $_SESSION['user_id'] = $newUser['id'];
    $_SESSION['role'] = $newUser['role'];

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'user' => $newUser,
        'role' => $newUser['role'],
        'isNewAccount' => true,
        'message' => 'Pendaftaran akun berhasil.'
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('[Registration Error] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Terjadi kesalahan server saat membuat akun. Coba lagi nanti.']);
}
