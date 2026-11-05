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

if (empty($identifier)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Harap masukkan email, username, atau nomor WhatsApp.']);
    exit;
}

$cleanId = strtolower($identifier);
$cleanDigits = preg_replace('/[^0-9]/', '', $cleanId);

try {
    // 1. Cari user berdasarkan email, username, atau ID
    // Skema bawaan tidak memiliki kolom username; dukung email, ID, dan nomor telepon.
    $sql = 'SELECT * FROM users WHERE LOWER(email) = ? OR id = ?';
    $params = [$cleanId, $cleanId];

    if (strlen($cleanDigits) >= 7) {
        $sql .= ' OR REPLACE(REPLACE(phone, "-", ""), " ", "") LIKE ?';
        $params[] = "%{$cleanDigits}%";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $user = $stmt->fetch();

    // 2. Jika user tidak ditemukan
    if (!$user) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Akun tidak ditemukan. Pastikan email, username, atau nomor telepon telah terdaftar, atau silakan lakukan pendaftaran baru.'
        ]);
        exit;
    }

    // 3. Verifikasi password
    $passwordMatch = false;
    $storedHash = $user['password_hash'] ?? '';

    if (strpos($storedHash, '$2') === 0) {
        $passwordMatch = password_verify($password, $storedHash);
    } else {
        $passwordMatch = ($storedHash === $password);
    }

    if (!$passwordMatch) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Kata sandi yang Anda masukkan salah. Silakan periksa kembali.'
        ]);
        exit;
    }

    // 4. Sukses login (auto-routing sesuai peran terdaftar)
    $authUser = mapUserRow($user);
    session_regenerate_id(true);
    $_SESSION['user_id'] = $authUser['id'];
    $_SESSION['role'] = $authUser['role'];
    echo json_encode([
        'success' => true,
        'user' => $authUser,
        'role' => $authUser['role'],
        'message' => "Selamat datang kembali, {$authUser['name']}!"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("[API Login Error] " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Terjadi kendala pada server autentikasi. Silakan coba sesaat lagi.']);
}
