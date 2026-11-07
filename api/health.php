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
        'mysql_database' => true,
        'cloudinary_storage' => defined('CLOUDINARY_CLOUD_NAME')
            && defined('CLOUDINARY_API_KEY')
            && defined('CLOUDINARY_API_SECRET')
            && defined('CLOUDINARY_UPLOAD_PRESET')
            && function_exists('curl_init')
            && class_exists('finfo')
            && CLOUDINARY_CLOUD_NAME !== ''
            && CLOUDINARY_API_KEY !== ''
            && CLOUDINARY_API_SECRET !== ''
            && CLOUDINARY_UPLOAD_PRESET !== '',
        // This PHP API uses InfinityFree MySQL. Supabase is an optional
        // browser-side catalog mirror and is not a PHP database connection.
        'supabase_db' => false
    ]
]);
