<?php
// Compatibility REST API for the static client on InfinityFree (Apache + PHP + MySQL).
require_once __DIR__ . '/db.php';

function api_json($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function api_body() {
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === false) return $_POST;
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : $_POST;
}
function api_require_role($roles) {
    if (empty($_SESSION['user_id'])) api_json(['success' => false, 'message' => 'Silakan masuk terlebih dahulu.'], 401);
    if (!in_array($_SESSION['role'] ?? '', $roles, true)) api_json(['success' => false, 'message' => 'Akses tidak diizinkan.'], 403);
}
function api_same_origin_write() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin && parse_url($origin, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '')) {
        api_json(['success' => false, 'message' => 'Permintaan lintas domain ditolak.'], 403);
    }
}
function api_event_row($r) {
    $date = (string)($r['event_date'] ?? '');
    $months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    $ts = strtotime($date ?: 'now');
    return [
        'id' => $r['id'], 'title' => $r['title'], 'category' => $r['event_type'] ?? 'webinar',
        'categoryLabel' => strtoupper($r['event_type'] ?? 'webinar'), 'date' => $date,
        'day' => date('d', $ts), 'monthYear' => $months[(int)date('n', $ts) - 1] . ' ' . date('Y', $ts),
        'time' => $r['event_time'] ?? '', 'location' => $r['location'] ?? 'Online',
        'image' => $r['image'] ?? '', 'description' => $r['description'] ?? '',
        'price' => (float)($r['price'] ?? 0), 'isFree' => (float)($r['price'] ?? 0) <= 0,
        'status' => ($r['status'] ?? 'aktif') === 'aktif' ? 'published' : $r['status']
    ];
}
function api_category_group_id($main) {
    $value=strtolower((string)$main);
    foreach(['minyak'=>'cat_minyak_cairan','kertas'=>'cat_kertas_karton','plastik'=>'cat_plastik','logam'=>'cat_logam','kaca'=>'cat_kaca','karet'=>'cat_karet','kayu'=>'cat_kayu','tekstil'=>'cat_tekstil','elektronik'=>'cat_elektronik','baterai'=>'cat_baterai_aki','aki'=>'cat_baterai_aki','organik'=>'cat_organik','kemasan'=>'cat_kemasan_industri','scrap'=>'cat_scrap_produksi','recovery'=>'cat_material_recovery','konstruksi'=>'cat_limbah_konstruksi','b3'=>'cat_limbah_b3'] as $needle=>$id)if(strpos($value,$needle)!==false)return $id;
    return 'cat_lainnya';
}
function api_category_name_for_group($id,$label='') {
    $map=['cat_minyak_cairan'=>'Minyak & Cairan Bekas','cat_kertas_karton'=>'Kertas & Karton','cat_plastik'=>'Plastik','cat_logam'=>'Logam','cat_kaca'=>'Kaca','cat_karet'=>'Karet','cat_kayu'=>'Kayu','cat_tekstil'=>'Tekstil','cat_elektronik'=>'Elektronik','cat_baterai_aki'=>'Baterai','cat_organik'=>'Organik','cat_kemasan_industri'=>'Kemasan','cat_scrap_produksi'=>'Scrap','cat_material_recovery'=>'Material Recovery','cat_limbah_konstruksi'=>'Konstruksi','cat_limbah_b3'=>'B3'];
    return $map[$id]??$label;
}
require_once __DIR__ . '/cloudinary_private.php';

function payment_config_key() {
    $key = defined('PAYMENT_ENCRYPTION_KEY') ? PAYMENT_ENCRYPTION_KEY : '';
    if (!preg_match('/^[a-fA-F0-9]{64}$/', $key)) api_json(['success'=>false,'message'=>'PAYMENT_ENCRYPTION_KEY server (64 karakter hex) belum dikonfigurasi.'],503);
    return hex2bin($key);
}
function payment_secret_encrypt($plain) {
    if ($plain === '') return [null,null,null];
    $iv=random_bytes(12);$tag='';$cipher=openssl_encrypt($plain,'aes-256-gcm',payment_config_key(),OPENSSL_RAW_DATA,$iv,$tag);
    if($cipher===false)api_json(['success'=>false,'message'=>'Kunci gateway gagal dienkripsi.'],500);
    return [base64_encode($cipher),bin2hex($iv),bin2hex($tag)];
}
function payment_secret_decrypt($row,$prefix) {
    $cipher=$row[$prefix.'_ciphertext']??'';$iv=$row[$prefix.'_iv']??'';$tag=$row[$prefix.'_tag']??'';
    if(!$cipher||!$iv||!$tag)return '';
    $plain=openssl_decrypt(base64_decode($cipher,true),'aes-256-gcm',payment_config_key(),OPENSSL_RAW_DATA,hex2bin($iv),hex2bin($tag));
    return is_string($plain)?$plain:'';
}
function payment_config_row($pdo) {
    $row=$pdo->query('SELECT * FROM payment_gateway_config WHERE id=1')->fetch();
    return $row?:[];
}

