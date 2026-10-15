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
$password = $input['password'] ?? '[REDACTED]';
$role = $input['role'] ?? 'buyer';
$name = trim($input['name'] ?? '');
$company = trim($input['company'] ?? '');
$phone = trim($input['phone'] ?? '');
$location = trim($input['location'] ?? 'Indonesia');
$bankAccount = trim($input['bankAccount'] ?? '-');
$tierId = trim($input['tierId'] ?? 'tier_starter');

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Alamat email tidak valid.']);
    exit;
}

try {
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
    $newId = 'user_' . $role . '_' . round(microtime(true) * 1000);
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', ?, 1, ?, 0, 'unverified', ?, ?, ?, 0.00)";

    $insertStmt = $pdo->prepare($insertSql);
    $insertStmt->execute([
        $newId, $finalName, $email, $defaultPhone, $finalCompany, $role,
        $passwordHash, $tierId, $expiry, $badge, $bankAccount, $location
    ]);

    // 4. Return data
    $fetchStmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $fetchStmt->execute([$newId]);
    $newUser = mapUserRow($fetchStmt->fetch());

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'user' => $newUser,
        'role' => $newUser['role'],
        'isNewAccount' => true,
        'message' => 'Pendaftaran akun berhasil.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Terjadi kesalahan server: ' . $e->getMessage()]);
}
