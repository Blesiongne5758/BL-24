<?php
// SPDX-License-Identifier: MIT
// =======================================================
// CircuLink Environment Configuration (PHP / InfinityFree)
// =======================================================

define('CLOUDINARY_CLOUD_NAME', 'v1pwadqp');
define('CLOUDINARY_API_KEY', '[REDACTED]');
define('CLOUDINARY_API_SECRET', '[REDACTED]');
define('CLOUDINARY_UPLOAD_PRESET', 'circulink_preset');
define('CLOUDINARY_FOLDER', 'circulink');

function getCloudinaryConfig() {
    return [
        'cloud_name' => CLOUDINARY_CLOUD_NAME,
        'api_key' =[REDACTED]
        'upload_preset' => CLOUDINARY_UPLOAD_PRESET,
        'folder' => CLOUDINARY_FOLDER
    ];
}
