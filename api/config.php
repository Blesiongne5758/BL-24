<?php
// SPDX-License-Identifier: MIT
// =======================================================
// CircuLink Environment Configuration (PHP / InfinityFree)
// =======================================================

// --- CLOUDINARY CREDENTIALS ---
define('CLOUDINARY_CLOUD_NAME', 'v1pwadqp');
define('CLOUDINARY_API_KEY', '351693688969844');
define('CLOUDINARY_API_SECRET', 'P_4c_Wl963sA-YhZtB7oM8x64L0');
define('CLOUDINARY_UPLOAD_PRESET', 'circulink_preset');
define('CLOUDINARY_FOLDER', 'circulink');

// --- SUPABASE CREDENTIALS ---
define('SUPABASE_URL', 'https://vnajenbubmglwlsvteed.supabase.co');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuYWplbmJ1Ym1nbHdsc3Z0ZWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDI0MjUsImV4cCI6MjEwODIxODQyNX0.Ft3UjkZa0nqkflx1gG1JaFCAfhFlIYY2Jy3xetLwDRE');
define('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuYWplbmJ1Ym1nbHdsc3Z0ZWVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjY0MjQyNSwiZXhwIjoyMTA4MjE4NDI1fQ.kcWNWLCqWvIKqJn1hNu7EDLDZXfpUAsgCrd40RxnJZ8');
define('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_ZIGjy8W8eIPuBXRM24AhmQ_0UE-3MZP');

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
