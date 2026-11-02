<?php
// SPDX-License-Identifier: MIT
// =======================================================
// API: UPDATE USER SUBSCRIPTION TIER
// =======================================================

require_once 'db.php';

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
$subscriptionActive = isset($input['subscriptionActive']) ? (bool)$input['subscriptionActive'] : true;

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
