<?php
// SPDX-License-Identifier: MIT
// =======================================================
// CircuLink - API Health Check Endpoint (PHP)
// =======================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try { $pdo->query('SELECT 1'); } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'status' => 'error', 'message' => 'Database belum dapat dihubungi.']);
    exit;
}

echo json_encode([
    'success' => true,
    'status' => 'ok',
    'service' => 'circulink-api-php',
    'platform' => 'Apache',
    'php_version' => phpversion(),
    'timestamp' => date('c'),
    'features' => [
        'cloudinary_storage' => true,
        'supabase_db' => true
    ]
]);
