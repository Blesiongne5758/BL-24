-- ====================================================================
-- BURSA LIMBAH / CIRCULINK — DATABASE SETUP SCRIPT
-- MySQL Version: 8.4 LTS
-- Target Database: bursalimbahdb
-- Target User: admin@% (Password: [REDACTED])
-- ====================================================================

-- 1. Buat Database
CREATE DATABASE IF NOT EXISTS `bursalimbahdb`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 2. Buat Pengguna & Beri Hak Akses Penuh
-- Sesuai standar MySQL 8.4 LTS (caching_sha2_password)
CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY '[REDACTED]';
ALTER USER 'admin'@'%' IDENTIFIED BY '[REDACTED]';
GRANT ALL PRIVILEGES ON `bursalimbahdb`.* TO 'admin'@'%';
FLUSH PRIVILEGES;

USE `bursalimbahdb`;

-- ====================================================================
-- 3. TABEL: users
-- Menyimpan kredensial dan profil pengguna (Pembeli, Penjual, Admin)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `company` VARCHAR(150) DEFAULT NULL,
  `role` ENUM('buyer', 'seller', 'admin') NOT NULL DEFAULT 'buyer',
  `password_hash` VARCHAR(255) NOT NULL,
  `auth_provider` VARCHAR(50) NOT NULL DEFAULT 'local',
  `subscription_tier` VARCHAR(50) NOT NULL DEFAULT 'tier_starter',
  `subscription_active` TINYINT(1) NOT NULL DEFAULT 1,
  `subscription_expiry` DATE DEFAULT NULL,
  `identity_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_status` VARCHAR(50) NOT NULL DEFAULT 'unverified',
  `verification_type` VARCHAR(20) DEFAULT NULL,
  `ktp_number` VARCHAR(50) DEFAULT NULL,
  `npwp_number` VARCHAR(50) DEFAULT NULL,
  `verification_doc_url` TEXT DEFAULT NULL,
  `verified_badge` VARCHAR(100) DEFAULT NULL,
  `verified_at` VARCHAR(50) DEFAULT NULL,
  `bank_account` VARCHAR(100) DEFAULT NULL,
  `location` VARCHAR(150) DEFAULT NULL,
  `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `avatar` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 4. TABEL: waste_categories
-- Master kategori limbah komoditas bursa
-- ====================================================================
CREATE TABLE IF NOT EXISTS `waste_categories` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'Kg',
  `icon` VARCHAR(50) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `avg_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `price_range` VARCHAR(100) DEFAULT NULL,
  `color` VARCHAR(30) DEFAULT 'emerald',
  `image` TEXT DEFAULT NULL,
  `badge` VARCHAR(100) DEFAULT NULL,
  `change_percent` VARCHAR(20) DEFAULT '+0.0%',
  `trend` ENUM('up', 'down', 'neutral') DEFAULT 'neutral',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 5. TABEL: waste_products
