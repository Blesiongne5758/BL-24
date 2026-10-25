<?php
// Konfigurasi hanya dibaca dari environment server; jangan simpan secret di repository.

function getCloudinaryConfig(): array {
    return [
        'cloud_name' => getenv('CLOUDINARY_CLOUD_NAME') ?: '',
        'api_key' =[REDACTED]
        'upload_preset' => getenv('CLOUDINARY_UPLOAD_PRESET') ?: '',
        'folder' => getenv('CLOUDINARY_FOLDER') ?: ''
    ];
}

function getSupabaseConfig(): array {
    // Hanya nilai publik; SUPABASE_SERVICE_ROLE_KEY tidak boleh diekspos ke klien.
    return [
        'url' => getenv('SUPABASE_URL') ?: '',
        'anon_key' => getenv('SUPABASE_ANON_KEY') ?: '',
        'publishable_key' => getenv('SUPABASE_PUBLISHABLE_KEY') ?: ''
    ];
}
