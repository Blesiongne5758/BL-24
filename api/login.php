<?php
// SPDX-License-Identifier: MIT
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method tidak diizinkan.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$identifier = trim($input['identifier'] ?? '');
$password = $input['password'] ?? '';
$expectedRole = $input['role'] ?? null;

if (empty($identifier) || !is_string($password) || strlen($password) < 8 || strlen($password) > 128) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Identifier dan kata sandi 8-128 karakter wajib diisi.']);
    exit;
}
if ($expectedRole !== null && !in_array($expectedRole, ['buyer', 'seller', 'admin'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Role tidak valid.']);
    exit;
}

$cleanId = strtolower($identifier);
$cleanDigits = preg_replace('/[^0-9]/', '', $cleanId);

try {
    // 1. Cari user
    $sql = 'SELECT * FROM users WHERE LOWER(email) = ?';
    $params = [$cleanId];

    if (strlen($cleanDigits) >= 7) {
        $sql .= ' OR REPLACE(REPLACE(phone, "-", ""), " ", "") LIKE ?';
        $params[] = "%{$cleanDigits}%";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $user = $stmt->fetch();

    // 2. Jika user tidak ditemukan -> auto register jika format email valid
    if (!$user) {
        if (strpos($cleanId, '@') !== false && strpos($cleanId, '.') !== false) {
            $roleToAssign = $expectedRole ?: 'buyer';
            $passwordHash = password_hash($password, PASSWORD_BCRYPT);
            $newId = 'user_' . $roleToAssign . '_' . round(microtime(true) * 1000);
            $emailPrefix = ucwords(preg_replace('/[^a-zA-Z0-9]/', ' ', explode('@', $cleanId)[0]));
            $newName = $roleToAssign === 'seller' ? "{$emailPrefix} (Mitra Penjual)" : "{$emailPrefix} (Pembeli)";
            $newCompany = $roleToAssign === 'seller' ? "CV {$emailPrefix} Mandiri" : "PT {$emailPrefix} Daur Ulang";
            $newPhone = '+62 812-' . mt_rand(10000000, 99999999);
            $expiry = date('Y-m-d', strtotime('+30 days'));
            $badge = $roleToAssign === 'seller' ? 'Pemasok Baru' : 'Pembeli Baru';

            $insertSql = "INSERT INTO users (
                id, name, email, phone, company, role, password_hash, auth_provider,
                subscription_tier, subscription_active, subscription_expiry,
                identity_verified, verification_status, verified_badge,
                bank_account, location, balance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', 'tier_starter', 1, ?, 0, 'unverified', ?, '-', 'Indonesia', 0.00)";

            $insStmt = $pdo->prepare($insertSql);
            $insStmt->execute([
                $newId, $newName, $cleanId, $newPhone, $newCompany, $roleToAssign,
                $passwordHash, $expiry, $badge
            ]);

            $fetchStmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $fetchStmt->execute([$newId]);
            $createdUser = mapUserRow($fetchStmt->fetch());

            echo json_encode([
                'success' => true,
                'user' => $createdUser,
                'role' => $createdUser['role'],
                'isNewAccount' => true,
                'message' => 'Akun baru berhasil dibuat secara otomatis.'
            ]);
            exit;
        }

        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Akun tidak ditemukan. Masukkan alamat email yang valid untuk login/daftar otomatis.'
        ]);
        exit;
    }

    // 3. Validasi kesesuaian peran
    if ($expectedRole && $user['role'] !== $expectedRole) {
        $roleLabel = $user['role'] === 'buyer' ? 'Pembeli' : ($user['role'] === 'seller' ? 'Penjual' : 'Pengelola');
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => "Akun ini terdaftar sebagai {$roleLabel}. Silakan masuk melalui tab {$roleLabel}."
        ]);
        exit;
    }

    // 4. Verifikasi password
    $storedHash = $user['password_hash'] ?? '';
    $passwordMatch = strpos($storedHash, '$2') === 0 && password_verify($password, $storedHash);

    if (!$passwordMatch) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Kredensial login tidak cocok.'
        ]);
        exit;
    }

    // 5. Sukses login
    $authUser = mapUserRow($user);
    echo json_encode([
        'success' => true,
        'user' => $authUser,
        'role' => $authUser['role'],
        'message' => "Selamat datang kembali, {$authUser['name']}!"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Terjadi kesalahan server: ' . $e->getMessage()]);
}
