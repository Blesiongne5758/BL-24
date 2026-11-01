<?php
// SPDX-License-Identifier: MIT
// =======================================================
// CircuLink - Google OAuth Endpoint (DISABLED)
// Autentikasi Google dinonaktifkan oleh administrator
// =======================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

http_response_code(403);
echo json_encode([
    'success' => false,
    'message' => 'Autentikasi Google telah dinonaktifkan oleh administrator demi keamanan.'
]);
exit;
