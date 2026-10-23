<?php
// SPDX-License-Identifier: MIT
// CircuLink environment configuration. Never commit production credentials.
function envRequired($name) {
    $value = getenv($name);
    if ($value === false || trim($value) === '') {
        throw new RuntimeException("Konfigurasi lingkungan {$name} belum diset.");
    }
    return trim($value);
}

define('CLOUDINARY_CLOUD_NAME', envRequired('CLOUDINARY_CLOUD_NAME'));
define('CLOUDINARY_API_KEY', envRequired('CLOUDINARY_API_KEY'));
define('CLOUDINARY_API_SECRET', envRequired('CLOUDINARY_API_SECRET'));
define('CLOUDINARY_UPLOAD_PRESET', envRequired('CLOUDINARY_UPLOAD_PRESET'));
define('CLOUDINARY_FOLDER', getenv('CLOUDINARY_FOLDER') ?: 'circulink');

define('SUPABASE_URL', envRequired('SUPABASE_URL'));
define('SUPABASE_ANON_KEY', envRequired('SUPABASE_ANON_KEY'));
define('SUPABASE_SERVICE_ROLE_KEY', envRequired('SUPABASE_SERVICE_ROLE_KEY'));
define('SUPABASE_PUBLISHABLE_KEY', getenv('SUPABASE_PUBLISHABLE_KEY') ?: '');

function getCloudinaryConfig() {
    return [
        'cloud_name' => CLOUDINARY_CLOUD_NAME,
        'api_key' =[REDACTED]
        'upload_preset' => CLOUDINARY_UPLOAD_PRESET,
        'folder' => CLOUDINARY_FOLDER
    ];
}

function getSupabaseConfig() {
    return [
        'url' => SUPABASE_URL,
        'anon_key' => SUPABASE_ANON_KEY,
        'service_role_key' =[REDACTED]
        'publishable_key' => SUPABASE_PUBLISHABLE_KEY
    ];
}
