<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method tidak diizinkan.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$email = trim(strtolower($input['email'] ?? ''));
$name = trim($input['name'] ?? '');
$avatar = trim($input['avatar'] ?? '');
$role = $input['role'] ?? 'buyer';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email Google tidak valid.']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $authUser = mapUserRow($user);
        echo json_encode([
            'success' => true,
            'user' => $authUser,
            'role' => $authUser['role'],
            'isNewAccount' => false
        ]);
        exit;
    }

    $newId = 'user_' . $role . '_' . round(microtime(true) * 1000);
    $displayName = !empty($name) ? $name : explode('@', $email)[0];
    $dummyPhone = '+62 812-' . mt_rand(10000000, 99999999);
    $company = $role === 'seller' ? "CV {$displayName} Sentra" : "PT {$displayName} Daur Ulang";
    $passwordHash = password_hash('google_oauth_' . time(), PASSWORD_BCRYPT);
    $expiry = date('Y-m-d', strtotime('+30 days'));
    $badge = $role === 'seller' ? 'Mitra Google' : 'Pembeli Google';

    $insertSql = "INSERT INTO users (
        id, name, email, phone, company, role, password_hash, auth_provider,
        subscription_tier, subscription_active, subscription_expiry,
        identity_verified, verification_status, verified_badge,
        bank_account, location, balance, avatar
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'google', 'tier_starter', 1, ?, 0, 'unverified', ?, '-', 'Indonesia', 0.00, ?)";

    $ins = $pdo->prepare($insertSql);
    $ins->execute([
        $newId, $displayName, $email, $dummyPhone, $company, $role,
        $passwordHash, $expiry, $badge, $avatar ?: null
    ]);

    $fetchStmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $fetchStmt->execute([$newId]);
    $newUser = mapUserRow($fetchStmt->fetch());

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'user' => $newUser,
        'role' => $newUser['role'],
        'isNewAccount' => true
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Terjadi kesalahan server: ' . $e->getMessage()]);
}
