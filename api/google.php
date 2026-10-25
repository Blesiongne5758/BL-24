<?php
// Login Google dinonaktifkan. Endpoint mengembalikan 410 agar klien lama gagal secara aman.
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => false, 'message' => 'Login Google telah dinonaktifkan.']);
