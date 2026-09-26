-- ====================================================================
-- BURSA LIMBAH — DATA DEMO (seed_demo.sql)
-- Berisi: 1 Admin, 2 Penjual, 2 Pembeli, 5 Produk, 1 Event, Notifikasi
-- Password semua akun demo: [REDACTED]
-- Hash bcrypt untuk "[REDACTED]": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh...
-- ====================================================================

USE `bursalimbahdb`;

-- Password hash untuk "[REDACTED]" (bcrypt rounds=10)
-- Gunakan ini untuk semua akun demo
SET @pass_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu';

-- ====================================================================
-- SEED: USERS (1 Admin, 2 Penjual, 2 Pembeli)
-- ====================================================================
INSERT INTO `users` (
  `id`, `role`, `name`, `company`, `email`, `phone`,
  `password_hash`, `auth_provider`,
  `subscription_tier`, `subscription_active`, `subscription_expiry`,
  `identity_verified`, `verification_status`, `verification_type`,
  `ktp_number`, `npwp_number`, `verified_badge`, `verified_at`,
  `bank_account`, `location`, `balance`
) VALUES

-- Admin
('user_admin_001',
 'admin', 'Admin Bursa Limbah', 'PT Bursa Limbah Indonesia',
 'admin@bursalimbah.id', '+62 811-0000-0001',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu', 'local',
 'tier_enterprise', 1, '2027-12-31',
 1, 'verified', 'npwp',
 '[REDACTED]7890[REDACTED]', '12.345.678.9-000.000', 'Admin Platform', '1 Jan 2026',
 'BCA [REDACTED]7890 a/n PT Bursa Limbah Indonesia', 'Jakarta Selatan',
 50000000.00),

-- Penjual 1 — Besi & Logam
('user_seller_001',
 'seller', 'Budi Santoso', 'CV Jaya Logam Mandiri',
 'budi.seller@demo.id', '+62 812-1111-2222',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu', 'local',
 'tier_pro', 1, DATE_ADD(CURDATE(), INTERVAL 3 MONTH),
 1, 'verified', 'ktp',
 '32710[REDACTED]70001', NULL, 'Mitra Terverifikasi (KTP)', '15 Sep 2026',
 'BRI 0[REDACTED]789 a/n Budi Santoso', 'Surabaya, Jawa Timur',
 12500000.00),

-- Penjual 2 — Plastik & Kertas
('user_seller_002',
 'seller', 'Siti Rahayu', 'UD Sumber Plastik Jaya',
 'siti.seller@demo.id', '+62 813-2222-3333',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu', 'local',
 'tier_basic', 1, DATE_ADD(CURDATE(), INTERVAL 1 MONTH),
 0, 'unverified', NULL,
 NULL, NULL, 'Pemasok Baru', NULL,
 'Mandiri [REDACTED]0000 a/n Siti Rahayu', 'Bekasi, Jawa Barat',
 3200000.00),

-- Pembeli 1 — Industri Daur Ulang
('user_buyer_001',
 'buyer', 'PT Hijau Lestari', 'PT Hijau Lestari Nusantara',
 'hijau.buyer@demo.id', '+62 821-3333-4444',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu', 'local',
 'tier_pro', 1, DATE_ADD(CURDATE(), INTERVAL 2 MONTH),
 1, 'verified', 'npwp',
 '3175010000012345', '98.765.432.1-001.000', 'Pembeli Terverifikasi', '10 Agu 2026',
 'BCA 9876543210 a/n PT Hijau Lestari', 'Tangerang, Banten',
 75000000.00),

-- Pembeli 2 — Pengepul Kecil
('user_buyer_002',
 'buyer', 'Ahmad Yusuf', 'UD Yusuf Recycle',
 'ahmad.buyer@demo.id', '+62 857-4444-5555',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu', 'local',
 'tier_starter', 1, DATE_ADD(CURDATE(), INTERVAL 1 MONTH),
 0, 'unverified', NULL,
 NULL, NULL, 'Pembeli Terdaftar', NULL,
 '-', 'Bandung, Jawa Barat',
 1500000.00)