$path = trim((string)($_GET['path'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$parts = $path === '' ? [] : explode('/', $path);
api_same_origin_write();

// Preserve the public endpoint contract used by js/store.js.
if ($path === 'auth/login' && $method === 'POST') require __DIR__ . '/login.php';
if ($path === 'auth/register' && $method === 'POST') require __DIR__ . '/register.php';
$input = api_body();

function ai_agent_decrypt_key($row) {
    if (!defined('INFERX_ENCRYPTION_KEY') || !preg_match('/^[a-fA-F0-9]{64}$/', INFERX_ENCRYPTION_KEY)) return '';
    if (empty($row['api_key_encrypted']) || empty($row['api_key_iv']) || empty($row['api_key_tag'])) return '';
    $plain = openssl_decrypt(base64_decode($row['api_key_encrypted'], true), 'aes-256-gcm', hex2bin(INFERX_ENCRYPTION_KEY), OPENSSL_RAW_DATA, base64_decode($row['api_key_iv'], true), base64_decode($row['api_key_tag'], true));
    return is_string($plain) ? $plain : '';
}

function ai_agent_config_row($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_agent_config (
        id TINYINT UNSIGNED NOT NULL DEFAULT 1,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        provider VARCHAR(40) NOT NULL DEFAULT 'inferx',
        base_url VARCHAR(255) NOT NULL DEFAULT 'https://model.inferx.net/endpoints/v1',
        model_name VARCHAR(120) NOT NULL DEFAULT 'deepseek-v4.1-flash',
        api_key_encrypted TEXT DEFAULT NULL,
        api_key_iv VARCHAR(64) DEFAULT NULL,
        api_key_tag VARCHAR(64) DEFAULT NULL,
        site_help_enabled TINYINT(1) NOT NULL DEFAULT 1,
        product_search_enabled TINYINT(1) NOT NULL DEFAULT 1,
        product_posting_assist_enabled TINYINT(1) NOT NULL DEFAULT 1,
        updated_by VARCHAR(64) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $q = $pdo->query('SELECT * FROM ai_agent_config WHERE id=1 LIMIT 1');
    $row = $q->fetch();
    if (!$row) {
        $pdo->exec('INSERT IGNORE INTO ai_agent_config (id) VALUES (1)');
        $row = $pdo->query('SELECT * FROM ai_agent_config WHERE id=1 LIMIT 1')->fetch();
    }
    return $row ?: [];
}

if ($path === 'agent/config' && $method === 'GET') {
    api_require_role(['admin']);
    $row = ai_agent_config_row($pdo);
    api_json(['success'=>true,'config'=>[
        'enabled'=>(bool)($row['enabled']??false), 'provider'=>$row['provider']??'inferx',
        'baseUrl'=>$row['base_url']??'https://model.inferx.net/endpoints/v1', 'modelName'=>$row['model_name']??'deepseek-v4.1-flash',
        'hasApiKey'=>!empty($row['api_key_encrypted']), 'siteHelpEnabled'=>(bool)($row['site_help_enabled']??true),
        'productSearchEnabled'=>(bool)($row['product_search_enabled']??true), 'productPostingAssistEnabled'=>(bool)($row['product_posting_assist_enabled']??true)
    ]]);
}

if ($path === 'agent/config' && $method === 'PUT') {
    api_require_role(['admin']);
    $baseUrl=trim((string)($input['baseUrl']??'')); $model=trim((string)($input['modelName']??'')); $apiKey=trim((string)($input['apiKey']??''));
    if (!filter_var($baseUrl,FILTER_VALIDATE_URL) || parse_url($baseUrl,PHP_URL_SCHEME)!=='https' || strlen($baseUrl)>255) api_json(['success'=>false,'message'=>'Base URL harus berupa URL HTTPS yang valid.'],400);
    if ($model==='' || strlen($model)>120 || strlen($apiKey)>500) api_json(['success'=>false,'message'=>'Nama model atau API key tidak valid.'],400);
    $old=ai_agent_config_row($pdo); $encrypted=$old['api_key_encrypted']??null; $iv=$old['api_key_iv']??null; $tag=$old['api_key_tag']??null;
    if ($apiKey!=='') {
        if (!defined('INFERX_ENCRYPTION_KEY') || !preg_match('/^[a-fA-F0-9]{64}$/', INFERX_ENCRYPTION_KEY)) api_json(['success'=>false,'message'=>'Kunci enkripsi server belum diatur pada api/config.local.php.'],503);
        $nonce=random_bytes(12); $authTag=''; $cipher=openssl_encrypt($apiKey,'aes-256-gcm',hex2bin(INFERX_ENCRYPTION_KEY),OPENSSL_RAW_DATA,$nonce,$authTag);
        if ($cipher===false) api_json(['success'=>false,'message'=>'API key tidak dapat dienkripsi.'],500);
        $encrypted=base64_encode($cipher); $iv=base64_encode($nonce); $tag=base64_encode($authTag);
    }
    if (!empty($input['enabled']) && !$encrypted) api_json(['success'=>false,'message'=>'Masukkan API key sebelum mengaktifkan agent.'],400);
    $q=$pdo->prepare('UPDATE ai_agent_config SET enabled=?,provider=?,base_url=?,model_name=?,api_key_encrypted=?,api_key_iv=?,api_key_tag=?,site_help_enabled=?,product_search_enabled=?,product_posting_assist_enabled=?,updated_by=? WHERE id=1');
    $q->execute([!empty($input['enabled'])?1:0,'inferx',$baseUrl,$model,$encrypted,$iv,$tag,!empty($input['siteHelpEnabled'])?1:0,!empty($input['productSearchEnabled'])?1:0,!empty($input['productPostingAssistEnabled'])?1:0,$_SESSION['user_id']??null]);
    api_json(['success'=>true,'message'=>'Pengaturan agent berhasil disimpan.','hasApiKey'=>(bool)$encrypted]);
}

if ($path === 'agent/chat' && $method === 'POST') {
    // Rate limit berdasarkan sesi, termasuk pengunjung tanpa akun.
    $now=time(); $window=600;
    if (!isset($_SESSION['ai_agent_rate']) || $now-(int)$_SESSION['ai_agent_rate']['start'] >= $window) $_SESSION['ai_agent_rate']=['start'=>$now,'count'=>0];
    if (++$_SESSION['ai_agent_rate']['count']>20) api_json(['success'=>false,'message'=>'Batas chat bantuan tercapai. Silakan coba lagi beberapa menit.'],429);
    $row=ai_agent_config_row($pdo);
    if (empty($row['enabled'])) api_json(['success'=>false,'message'=>'Layanan bantuan AI sedang tidak aktif.'],503);
    $apiKey=ai_agent_decrypt_key($row);
    if (!$apiKey) api_json(['success'=>false,'message'=>'Konfigurasi kunci agent belum tersedia.'],503);
    $messages=$input['messages']??[];
    if (!is_array($messages)||count($messages)<1||count($messages)>12) api_json(['success'=>false,'message'=>'Percakapan harus berisi 1 sampai 12 pesan.'],400);
    $safeMessages=[]; $totalChars=0;
    foreach($messages as $message){
        if(!is_array($message)||!in_array($message['role']??'', ['user','assistant'],true)||!is_string($message['content']??null)||trim($message['content'])===''||strlen($message['content'])>4000) api_json(['success'=>false,'message'=>'Format pesan tidak valid atau terlalu panjang.'],400);
        $totalChars+=strlen($message['content']); $safeMessages[]=['role'=>$message['role'],'content'=>trim($message['content'])];
    }
    if($totalChars>16000) api_json(['success'=>false,'message'=>'Riwayat chat terlalu panjang. Mulai percakapan baru.'],400);

    $system='Anda adalah asisten Bursa Limbah (bursalimbah.com), marketplace perdagangan limbah dan material daur ulang Indonesia. Jawab dalam Bahasa Indonesia yang ramah, ringkas, dan praktis. Bantu hanya aktivitas yang fiturnya aktif. Jangan mengarang kebijakan atau biaya. Untuk status akun/transaksi atau sengketa, arahkan ke Pusat Layanan Bursa Limbah. Jangan meminta password, OTP, API key, nomor kartu, atau dokumen identitas.';
    if(!empty($row['site_help_enabled'])) $system.='\n\nBantu pertanyaan pendaftaran, akun, paket, penawaran, chat, pesanan, pembayaran/escrow, pengiriman, verifikasi, serta navigasi situs berdasarkan informasi yang tersedia.';
    if(!empty($row['product_search_enabled'])) $system.='\n\nBantu pengguna menemukan produk dengan meminta kata kunci/kategori/lokasi/volume lalu merangkum kandidat katalog publik yang disediakan.';
    if(!empty($row['product_posting_assist_enabled'])) $system.='\n\nBantu penjual menyiapkan posting dengan memandu judul, kategori, kondisi/mutu, volume dan satuan, harga, lokasi, jadwal, serta foto; arahkan mereka ke tombol Jual untuk meninjau dan mengirim formulir. Jangan pernah membuat atau mempublikasikan listing sendiri.';
    $lastUser=''; foreach(array_reverse($safeMessages) as $m){if($m['role']==='user'){$lastUser=$m['content'];break;}}
    if(!empty($row['product_search_enabled']) && $lastUser!==''){
        try {
            $lower= function_exists('mb_strtolower') ? mb_strtolower($lastUser,'UTF-8') : strtolower($lastUser);
            $terms=array_values(array_filter(array_unique(preg_split('/[^\p{L}\p{N}]+/u',$lower,-1,PREG_SPLIT_NO_EMPTY)),fn($t)=>function_exists('mb_strlen')?mb_strlen($t,'UTF-8')>=3:strlen($t)>=3));
            $terms=array_slice($terms,0,4);
            if($terms){$where=[];$params=[];foreach($terms as $term){$where[]='(LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(c.main_category) LIKE ?)';$like='%'.$term.'%';array_push($params,$like,$like,$like);} $sql='SELECT p.title,p.description,p.asking_price,p.weight,p.unit,p.city,c.main_category FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.status IN (\'approved\',\'tersedia\') AND ('.implode(' OR ',$where).') ORDER BY p.created_at DESC LIMIT 5';$q=$pdo->prepare($sql);$q->execute($params);$hits=$q->fetchAll();if($hits){$system.='\n\nKandidat produk publik dari katalog saat ini (gunakan hanya yang relevan; nyatakan sebagai hasil yang perlu dicek pengguna): '.json_encode(array_map(fn($p)=>['produk'=>$p['title'],'kategori'=>$p['main_category'],'harga'=>$p['asking_price'],'berat'=>$p['weight'],'satuan'=>$p['unit'],'kota'=>$p['city'],'deskripsi'=>function_exists('mb_substr')?mb_substr(strip_tags($p['description']??''),0,240,'UTF-8'):substr(strip_tags($p['description']??''),0,240)],$hits),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);}}
        } catch(Throwable $e) { error_log('[Agent Catalog Search] '.$e->getMessage()); }
    }
    $url=rtrim((string)$row['base_url'],'/').'/chat/completions';
    $payload=json_encode(['model'=>$row['model_name'],'messages'=>array_merge([['role'=>'system','content'=>$system]],$safeMessages)],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    if(!function_exists('curl_init')) api_json(['success'=>false,'message'=>'Ekstensi cURL belum aktif pada server.'],503);
    $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$apiKey,'Content-Type: application/json'],CURLOPT_POSTFIELDS=>$payload,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>60]);
    $body=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);$curlError=curl_error($ch);curl_close($ch);
    if($body===false||$status<200||$status>=300){error_log('[Agent API] Upstream HTTP '.$status.' '.$curlError);api_json(['success'=>false,'message'=>'Layanan bantuan sedang bermasalah. Coba lagi nanti.'],502);}
    $result=json_decode($body,true);$reply=$result['choices'][0]['message']['content']??'';
    if(!is_string($reply)||trim($reply)==='')api_json(['success'=>false,'message'=>'Respons bantuan tidak valid.'],502);
    api_json(['success'=>true,'message'=>trim($reply)]);
}

if ($path === 'auth/logout' && $method === 'POST') { $_SESSION = []; session_regenerate_id(true); api_json(['success'=>true]); }
if ($path === 'auth/admin/password' && $method === 'POST') {
    api_require_role(['admin']);
    $current=(string)($input['currentPassword']??'');$next=(string)($input['newPassword']??'');
    if(strlen($next)<8)api_json(['success'=>false,'message'=>'Sandi baru minimal 8 karakter.'],400);
    $q=$pdo->prepare('SELECT password_hash FROM users WHERE id=? AND role=\'admin\'');$q->execute([$_SESSION['user_id']]);$hash=$q->fetchColumn();
    if(!$hash||!password_verify($current,$hash))api_json(['success'=>false,'message'=>'Sandi saat ini tidak sesuai.'],401);
    $q=$pdo->prepare('UPDATE users SET password_hash=? WHERE id=?');$q->execute([password_hash($next,PASSWORD_DEFAULT),$_SESSION['user_id']]);api_json(['success'=>true,'message'=>'Sandi admin berhasil diperbarui.']);
}
if ($path === 'uploads/identity-document' && $method === 'POST') { api_require_role(['buyer','seller','admin']); cloudinary_private_upload($_FILES['file'] ?? null); }
if ($path === 'uploads/profile-photo' && $method === 'POST') {
    api_require_role(['buyer','seller','admin']);
    $uploaded=cloudinary_public_upload($_FILES['file']??null,'bursalimbah/profile_avatars');
    $q=$pdo->prepare('UPDATE users SET avatar=?,updated_at=NOW() WHERE id=?');$q->execute([$uploaded['url'],$_SESSION['user_id']]);
    api_json(['success'=>true,'url'=>$uploaded['url'],'thumbnailUrl'=>$uploaded['thumbnailUrl']]);
}
if ($path === 'uploads/weighing-proof' && $method === 'POST') { api_require_role(['buyer','seller','admin']); cloudinary_private_upload($_FILES['file'] ?? null, 'private_payment'); }
if ($path === 'uploads/payment-qris' && $method === 'POST') {
    api_require_role(['admin']);
    $file=$_FILES['file']??null;
    if(empty($file)||($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK||$file['size']>5*1024*1024)api_json(['success'=>false,'message'=>'Gambar QRIS wajib PNG/JPG/WebP dan maksimal 5 MB.'],400);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if(!in_array($mime,['image/jpeg','image/png','image/webp'],true))api_json(['success'=>false,'message'=>'Gambar QRIS harus JPEG, PNG, atau WebP.'],400);
    $uploaded=cloudinary_public_upload($file);
    $q=$pdo->prepare('UPDATE payment_gateway_config SET static_qris_url=?,updated_by=? WHERE id=1');$q->execute([$uploaded['url'],$_SESSION['user_id']]);
    api_json(['success'=>true,'url'=>$uploaded['url']]);
}
if ($path === 'uploads/product-evidence' && $method === 'POST') {
    api_require_role(['seller','admin']);
    $batch=$_FILES['files']??null; if(!$batch||!is_array($batch['name']??null))api_json(['success'=>false,'message'=>'Pilih setidaknya satu foto.'],400);
    if(count($batch['name'])>3)api_json(['success'=>false,'message'=>'Maksimal tiga foto per unggahan.'],400);
    $files=[]; foreach($batch['name'] as $i=>$name){$one=['name'=>$name,'type'=>$batch['type'][$i]??'','tmp_name'=>$batch['tmp_name'][$i]??'','error'=>$batch['error'][$i]??UPLOAD_ERR_NO_FILE,'size'=>$batch['size'][$i]??0];$files[]=cloudinary_public_upload($one);}
    api_json(['success'=>true,'files'=>$files],201);
}
if ($path === 'storage/private-url' && $method === 'GET') { cloudinary_private_url($_GET['key'] ?? ''); }

try {
    if ($path === 'public/payment-config' && $method === 'GET') {
        $cfg=payment_config_row($pdo);
        api_json(['success'=>true,'config'=>[
            'enabled'=>(bool)($cfg['enabled']??false),'provider'=>$cfg['provider']??'midtrans',
            'environment'=>$cfg['environment']??'sandbox','clientKey'=>$cfg['client_key']??'',
            'staticQrisUrl'=>$cfg['static_qris_url']??'','staticQrisLabel'=>$cfg['static_qris_label']??'QRIS BURSA LIMBAH',
            'paymentChannels'=>json_decode($cfg['payment_channels']??'[]',true)?:[],
            'manualShippingOptions'=>!empty($cfg['expedition_enabled'])?(json_decode($cfg['manual_shipping_options']??'[]',true)?:[]):[],
            'expeditionEnabled'=>(bool)($cfg['expedition_enabled']??false)
        ]]);
    }

    if ($path === 'admin/payment-config') {
        api_require_role(['admin']);
        if ($method==='GET') {
            $cfg=payment_config_row($pdo);
            api_json(['success'=>true,'config'=>[
                'enabled'=>(bool)($cfg['enabled']??false),'provider'=>$cfg['provider']??'midtrans',
                'environment'=>$cfg['environment']??'sandbox','merchantId'=>$cfg['merchant_id']??'',
                'clientKey'=>$cfg['client_key']??'','hasServerKey'=>(bool)($cfg['server_key_ciphertext']??''),
                'staticQrisUrl'=>$cfg['static_qris_url']??'','staticQrisLabel'=>$cfg['static_qris_label']??'',
                'paymentChannels'=>json_decode($cfg['payment_channels']??'[]',true)?:[],
                'expeditionEnabled'=>(bool)($cfg['expedition_enabled']??false),
                'expeditionProvider'=>$cfg['expedition_provider']??'manual','expeditionOrigin'=>$cfg['expedition_origin']??'',
                'hasExpeditionKey'=>(bool)($cfg['expedition_key_ciphertext']??''),
                'expeditionCouriers'=>json_decode($cfg['expedition_couriers']??'[]',true)?:[],
                'manualShippingOptions'=>json_decode($cfg['manual_shipping_options']??'[]',true)?:[]
            ]]);
        }
        if ($method==='PUT') {
            $cfg=payment_config_row($pdo);
            $gatewayKey=(string)($input['serverKey']??'');$expeditionKey=(string)($input['expeditionKey']??'');
            $gatewayEncrypted=[$cfg['server_key_ciphertext']??null,$cfg['server_key_iv']??null,$cfg['server_key_tag']??null];
            $expeditionEncrypted=[$cfg['expedition_key_ciphertext']??null,$cfg['expedition_key_iv']??null,$cfg['expedition_key_tag']??null];
            if($gatewayKey!=='')$gatewayEncrypted=payment_secret_encrypt($gatewayKey);
            if($expeditionKey!=='')$expeditionEncrypted=payment_secret_encrypt($expeditionKey);
            $provider=(string)($input['provider']??'midtrans');
            if($provider!=='midtrans')api_json(['success'=>false,'message'=>'Integrasi gateway aktif saat ini mendukung Midtrans Snap.'],400);
            $channels=array_values(array_intersect((array)($input['paymentChannels']??[]),['qris','va','ewallet','cc']));
            if(!empty($input['enabled'])&&!$channels)api_json(['success'=>false,'message'=>'Aktifkan minimal satu kanal pembayaran Midtrans.'],400);
            $options=$input['manualShippingOptions']??[];
            if(!is_array($options))api_json(['success'=>false,'message'=>'Daftar opsi pengantaran tidak valid.'],400);
            $cleanOptions=[];
            foreach($options as $option){$name=trim((string)($option['name']??''));$fee=max(0,(int)($option['fee']??0));if($name!=='')$cleanOptions[]=['id'=>substr(preg_replace('/[^a-z0-9_-]/i','-',(string)($option['id']??$name)),0,40),'name'=>substr($name,0,100),'fee'=>$fee,'enabled'=>!empty($option['enabled'])];}
            if(!empty($input['enabled'])&&(!trim((string)($input['clientKey']??''))||empty($gatewayEncrypted[0])))api_json(['success'=>false,'message'=>'Gateway tidak dapat diaktifkan tanpa Client Key dan Server Key tersimpan.'],400);
            if(!empty($input['expeditionEnabled'])&&!array_filter($cleanOptions,fn($option)=>$option['enabled']))api_json(['success'=>false,'message'=>'Aktifkan setidaknya satu opsi kurir dan ongkir sebelum mengaktifkan pengantaran.'],400);
            $q=$pdo->prepare("UPDATE payment_gateway_config SET enabled=?,provider='midtrans',environment=?,merchant_id=?,client_key=?,server_key_ciphertext=?,server_key_iv=?,server_key_tag=?,static_qris_label=?,payment_channels=?,expedition_enabled=?,expedition_provider=?,expedition_key_ciphertext=?,expedition_key_iv=?,expedition_key_tag=?,expedition_origin=?,expedition_couriers=?,manual_shipping_options=?,updated_by=? WHERE id=1");
            $q->execute([!empty($input['enabled'])?1:0,($input['environment']??'sandbox')==='production'?'production':'sandbox',trim((string)($input['merchantId']??'')),trim((string)($input['clientKey']??'')),$gatewayEncrypted[0],$gatewayEncrypted[1],$gatewayEncrypted[2],substr(trim((string)($input['staticQrisLabel']??'QRIS BURSA LIMBAH')),0,180),json_encode($channels),!empty($input['expeditionEnabled'])?1:0,substr((string)($input['expeditionProvider']??'manual'),0,32),$expeditionEncrypted[0],$expeditionEncrypted[1],$expeditionEncrypted[2],substr(trim((string)($input['expeditionOrigin']??'')),0,180),json_encode(array_values(array_intersect((array)($input['expeditionCouriers']??[]),['jne','jnt','sicepat','lalamove','anteraja','wahana','kargo','mandiri']))),json_encode($cleanOptions,JSON_UNESCAPED_UNICODE),$_SESSION['user_id']]);
            api_json(['success'=>true,'hasServerKey'=>(bool)$gatewayEncrypted[0],'hasExpeditionKey'=>(bool)$expeditionEncrypted[0]]);
        }
    }

    if ($path==='admin/payment-config/test'&&$method==='POST') {
        api_require_role(['admin']);$cfg=payment_config_row($pdo);$key=payment_secret_decrypt($cfg,'server_key');
        if(!$key)api_json(['success'=>false,'message'=>'Server Key belum tersimpan.'],400);
        $base=($cfg['environment']==='production')?'https://api.midtrans.com':'https://api.sandbox.midtrans.com';
        $ch=curl_init($base.'/v2/BL-CONNECTION-CHECK/status');curl_setopt_array($ch,[CURLOPT_HTTPHEADER=>['Accept: application/json','Authorization: Basic '.base64_encode($key.':')],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>20]);$raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
        if($code===401||$code===403)api_json(['success'=>false,'message'=>'Midtrans menolak kredensial. Periksa Server Key dan environment.'],502);
        if($code===0||$code>=500)api_json(['success'=>false,'message'=>'Server Midtrans tidak dapat dijangkau saat ini.'],502);
        api_json(['success'=>true,'message'=>'Kredensial berhasil diautentikasi ke Midtrans (HTTP '.$code.').']);
    }

    if ($path==='payments/snap-token' && $method==='POST') {
        api_require_role(['buyer']);
        $orderId=(string)($input['orderId']??'');
        $q=$pdo->prepare('SELECT o.*,u.name AS buyer_name,u.email AS buyer_email,u.phone AS buyer_phone,COALESCE(f.shipping_fee,0) AS shipping_fee FROM orders o JOIN users u ON u.id=o.buyer_id LEFT JOIN order_fulfillments f ON f.order_id=o.id WHERE o.id=? AND o.buyer_id=?');$q->execute([$orderId,$_SESSION['user_id']]);$order=$q->fetch();
        if(!$order)api_json(['success'=>false,'message'=>'Pesanan tidak ditemukan.'],404);
        $cfg=payment_config_row($pdo);$serverKey=payment_secret_decrypt($cfg,'server_key');
        if(empty($cfg['enabled'])||$cfg['provider']!=='midtrans'||!$serverKey||empty($cfg['client_key']))api_json(['success'=>false,'message'=>'Gateway Midtrans belum diaktifkan atau kredensial server belum tersedia.'],503);
        $amount=(int)round((float)$order['dp_amount']+(float)$order['handling_fee']+(float)$order['service_fee']+(float)$order['shipping_fee']);
        if($amount<1)api_json(['success'=>false,'message'=>'Nilai tagihan tidak valid.'],400);
        $paymentId='pay_'.bin2hex(random_bytes(10));$gatewayOrderId='BL-'.str_replace('_','-',substr($paymentId,4));
        $configuredChannels=json_decode($cfg['payment_channels']??'[]',true)?:[];
        $channelMap=['qris'=>'qris','va'=>'bank_transfer','ewallet'=>'gopay','cc'=>'credit_card'];
        $enabledPayments=[];foreach($configuredChannels as $channel=>$enabled){$key=is_int($channel)?(string)$enabled:(string)$channel;$isEnabled=is_int($channel)?true:(bool)$enabled;if($isEnabled&&!empty($channelMap[$key]))$enabledPayments[]=$channelMap[$key];}
        if(!$enabledPayments)api_json(['success'=>false,'message'=>'Admin belum memilih kanal pembayaran Midtrans.'],503);
        $payload=['transaction_details'=>['order_id'=>$gatewayOrderId,'gross_amount'=>$amount],
            'customer_details'=>['first_name'=>substr((string)$order['buyer_name'],0,50),'email'=>(string)$order['buyer_email'],'phone'=>(string)$order['buyer_phone']],
            'item_details'=>[['id'=>'order-'.$orderId,'price'=>$amount,'quantity'=>1,'name'=>'Tagihan Bursa Limbah']]];
        if($enabledPayments)$payload['enabled_payments']=$enabledPayments;
        $base=($cfg['environment']==='production')?'https://app.midtrans.com':'https://app.sandbox.midtrans.com';
        $ch=curl_init($base.'/snap/v1/transactions');curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Accept: application/json','Content-Type: application/json','Authorization: Basic '.base64_encode($serverKey.':')],CURLOPT_POSTFIELDS=>json_encode($payload),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30]);
        $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);$snap=json_decode((string)$raw,true);
        if($code<200||$code>=300||empty($snap['token'])){error_log('[Midtrans Snap] '.substr((string)$raw,0,500));api_json(['success'=>false,'message'=>'Midtrans gagal membuat sesi pembayaran. Periksa kredensial dan konfigurasi merchant.'],502);}
        $save=$pdo->prepare("INSERT INTO order_payment_records (id,order_id,buyer_id,payment_type,amount,method,provider,gateway_order_id,provider_transaction_status,status,metadata) VALUES (?,?,?,?,?,'gateway','midtrans',?,?,'pending',?)");
        $save->execute([$paymentId,$orderId,$_SESSION['user_id'],'initial',$amount,$gatewayOrderId,'created',json_encode(['snapToken'=>$snap['token'],'redirectUrl'=>$snap['redirect_url']??''])]);
        api_json(['success'=>true,'paymentId'=>$paymentId,'amount'=>$amount,'token'=>$snap['token'],'redirectUrl'=>$snap['redirect_url']??'','clientKey'=>$cfg['client_key'],'environment'=>$cfg['environment']]);
    }

    if ($path==='payments/manual/create' && $method==='POST') {
        api_require_role(['buyer']);$orderId=(string)($input['orderId']??'');
        $q=$pdo->prepare('SELECT o.*,COALESCE(f.shipping_fee,0) AS shipping_fee FROM orders o LEFT JOIN order_fulfillments f ON f.order_id=o.id WHERE o.id=? AND o.buyer_id=?');$q->execute([$orderId,$_SESSION['user_id']]);$order=$q->fetch();
        if(!$order)api_json(['success'=>false,'message'=>'Pesanan tidak ditemukan.'],404);
        $cfg=payment_config_row($pdo);if(empty($cfg['static_qris_url']))api_json(['success'=>false,'message'=>'Admin belum mengunggah QRIS statis. Pembayaran manual belum tersedia.'],503);$amount=(int)round((float)$order['dp_amount']+(float)$order['handling_fee']+(float)$order['service_fee']+(float)$order['shipping_fee']);
        if($amount<1)api_json(['success'=>false,'message'=>'Nilai tagihan tidak valid.'],400);
        $id='pay_'.bin2hex(random_bytes(10));$save=$pdo->prepare("INSERT INTO order_payment_records (id,order_id,buyer_id,payment_type,amount,method,status) VALUES (?,?,?,'initial',?,'manual','pending')");$save->execute([$id,$orderId,$_SESSION['user_id'],$amount]);
        api_json(['success'=>true,'paymentId'=>$id,'amount'=>$amount,'qrisUrl'=>$cfg['static_qris_url']??'','qrisLabel'=>$cfg['static_qris_label']??'QRIS BURSA LIMBAH']);
    }

    if ($path==='payments/tier/manual/create' && $method==='POST') {
        api_require_role(['buyer']);$tierId=(string)($input['tierId']??'');$allowed=['tier_basic','tier_pro','tier_enterprise'];
        if(!in_array($tierId,$allowed,true))api_json(['success'=>false,'message'=>'Paket berbayar tidak valid.'],400);
        $price=$pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key=? LIMIT 1');$price->execute([$tierId.'_price']);$amount=(int)round((float)$price->fetchColumn());
        if($amount<1)api_json(['success'=>false,'message'=>'Harga tier belum diatur admin atau paket ini gratis.'],400);
        $cfg=payment_config_row($pdo);if(empty($cfg['static_qris_url']))api_json(['success'=>false,'message'=>'Admin belum mengunggah QRIS statis. Pembelian tier belum tersedia.'],503);
        $user=$pdo->prepare('SELECT subscription_tier,subscription_active FROM users WHERE id=?');$user->execute([$_SESSION['user_id']]);$current=$user->fetch();
        if(!$current)api_json(['success'=>false,'message'=>'Akun pembeli tidak ditemukan.'],404);
        $pending=$pdo->prepare("SELECT id FROM order_payment_records WHERE buyer_id=? AND payment_type='tier_subscription' AND tier_id=? AND status IN ('pending','review') LIMIT 1");$pending->execute([$_SESSION['user_id'],$tierId]);$existing=$pending->fetchColumn();
        if($existing)api_json(['success'=>false,'message'=>'Masih ada pembayaran tier ini yang menunggu validasi.'],409);
        $id='pay_'.bin2hex(random_bytes(10));$save=$pdo->prepare("INSERT INTO order_payment_records (id,order_id,buyer_id,payment_type,tier_id,amount,method,status) VALUES (?,NULL,?,'tier_subscription',?,?,'manual','pending')");$save->execute([$id,$_SESSION['user_id'],$tierId,$amount]);
        api_json(['success'=>true,'paymentId'=>$id,'amount'=>$amount,'tierId'=>$tierId,'qrisUrl'=>$cfg['static_qris_url'],'qrisLabel'=>$cfg['static_qris_label']??'QRIS BURSA LIMBAH']);
    }

    if ($path==='payments/manual' && $method==='POST') {
        api_require_role(['buyer']);
        $paymentId=(string)($input['paymentId']??'');$reference=trim((string)($input['reference']??''));$storageKey=trim((string)($input['proofStorageKey']??''));
        if(!$paymentId||!str_starts_with($storageKey,'cldpriv:'.$_SESSION['user_id'].':'))api_json(['success'=>false,'message'=>'Bukti transfer privat wajib diunggah terlebih dahulu.'],400);
        $q=$pdo->prepare("UPDATE order_payment_records SET proof_storage_key=?,payment_reference=?,status='review',updated_at=NOW() WHERE id=? AND buyer_id=? AND status='pending'");$q->execute([$storageKey,$reference,$paymentId,$_SESSION['user_id']]);
        if(!$q->rowCount())api_json(['success'=>false,'message'=>'Tagihan tidak ditemukan atau sudah diproses.'],404);
        api_json(['success'=>true,'message'=>'Bukti pembayaran dikirim untuk validasi admin.']);
    }
    if (count($parts)===2&&$parts[0]==='payments'&&$method==='GET') {
        api_require_role(['buyer','admin']);$q=$pdo->prepare('SELECT id,order_id,status,amount,method,payment_reference,created_at,review_note FROM order_payment_records WHERE id=?'.(($_SESSION['role']??'')==='buyer'?' AND buyer_id=?':''));
        $args=($_SESSION['role']==='buyer')?[$parts[1],$_SESSION['user_id']]:[$parts[1]];$q->execute($args);$row=$q->fetch();if(!$row)api_json(['success'=>false,'message'=>'Pembayaran tidak ditemukan.'],404);api_json(['success'=>true,'payment'=>$row]);
    }

    if ($path==='admin/payment-reviews' && $method==='GET') {
        api_require_role(['admin']);$q=$pdo->query("SELECT p.*,COALESCE(o.order_code,CONCAT('Tier: ',p.tier_id)) AS order_code,o.product_id,u.name AS buyer_name,u.email AS buyer_email FROM order_payment_records p LEFT JOIN orders o ON o.id=p.order_id JOIN users u ON u.id=p.buyer_id WHERE p.status='review' ORDER BY p.created_at ASC LIMIT 200");api_json(['success'=>true,'payments'=>$q->fetchAll()]);
    }
    if ($parts[0]==='admin'&&$parts[1]==='payment-reviews'&&count($parts)===3&&$method==='PATCH') {
        api_require_role(['admin']);$decision=(string)($input['decision']??'');if(!in_array($decision,['approve','reject'],true))api_json(['success'=>false,'message'=>'Keputusan validasi tidak dikenal.'],400);
        $q=$pdo->prepare("SELECT * FROM order_payment_records WHERE id=? AND status='review'");$q->execute([$parts[2]]);$payment=$q->fetch();if(!$payment)api_json(['success'=>false,'message'=>'Bukti pembayaran sudah diproses atau tidak ditemukan.'],404);
        $status=$decision==='approve'?'paid':'rejected';$update=$pdo->prepare('UPDATE order_payment_records SET status=?,reviewed_by=?,review_note=?,reviewed_at=NOW(),paid_at=IF(?=\'paid\',NOW(),paid_at) WHERE id=?');$update->execute([$status,$_SESSION['user_id'],substr((string)($input['note']??''),0,500),$status,$parts[2]]);
        if($decision==='approve'&&$payment['payment_type']==='tier_subscription'){$tier=(string)$payment['tier_id'];if(!in_array($tier,['tier_basic','tier_pro','tier_enterprise'],true))api_json(['success'=>false,'message'=>'Paket pada pembayaran tidak valid.'],400);$u=$pdo->prepare("UPDATE users SET subscription_tier=?,subscription_active=1,subscription_expiry=DATE_ADD(GREATEST(COALESCE(subscription_expiry,CURDATE()),CURDATE()),INTERVAL 1 MONTH),updated_at=NOW() WHERE id=?");$u->execute([$tier,$payment['buyer_id']]);}
        elseif($decision==='approve'){$o=$pdo->prepare("UPDATE orders SET status='dp_secured',escrow_status='dp_secured',updated_at=NOW() WHERE id=?");$o->execute([$payment['order_id']]);}
        api_json(['success'=>true,'status'=>$status,'paymentType'=>$payment['payment_type']]);
    }

    if ($path==='payment/webhook' && $method==='POST') {
        $body=$input;$cfg=payment_config_row($pdo);$serverKey=payment_secret_decrypt($cfg,'server_key');
        $expected=hash('sha512',(string)($body['order_id']??'').(string)($body['status_code']??'').(string)($body['gross_amount']??'').$serverKey);
        if(!$serverKey||!hash_equals($expected,(string)($body['signature_key']??'')))api_json(['success'=>false,'message'=>'Signature not valid.'],403);
        $q=$pdo->prepare('SELECT * FROM order_payment_records WHERE gateway_order_id=?');$q->execute([(string)$body['order_id']]);$payment=$q->fetch();if(!$payment)api_json(['success'=>false,'message'=>'Pembayaran tidak ditemukan.'],404);
        if(abs((float)$body['gross_amount']-(float)$payment['amount'])>0.01)api_json(['success'=>false,'message'=>'Jumlah pembayaran tidak cocok.'],400);
        $trx=(string)($body['transaction_status']??'');$fraud=(string)($body['fraud_status']??'');
        $status=in_array($trx,['settlement','capture'],true)&&($fraud===''||$fraud==='accept')?'paid':(in_array($trx,['expire','cancel','deny'],true)?'failed':'pending');
        $upd=$pdo->prepare('UPDATE order_payment_records SET status=?,provider_transaction_id=?,provider_transaction_status=?,paid_at=IF(?=\'paid\',NOW(),paid_at),metadata=?,updated_at=NOW() WHERE id=?');
        $upd->execute([$status,(string)($body['transaction_id']??''),$trx,json_encode($body,JSON_UNESCAPED_UNICODE),$payment['id']]);
        if($status==='paid'){$o=$pdo->prepare("UPDATE orders SET status='paid',escrow_status='dp_secured',updated_at=NOW() WHERE id=?");$o->execute([$payment['order_id']]);}
        api_json(['success'=>true]);
    }

    if ($path === 'health' && $method === 'GET') {
        $pdo->query('SELECT 1');
        api_json(['success' => true, 'status' => 'ok', 'service' => 'infinityfree-php-mysql']);
    }

    if ($parts[0] === 'products') {
        if ($method === 'GET' && count($parts) === 1) {
            $stmt = $pdo->query("SELECT p.*, c.main_category AS category_name, u.name AS seller_name, u.company AS seller_type, u.phone AS seller_phone FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN users u ON u.id=p.seller_id ORDER BY p.created_at DESC LIMIT 200");
            $rows = $stmt->fetchAll();
            $products = array_map(function($p) use ($pdo) {
                $status = strtolower((string)$p['status']);
                $img=$pdo->prepare('SELECT image_url,caption,is_evidence FROM product_images WHERE product_id=? ORDER BY sort_order,created_at');$img->execute([$p['id']]);
                $evidences=array_map(function($r){$caption=$r['caption']??'Foto eviden';return ['url'=>$r['image_url'],'thumbnailUrl'=>$r['image_url'],'type'=>$caption,'notes'=>$caption,'filename'=>$caption,'provider'=>'cloudinary'];},$img->fetchAll());
                return [
                    'id'=>$p['id'],'code'=>$p['code'],'title'=>$p['title'],'categoryId'=>!empty($p['is_b3'])?'cat_limbah_b3':api_category_group_id($p['category_name']??''),
                    'categoryName'=>$p['category_name'] ?? 'Lainnya','sellerId'=>$p['seller_id'],'sellerName'=>$p['seller_name'] ?? '',
                    'sellerType'=>$p['seller_type'] ?? '','sellerWhatsapp'=>preg_replace('/\D+/', '', $p['seller_phone'] ?? ''),
                    'sourceType'=>$p['source_type'] ?? '','origin'=>$p['origin_source'] ?? '',
                    'volume'=>(float)$p['volume'],'weight'=>(float)$p['weight'],'unit'=>$p['unit'],
                    'offerPrice'=>(float)$p['asking_price'],'totalPrice'=>(float)$p['asking_price'] * max(1,(float)$p['weight']),
                    'minimumOrder'=>(float)$p['minimum_order'],'containerType'=>$p['container_type'],'containerQty'=>(int)($p['container_qty'] ?? 1),'condition'=>$p['condition']==='sudah_dipilah'?'Sudah Dipilah':$p['condition'],
                    'grade'=>$p['grade'],'description'=>$p['description'],'address'=>$p['location'],'location'=>$p['location'],
                    'city'=>$p['city'],'latitude'=>$p['latitude'],'longitude'=>$p['longitude'],'isB3'=>(bool)$p['is_b3'],
                    'nib'=>$p['nib'] ?? null,'tpsPermit'=>$p['tps_permit'] ?? null,'b3PermitNumber'=>$p['b3_permit_number'] ?? null,
                    'evidences'=>$evidences,'status'=>$status,'listingStatus'=>$status === 'approved' || $status === 'tersedia' ? 'Tersedia' : $status,
                    'createdAt'=>$p['created_at']
                ];
            }, $rows);
            api_json(['success'=>true,'products'=>$products]);
        }
        if ($method === 'POST' && count($parts) === 1) {
            api_require_role(['seller','admin']);
            $id=(string)($input['id'] ?? ('prd_'.bin2hex(random_bytes(8))));
            $sellerId=(string)($input['sellerId'] ?? $_SESSION['user_id']);
            if (($_SESSION['role'] ?? '') !== 'admin' && $sellerId !== $_SESSION['user_id']) api_json(['success'=>false,'message'=>'Tidak boleh membuat pasokan atas nama akun lain.'],403);
            $city=(string)($input['city'] ?? 'Indonesia');
            $condition=str_replace(' ','_',strtolower(trim((string)($input['condition']??''))));
            if(!in_array($condition,['bersih','campur','terpress','cacah','baled','sudah_dipilah'],true))$condition='bersih';
            $cat=$pdo->prepare('SELECT id FROM categories WHERE id=?');$cat->execute([$input['categoryId']??'']);$catId=$cat->fetchColumn();
            if(!$catId){$main=api_category_name_for_group($input['categoryId']??'',(string)($input['categoryName']??''));$cat=$pdo->prepare('SELECT id FROM categories WHERE main_category=? OR sub_category LIKE ? ORDER BY is_b3 ASC LIMIT 1');$cat->execute([$main,'%'.$main.'%']);$catId=$cat->fetchColumn();}
            if(!$catId)$catId=$pdo->query('SELECT id FROM categories ORDER BY id LIMIT 1')->fetchColumn();
            if(!$catId)api_json(['success'=>false,'message'=>'Kategori database belum diimpor.'],503);
            $pdo->beginTransaction();
            $q=$pdo->prepare("INSERT INTO products (id,code,seller_id,category_id,title,description,`condition`,grade,container_type,container_qty,weight,volume,unit,origin_source,source_type,nib,tps_permit,location,city,latitude,longitude,asking_price,minimum_order,pickup_schedule,status,is_b3,b3_permit_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $q->execute([$id,$input['code']??$id,$sellerId,$catId,$input['title']??'Pasokan baru',$input['description']??'',$condition,$input['grade']??'Grade A',$input['containerType']??'Jerigen / Drum / Bal',max(1,(int)($input['containerQty']??1)),(float)($input['weight']??$input['volume']??0),(float)($input['volume']??$input['weight']??0),$input['unit']??'Kg',$input['origin']??'',$input['sourceType']??null,$input['nib']??null,$input['tpsPermit']??null,$input['address']??$input['location']??$city,$city,$input['lat']??$input['latitude']??null,$input['lng']??$input['longitude']??null,(float)($input['offerPrice']??$input['price']??0),(float)($input['minimumOrder']??1),$input['pickupSchedule']??'Siap Angkut Segera','pending',!empty($input['isB3'])?1:0,$input['b3PermitNumber']??null]);
            foreach(($input['evidences']??[]) as $idx=>$evidence){$url=is_array($evidence)?($evidence['url']??''):(string)$evidence;if(!$url)continue;$caption=is_array($evidence)?($evidence['type']??$evidence['filename']??'Foto eviden'):'Foto eviden';$img=$pdo->prepare('INSERT INTO product_images (id,product_id,image_url,caption,is_evidence,sort_order) VALUES (?,?,?,?,1,?)');$img->execute(['img_'.bin2hex(random_bytes(8)),$id,$url,$caption,$idx]);}
            $pdo->commit();
            api_json(['success'=>true,'id'=>$id],201);
        }
        if ($method === 'PATCH' && count($parts) === 3 && $parts[2] === 'status') {
            api_require_role(['admin']);
            $status=(string)($input['status']??'pending');
            if (!in_array($status,['tersedia','terjual','kontrak','draft','pending','approved','booked'],true)) api_json(['success'=>false,'message'=>'Status produk tidak valid.'],400);
            $q=$pdo->prepare('UPDATE products SET status=?,updated_at=NOW() WHERE id=?'); $q->execute([$status,$parts[1]]);
            api_json(['success'=>true]);
        }
    }

    if ($parts[0] === 'orders') {
        if ($method === 'GET' && count($parts) === 1) {
            api_require_role(['buyer','seller','admin']);
            $sql="SELECT o.*,p.title AS product_title,b.name AS buyer_name,s.name AS seller_name,f.shipping_method AS fulfillment_method,f.courier_name,f.shipping_fee,f.shipping_status,f.tracking_number,f.delivery_details,f.dispatched_at,f.received_at,f.actual_received_weight,(SELECT pr.status FROM order_payment_records pr WHERE pr.order_id=o.id ORDER BY pr.created_at DESC LIMIT 1) AS latest_payment_status FROM orders o LEFT JOIN products p ON p.id=o.product_id LEFT JOIN users b ON b.id=o.buyer_id LEFT JOIN users s ON s.id=o.seller_id LEFT JOIN order_fulfillments f ON f.order_id=o.id";
            $params=[];
            if (($_SESSION['role']??'')==='buyer') { $sql.=' WHERE o.buyer_id=?'; $params[]=$_SESSION['user_id']; }
            if (($_SESSION['role']??'')==='seller') { $sql.=' WHERE o.seller_id=?'; $params[]=$_SESSION['user_id']; }
            $sql.=' ORDER BY o.created_at DESC LIMIT 300'; $q=$pdo->prepare($sql);$q->execute($params);
            $rows=array_map(function($o){return ['id'=>$o['id'],'order_code'=>$o['order_code'],'product_id'=>$o['product_id'],'product_title'=>$o['product_title'],'buyer_id'=>$o['buyer_id'],'buyer_name'=>$o['buyer_name'],'seller_id'=>$o['seller_id'],'seller_name'=>$o['seller_name'],'total_amount'=>$o['total_amount'],'dp_percentage'=>$o['dp_percentage'],'dp_amount'=>$o['dp_amount'],'remaining_amount'=>$o['remaining_amount'],'handling_fee'=>$o['handling_fee'],'service_fee'=>$o['service_fee'],'escrow_status'=>$o['escrow_status'],'status'=>$o['status'],'latest_payment_status'=>$o['latest_payment_status'],'pickup_date'=>$o['pickup_date'],'notes'=>$o['notes'],'created_at'=>$o['created_at'],'remaining_payment_status'=>$o['remaining_payment_status'],'remaining_payment_proof'=>json_decode($o['remaining_payment_proof']??'{}',true)?:null,'shipping_method'=>$o['fulfillment_method'],'shipping_fee'=>$o['shipping_fee'],'shipping_status'=>$o['shipping_status'],'tracking_number'=>$o['tracking_number'],'delivery_details'=>json_decode($o['delivery_details']??'{}',true)?:null,'dispatched_at'=>$o['dispatched_at'],'received_at'=>$o['received_at'],'actual_received_weight'=>$o['actual_received_weight']];},$q->fetchAll());
            api_json(['success'=>true,'orders'=>$rows]);
        }
        if ($method === 'POST' && count($parts) === 1) {
            api_require_role(['buyer','admin']);
            $buyerId=(string)($input['buyerId']??$_SESSION['user_id']);
            if (($_SESSION['role']??'')==='buyer' && $buyerId!==$_SESSION['user_id']) api_json(['success'=>false,'message'=>'Akun pembeli tidak cocok.'],403);
            if (($_SESSION['role']??'')==='buyer') {
                $buyerCheck=$pdo->prepare('SELECT subscription_active FROM users WHERE id=? AND role=\'buyer\'');$buyerCheck->execute([$buyerId]);
                if (!(int)$buyerCheck->fetchColumn()) api_json(['success'=>false,'message'=>'Paket langganan pembeli belum aktif.'],403);
            }
            $id=(string)($input['id']??('ord_'.bin2hex(random_bytes(8)))); $total=(float)($input['totalPrice']??0);
            $dpSettings=$pdo->query("SELECT setting_key,setting_value FROM system_settings WHERE setting_key IN ('dp_enabled','dp_percentage')")->fetchAll(PDO::FETCH_KEY_PAIR);
            $dpEnabled=($dpSettings['dp_enabled']??'false')==='true';$dpPercent=max(0,min(100,(float)($dpSettings['dp_percentage']??30)));
            if($dpEnabled&&$dpPercent<=0){api_json(['success'=>false,'message'=>'Persentase DP harus lebih dari 0%. Hubungi admin.'],503);}
            $dpRate=$dpEnabled?$dpPercent:100;
            $dp=round($total*$dpRate/100,2);$remaining=max(0,$total-$dp);
            if($total<=0||$dp<0||$remaining<0)api_json(['success'=>false,'message'=>'Nilai pesanan tidak valid.'],400);
            $pdo->beginTransaction();
            $productCheck=$pdo->prepare('SELECT seller_id,status FROM products WHERE id=? FOR UPDATE');$productCheck->execute([$input['productId']??'']);$product=$productCheck->fetch();
            if(!$product||$product['seller_id']!==($input['sellerId']??'')||!in_array($product['status'],['approved','tersedia'],true)){$pdo->rollBack();api_json(['success'=>false,'message'=>'Produk tidak tersedia atau data penjual tidak cocok.'],409);}
            try {
                $q=$pdo->prepare("INSERT INTO orders (id,order_code,product_id,seller_id,buyer_id,quantity,unit,unit_price,total_amount,dp_percentage,dp_amount,remaining_amount,handling_fee,service_fee,escrow_status,status,pickup_date,shipping_method,notes,remaining_payment_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
                $q->execute([$id,$input['bookingCode']??$id,$input['productId']??'', $input['sellerId']??'', $buyerId,(float)($input['quantity']??1),$input['unit']??'Kg',(float)($input['unitPrice']??0),$total,$dpRate,$dp,$remaining,(float)($input['handlingFee']??10000),(float)($input['appFee']??0),'dp_pending','dp_pending',$input['pickupDate']??null,$input['shippingMethod']??null,$input['notes']??null,'unpaid']);
                $lock=$pdo->prepare("UPDATE products SET status='booked',updated_at=NOW() WHERE id=? AND status IN ('approved','tersedia')");$lock->execute([$input['productId']??'']);
                if($lock->rowCount()!==1)throw new RuntimeException('Pasokan baru saja dipesan pengguna lain.');
                $fulfillment=$pdo->prepare('INSERT INTO order_fulfillments (order_id,shipping_method,courier_code,courier_name,shipping_fee,shipping_status) VALUES (?,?,?,?,?,\'pending_dispatch\')');
                $fulfillment->execute([$id,$input['shippingMethod']??'Armada Mandiri Pembeli',$input['courierCode']??null,$input['courierName']??null,(float)($input['shippingFee']??0)]);
                $pdo->commit();
            } catch (Throwable $e) {
                if($pdo->inTransaction())$pdo->rollBack();
                throw $e;
            }
            api_json(['success'=>true,'id'=>$id],201);
        }
        if ($method==='POST' && count($parts)===3 && $parts[2]==='dispatch') {
            api_require_role(['seller']);
            $type=($input['dispatchType']??'')==='third_party'?'third_party':'direct';
            $courier=trim((string)($input['courierName']??''));$tracking=trim((string)($input['trackingNumber']??''));
            if($type==='third_party'&&(!$courier||!$tracking))api_json(['success'=>false,'message'=>'Nama ekspedisi dan nomor resi wajib diisi.'],400);
            $pdo->beginTransaction();
            $q=$pdo->prepare('SELECT o.id,o.status,o.seller_id,f.shipping_status FROM orders o JOIN order_fulfillments f ON f.order_id=o.id WHERE o.id=? FOR UPDATE');$q->execute([$parts[1]]);$order=$q->fetch();
            if(!$order||$order['seller_id']!==$_SESSION['user_id']){$pdo->rollBack();api_json(['success'=>false,'message'=>'Pesanan tidak ditemukan atau akses ditolak.'],404);}
            if(!in_array($order['status'],['paid','Lunas 100%','DP Terbayar'],true)){$pdo->rollBack();api_json(['success'=>false,'message'=>'Pembayaran awal harus terverifikasi sebelum pesanan dikirim.'],409);}
            if($order['shipping_status']!=='pending_dispatch'){$pdo->rollBack();api_json(['success'=>false,'message'=>'Pengiriman pesanan ini sudah dicatat.'],409);}
            $shippingStatus=$type==='third_party'?'shipped_third_party':'handed_over';
            $details=['dispatchType'=>$type,'courierName'=>$type==='third_party'?$courier:'Serah Terima Langsung di Depo','trackingNumber'=>$tracking,'notes'=>substr((string)($input['notes']??''),0,1000),'proofImage'=>$input['proofImage']??null,'handoverRecipient'=>substr((string)($input['handoverRecipient']??''),0,160)];
            $upd=$pdo->prepare('UPDATE order_fulfillments SET shipping_status=?,courier_name=?,tracking_number=?,delivery_details=?,dispatched_at=NOW(),updated_at=NOW() WHERE order_id=?');$upd->execute([$shippingStatus,$details['courierName'],$tracking?:null,json_encode($details,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$parts[1]]);
            $pdo->commit();api_json(['success'=>true,'shippingStatus'=>$shippingStatus,'deliveryDetails'=>$details]);
        }
        if ($method==='POST' && count($parts)===3 && $parts[2]==='receive') {
            api_require_role(['buyer']);
            $pdo->beginTransaction();
            $q=$pdo->prepare('SELECT o.*,f.shipping_status,f.delivery_details FROM orders o JOIN order_fulfillments f ON f.order_id=o.id WHERE o.id=? AND o.buyer_id=? FOR UPDATE');$q->execute([$parts[1],$_SESSION['user_id']]);$order=$q->fetch();
            if(!$order){$pdo->rollBack();api_json(['success'=>false,'message'=>'Pesanan tidak ditemukan untuk akun ini.'],404);}
            if(!in_array($order['shipping_status'],['shipped_third_party','handed_over'],true)){$pdo->rollBack();api_json(['success'=>false,'message'=>'Penjual belum mencatat pengiriman atau serah terima.'],409);}
            if(!in_array($order['status'],['paid','Lunas 100%','DP Terbayar'],true)){$pdo->rollBack();api_json(['success'=>false,'message'=>'Pembayaran awal belum terverifikasi.'],409);}
            if((float)$order['remaining_amount']>0&&!in_array($order['remaining_payment_status'],['paid','completed','verified_by_seller','verified_by_admin'],true)){$pdo->rollBack();api_json(['success'=>false,'message'=>'Pelunasan sisa pembayaran harus diverifikasi terlebih dahulu.'],409);}
            $actual=max(0,(float)($input['actualWeight']??0));$details=json_decode($order['delivery_details']??'{}',true)?:[];$qr=trim((string)($input['handoverQrCode']??''));
            if($qr!==''&&$qr!==('QR-HANDOVER-'.$order['id'])&&$qr!==(string)($details['handoverQr']??'')){$pdo->rollBack();api_json(['success'=>false,'message'=>'Kode QR serah terima tidak valid.'],400);}
            $details['actualReceivedWeight']=$actual>0?$actual:(float)$order['quantity'];$details['buyerNotes']=substr((string)($input['notes']??''),0,1000);$details['weighingProof']=$input['proofImage']??null;
            $upd=$pdo->prepare("UPDATE order_fulfillments SET shipping_status='delivered',delivery_details=?,actual_received_weight=?,received_at=NOW(),updated_at=NOW() WHERE order_id=?");$upd->execute([json_encode($details,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$details['actualReceivedWeight'],$parts[1]]);
            $ord=$pdo->prepare("UPDATE orders SET escrow_status='completed',updated_at=NOW() WHERE id=?");$ord->execute([$parts[1]]);
            $pdo->commit();api_json(['success'=>true,'shippingStatus'=>'delivered','escrowStatus'=>'completed','deliveryDetails'=>$details]);
        }
        if ($method === 'PATCH' && count($parts) === 3 && $parts[2] === 'status') {
            api_require_role(['seller','admin']);
            $status=(string)($input['status']??'');
            if(($_SESSION['role']??'')==='admin'){$q=$pdo->prepare('UPDATE orders SET escrow_status=?,status=?,updated_at=NOW() WHERE id=?');$q->execute([$status,$status,$parts[1]]);}
            else{$q=$pdo->prepare('UPDATE orders SET escrow_status=?,status=?,updated_at=NOW() WHERE id=? AND seller_id=?');$q->execute([$status,$status,$parts[1],$_SESSION['user_id']]);}
            api_json(['success'=>true]);
        }
        if ($method==='POST' && count($parts)===3 && $parts[2]==='remaining-proof') {
            api_require_role(['buyer']);
            $q=$pdo->prepare("UPDATE orders SET remaining_payment_proof=?,remaining_payment_status='proof_submitted',remaining_payment_submitted_at=NOW(),updated_at=NOW() WHERE id=? AND buyer_id=?");
            $q->execute([json_encode($input,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$parts[1],$_SESSION['user_id']]);
            if(!$q->rowCount())api_json(['success'=>false,'message'=>'Pesanan tidak ditemukan untuk akun ini.'],404);
            api_json(['success'=>true]);
        }
        if ($method==='POST' && count($parts)===3 && $parts[2]==='verify-remaining') {
            api_require_role(['seller','admin']);
            $verifiedBy=($_SESSION['role']==='admin')?'admin':'seller';
            $q=$pdo->prepare('SELECT remaining_payment_proof,seller_id FROM orders WHERE id=?');$q->execute([$parts[1]]);$order=$q->fetch();
            if(!$order||($verifiedBy==='seller'&&$order['seller_id']!==$_SESSION['user_id']))api_json(['success'=>false,'message'=>'Pesanan tidak ditemukan atau akses ditolak.'],404);
            $proof=json_decode($order['remaining_payment_proof']??'{}',true)?:[];
            if($verifiedBy==='admin'){$proof['verifiedByAdmin']=true;$proof['verifiedByAdminName']=$input['verifierName']??'Admin';$column='remaining_payment_verified_by';$status='verified_by_admin';}
            else{$proof['verifiedBySeller']=true;$proof['verifiedBySellerName']=$input['verifierName']??'Penjual';$column='remaining_payment_verified_by';$status='verified_by_seller';}
            $upd=$pdo->prepare("UPDATE orders SET remaining_payment_proof=?,remaining_payment_status=?,remaining_payment_verified_at=NOW(),remaining_payment_verified_by=?,updated_at=NOW() WHERE id=?");$upd->execute([json_encode($proof,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$status,$input['verifierName']??$verifiedBy,$parts[1]]);api_json(['success'=>true]);
        }
    }

    if ($parts[0] === 'offers') {
        if ($method === 'GET' && count($parts)===1) {
            api_require_role(['buyer','seller','admin']);
            $sql='SELECT o.*,p.title AS product_title,p.code AS product_code,p.seller_id,s.name AS seller_name,u.name AS buyer_name FROM offers o JOIN products p ON p.id=o.product_id JOIN users u ON u.id=o.buyer_id JOIN users s ON s.id=p.seller_id';$params=[];
            if(($_SESSION['role']??'')==='buyer'){$sql.=' WHERE o.buyer_id=?';$params[]=$_SESSION['user_id'];}
            elseif(($_SESSION['role']??'')==='seller'){$sql.=' WHERE p.seller_id=?';$params[]=$_SESSION['user_id'];}
            $sql.=' ORDER BY o.created_at DESC LIMIT 300';$q=$pdo->prepare($sql);$q->execute($params);api_json(['success'=>true,'offers'=>$q->fetchAll()]);
        }
        if ($method==='POST' && count($parts)===1) { api_require_role(['buyer']);$product=$pdo->prepare("SELECT id FROM products WHERE id=? AND status='approved'");$product->execute([$input['productId']??'']);if(!$product->fetchColumn())api_json(['success'=>false,'message'=>'Produk tidak tersedia untuk penawaran.'],409);$id=(string)($input['id']??('off_'.bin2hex(random_bytes(8)))); $q=$pdo->prepare('INSERT INTO offers (id,product_id,buyer_id,offer_price,quantity,unit,note,status) VALUES (?,?,?,?,?,?,?,?)'); $q->execute([$id,$input['productId']??'',$_SESSION['user_id'],(float)($input['offerPrice']??0),(float)($input['quantity']??1),$input['unit']??'Kg',$input['note']??null,'pending']); api_json(['success'=>true,'id'=>$id],201); }
        if ($method==='PATCH' && count($parts)===3 && $parts[2]==='status') { api_require_role(['seller','admin']);$status=in_array($input['status']??'', ['accepted','rejected'],true)?$input['status']:'rejected';if(($_SESSION['role']??'')==='admin'){$q=$pdo->prepare('UPDATE offers SET status=? WHERE id=?');$q->execute([$status,$parts[1]]);}else{$q=$pdo->prepare('UPDATE offers o JOIN products p ON p.id=o.product_id SET o.status=? WHERE o.id=? AND p.seller_id=?');$q->execute([$status,$parts[1],$_SESSION['user_id']]);}api_json(['success'=>true]); }
    }

    if ($parts[0] === 'events') {
        if ($method==='GET' && count($parts)===1) { $q=$pdo->query('SELECT * FROM events ORDER BY event_date DESC LIMIT 200'); api_json(['success'=>true,'events'=>$q->fetchAll()]); }
        if ($method==='POST' && count($parts)===1) { api_require_role(['admin']); $id=(string)($input['id']??('evt_'.bin2hex(random_bytes(8)))); $q=$pdo->prepare('INSERT INTO events (id,title,description,event_type,location,event_date,event_time,quota,price,image,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'); $q->execute([$id,$input['title']??'Agenda',$input['description']??'', $input['category']??'webinar',$input['location']??'Online',$input['date']??date('Y-m-d'),$input['time']??null,(int)($input['quota']??100),(float)($input['price']??0),$input['image']??null,($input['status']??'published')==='published'?'aktif':'draft',$_SESSION['user_id']]); api_json(['success'=>true,'id'=>$id],201); }
        if ($method==='PUT' && count($parts)===2) { api_require_role(['admin']); $allowed=['title','description','event_type','location','event_date','event_time','quota','price','image','status']; $data=[]; foreach($allowed as $k){$source=['category'=>'event_type','date'=>'event_date','time'=>'event_time'][$k]??$k; if(array_key_exists($source,$input))$data[$k]=$input[$source];} if(!$data)api_json(['success'=>false,'message'=>'Tidak ada perubahan.'],400); if(isset($data['status']))$data['status']=$data['status']==='published'?'aktif':$data['status']; $set=implode(',',array_map(fn($k)=>"`$k`=?",array_keys($data))); $q=$pdo->prepare("UPDATE events SET $set WHERE id=?"); $q->execute([...array_values($data),$parts[1]]); api_json(['success'=>true]); }
        if ($method==='DELETE' && count($parts)===2) { api_require_role(['admin']); $q=$pdo->prepare('DELETE FROM events WHERE id=?');$q->execute([$parts[1]]);api_json(['success'=>true]); }
    }

    if ($path==='settings') {
        if ($method==='GET') { $q=$pdo->query('SELECT setting_key,setting_value FROM system_settings'); $settings=[]; foreach($q->fetchAll() as $r){if(($_SESSION['role']??'')!=='admin'&&preg_match('/secret|server.?key|password|token|credential|api.?key/i',$r['setting_key']))continue;$settings[$r['setting_key']]=$r['setting_value'];} api_json(['success'=>true,'settings'=>$settings]); }
        if ($method==='PUT') { api_require_role(['admin']); foreach($input as $key=>$value) { if(!preg_match('/^[a-zA-Z0-9_]{1,100}$/',$key)||preg_match('/secret|server.?key|password|token|credential|api.?key/i',$key))continue; if(is_array($value)||is_object($value))$value=json_encode($value); $q=$pdo->prepare('INSERT INTO system_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)'); $q->execute([$key,(string)$value]); } api_json(['success'=>true,'message'=>'Pengaturan berhasil disimpan.']); }
    }

    if ($parts[0]==='notifications') {
        if($method==='GET'){api_require_role(['buyer','seller','admin']);$q=$pdo->prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100');$q->execute([$_SESSION['user_id']]);api_json(['success'=>true,'notifications'=>$q->fetchAll()]);}
        if($method==='POST'){api_require_role(['buyer','seller','admin']);$recipient=(string)($input['userId']??$_SESSION['user_id']);$q=$pdo->prepare('INSERT INTO notifications (id,user_id,type,title,message,link,is_read) VALUES (?,?,?,?,?,?,0)');$q->execute([$input['id']??bin2hex(random_bytes(12)),$recipient,$input['type']??'info',$input['title']??'Pemberitahuan',$input['message']??'',$input['link']??null]);api_json(['success'=>true],201);}
    }

    if ($parts[0]==='chats') {
        if ($method==='GET') {
            api_require_role(['buyer','seller','admin']);
            $q=$pdo->prepare('SELECT m.id,m.message,m.created_at,m.sender_id,r.product_id,r.buyer_id,r.seller_id,u.name AS sender_name,u.role AS sender_role FROM chat_messages m JOIN chat_rooms r ON r.id=m.room_id JOIN users u ON u.id=m.sender_id WHERE r.buyer_id=? OR r.seller_id=? ORDER BY m.created_at ASC LIMIT 500');
            $q->execute([$_SESSION['user_id'],$_SESSION['user_id']]);
            $rows=array_map(function($r){return ['id'=>$r['id'],'productId'=>$r['product_id'],'buyerId'=>$r['buyer_id'],'sellerId'=>$r['seller_id'],'senderName'=>$r['sender_name'],'senderRole'=>$r['sender_role'],'text'=>$r['message'],'timestamp'=>date('H:i',strtotime($r['created_at'])).' WIB','date'=>date('Y-m-d',strtotime($r['created_at']))];},$q->fetchAll());
            api_json(['success'=>true,'count'=>count($rows),'chats'=>$rows]);
        }
        if ($method==='POST') {
            api_require_role(['buyer','seller']);
            $text=trim((string)($input['text']??'')); if($text==='')api_json(['success'=>false,'message'=>'Pesan tidak boleh kosong.'],400);
            $buyerId=($_SESSION['role']==='buyer')?$_SESSION['user_id']:(string)($input['buyerId']??'');
            $sellerId=($_SESSION['role']==='seller')?$_SESSION['user_id']:(string)($input['sellerId']??'');
            $productId=(string)($input['productId']??'PRD-GENERAL');
            if(!$buyerId||!$sellerId)api_json(['success'=>false,'message'=>'Penerima chat tidak lengkap.'],400);
            $members=$pdo->prepare("SELECT COUNT(*) FROM users WHERE (id=? AND role='buyer') OR (id=? AND role='seller')");$members->execute([$buyerId,$sellerId]);if((int)$members->fetchColumn()!==2)api_json(['success'=>false,'message'=>'Anggota percakapan tidak valid.'],400);
            if($productId!=='PRD-GENERAL'){$owner=$pdo->prepare('SELECT seller_id FROM products WHERE id=?');$owner->execute([$productId]);if($owner->fetchColumn()!==$sellerId)api_json(['success'=>false,'message'=>'Penjual bukan pemilik produk.'],403);}
            $room=$pdo->prepare('SELECT id FROM chat_rooms WHERE buyer_id=? AND seller_id=? AND product_id=?');$room->execute([$buyerId,$sellerId,$productId]);$found=$room->fetch();
            $roomId=$found['id']??('room_'.bin2hex(random_bytes(8)));
            if(!$found){$create=$pdo->prepare('INSERT INTO chat_rooms (id,buyer_id,seller_id,product_id,last_msg,last_msg_at) VALUES (?,?,?,?,?,NOW())');$create->execute([$roomId,$buyerId,$sellerId,$productId,$text]);}
            else{$upd=$pdo->prepare('UPDATE chat_rooms SET last_msg=?,last_msg_at=NOW() WHERE id=?');$upd->execute([$text,$roomId]);}
            $msgId='chat_'.bin2hex(random_bytes(8));$msg=$pdo->prepare('INSERT INTO chat_messages (id,room_id,sender_id,message) VALUES (?,?,?,?)');$msg->execute([$msgId,$roomId,$_SESSION['user_id'],$text]);
            api_json(['success'=>true,'chat'=>['id'=>$msgId,'productId'=>$productId,'buyerId'=>$buyerId,'sellerId'=>$sellerId,'senderRole'=>$_SESSION['role'],'senderName'=>$input['senderName']??'Pengguna','text'=>$text,'timestamp'=>date('H:i').' WIB','date'=>date('Y-m-d')]],201);
        }
    }

    if (count($parts)===3 && $parts[0]==='users' && $parts[2]==='profile' && $method==='PUT') {
        api_require_role(['buyer','seller','admin']);
        $target=$parts[1]; if($target!==$_SESSION['user_id'] && $_SESSION['role']!=='admin')api_json(['success'=>false,'message'=>'Tidak boleh mengubah profil akun lain.'],403);
        $allowed=['name'=>'name','company'=>'company','phone'=>'phone','location'=>'location','bankAccount'=>'bank_account','avatar'=>'avatar','paymentMethods'=>'payment_methods'];$sets=[];$values=[];
        foreach($allowed as $key=>$column){if(array_key_exists($key,$input)){$sets[]="`$column`=?";$value=$input[$key];$values[]=($key==='paymentMethods'&&is_array($value))?json_encode($value):$value;}}
        if(!$sets)api_json(['success'=>false,'message'=>'Tidak ada data profil untuk disimpan.'],400);
        $values[]=$target;$q=$pdo->prepare('UPDATE users SET '.implode(',',$sets).' WHERE id=?');$q->execute($values);api_json(['success'=>true]);
    }

    api_json(['success'=>false,'message'=>'Endpoint PHP belum tersedia untuk rute ini: '.$path],404);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('[PHP API] '.$path.' '.$e->getMessage());
    api_json(['success'=>false,'message'=>'Permintaan API gagal diproses. Periksa skema database dan konfigurasi hosting.'],500);
}
