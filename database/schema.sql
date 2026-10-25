-- =======================================================
-- SKEMA DATABASE MYSQL: BURSA LIMBAH
-- Autentikasi Pengguna: Pendaftaran (Signup) & Login
-- =======================================================

CREATE DATABASE IF NOT EXISTS `bursalimbahdb` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `bursalimbahdb`;

-- -------------------------------------------------------
-- Tabel: users
-- Menyimpan kredensial dan profil lengkap akun pengguna
-- (Pembeli, Penjual, dan Administrator)
-- -------------------------------------------------------
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
  `payment_methods` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Data Awal (Seed Data) untuk Akun Demo Bawaan
-- -------------------------------------------------------
INSERT INTO `users` (
  `id`, `name`, `email`, `phone`, `company`, `role`, `password_hash`, `auth_provider`,
  `subscription_tier`, `subscription_active`, `subscription_expiry`, `identity_verified`,
  `verification_status`, `verified_badge`, `bank_account`, `location`, `balance`, `avatar`
) VALUES
-- 1. Pembeli Pro
(
  'user_buyer_1',
  'Budi Santoso (Purchasing)',
  'pengadaan@hijaulestari.co.id',
  '+62 811-2345-678',
  'PT Hijau Lestari Biofuel',
  'buyer',
  '!DISABLED_DEMO_ACCOUNT!',
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
-- 2. Pembeli Enterprise
(
  'user_buyer_2',
  'Hendro Wijaya (Procurement)',
  'purchasing@daurnusantara.co.id',
  '+62 812-9876-543',
  'PT Daur Nusantara Tbk',
  'buyer',
  '!DISABLED_DEMO_ACCOUNT!',
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
-- 3. Pembeli Starter (Free Tier)
(
  'user_buyer_free',
  'Ahmad Fauzi (UMKM Pengolah)',
  'ahmad@daurmandiri.id',
  '+62 813-1122-3344',
  'UD Daur Mandiri',
  'buyer',
  '!DISABLED_DEMO_ACCOUNT!',
  'local',
  'tier_starter',
  1,
  DATE_ADD(CURRENT_DATE, INTERVAL 365 DAY),
  1,
  'verified',
  'Mitra Terverifikasi (KTP)',
  'BRI 0341-01-001234-50-8 a.n Ahmad Fauzi',
  'Sidoarjo, Jawa Timur',
  0.00,
  NULL
),
-- 4. Penjual 1 (Budi Jelantah)
(
  'user_seller_1',
  'Budi Santoso',
  'budi@sentrajelantah.id',
  '+62 813-8899-0011',
  'Sentra Jelantah Berkah',
  'seller',
  '!DISABLED_DEMO_ACCOUNT!',
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
-- 5. Penjual 2 (PT Dwi Graha)
(
  'user_seller_2',
  'Hendra Gunawan',
  'dwigraha@rongsok.co.id',
  '+62 821-4455-6677',
  'PT Dwi Graha Logam',
  'seller',
  '!DISABLED_DEMO_ACCOUNT!',
  'local',
  'tier_starter',
  1,
  NULL,
  1,
  'verified',
  'Pemasok Terverifikasi NIB & Tera',
  'Mandiri 122-00-112233-4 a.n PT Dwi Graha Logam',
  'Semarang, Jawa Tengah',
  18300000.00,
  NULL
),
-- 6. Pengelola / Administrator Utama
(
  'user_admin_1',
  'Tim Kurator & Rekening Bersama Pusat',
  'admin@bursalimbah.com',
  '+62 811-9988-7766',
  'Pusat Operasional Bursa Limbah Indonesia',
  'admin',
  '!DISABLED_DEMO_ACCOUNT!',
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