ON DUPLICATE KEY UPDATE
  name         = VALUES(name),
  phone        = VALUES(phone),
  balance      = VALUES(balance);

-- ====================================================================
-- SEED: PRODUCTS (5 listing aktif dari 2 penjual)
-- ====================================================================
INSERT INTO `products` (
  `id`, `code`, `seller_id`, `category_id`,
  `title`, `description`, `condition`, `grade`, `container_type`,
  `weight`, `volume`, `unit`, `origin_source`,
  `location`, `city`, `latitude`, `longitude`,
  `asking_price`, `minimum_order`, `pickup_schedule`, `status`
) VALUES

-- Produk 1: Besi Scrap dari seller 001
('prod_001', 'BL-MTL-001', 'user_seller_001', 'sub_mtl_001',
 'Besi Scrap Kualitas A — 5 Ton Siap Angkut',
 'Besi scrap bekas konstruksi gedung bertingkat. Sudah dipisahkan dari beton, kondisi kering dan bebas kotoran. Tersedia rutin setiap bulan.',
 'bersih', 'Grade A', 'Truk CDD',
 5000, 5000, 'Kg', 'Proyek Konstruksi Gedung Surabaya',
 'Jl. Raya Industri No. 45, Surabaya', 'Surabaya',
 -7.2575, 112.7521,
 7500, 500, 'Senin-Jumat, 08.00-16.00', 'tersedia'),

-- Produk 2: Tembaga Kabel dari seller 001
('prod_002', 'BL-MTL-002', 'user_seller_001', 'sub_mtl_004',
 'Kabel Tembaga Cu 99% — 500 Kg',
 'Kabel tembaga bekas kupas dari proyek instalasi listrik. Kemurnian Cu 99%. Sudah diuji kadar di laboratorium independen.',
 'bersih', 'Super', 'Karung Jumbo',
 500, 500, 'Kg', 'Proyek Instalasi Listrik Pabrik',
 'Jl. Raya Industri No. 45, Surabaya', 'Surabaya',
 -7.2575, 112.7521,
 120000, 50, 'Senin-Sabtu, 08.00-17.00', 'tersedia'),

-- Produk 3: Kardus OCC dari seller 002
('prod_003', 'BL-PPR-001', 'user_seller_002', 'sub_ppr_001',
 'Kardus OCC Grade A — 2 Ton',
 'Kardus bekas kemasan industri makanan. Kondisi kering, bersih, sudah dipress. Rutin tersedia setiap minggu dari pabrik.',
 'terpress', 'Grade A', 'Bal Press',
 2000, 2000, 'Kg', 'Pabrik Kemasan Makanan Bekasi',
 'Jl. M.H. Thamrin No. 22, Bekasi Barat', 'Bekasi',
 -6.2350, 107.0020,
 2800, 200, 'Setiap hari, ambil sendiri', 'tersedia'),

-- Produk 4: Botol PET dari seller 002
('prod_004', 'BL-PLS-001', 'user_seller_002', 'sub_pls_001',
 'Botol PET Bening Press — 1 Ton',
 'Botol air mineral PET sudah dipress dan dipisahkan dari tutup. Bersih tanpa label. Grade A untuk daur ulang langsung.',
 'terpress', 'Grade A', 'Bal Press',
 1000, 1000, 'Kg', 'Bank Sampah & Pengepul Wilayah Bekasi',
 'Jl. Ahmad Yani No. 10, Bekasi Timur', 'Bekasi',
 -6.2388, 107.0240,
 6500, 100, 'Senin, Rabu, Jumat', 'tersedia'),

