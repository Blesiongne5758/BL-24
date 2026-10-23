<?php
// SPDX-License-Identifier: MIT
// Koneksi database MySQL via PHP PDO.
$corsOrigin = getenv('CORS_ORIGIN');
if ($corsOrigin) {
    header('Access-Control-Allow-Origin: ' . $corsOrigin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$dbname = getenv('DB_NAME') ?: 'bursalimbahdb';
$username = getenv('DB_USER') ?: 'bursalimbah';
$password = getenv('DB_PASSWORD');
if ($password === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Konfigurasi database belum lengkap.']);
    exit;
}

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    error_log('[DB] Connection failed: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Gagal terhubung ke database.']);
    exit;
}

function mapUserRow($row) {
    if (!$row) return null;
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'phone' => $row['phone'] ?? '',
        'company' => $row['company'] ?? '',
        'role' => $row['role'],
        'authProvider' => $row['auth_provider'],
        'subscriptionTier' => $row['subscription_tier'],
        'subscriptionActive' => (bool)$row['subscription_active'],
        'subscriptionExpiry' => $row['subscription_expiry'] ?? null,
        'identityVerified' => (bool)$row['identity_verified'],
        'verificationStatus' => $row['verification_status'],
        'verificationType' => $row['verification_type'] ?? null,
        'ktpNumber' => $row['ktp_number'] ?? null,
        'npwpNumber' => $row['npwp_number'] ?? null,
        'verifiedBadge' => $row['verified_badge'] ?? null,
        'verifiedAt' => $row['verified_at'] ?? null,
        'bankAccount' => $row['bank_account'] ?? null,
        'location' => $row['location'] ?? null,
        'balance' => (float)($row['balance'] ?? 0),
        'avatar' => $row['avatar'] ?? null,
        'createdAt' => $row['created_at'] ?? null,
        'updatedAt' => $row['updated_at'] ?? null
    ];
}
