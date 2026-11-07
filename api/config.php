<?php
// SPDX-License-Identifier: MIT
// =======================================================
// CircuLink Environment Configuration (PHP / InfinityFree)
// =======================================================

// Muat kredensial lokal dari config.local.php jika tersedia (diabaikan dari Git)
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

// --- CLOUDINARY CREDENTIALS (Fallback dari Environment Variables) ---
if (!defined('CLOUDINARY_CLOUD_NAME')) {
    define('CLOUDINARY_CLOUD_NAME', getenv('CLOUDINARY_CLOUD_NAME') ?: '');
}
if (!defined('CLOUDINARY_API_KEY')) {
    define('CLOUDINARY_API_KEY', getenv('CLOUDINARY_API_KEY') ?: '');
}
if (!defined('CLOUDINARY_API_SECRET')) {
    define('CLOUDINARY_API_SECRET', getenv('CLOUDINARY_API_SECRET') ?: '');
}
if (!defined('CLOUDINARY_UPLOAD_PRESET')) {
    define('CLOUDINARY_UPLOAD_PRESET', getenv('CLOUDINARY_UPLOAD_PRESET') ?: 'circulink_preset');
}
if (!defined('CLOUDINARY_FOLDER')) {
    define('CLOUDINARY_FOLDER', getenv('CLOUDINARY_FOLDER') ?: 'circulink');
}

// --- SUPABASE CREDENTIALS (Fallback dari Environment Variables) ---
if (!defined('SUPABASE_URL')) {
    define('SUPABASE_URL', getenv('SUPABASE_URL') ?: '');
}
if (!defined('SUPABASE_ANON_KEY')) {
    define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: '');
}
if (!defined('SUPABASE_SERVICE_ROLE_KEY')) {
    define('SUPABASE_SERVICE_ROLE_KEY', getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');
}
if (!defined('SUPABASE_PUBLISHABLE_KEY')) {
    define('SUPABASE_PUBLISHABLE_KEY', getenv('SUPABASE_PUBLISHABLE_KEY') ?: '');
}

// Kunci enkripsi untuk kredensial agent yang disimpan di database.
if (!defined('INFERX_ENCRYPTION_KEY')) {
    define('INFERX_ENCRYPTION_KEY', getenv('INFERX_ENCRYPTION_KEY') ?: '');
}

// AES-256 key (64 hex chars) for payment and logistics secrets at rest.
if (!defined('PAYMENT_ENCRYPTION_KEY')) {
    define('PAYMENT_ENCRYPTION_KEY', getenv('PAYMENT_ENCRYPTION_KEY') ?: '');
}

function getCloudinaryConfig() {
    return [
        'cloud_name' => CLOUDINARY_CLOUD_NAME,
        'api_key' => CLOUDINARY_API_KEY,
        'upload_preset' => CLOUDINARY_UPLOAD_PRESET,
        'folder' => CLOUDINARY_FOLDER
    ];
}

function getSupabaseConfig() {
    return [
        'url' => SUPABASE_URL,
        'anon_key' => SUPABASE_ANON_KEY,
        'service_role_key' => SUPABASE_SERVICE_ROLE_KEY,
        'publishable_key' => SUPABASE_PUBLISHABLE_KEY
    ];
}