-- Produk 5: Minyak Jelantah dari seller 001
('prod_005', 'BL-OIL-001', 'user_seller_001', 'sub_oil_001',
 'Minyak Jelantah — 500 Liter (Drum)',
 'Minyak jelantah bekas penggorengan restoran bersertifikat halal. Sudah disaring dari kotoran. Cocok untuk bahan baku biodiesel.',
 'bersih', 'Grade A', 'Drum 200L',
 450, 500, 'Liter', 'Restoran & Katering Surabaya Raya',
 'Jl. Kali Rungkut No. 100, Surabaya', 'Surabaya',
 -7.3210, 112.7800,
 10000, 100, 'Selasa & Kamis, 09.00-15.00', 'tersedia')

ON DUPLICATE KEY UPDATE
  title        = VALUES(title),
  asking_price = VALUES(asking_price),
  status       = VALUES(status);

-- ====================================================================
-- SEED: EVENT (1 event aktif)
-- ====================================================================
INSERT INTO `events` (
  `id`, `title`, `description`, `event_type`, `location`,
  `event_date`, `event_time`, `quota`, `registered`, `price`,
  `status`, `created_by`
) VALUES
('evt_001',
 'Webinar: Peluang Bisnis Daur Ulang Plastik 2026',
 'Bersama praktisi industri daur ulang dan pelaku UMKM. Diskusi tren harga, regulasi, dan peluang ekspor material daur ulang ke 2027.',
 'webinar', 'Online via Zoom',
 DATE_ADD(CURDATE(), INTERVAL 14 DAY),
 '14.00 - 16.00 WIB',
 200, 45, 0,
 'aktif', 'user_admin_001')
ON DUPLICATE KEY UPDATE
  title    = VALUES(title),
  status   = VALUES(status);

-- ====================================================================
-- SEED: NOTIFIKASI (untuk tiap user)
-- ====================================================================
INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`) VALUES
('notif_001', 'user_seller_001', 'success', 'Selamat datang di Bursa Limbah!',
 'Akun Penjual Anda sudah aktif. Mulai pasang listing pertama Anda sekarang.'),
('notif_002', 'user_seller_002', 'info', 'Lengkapi Profil Anda',
 'Verifikasi KTP/NPWP untuk mendapatkan badge Mitra Terverifikasi dan kepercayaan pembeli.'),
('notif_003', 'user_buyer_001', 'success', 'Akun Pembeli Aktif',
 'Anda sudah bisa melihat detail harga, lokasi presisi, dan menghubungi penjual langsung.'),
('notif_004', 'user_buyer_002', 'info', 'Upgrade ke Tier Basic',
 'Dengan Basic (Rp99.000/bln) Anda bisa akses 10x lebih banyak listing dan kontak penjual.')
ON DUPLICATE KEY UPDATE
  message = VALUES(message);

-- ====================================================================
-- SEED: SUBSCRIPTION HISTORY untuk penjual tier_pro
-- ====================================================================
INSERT INTO `subscriptions` (`id`, `user_id`, `plan_name`, `price`, `start_date`, `end_date`, `status`) VALUES
('sub_demo_001', 'user_seller_001', 'tier_pro', 299000,
 DATE_FORMAT(CURDATE(), '%Y-%m-01'),
 DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 3 MONTH), '%Y-%m-01'),
 'active'),
('sub_demo_002', 'user_buyer_001', 'tier_pro', 299000,
 DATE_FORMAT(CURDATE(), '%Y-%m-01'),
 DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 2 MONTH), '%Y-%m-01'),
 'active')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ====================================================================
-- SELESAI — Verifikasi data demo
-- ====================================================================
SELECT 'USERS'    AS tabel, COUNT(*) AS total FROM users
UNION ALL
SELECT 'PRODUCTS' AS tabel, COUNT(*) AS total FROM products
UNION ALL
SELECT 'EVENTS'   AS tabel, COUNT(*) AS total FROM events
UNION ALL
SELECT 'CATEGORIES' AS tabel, COUNT(*) AS total FROM categories;
