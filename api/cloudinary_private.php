<?php
// Signed, authenticated Cloudinary uploads for private identity documents.
function cloudinary_signed_params($params, $secret) {
    ksort($params, SORT_STRING);
    $pairs=[];
    foreach($params as $key=>$value) $pairs[]=$key.'='.$value;
    return sha1(implode('&',$pairs).$secret);
}

function cloudinary_private_upload($file, $folderName = 'private_kyc') {
    $userId=$_SESSION['user_id'] ?? '';
    if(!$userId || !defined('CLOUDINARY_CLOUD_NAME') || !CLOUDINARY_CLOUD_NAME || !defined('CLOUDINARY_API_KEY') || !CLOUDINARY_API_KEY || !defined('CLOUDINARY_API_SECRET') || !CLOUDINARY_API_SECRET) {
        api_json(['success'=>false,'message'=>'Konfigurasi upload privat Cloudinary belum lengkap.'],503);
    }
    if(empty($file) || ($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || $file['size']>25*1024*1024) api_json(['success'=>false,'message'=>'File tidak valid atau melebihi batas 25 MB.'],400);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $allowed=['application/pdf'=>'raw','image/jpeg'=>'image','image/png'=>'image','image/webp'=>'image'];
    if(!isset($allowed[$mime]))api_json(['success'=>false,'message'=>'Dokumen harus berupa PDF, JPEG, PNG, atau WebP.'],400);
    if(!function_exists('curl_init'))api_json(['success'=>false,'message'=>'Ekstensi cURL PHP tidak tersedia di hosting.'],503);

    $resourceType=$allowed[$mime]; $timestamp=time(); $assetId=bin2hex(random_bytes(16));
    $folderPath=$folderName.'/'.$userId;
    $params=['folder'=>$folderPath,'public_id'=>$assetId,'timestamp'=>$timestamp,'type'=>'authenticated'];
    $fields=$params+['api_key'=>CLOUDINARY_API_KEY,'signature'=>cloudinary_signed_params($params,CLOUDINARY_API_SECRET),'file'=>new CURLFile($file['tmp_name'],$mime,$file['name'])];
    $url='https://api.cloudinary.com/v1_1/'.rawurlencode(CLOUDINARY_CLOUD_NAME).'/'.$resourceType.'/upload';
    $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$fields,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>60]);
    $raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    $response=json_decode((string)$raw,true);
    if($status<200||$status>=300||empty($response['public_id'])){error_log('[Private Cloudinary Upload] '.substr((string)$raw,0,500));api_json(['success'=>false,'message'=>'Cloudinary menolak unggahan dokumen privat.'],502);}
    $key=implode(':',['cldpriv',$userId,$resourceType,$response['public_id'],(string)$response['version'],$response['format']??'bin']);
    api_json(['success'=>true,'file'=>['storageKey'=>$key,'filename'=>$file['name'],'contentType'=>$mime,'size'=>$file['size'],'provider'=>'cloudinary_authenticated']]);
}

function cloudinary_public_upload($file) {
    if(!defined('CLOUDINARY_CLOUD_NAME')||!CLOUDINARY_CLOUD_NAME||!defined('CLOUDINARY_API_KEY')||!CLOUDINARY_API_KEY||!defined('CLOUDINARY_API_SECRET')||!CLOUDINARY_API_SECRET)api_json(['success'=>false,'message'=>'Konfigurasi server Cloudinary belum lengkap.'],503);
    if(empty($file)||($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK||$file['size']>15*1024*1024)api_json(['success'=>false,'message'=>'Foto tidak valid atau melebihi 15 MB.'],400);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if(!in_array($mime,['image/jpeg','image/png','image/webp'],true))api_json(['success'=>false,'message'=>'Foto harus JPEG, PNG, atau WebP.'],400);
    if(!function_exists('curl_init'))api_json(['success'=>false,'message'=>'Ekstensi cURL PHP tidak tersedia di hosting.'],503);
    $timestamp=time();$assetId=bin2hex(random_bytes(16));$params=['folder'=>'bursalimbah/public_listing','public_id'=>$assetId,'timestamp'=>$timestamp,'type'=>'upload'];
    $fields=$params+['api_key'=>CLOUDINARY_API_KEY,'signature'=>cloudinary_signed_params($params,CLOUDINARY_API_SECRET),'file'=>new CURLFile($file['tmp_name'],$mime,$file['name'])];
    $url='https://api.cloudinary.com/v1_1/'.rawurlencode(CLOUDINARY_CLOUD_NAME).'/image/upload';
    $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$fields,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>60]);$raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);$response=json_decode((string)$raw,true);
    if($status<200||$status>=300||empty($response['secure_url'])){error_log('[Public Cloudinary Upload] '.substr((string)$raw,0,500));api_json(['success'=>false,'message'=>'Cloudinary menolak unggahan foto.'],502);}
    $url=$response['secure_url'];$thumb=preg_replace('~/upload/~','/upload/c_fill,w_400,h_300,g_auto,f_auto,q_auto/',$url,1);
    return ['url'=>$url,'thumbnailUrl'=>$thumb,'filename'=>$file['name'],'provider'=>'cloudinary','storageKey'=>$response['public_id']];
}

function cloudinary_private_url($key) {
    if(empty($_SESSION['user_id']))api_json(['success'=>false,'message'=>'Sesi masuk diperlukan.'],401);
    $parts=explode(':',(string)$key,6);
    if(count($parts)!==6||$parts[0]!=='cldpriv')api_json(['success'=>false,'message'=>'Kunci dokumen tidak valid.'],400);
    [, $ownerId,$resourceType,$publicId,$version,$format]=$parts;
    if($_SESSION['role']!=='admin' && $_SESSION['user_id']!==$ownerId)api_json(['success'=>false,'message'=>'Akses dokumen ditolak.'],403);
    if(!in_array($resourceType,['image','raw'],true)||!defined('CLOUDINARY_CLOUD_NAME')||!CLOUDINARY_CLOUD_NAME||!defined('CLOUDINARY_API_KEY')||!CLOUDINARY_API_KEY||!defined('CLOUDINARY_API_SECRET')||!CLOUDINARY_API_SECRET)api_json(['success'=>false,'message'=>'Konfigurasi dokumen privat tidak tersedia.'],503);
    $params=['attachment'=>'false','expires_at'=>time()+300,'format'=>$format,'public_id'=>$publicId,'timestamp'=>time(),'type'=>'authenticated'];
    $params['api_key']=CLOUDINARY_API_KEY;
    $params['signature']=cloudinary_signed_params(array_diff_key($params,['api_key'=>true]),CLOUDINARY_API_SECRET);
    $url='https://api.cloudinary.com/v1_1/'.rawurlencode(CLOUDINARY_CLOUD_NAME).'/'.$resourceType.'/download?'.http_build_query($params,'','&',PHP_QUERY_RFC3986);
    api_json(['success'=>true,'signedUrl'=>$url,'expiresIn'=>300]);
}
