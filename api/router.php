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
if ($path === 'uploads/weighing-proof' && $method === 'POST') { api_require_role(['buyer','seller','admin']); cloudinary_private_upload($_FILES['file'] ?? null, 'private_payment'); }
if ($path === 'uploads/product-evidence' && $method === 'POST') {
    api_require_role(['seller','admin']);
    $batch=$_FILES['files']??null; if(!$batch||!is_array($batch['name']??null))api_json(['success'=>false,'message'=>'Pilih setidaknya satu foto.'],400);
    if(count($batch['name'])>3)api_json(['success'=>false,'message'=>'Maksimal tiga foto per unggahan.'],400);
    $files=[]; foreach($batch['name'] as $i=>$name){$one=['name'=>$name,'type'=>$batch['type'][$i]??'','tmp_name'=>$batch['tmp_name'][$i]??'','error'=>$batch['error'][$i]??UPLOAD_ERR_NO_FILE,'size'=>$batch['size'][$i]??0];$files[]=cloudinary_public_upload($one);}
    api_json(['success'=>true,'files'=>$files],201);
}
if ($path === 'storage/private-url' && $method === 'GET') { cloudinary_private_url($_GET['key'] ?? ''); }

try {
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
                $evidences=array_map(function($r){return ['url'=>$r['image_url'],'thumbnailUrl'=>$r['image_url'],'filename'=>$r['caption']??'','provider'=>'cloudinary'];},$img->fetchAll());
                return [
                    'id'=>$p['id'],'code'=>$p['code'],'title'=>$p['title'],'categoryId'=>!empty($p['is_b3'])?'cat_limbah_b3':api_category_group_id($p['category_name']??''),
                    'categoryName'=>$p['category_name'] ?? 'Lainnya','sellerId'=>$p['seller_id'],'sellerName'=>$p['seller_name'] ?? '',
                    'sellerType'=>$p['seller_type'] ?? '','sellerWhatsapp'=>preg_replace('/\D+/', '', $p['seller_phone'] ?? ''),
                    'sourceType'=>$p['origin_source'] ?? '','origin'=>$p['origin_source'] ?? '',
                    'volume'=>(float)$p['volume'],'weight'=>(float)$p['weight'],'unit'=>$p['unit'],
                    'offerPrice'=>(float)$p['asking_price'],'totalPrice'=>(float)$p['asking_price'] * max(1,(float)$p['weight']),
                    'minimumOrder'=>(float)$p['minimum_order'],'containerType'=>$p['container_type'],'condition'=>$p['condition'],
                    'grade'=>$p['grade'],'description'=>$p['description'],'address'=>$p['location'],'location'=>$p['location'],
                    'city'=>$p['city'],'latitude'=>$p['latitude'],'longitude'=>$p['longitude'],'isB3'=>(bool)$p['is_b3'],
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
            $cat=$pdo->prepare('SELECT id FROM categories WHERE id=?');$cat->execute([$input['categoryId']??'']);$catId=$cat->fetchColumn();
            if(!$catId){$main=api_category_name_for_group($input['categoryId']??'',(string)($input['categoryName']??''));$cat=$pdo->prepare('SELECT id FROM categories WHERE main_category=? OR sub_category LIKE ? ORDER BY is_b3 ASC LIMIT 1');$cat->execute([$main,'%'.$main.'%']);$catId=$cat->fetchColumn();}
            if(!$catId)$catId=$pdo->query('SELECT id FROM categories ORDER BY id LIMIT 1')->fetchColumn();
            if(!$catId)api_json(['success'=>false,'message'=>'Kategori database belum diimpor.'],503);
            $q=$pdo->prepare("INSERT INTO products (id,code,seller_id,category_id,title,description,`condition`,grade,container_type,weight,volume,unit,origin_source,location,city,latitude,longitude,asking_price,minimum_order,pickup_schedule,status,is_b3,b3_permit_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $q->execute([$id,$input['code']??$id,$sellerId,$catId,$input['title']??'Pasokan baru',$input['description']??'',in_array(strtolower($input['condition']??''), ['bersih','campur','terpress','cacah','baled'],true)?strtolower($input['condition']):'bersih',$input['grade']??'Grade A',$input['containerType']??'Jerigen / Drum / Bal',(float)($input['weight']??$input['volume']??0),(float)($input['volume']??$input['weight']??0),$input['unit']??'Kg',$input['origin']??$input['sourceType']??'', $input['address']??$input['location']??$city,$city,$input['lat']??$input['latitude']??null,$input['lng']??$input['longitude']??null,(float)($input['offerPrice']??$input['price']??0),(float)($input['minimumOrder']??1),$input['pickupSchedule']??'Siap Angkut Segera','pending',!empty($input['isB3'])?1:0,$input['b3PermitNumber']??null]);
            foreach(($input['evidences']??[]) as $idx=>$evidence){$url=is_array($evidence)?($evidence['url']??''):(string)$evidence;if(!$url)continue;$img=$pdo->prepare('INSERT INTO product_images (id,product_id,image_url,caption,is_evidence,sort_order) VALUES (?,?,?,?,1,?)');$img->execute(['img_'.bin2hex(random_bytes(8)),$id,$url,is_array($evidence)?($evidence['filename']??null):null,$idx]);}
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
            $sql="SELECT o.*,p.title AS product_title,b.name AS buyer_name,s.name AS seller_name FROM orders o LEFT JOIN products p ON p.id=o.product_id LEFT JOIN users b ON b.id=o.buyer_id LEFT JOIN users s ON s.id=o.seller_id";
            $params=[];
            if (($_SESSION['role']??'')==='buyer') { $sql.=' WHERE o.buyer_id=?'; $params[]=$_SESSION['user_id']; }
            if (($_SESSION['role']??'')==='seller') { $sql.=' WHERE o.seller_id=?'; $params[]=$_SESSION['user_id']; }
            $sql.=' ORDER BY o.created_at DESC LIMIT 300'; $q=$pdo->prepare($sql);$q->execute($params);
            $rows=array_map(function($o){return ['id'=>$o['id'],'order_code'=>$o['order_code'],'product_id'=>$o['product_id'],'product_title'=>$o['product_title'],'buyer_id'=>$o['buyer_id'],'buyer_name'=>$o['buyer_name'],'seller_id'=>$o['seller_id'],'seller_name'=>$o['seller_name'],'total_amount'=>$o['total_amount'],'dp_percentage'=>$o['dp_percentage'],'dp_amount'=>$o['dp_amount'],'remaining_amount'=>$o['remaining_amount'],'handling_fee'=>$o['handling_fee'],'escrow_status'=>$o['escrow_status'],'status'=>$o['status'],'pickup_date'=>$o['pickup_date'],'notes'=>$o['notes'],'created_at'=>$o['created_at'],'remaining_payment_status'=>$o['remaining_payment_status'],'remaining_payment_proof'=>json_decode($o['remaining_payment_proof']??'{}',true)?:null];},$q->fetchAll());
            api_json(['success'=>true,'orders'=>$rows]);
        }
        if ($method === 'POST' && count($parts) === 1) {
            api_require_role(['buyer','admin']);
            $buyerId=(string)($input['buyerId']??$_SESSION['user_id']);
            if (($_SESSION['role']??'')==='buyer' && $buyerId!==$_SESSION['user_id']) api_json(['success'=>false,'message'=>'Akun pembeli tidak cocok.'],403);
            $productCheck=$pdo->prepare('SELECT seller_id,status FROM products WHERE id=?');$productCheck->execute([$input['productId']??'']);$product=$productCheck->fetch();
            if(!$product||$product['seller_id']!==($input['sellerId']??'')||!in_array($product['status'],['approved','tersedia'],true))api_json(['success'=>false,'message'=>'Produk tidak tersedia atau data penjual tidak cocok.'],409);
            $id=(string)($input['id']??('ord_'.bin2hex(random_bytes(8)))); $total=(float)($input['totalPrice']??0); $dp=(float)($input['downPaymentAmount']??$total); $remaining=(float)($input['remainingPayment']??max(0,$total-$dp));
            if($total<=0||$dp<0||$remaining<0)api_json(['success'=>false,'message'=>'Nilai pesanan tidak valid.'],400);
            $q=$pdo->prepare("INSERT INTO orders (id,order_code,product_id,seller_id,buyer_id,quantity,unit,unit_price,total_amount,dp_percentage,dp_amount,remaining_amount,handling_fee,service_fee,escrow_status,status,pickup_date,shipping_method,notes,remaining_payment_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $q->execute([$id,$input['bookingCode']??$id,$input['productId']??'', $input['sellerId']??'', $buyerId,(float)($input['quantity']??1),$input['unit']??'Kg',(float)($input['unitPrice']??0),$total,(float)($input['downPaymentRate']??30),$dp,$remaining,(float)($input['handlingFee']??10000),(float)($input['appFee']??0),$input['bookingStatus']??'dp_secured',$input['paymentStatus']??'dp_pending',$input['pickupDate']??null,$input['shippingMethod']??null,$input['notes']??null,$input['remainingPaymentStatus']??'unpaid']);
            api_json(['success'=>true,'id'=>$id],201);
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
    error_log('[PHP API] '.$path.' '.$e->getMessage());
    api_json(['success'=>false,'message'=>'Permintaan API gagal diproses. Periksa skema database dan konfigurasi hosting.'],500);
}