-- Katalog pasokan limbah dari penjual (traceability & status kurasi)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `waste_products` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `seller_name` VARCHAR(150) NOT NULL,
  `category_id` VARCHAR(64) NOT NULL,
  `container_type` VARCHAR(100) DEFAULT 'Jerigen / Drum / Bal',
  `container_size` VARCHAR(100) DEFAULT NULL,
  `weight` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `volume` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `origin_type` VARCHAR(100) DEFAULT 'Pabrik / Resto / Pengepul',
  `location_city` VARCHAR(100) NOT NULL,
  `location_full` TEXT DEFAULT NULL,
  `latitude` DECIMAL(10, 7) DEFAULT NULL,
  `longitude` DECIMAL(10, 7) DEFAULT NULL,
  `target_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `description` TEXT DEFAULT NULL,
  `quality_notes` TEXT DEFAULT NULL,
  `status` ENUM('draft', 'pending', 'approved', 'booked', 'completed') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_products_code` (`code`),
  KEY `idx_products_seller` (`seller_id`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 6. TABEL: waste_evidences
-- Foto eviden fisik & dokumen uji lab / tera timbangan
-- ====================================================================
CREATE TABLE IF NOT EXISTS `waste_evidences` (
  `id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'photo_warehouse',
  `url` TEXT NOT NULL,
  `caption` VARCHAR(200) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_evidence_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 7. TABEL: subscriptions
-- Paket berlangganan pembeli (3-Tier Gated Access)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `price_monthly` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `max_price_limit` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `allow_address` ENUM('city_only', 'full') NOT NULL DEFAULT 'city_only',
  `allow_gps_map` TINYINT(1) NOT NULL DEFAULT 0,
  `allow_whatsapp` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 8. TABEL: orders
-- Data transaksi booking pasokan dengan jaminan Rekening Bersama Escrow
-- ====================================================================
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) NOT NULL,
  `order_code` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `buyer_id` VARCHAR(64) NOT NULL,
  `buyer_company` VARCHAR(150) NOT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `dp_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
  `dp_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `remaining_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `handling_fee` DECIMAL(12, 2) NOT NULL DEFAULT 10000.00,
  `escrow_status` ENUM('pending_dp', 'dp_secured', 'pickup_scheduled', 'scale_verified', 'completed', 'cancelled') NOT NULL DEFAULT 'pending_dp',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_orders_code` (`order_code`),
  KEY `idx_orders_product` (`product_id`),
  KEY `idx_orders_buyer` (`buyer_id`),
  KEY `idx_orders_seller` (`seller_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 9. TABEL: payments
-- Mutasi pembayaran DP 30% dan pelunasan 70%
-- ====================================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(64) NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `payment_type` ENUM('dp_30', 'settlement_70', 'subscription') NOT NULL DEFAULT 'dp_30',
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) DEFAULT 'bank_transfer',
  `va_number` VARCHAR(50) DEFAULT NULL,
  `payment_status` ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  `paid_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 10. TABEL: settings
-- Konfigurasi biaya handling, DP default, dan parameter sistem
-- ====================================================================
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 11. DATA AWAL (SEED DATA MVP)
-- ====================================================================

-- 11.1 Pengaturan Sistem Bawaan
INSERT INTO `settings` (`setting_key`, `setting_value`, `description`) VALUES
('default_dp_percentage', '30', 'Persentase DP standar Rekening Bersama Escrow'),
('handling_fee_per_trans', '10000', 'Biaya administrasi penanganan per transaksi (Rp)'),
('platform_name', 'Bursa Limbah (Circulink)', 'Nama resmi marketplace bursa perdagangan limbah'),
('contact_cs_wa', '+628[REDACTED]7890', 'Nomor WhatsApp resmi Customer Support & Kurator')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 11.2 Master Tier Langganan Pembeli (3-Tier)
INSERT INTO `subscriptions` (`id`, `name`, `price_monthly`, `max_price_limit`, `allow_address`, `allow_gps_map`, `allow_whatsapp`) VALUES
('tier_starter', 'Starter (UMKM)', 0.00, 15000000.00, 'city_only', 0, 0),
('tier_pro', 'Bisnis Pro (Rekomendasi)', 99000.00, 50000000.00, 'full', 1, 1),
('tier_enterprise', 'Enterprise Korporasi', 249000.00, 0.00, 'full', 1, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 11.3 Akun Pengguna Bawaan (Password Default: [REDACTED])
INSERT INTO `users` (
  `id`, `name`, `email`, `phone`, `company`, `role`, `password_hash`, `auth_provider`,
  `subscription_tier`, `subscription_active`, `subscription_expiry`, `identity_verified`,
  `verification_status`, `verified_badge`, `bank_account`, `location`, `balance`, `avatar`
) VALUES
-- Pembeli Pro
(
  'user_buyer_1',
  'Budi Santoso (Purchasing)',
  'pengadaan@hijaulestari.co.id',
  '+62 811-2345-678',
  'PT Hijau Lestari Biofuel',
  'buyer',
  '$2a$10$wN9aCshc8f5VvF1W2xK8iOs005oXq8/gZ3.9gq8W226W5vR5wQJv.',
  'local',
  'tier_pro',
  1,
  DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY),
  1,
  'verified',
  'Mitra Terverifikasi (KTP/NPWP)',
  'Mandiri 137-00-9876543-2 a.n PT Hijau Lestari Biofuel',
  'Kawasan Industri Cikarang, Jawa Barat',
  0.00,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
),
-- Pembeli Enterprise
(
  'user_buyer_2',
  'Hendro Wijaya (Procurement)',
  'purchasing@daurnusantara.co.id',
  '+62 812-9876-543',
  'PT Daur Nusantara Tbk',
  'buyer',
  '$2a$10$wN9aCshc8f5VvF1W2xK8iOs005oXq8/gZ3.9gq8W226W5vR5wQJv.',
  'local',
  'tier_enterprise',
  1,
  DATE_ADD(CURRENT_DATE, INTERVAL 90 DAY),
  1,
  'verified',
  'Mitra Terverifikasi (KTP/NPWP)',
  'BCA 542-019-8821 a.n PT Daur Nusantara',
  'Surabaya Industrial Estate Rungkut (SIER), Jawa Timur',
  0.00,
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'
),
-- Penjual 1 (Jelantah)
(
  'user_seller_1',
  'Budi Santoso',
  'budi@sentrajelantah.id',
  '+62 813-8899-0011',
  'Sentra Jelantah Berkah',
  'seller',
  '$2a$10$wN9aCshc8f5VvF1W2xK8iOs005oXq8/gZ3.9gq8W226W5vR5wQJv.',
  'local',
  'tier_starter',
  1,
  NULL,
  1,
  'verified',
  'Pemasok Terverifikasi NIB & Tera',
  'BCA 872-049-1122 a.n Budi Santoso',
  'Tangerang, Banten',
  42500000.00,
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
),
-- Admin Pengelola
(
  'user_admin_1',
  'Tim Kurator & Rekening Bersama Pusat',
  'admin@bursalimbah.com',
  '+62 811-9988-7766',
  'Pusat Operasional Bursa Limbah Indonesia',
  'admin',
  '$2a$10$wN9aCshc8f5VvF1W2xK8iOs005oXq8/gZ3.9gq8W226W5vR5wQJv.',
  'local',
  'tier_enterprise',
  1,
  NULL,
  1,
  'verified',
  'Administrator Resmi Bursa Limbah',
  'Escrow BNI Virtual Account 988-1234-5678-0000',
  'Jakarta Pusat, DKI Jakarta',
  0.00,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 11.4 Kategori Awal (10 Komoditas)
INSERT INTO `waste_categories` (`id`, `name`, `unit`, `icon`, `description`, `avg_price`, `price_range`, `badge`) VALUES
('cat_jelantah', 'Minyak Jelantah (UCO)', 'Liter', 'droplet', 'Used Cooking Oil (UCO) dari restoran dan pabrik makanan', 9500.00, 'Rp8.500 - Rp11.000 / Liter', 'Bahan Baku Biodiesel'),
('cat_oli', 'Oli Pelumas Bekas', 'Liter', 'fuel', 'Limbah pelumas mesin genset, kendaraan, & mesin pabrik', 3200.00, 'Rp2.800 - Rp4.000 / Liter', 'Limbah B3 Terdaftar'),
('cat_kardus', 'Kardus (OCC Corrugated)', 'Kg', 'box', 'Kardus cokelat tebal (OCC) packaging & pabrik karton', 2400.00, 'Rp2.000 - Rp2.800 / Kg', 'Daur Ulang Kertas Pulp'),
('cat_plastik', 'Plastik (PET / HDPE)', 'Kg', 'recycle', 'Botol PET bening, jerigen HDPE bal press', 5800.00, 'Rp4.500 - Rp7.200 / Kg', 'Biji Plastik Sirkular'),
('cat_besi', 'Besi Rongsok (Scrap WF)', 'Kg', 'hammer', 'Scrap besi konstruksi potongan WF & plat baja pabrik', 6200.00, 'Rp5.500 - Rp7.000 / Kg', 'Peleburan Logam Induksi'),
('cat_aluminium', 'Aluminium Scrap', 'Kg', 'cube', 'Potongan kusen aluminium, kaleng UBC press', 18500.00, 'Rp16.000 - Rp21.000 / Kg', 'Ingot Secondary Grade A'),
('cat_tembaga', 'Tembaga Super (Bare Copper)', 'Kg', 'bolt', 'Kabel tembaga kupas kilap, trafo tembaga super', 95000.00, 'Rp88.000 - Rp105.000 / Kg', 'Kemurnian 99.9% Cu'),
('cat_kertas', 'Kertas Arsip & Buku (SWL)', 'Kg', 'newspaper', 'Kertas HVS putih cacah & arsip perkantoran kadaluwarsa', 2900.00, 'Rp2.400 - Rp3.400 / Kg', 'Bahan Tissue & Pulp'),
('cat_elektronik', 'Limbah Elektronik (E-Waste)', 'Kg', 'microchip', 'PCB komputer, motherboard server, & baterai lithium', 25000.00, 'Rp15.000 - Rp45.000 / Kg', 'Recovery Precious Metal'),
('cat_lainnya', 'Limbah B3 Industri & Abu Batubara', 'Ton', 'industry', 'Fly ash, bottom ash, & limbah anorganik pabrik', 120000.00, 'Rp90.000 - Rp160.000 / Ton', 'Sertifikasi Manifes KLHK')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
