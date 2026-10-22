<?php
// SPDX-License-Identifier: MIT
// =======================================================
// CircuLink Environment Configuration (PHP / InfinityFree)
// =======================================================

// --- CLOUDINARY CREDENTIALS ---
define('CLOUDINARY_CLOUD_NAME', 'v1pwadqp');
define('CLOUDINARY_API_KEY', '[REDACTED]');
define('CLOUDINARY_API_SECRET', '[REDACTED]');
define('CLOUDINARY_UPLOAD_PRESET', 'circulink_preset');
define('CLOUDINARY_FOLDER', 'circulink');

// --- SUPABASE CREDENTIALS ---
define('SUPABASE_URL', 'https://vnajenbubmglwlsvteed.supabase.co');
define('SUPABASE_ANON_KEY', '[REDACTED]');
define('SUPABASE_SERVICE_ROLE_KEY', '[REDACTED]');
define('SUPABASE_PUBLISHABLE_KEY', '[REDACTED]');

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
