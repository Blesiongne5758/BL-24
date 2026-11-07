<?php
// SPDX-License-Identifier: MIT
// =======================================================
// API: UPDATE USER SUBSCRIPTION TIER
// =======================================================

require_once 'db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Silakan masuk terlebih dahulu.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['userId']) || !isset($input['tierId'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request. userId and tierId are required.'
    ]);
    exit;
}

$userId = trim($input['userId']);
$tierId = trim($input['tierId']);
$tiers = ['tier_starter', 'tier_basic', 'tier_pro', 'tier_enterprise'];
if (!in_array($tierId, $tiers, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Paket langganan tidak valid.']);
    exit;
}
if ($userId !== $_SESSION['user_id'] && ($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Anda tidak dapat mengubah langganan akun lain.']);
    exit;
}
$subscriptionActive = isset($input['subscriptionActive']) ? (bool)$input['subscriptionActive'] : true;

// Buyers may activate the free starter plan directly; paid plans require QRIS review.
if (($_SESSION['role'] ?? '') !== 'admin' && $subscriptionActive) {
    $priceStmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1');
    $priceStmt->execute([$tierId . '_price']);
    $configuredPrice = $priceStmt->fetchColumn();
    if ($tierId !== 'tier_starter' && !is_numeric($configuredPrice)) {
        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'Harga paket belum dikonfigurasi admin.']);
        exit;
    }
    $price = $tierId === 'tier_starter' ? 0 : (float)$configuredPrice;
    if ($price > 0) {
        http_response_code(402);
        echo json_encode(['success' => false, 'message' => 'Tier berbayar harus dibeli melalui QRIS dan menunggu validasi admin.']);
        exit;
    }
}

try {
    // 1. Calculate Expiry (Next Month if active)
    $expiry = null;
    if ($subscriptionActive) {
        $date = new DateTime();
        $date->modify('+1 month');
        $expiry = $date->format('Y-m-d');
    }

    // 2. Update User Table
    $stmt = $pdo->prepare("
        UPDATE users
        SET subscription_tier = :tier,
            subscription_active = :active,
            subscription_expiry = :expiry,
            updated_at = NOW()
        WHERE id = :id
    ");

    $stmt->execute([
        ':tier' => $tierId,
        ':active' => $subscriptionActive ? 1 : 0,
        ':expiry' => $expiry,
        ':id' => $userId
    ]);

    if ($stmt->rowCount() === 0) {
        throw new Exception("User not found or no changes made.");
    }

    echo json_encode([
        'success' => true,
        'message' => 'Subscription updated successfully.',
        'data' => [
            'userId' => $userId,
            'tierId' => $tierId,
            'subscriptionActive' => $subscriptionActive,
            'subscriptionExpiry' => $expiry
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating subscription: ' . $e->getMessage()
    ]);
}
