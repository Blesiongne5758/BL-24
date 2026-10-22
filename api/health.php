<?php
// SPDX-License-Identifier: MIT
// =======================================================
// CircuLink - API Health Check Endpoint (PHP / InfinityFree)
// =======================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

echo json_encode([
    'success' => true,
    'status' => 'ok',
    'service' => 'circulink-api-php',
    'platform' => 'InfinityFree / Apache',
    'php_version' => phpversion(),
    'timestamp' => date('c'),
    'features' => [
        'cloudinary_storage' => true,
        'supabase_db' => true,
        'crypto_wallet' => true
    ]
]);
