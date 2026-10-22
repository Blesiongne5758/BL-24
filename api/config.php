<?php
// SPDX-License-Identifier: MIT
// =======================================================
// CircuLink Environment Configuration (PHP / InfinityFree)
// =======================================================

define('CLOUDINARY_CLOUD_NAME', 'v1pwadqp');
define('CLOUDINARY_API_KEY', '351693688969844');
define('CLOUDINARY_API_SECRET', 'P_4c_Wl963sA-YhZtB7oM8x64L0');
define('CLOUDINARY_UPLOAD_PRESET', 'circulink_preset');
define('CLOUDINARY_FOLDER', 'circulink');

function getCloudinaryConfig() {
    return [
        'cloud_name' => CLOUDINARY_CLOUD_NAME,
        'api_key' => CLOUDINARY_API_KEY,
        'upload_preset' => CLOUDINARY_UPLOAD_PRESET,
        'folder' => CLOUDINARY_FOLDER
    ];
}
