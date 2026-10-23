-- ====================================================================
-- BURSA LIMBAH — SETUP DATABASE LENGKAP (MySQL 8.4 LTS)
-- Sinkron 100% dengan server/server.js & server/db.js
-- Jalankan script ini sebagai root MySQL untuk setup awal
-- Target DB/user/host must be configured for the deployment environment.
-- ====================================================================

-- 1. Buat database dan user
CREATE DATABASE IF NOT EXISTS `bursalimbahdb`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY '[REDACTED]';
ALTER USER 'admin'@'%' IDENTIFIED BY '[REDACTED]';
GRANT ALL PRIVILEGES ON `bursalimbahdb`.* TO 'admin'@'%';
FLUSH PRIVILEGES;

USE `bursalimbahdb`;

-- ====================================================================
-- TABEL 1: users
-- Kolom sesuai mapUserFromDb() di server.js dan query INSERT
-- ====================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`                    VARCHAR(64)   NOT NULL,
  `role`                  ENUM('buyer','seller','admin') NOT NULL DEFAULT 'buyer',
  `name`                  VARCHAR(150)  NOT NULL,
  `company`               VARCHAR(150)  DEFAULT NULL,
  `email`                 VARCHAR(191)  NOT NULL,
  `phone`                 VARCHAR(50)   DEFAULT NULL,
  `password_hash`         VARCHAR(255)  NOT NULL,
  `auth_provider`         VARCHAR(30)   NOT NULL DEFAULT 'local',
  `subscription_tier`     VARCHAR(50)   NOT NULL DEFAULT 'tier_starter',
  `subscription_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `subscription_expiry`   DATE          DEFAULT NULL,
  `identity_verified`     TINYINT(1)    NOT NULL DEFAULT 0,
  `verification_status`   VARCHAR(30)   NOT NULL DEFAULT 'unverified',
  `verification_type`     VARCHAR(30)   DEFAULT NULL,
  `ktp_number`            VARCHAR(50)   DEFAULT NULL,
  `npwp_number`           VARCHAR(50)   DEFAULT NULL,
  `verification_doc_url`  TEXT          DEFAULT NULL,
  `verified_badge`        VARCHAR(100)  DEFAULT NULL,
  `verified_at`           VARCHAR(50)   DEFAULT NULL,
  `bank_account`          VARCHAR(100)  DEFAULT NULL,
  `location`              VARCHAR(200)  DEFAULT 'Indonesia',
  `balance`               DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `avatar`                TEXT          DEFAULT NULL,
  `payment_methods`       LONGTEXT      DEFAULT NULL,
  `created_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_subscription_tier` (`subscription_tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 2: categories (16 kategori utama, industri, B3)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id`             VARCHAR(64)   NOT NULL,
  `category_code`  VARCHAR(20)   NOT NULL,
  `main_category`  VARCHAR(100)  NOT NULL,
  `sub_category`   TEXT          DEFAULT NULL,
  `group_type`     ENUM('utama','industri','b3') NOT NULL DEFAULT 'utama',
  `is_b3`          TINYINT(1)    NOT NULL DEFAULT 0,
  `grade_default`  VARCHAR(10)   NOT NULL DEFAULT 'A',
  `unit`           VARCHAR(20)   NOT NULL DEFAULT 'Kg',
  `avg_price`      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `price_range`    VARCHAR(100)  DEFAULT NULL,
  `icon`           VARCHAR(50)   DEFAULT NULL,
  `image`          TEXT          DEFAULT NULL,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_cat_code` (`category_code`),
  KEY `idx_cat_group` (`group_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 3: products (10 atribut wajib listing)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `products` (
  `id`               VARCHAR(64)   NOT NULL,
  `code`             VARCHAR(50)   NOT NULL,
  `seller_id`        VARCHAR(64)   NOT NULL,
  `category_id`      VARCHAR(64)   NOT NULL,
  `title`            VARCHAR(200)  NOT NULL,
  `description`      TEXT          DEFAULT NULL,
  `condition`        ENUM('bersih','campur','terpress','cacah','baled') NOT NULL DEFAULT 'bersih',
  `grade`            VARCHAR(50)   DEFAULT 'Grade A',
  `container_type`   VARCHAR(100)  DEFAULT 'Jerigen / Drum / Bal',
  `weight`           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `volume`           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `unit`             VARCHAR(20)   NOT NULL DEFAULT 'Kg',
  `origin_source`    VARCHAR(200)  DEFAULT NULL,
  `location`         TEXT          NOT NULL,
  `city`             VARCHAR(100)  NOT NULL,
  `latitude`         DECIMAL(10,7) DEFAULT NULL,
  `longitude`        DECIMAL(10,7) DEFAULT NULL,
  `asking_price`     DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `minimum_order`    DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  `pickup_schedule`  VARCHAR(100)  NOT NULL DEFAULT 'Siap Angkut Segera',
  `status`           ENUM('tersedia','terjual','kontrak','draft','pending','approved','booked') NOT NULL DEFAULT 'tersedia',
  `is_b3`            TINYINT(1)    NOT NULL DEFAULT 0,
  `b3_permit_number` VARCHAR(100)  DEFAULT NULL,
  `views`            INT           NOT NULL DEFAULT 0,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_products_code` (`code`),
  KEY `idx_products_seller` (`seller_id`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_status` (`status`),
  KEY `idx_products_city` (`city`),
  CONSTRAINT `fk_prod_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prod_cat`    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 4: product_images
-- ====================================================================
CREATE TABLE IF NOT EXISTS `product_images` (
  `id`          VARCHAR(64)  NOT NULL,
  `product_id`  VARCHAR(64)  NOT NULL,
  `image_url`   TEXT         NOT NULL,
  `caption`     VARCHAR(200) DEFAULT NULL,
  `is_evidence` TINYINT(1)   NOT NULL DEFAULT 0,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_img_product` (`product_id`),
  CONSTRAINT `fk_img_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 5: offers (penawaran harga dari pembeli)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `offers` (
  `id`            VARCHAR(64)   NOT NULL,
  `product_id`    VARCHAR(64)   NOT NULL,
  `buyer_id`      VARCHAR(64)   NOT NULL,
  `offer_price`   DECIMAL(14,2) NOT NULL,
  `quantity`      DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  `unit`          VARCHAR(20)   NOT NULL DEFAULT 'Kg',
  `evidence_photo` TEXT         DEFAULT NULL,
  `waste_origin`  TEXT          DEFAULT NULL,
  `note`          TEXT          DEFAULT NULL,
  `status`        ENUM('pending','accepted','rejected','cancelled','expired') NOT NULL DEFAULT 'pending',
  `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_offers_prod`   (`product_id`),
  KEY `idx_offers_buyer`  (`buyer_id`),
  KEY `idx_offers_status` (`status`),
  CONSTRAINT `fk_off_prod`  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_off_buyer` FOREIGN KEY (`buyer_id`)   REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 6: orders (transaksi resmi setelah offer diterima)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `orders` (
  `id`                            VARCHAR(64)   NOT NULL,
  `order_code`                    VARCHAR(50)   NOT NULL,
  `product_id`                    VARCHAR(64)   NOT NULL,
  `seller_id`                     VARCHAR(64)   NOT NULL,
  `buyer_id`                      VARCHAR(64)   NOT NULL,
  `buyer_company`                 VARCHAR(150)  DEFAULT NULL,
  `offer_id`                      VARCHAR(64)   DEFAULT NULL,
  `quantity`                      DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  `unit`                          VARCHAR(20)   NOT NULL DEFAULT 'Kg',
  `unit_price`                    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_amount`                  DECIMAL(14,2) NOT NULL,
  `dp_percentage`                 DECIMAL(5,2)  NOT NULL DEFAULT 30.00,
  `dp_amount`                     DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `remaining_amount`              DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `handling_fee`                  DECIMAL(14,2) NOT NULL DEFAULT 10000.00,
  `service_fee`                   DECIMAL(14,2) NOT NULL DEFAULT 10000.00,
  `escrow_status`                 VARCHAR(50)   NOT NULL DEFAULT 'dp_secured',
  `status`                        VARCHAR(30)   NOT NULL DEFAULT 'dp_pending',
  `pickup_date`                   VARCHAR(50)   DEFAULT NULL,
  `shipping_method`               VARCHAR(100)  DEFAULT 'Armada Mandiri Pembeli',
  `notes`                         TEXT          DEFAULT NULL,
  `note`                          TEXT          DEFAULT NULL,
  `remaining_payment_status`      VARCHAR(50)   NOT NULL DEFAULT 'unpaid',
  `remaining_payment_proof`       LONGTEXT      DEFAULT NULL,
  `remaining_payment_notes`       TEXT          DEFAULT NULL,
  `remaining_payment_submitted_at` VARCHAR(50)  DEFAULT NULL,
  `remaining_payment_verified_at` VARCHAR(50)   DEFAULT NULL,
  `remaining_payment_verified_by` VARCHAR(100)  DEFAULT NULL,
  `created_at`                    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_seller`         (`seller_id`),
  KEY `idx_orders_buyer`          (`buyer_id`),
  KEY `idx_orders_prod`           (`product_id`),
  KEY `idx_orders_status`         (`status`),
  KEY `idx_orders_escrow_status`  (`escrow_status`),
  KEY `idx_orders_rem_status`     (`remaining_payment_status`),
  CONSTRAINT `fk_ord_seller` FOREIGN KEY (`seller_id`)  REFERENCES `users` (`id`),
  CONSTRAINT `fk_ord_buyer`  FOREIGN KEY (`buyer_id`)   REFERENCES `users` (`id`),
  CONSTRAINT `fk_ord_prod`   FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 7: payments (riwayat pembayaran DP & pelunasan)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id`             VARCHAR(64)   NOT NULL,
  `order_id`       VARCHAR(64)   NOT NULL,
  `payment_type`   VARCHAR(30)   NOT NULL COMMENT 'dp / pelunasan / full',
  `amount`         DECIMAL(14,2) NOT NULL,
  `payment_method` VARCHAR(50)   NOT NULL,
  `payment_status` VARCHAR(30)   NOT NULL DEFAULT 'pending',
  `reference_code` VARCHAR(100)  DEFAULT NULL,
  `paid_at`        TIMESTAMP     NULL DEFAULT NULL,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_order`  (`order_id`),
  KEY `idx_pay_status` (`payment_status`),
  CONSTRAINT `fk_pay_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 8: transactions (rekap keuangan platform)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `transactions` (
  `id`                   VARCHAR(64)   NOT NULL,
  `order_id`             VARCHAR(64)   NOT NULL,
  `gross_amount`         DECIMAL(14,2) NOT NULL,
  `service_fee`          DECIMAL(14,2) NOT NULL DEFAULT 10000.00,
  `seller_receive`       DECIMAL(14,2) NOT NULL,
  `transaction_status`   VARCHAR(30)   NOT NULL DEFAULT 'escrow_hold',
  `released_at`          TIMESTAMP     NULL DEFAULT NULL,
  `created_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tx_order`  (`order_id`),
  KEY `idx_tx_status` (`transaction_status`),
  CONSTRAINT `fk_tx_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 9: subscriptions (riwayat paket berlangganan)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`          VARCHAR(64)   NOT NULL,
  `user_id`     VARCHAR(64)   NOT NULL,
  `plan_name`   VARCHAR(50)   NOT NULL,
  `price`       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `start_date`  DATE          DEFAULT NULL,
  `end_date`    DATE          DEFAULT NULL,
  `status`      VARCHAR(20)   NOT NULL DEFAULT 'active',
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subs_user`   (`user_id`),
  KEY `idx_subs_status` (`status`),
  CONSTRAINT `fk_subs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 10: pickup_schedules (jadwal pengambilan barang)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `pickup_schedules` (
  `id`             VARCHAR(64) NOT NULL,
  `order_id`       VARCHAR(64) NOT NULL,
  `pickup_date`    DATE        DEFAULT NULL,
  `pickup_time`    VARCHAR(20) DEFAULT NULL,
  `pickup_address` TEXT        DEFAULT NULL,
  `driver_name`    VARCHAR(100) DEFAULT NULL,
  `vehicle_number` VARCHAR(30) DEFAULT NULL,
  `vehicle_type`   VARCHAR(50) DEFAULT NULL,
  `status`         VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  `note`           TEXT        DEFAULT NULL,
  `created_at`     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pickup_order`  (`order_id`),
  KEY `idx_pickup_status` (`status`),
  CONSTRAINT `fk_pick_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 11: reviews (ulasan transaksi)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `reviews` (
  `id`           VARCHAR(64) NOT NULL,
  `order_id`     VARCHAR(64) NOT NULL,
  `reviewer_id`  VARCHAR(64) NOT NULL,
  `reviewee_id`  VARCHAR(64) NOT NULL,
  `rating`       INT         NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comment`      TEXT        DEFAULT NULL,
  `created_at`   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_rev_unique` (`order_id`, `reviewer_id`),
  KEY `idx_rev_reviewee` (`reviewee_id`),
  CONSTRAINT `fk_rev_order`    FOREIGN KEY (`order_id`)    REFERENCES `orders` (`id`),
  CONSTRAINT `fk_rev_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_rev_reviewee` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 12: favorites (produk favorit pembeli)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `favorites` (
  `user_id`    VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `product_id`),
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`)    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 13: notifications (notifikasi untuk semua user)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         VARCHAR(64)  NOT NULL,
  `user_id`    VARCHAR(64)  NOT NULL,
  `type`       VARCHAR(30)  NOT NULL DEFAULT 'info' COMMENT 'info/success/warning/error',
  `title`      VARCHAR(200) NOT NULL,
  `message`    TEXT         NOT NULL,
  `link`       VARCHAR(200) DEFAULT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user`    (`user_id`),
  KEY `idx_notif_is_read` (`is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 14: chat_rooms (ruang percakapan buyer-seller)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id`         VARCHAR(64) NOT NULL,
  `buyer_id`   VARCHAR(64) NOT NULL,
  `seller_id`  VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) DEFAULT NULL,
  `last_msg`   TEXT        DEFAULT NULL,
  `last_msg_at` TIMESTAMP  NULL DEFAULT NULL,
  `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_chat_unique` (`buyer_id`, `seller_id`, `product_id`),
  KEY `idx_chat_seller` (`seller_id`),
  CONSTRAINT `fk_cr_buyer`  FOREIGN KEY (`buyer_id`)  REFERENCES `users` (`id`),
  CONSTRAINT `fk_cr_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 15: chat_messages (pesan dalam ruang chat)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id`         VARCHAR(64) NOT NULL,
  `room_id`    VARCHAR(64) NOT NULL,
  `sender_id`  VARCHAR(64) NOT NULL,
  `message`    TEXT        NOT NULL,
  `is_read`    TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_room`   (`room_id`),
  KEY `idx_msg_sender` (`sender_id`),
  CONSTRAINT `fk_msg_room`   FOREIGN KEY (`room_id`)   REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 16: events (event/webinar/pameran yang dikelola admin)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `events` (
  `id`          VARCHAR(64)   NOT NULL,
  `title`       VARCHAR(200)  NOT NULL,
  `description` TEXT          DEFAULT NULL,
  `event_type`  VARCHAR(50)   NOT NULL DEFAULT 'webinar' COMMENT 'webinar/pameran/workshop/lelang',
  `location`    VARCHAR(200)  DEFAULT 'Online',
  `event_date`  DATE          NOT NULL,
  `event_time`  VARCHAR(20)   DEFAULT NULL,
  `quota`       INT           NOT NULL DEFAULT 100,
  `registered`  INT           NOT NULL DEFAULT 0,
  `price`       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `image`       TEXT          DEFAULT NULL,
  `status`      ENUM('aktif','selesai','batal','draft') NOT NULL DEFAULT 'aktif',
  `created_by`  VARCHAR(64)   NOT NULL,
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_date`   (`event_date`),
  KEY `idx_events_status` (`status`),
  CONSTRAINT `fk_events_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 17: event_registrations (peserta event)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id`         VARCHAR(64) NOT NULL,
  `event_id`   VARCHAR(64) NOT NULL,
  `user_id`    VARCHAR(64) NOT NULL,
  `status`     VARCHAR(20) NOT NULL DEFAULT 'registered',
  `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ereg_unique` (`event_id`, `user_id`),
  CONSTRAINT `fk_ereg_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ereg_user`  FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 18: admin_logs (log aktivitas admin)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id`         VARCHAR(64)  NOT NULL,
  `admin_id`   VARCHAR(64)  NOT NULL,
  `action`     VARCHAR(200) NOT NULL,
  `target_id`  VARCHAR(64)  DEFAULT NULL,
  `detail`     TEXT         DEFAULT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_admin`  (`admin_id`),
  KEY `idx_log_action` (`action`(50)),
  CONSTRAINT `fk_log_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 19: system_settings (konfigurasi platform oleh admin)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key`   VARCHAR(100) NOT NULL,
  `setting_value` TEXT         NOT NULL,
  `description`   VARCHAR(200) DEFAULT NULL,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_terms_acceptances` (
  `id`            VARCHAR(64)  NOT NULL,
  `user_id`       VARCHAR(64)  NOT NULL,
  `terms_version` VARCHAR(20)  NOT NULL,
  `terms_title`   VARCHAR(200) NOT NULL,
  `accepted_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_terms_version` (`user_id`, `terms_version`),
  CONSTRAINT `fk_terms_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- TABEL 20: addresses (alamat pengiriman/penjemputan user)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `addresses` (
  `id`          VARCHAR(64)   NOT NULL,
  `user_id`     VARCHAR(64)   NOT NULL,
  `label`       VARCHAR(50)   DEFAULT 'Utama',
  `province`    VARCHAR(100)  DEFAULT NULL,
  `city`        VARCHAR(100)  NOT NULL,
  `district`    VARCHAR(100)  DEFAULT NULL,
  `postal_code` VARCHAR(10)   DEFAULT NULL,
  `address`     TEXT          NOT NULL,
  `latitude`    DECIMAL(10,7) DEFAULT NULL,
  `longitude`   DECIMAL(10,7) DEFAULT NULL,
  `is_default`  TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addr_user` (`user_id`),
  CONSTRAINT `fk_addr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- INSERT DEFAULT SYSTEM SETTINGS
-- ====================================================================
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('google_login_enabled',    'false',         'Aktifkan login OAuth Google dari panel admin setelah konfigurasi Google Identity Services'),
('dp_enabled',              'false',         'Aktifkan fitur uang muka (DP) 30%'),
('dp_percentage',           '30',            'Persentase DP dari total transaksi'),
('dp_enabled',              'false',         'Aktivasi metode pembayaran DP'),
('paymentGatewayEnabled',   'false',         'Aktivasi API payment gateway'),
('paymentGatewayProvider',  'midtrans',      'Provider payment gateway'),
('paymentGatewayEnvironment','sandbox',      'Lingkungan gateway: sandbox/production'),
('paymentGatewayClientKey', '',              'Client/public key gateway; secret disimpan di environment server'),
('ticker_enabled',           'true',         'Aktivasi ticker harga pasar pada halaman publik'),
('ticker_title',             'Harga Pasar Terkini', 'Judul ticker harga pasar'),
('ticker_refresh_minutes',   '15',           'Interval pembaruan ticker harga pasar dalam menit'),
('terms_title',              'Syarat dan Ketentuan Penggunaan Bursa Limbah', 'Judul persetujuan pengguna baru'),
('terms_version',            '1.0',          'Versi dokumen syarat dan ketentuan'),
('terms_content',            'Dengan membuat akun, Anda menyatakan data yang diberikan benar dan menyetujui ketentuan penggunaan Bursa Limbah.', 'Isi persetujuan pengguna baru'),
('handlingFeeByTier',       '{"tier_starter":15000,"tier_basic":10000,"tier_pro":7500,"tier_enterprise":5000}', 'Biaya penanganan berdasarkan tier pembeli'),
('service_fee_fixed',       '10000',         'Biaya layanan platform (Rupiah)'),
('service_fee_percentage',  '2',             'Biaya layanan platform (%)'),
('tier_starter_price',      '0',             'Harga tier Starter per bulan'),
('tier_basic_price',        '99000',         'Harga tier Basic per bulan'),
('tier_pro_price',          '299000',        'Harga tier Pro per bulan'),
('tier_enterprise_price',   '799000',        'Harga tier Enterprise per bulan'),
('tier_starter_limit',      '3',             'Batas listing aktif tier Starter'),
('tier_basic_limit',        '10',            'Batas listing aktif tier Basic'),
('tier_pro_limit',          '50',            'Batas listing aktif tier Pro'),
('tier_enterprise_limit',   '999',           'Batas listing aktif tier Enterprise'),
('maintenance_mode',        'false',         'Mode pemeliharaan platform'),
('platform_name',           'Bursa Limbah',  'Nama platform'),
('platform_wa',             '628[REDACTED]7890', 'Nomor WhatsApp admin/CS'),
('auto_approve_listings',   'false',         'Persetujuan listing otomatis tanpa admin'),
('support_section_title',    'Pusat Layanan Resmi', 'Judul bagian layanan resmi footer'),
('contact_phone',           '+62 812-3456-7890', 'Nomor telepon kontak resmi'),
('contact_wa_number',       '628[REDACTED]7890', 'Nomor WhatsApp resmi untuk tautan'),
('contact_wa_message',      'Halo Admin Bursa Limbah, saya ingin konsultasi transaksi', 'Pesan template default WhatsApp'),
('contact_email',           'kemitraan@bursalimbah.id', 'Email resmi kemitraan'),
('contact_address',         'Sentra Inovasi Hijau BURSA LIMBAH Lt. 5, Jakarta Timur', 'Alamat kantor / operasional resmi'),
('support_guide_btn_text',  'Panduan Transaksi Aman', 'Teks tombol panduan transaksi aman'),
('support_guide_btn_action','modal',         'Aksi tombol panduan: modal atau url'),
('support_guide_btn_url',   '',              'URL eksternal tombol panduan'),
('support_guide_btn_enabled','true',         'Status visibilitas tombol panduan'),
('support_operational_hours','Senin – Jumat: 08.00 – 17.00 WIB', 'Jam operasional layanan resmi'),
('support_maps_url',        'https://maps.google.com/?q=Sentra+Inovasi+Hijau+Jakarta+Timur', 'Tautan Google Maps alamat resmi')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description   = VALUES(description);

-- ====================================================================
-- SEED DATA: 91 SUB-KATEGORI LIMBAH LENGKAP
-- 16 Kategori Utama: Minyak, Kertas, Plastik, Logam, Kaca, Karet,
--   Kayu, Tekstil, Elektronik, Baterai, Organik, Kemasan, Scrap,
--   Material Recovery, Konstruksi, B3
-- ====================================================================
INSERT INTO `categories` (`id`,`category_code`,`main_category`,`sub_category`,`group_type`,`is_b3`,`grade_default`,`unit`,`avg_price`,`price_range`,`icon`)
VALUES
-- 1. Minyak & Cairan Bekas
('sub_oil_001','OIL-001','Minyak & Cairan Bekas','Minyak Jelantah','utama',0,'A','Liter',9500,'Rp8.500 - Rp11.500 / Liter','fa-droplet'),
('sub_oil_002','OIL-002','Minyak & Cairan Bekas','Oli Bekas','utama',1,'B','Liter',3500,'Rp2.500 - Rp4.500 / Liter','fa-oil-can'),
('sub_oil_003','OIL-003','Minyak & Cairan Bekas','Coolant Bekas','utama',0,'B','Liter',2200,'Rp1.800 - Rp2.800 / Liter','fa-snowflake'),
('sub_oil_004','OIL-004','Minyak & Cairan Bekas','Grease Bekas','utama',0,'C','Kg',1800,'Rp1.200 - Rp2.500 / Kg','fa-brush'),
('sub_oil_005','OIL-005','Minyak & Cairan Bekas','Solar Bekas','utama',0,'B','Liter',6800,'Rp5.500 - Rp7.800 / Liter','fa-gas-pump'),
('sub_oil_006','OIL-006','Minyak & Cairan Bekas','Cairan Hidrolik','utama',0,'A','Liter',5500,'Rp4.500 - Rp7.000 / Liter','fa-gears'),
-- 2. Kertas & Karton
('sub_ppr_001','PPR-001','Kertas & Karton','Kardus OCC','utama',0,'A','Kg',2600,'Rp2.000 - Rp3.200 / Kg','fa-box-open'),
('sub_ppr_002','PPR-002','Kertas & Karton','HVS Bekas','utama',0,'A','Kg',3200,'Rp2.800 - Rp3.800 / Kg','fa-file-lines'),
('sub_ppr_003','PPR-003','Kertas & Karton','Koran Bekas','utama',0,'B','Kg',2000,'Rp1.600 - Rp2.400 / Kg','fa-newspaper'),
('sub_ppr_004','PPR-004','Kertas & Karton','Majalah Bekas','utama',0,'B','Kg',1800,'Rp1.400 - Rp2.200 / Kg','fa-book-open'),
('sub_ppr_005','PPR-005','Kertas & Karton','Duplex','utama',0,'B','Kg',1500,'Rp1.200 - Rp1.800 / Kg','fa-scroll'),
('sub_ppr_006','PPR-006','Kertas & Karton','Arsip Kertas Kantor','utama',0,'A','Kg',3000,'Rp2.500 - Rp3.500 / Kg','fa-folder-closed'),
('sub_ppr_007','PPR-007','Kertas & Karton','Paper Core','utama',0,'A','Kg',1400,'Rp1.000 - Rp1.800 / Kg','fa-circle-notch'),
-- 3. Plastik
('sub_pls_001','PLS-001','Plastik','PET (Botol Bening / Bal Press)','utama',0,'A','Kg',6200,'Rp4.500 - Rp8.500 / Kg','fa-bottle-water'),
('sub_pls_002','PLS-002','Plastik','HDPE (Jerigen / Tutup)','utama',0,'A','Kg',5800,'Rp4.000 - Rp7.500 / Kg','fa-jug-detergent'),
('sub_pls_003','PLS-003','Plastik','PP (Emberan / Gelas)','utama',0,'A','Kg',4800,'Rp3.500 - Rp6.000 / Kg','fa-glass-water'),
('sub_pls_004','PLS-004','Plastik','LDPE (Film / Plastik Bening)','utama',0,'A','Kg',5200,'Rp3.800 - Rp6.800 / Kg','fa-layer-group'),
('sub_pls_005','PLS-005','Plastik','PVC (Pipa / Talang Air)','utama',0,'B','Kg',3500,'Rp2.500 - Rp4.500 / Kg','fa-lines-leaning'),
('sub_pls_006','PLS-006','Plastik','ABS (Casing Elektronik)','utama',0,'A','Kg',8500,'Rp6.500 - Rp11.000 / Kg','fa-laptop'),
('sub_pls_007','PLS-007','Plastik','PS (Styrofoam / Wadah)','utama',0,'B','Kg',2800,'Rp1.800 - Rp3.500 / Kg','fa-cube'),
('sub_pls_008','PLS-008','Plastik','Plastik Campur (Mixed)','utama',0,'C','Kg',2200,'Rp1.500 - Rp3.000 / Kg','fa-recycle'),
('sub_pls_009','PLS-009','Plastik','Karung Plastik (Woven Bag)','utama',0,'B','Kg',2500,'Rp1.800 - Rp3.200 / Kg','fa-bag-shopping'),
('sub_pls_010','PLS-010','Plastik','Stretch Film Industri','utama',0,'A','Kg',5500,'Rp4.000 - Rp7.000 / Kg','fa-film'),
-- 4. Logam
('sub_mtl_001','MTL-001','Logam','Besi Tua (Scrap WF / Balok)','utama',0,'A','Kg',7200,'Rp6.000 - Rp8.500 / Kg','fa-cubes-stacked'),
('sub_mtl_002','MTL-002','Logam','Baja Scrap (Plat / Konstruksi)','utama',0,'A','Kg',8500,'Rp7.000 - Rp10.000 / Kg','fa-shield'),
('sub_mtl_003','MTL-003','Logam','Aluminium (Profil Kusen / Velg)','utama',0,'A','Kg',24500,'Rp18.000 - Rp32.000 / Kg','fa-car-side'),
('sub_mtl_004','MTL-004','Logam','Tembaga (Kabel Merah Cu 99%)','utama',0,'Super','Kg',115000,'Rp95.000 - Rp135.000 / Kg','fa-bolt'),
('sub_mtl_005','MTL-005','Logam','Kuningan Scrap','utama',0,'A','Kg',62000,'Rp50.000 - Rp75.000 / Kg','fa-coins'),
('sub_mtl_006','MTL-006','Logam','Stainless Steel (SUS 304/316)','utama',0,'A','Kg',19500,'Rp15.000 - Rp25.000 / Kg','fa-utensils'),
('sub_mtl_007','MTL-007','Logam','Timah Scrap','utama',0,'B','Kg',45000,'Rp35.000 - Rp55.000 / Kg','fa-ring'),
('sub_mtl_008','MTL-008','Logam','Seng Scrap','utama',0,'B','Kg',14000,'Rp10.000 - Rp18.000 / Kg','fa-sheet-plastic'),
('sub_mtl_009','MTL-009','Logam','Kabel Bekas Kupas','utama',0,'A','Kg',38000,'Rp25.000 - Rp65.000 / Kg','fa-ethernet'),
-- 5. Kaca
('sub_gls_001','GLS-001','Kaca','Kaca Bening Lembaran','utama',0,'A','Kg',950,'Rp700 - Rp1.300 / Kg','fa-window-maximize'),
('sub_gls_002','GLS-002','Kaca','Kaca Warna Lembaran','utama',0,'B','Kg',750,'Rp500 - Rp1.000 / Kg','fa-palette'),
('sub_gls_003','GLS-003','Kaca','Botol Kaca Kemasan','utama',0,'A','Pcs',800,'Rp500 - Rp1.500 / Pcs','fa-wine-bottle'),
('sub_gls_004','GLS-004','Kaca','Pecahan Kaca (Cullet)','utama',0,'A','Kg',850,'Rp600 - Rp1.200 / Kg','fa-shapes'),
('sub_gls_005','GLS-005','Kaca','Kaca Tempered','utama',0,'B','Kg',600,'Rp400 - Rp900 / Kg','fa-shield-halved'),
-- 6. Karet
('sub_rbr_001','RBR-001','Karet','Ban Bekas (Truk / Bus)','utama',0,'B','Pcs',35000,'Rp25.000 - Rp50.000 / Pcs','fa-circle-notch'),
('sub_rbr_002','RBR-002','Karet','Crumb Rubber (Serbuk Karet)','utama',0,'A','Kg',3200,'Rp2.500 - Rp4.500 / Kg','fa-circle-dot'),
('sub_rbr_003','RBR-003','Karet','Selang Karet Bekas','utama',0,'B','Kg',2000,'Rp1.500 - Rp2.800 / Kg','fa-ring'),
('sub_rbr_004','RBR-004','Karet','Gasket Karet Industri','utama',0,'B','Kg',2800,'Rp2.000 - Rp3.800 / Kg','fa-gears'),
('sub_rbr_005','RBR-005','Karet','Conveyor Belt Bekas','utama',0,'A','Meter',45000,'Rp35.000 - Rp65.000 / Meter','fa-arrows-left-right'),
-- 7. Kayu
('sub_wod_001','WOD-001','Kayu','Pallet Kayu Standar Ekspor','utama',0,'A','Pcs',45000,'Rp35.000 - Rp75.000 / Pcs','fa-tree'),
('sub_wod_002','WOD-002','Kayu','Peti Kayu Kemasan Mesin','utama',0,'A','Pcs',60000,'Rp40.000 - Rp90.000 / Pcs','fa-box'),
('sub_wod_003','WOD-003','Kayu','Kayu Bekas Proyek / Balok','utama',0,'B','Batang',18000,'Rp12.000 - Rp28.000 / Batang','fa-cubes'),
('sub_wod_004','WOD-004','Kayu','Serbuk Kayu Biomassa','utama',0,'B','Kg',450,'Rp300 - Rp700 / Kg','fa-wind'),
('sub_wod_005','WOD-005','Kayu','Potongan Kayu (Wood Chips)','utama',0,'B','Ton',650000,'Rp450.000 - Rp850.000 / Ton','fa-fire'),
-- 8. Tekstil
('sub_txt_001','TXT-001','Tekstil','Kain Perca / Majun Katun','utama',0,'A','Kg',4800,'Rp3.500 - Rp6.500 / Kg','fa-shirt'),
('sub_txt_002','TXT-002','Tekstil','Pakaian Bekas Industri','utama',0,'B','Kg',3200,'Rp2.200 - Rp4.500 / Kg','fa-vest'),
('sub_txt_003','TXT-003','Tekstil','Benang Sisa Gulungan','utama',0,'B','Kg',6500,'Rp4.500 - Rp8.500 / Kg','fa-scroll'),
('sub_txt_004','TXT-004','Tekstil','Karpet Bekas','utama',0,'C','M2',15000,'Rp10.000 - Rp25.000 / M2','fa-rug'),
-- 9. Elektronik (E-Waste)
('sub_elc_001','ELC-001','Elektronik (E-Waste)','Laptop & Notebook Bekas','utama',0,'A','Unit',150000,'Rp80.000 - Rp350.000 / Unit','fa-laptop'),
('sub_elc_002','ELC-002','Elektronik (E-Waste)','HP & Smartphone Bekas','utama',0,'A','Unit',45000,'Rp25.000 - Rp90.000 / Unit','fa-mobile-screen'),
('sub_elc_003','ELC-003','Elektronik (E-Waste)','Papan Sirkuit PCB Komputer','utama',0,'Super','Kg',48000,'Rp35.000 - Rp85.000 / Kg','fa-microchip'),
('sub_elc_004','ELC-004','Elektronik (E-Waste)','Server & Rack Bekas','utama',0,'A','Unit',450000,'Rp250.000 - Rp850.000 / Unit','fa-server'),
('sub_elc_005','ELC-005','Elektronik (E-Waste)','Printer & Mesin Fotokopi','utama',0,'B','Unit',85000,'Rp50.000 - Rp150.000 / Unit','fa-print'),
('sub_elc_006','ELC-006','Elektronik (E-Waste)','Kabel Elektronik & Data','utama',0,'A','Kg',28000,'Rp20.000 - Rp45.000 / Kg','fa-network-wired'),
-- 10. Baterai & Aki
('sub_bat_001','BAT-001','Baterai & Aki','Aki Kendaraan (Accu)','utama',0,'A','Kg',14500,'Rp12.000 - Rp18.000 / Kg','fa-car-battery'),
('sub_bat_002','BAT-002','Baterai & Aki','Baterai Lithium (Li-Ion)','utama',0,'A','Kg',38000,'Rp25.000 - Rp55.000 / Kg','fa-battery-full'),
('sub_bat_003','BAT-003','Baterai & Aki','UPS Battery Telecom','utama',0,'A','Unit',65000,'Rp45.000 - Rp95.000 / Unit','fa-tower-cell'),
('sub_bat_004','BAT-004','Baterai & Aki','Baterai Industri Forklift','utama',0,'A','Unit',850000,'Rp500.000 - Rp1.500.000 / Unit','fa-truck-ramp-box'),
-- 11. Organik
('sub_org_001','ORG-001','Organik','Sisa Makanan Restoran / Hotel','utama',0,'B','Kg',600,'Rp300 - Rp1.000 / Kg','fa-utensils'),
('sub_org_002','ORG-002','Organik','Limbah Kebun & Ranting Cacah','utama',0,'B','Ton',350000,'Rp200.000 - Rp500.000 / Ton','fa-leaf'),
('sub_org_003','ORG-003','Organik','Sekam Padi','utama',0,'A','Karung',12000,'Rp8.000 - Rp16.000 / Karung','fa-wheat-awn'),
('sub_org_004','ORG-004','Organik','Ampas Kopi Olahan','utama',0,'A','Kg',1200,'Rp800 - Rp2.000 / Kg','fa-mug-hot'),
('sub_org_005','ORG-005','Organik','Ampas Tebu (Bagasse)','utama',0,'A','Ton',420000,'Rp300.000 - Rp600.000 / Ton','fa-seedling'),
-- 12. Kemasan Industri Bekas
('sub_pkg_001','PKG-001','Kemasan Industri Bekas','Drum Besi 200L','utama',0,'A','Pcs',95000,'Rp75.000 - Rp135.000 / Pcs','fa-drum'),
('sub_pkg_002','PKG-002','Kemasan Industri Bekas','Drum Plastik HDPE 200L','utama',0,'A','Pcs',85000,'Rp65.000 - Rp120.000 / Pcs','fa-box-archive'),
('sub_pkg_003','PKG-003','Kemasan Industri Bekas','IBC Tank 1000L','utama',0,'A','Pcs',420000,'Rp350.000 - Rp750.000 / Pcs','fa-boxes-stacked'),
('sub_pkg_004','PKG-004','Kemasan Industri Bekas','Jerigen Plastik 20L - 30L','utama',0,'A','Pcs',16500,'Rp12.000 - Rp22.000 / Pcs','fa-jug-detergent'),
('sub_pkg_005','PKG-005','Kemasan Industri Bekas','Karung Jumbo (FIBC 1 Ton)','utama',0,'A','Pcs',35000,'Rp25.000 - Rp55.000 / Pcs','fa-boxes-packing'),
-- 13. Scrap Produksi (Industri)
('sub_ind_001','IND-001','Scrap Produksi','Reject Molding Plastik','industri',0,'A','Kg',8500,'Rp6.500 - Rp12.000 / Kg','fa-industry'),
('sub_ind_002','IND-002','Scrap Produksi','Runner Plastik Injeksi','industri',0,'A','Kg',9200,'Rp7.000 - Rp13.500 / Kg','fa-screwdriver-wrench'),
('sub_ind_003','IND-003','Scrap Produksi','Scrap Stamping Logam','industri',0,'A','Kg',8200,'Rp6.500 - Rp11.000 / Kg','fa-stamp'),
('sub_ind_004','IND-004','Scrap Produksi','Sisa Material Pabrik','industri',0,'A','Kg',7800,'Rp5.500 - Rp10.500 / Kg','fa-gears'),
-- 14. Material Recovery (Industri)
('sub_rec_001','REC-001','Material Recovery','Katalis Bekas (Spent Catalyst)','industri',0,'Super','Kg',42000,'Rp25.000 - Rp65.000 / Kg','fa-flask'),
('sub_rec_002','REC-002','Material Recovery','Resin Penukar Ion Bekas','industri',0,'B','Kg',18000,'Rp12.000 - Rp28.000 / Kg','fa-vial'),
('sub_rec_003','REC-003','Material Recovery','Karbon Aktif Bekas','industri',0,'B','Kg',12000,'Rp8.000 - Rp18.000 / Kg','fa-filter'),
('sub_rec_004','REC-004','Material Recovery','Filter Industri Bekas','industri',0,'B','Pcs',25000,'Rp15.000 - Rp45.000 / Pcs','fa-fan'),
-- 15. Limbah Konstruksi (Industri)
('sub_cst_001','CST-001','Limbah Konstruksi','Beton Bongkaran Gedung','industri',0,'B','Ton',95000,'Rp70.000 - Rp130.000 / Ton','fa-trowel-bricks'),
('sub_cst_002','CST-002','Limbah Konstruksi','Aspal Bekas Kupasan (RAP)','industri',0,'B','Ton',110000,'Rp80.000 - Rp150.000 / Ton','fa-road'),
('sub_cst_003','CST-003','Limbah Konstruksi','Puing Bata & Hebel','industri',0,'C','Truk',450000,'Rp350.000 - Rp650.000 / Truk','fa-building-crack'),
('sub_cst_004','CST-004','Limbah Konstruksi','Gypsum Board Bekas','industri',0,'C','M2',8500,'Rp5.000 - Rp14.000 / M2','fa-square'),
('sub_cst_005','CST-005','Limbah Konstruksi','Besi Tulangan Proyek','industri',0,'A','Kg',6800,'Rp5.500 - Rp8.000 / Kg','fa-bars'),
-- 16. Limbah B3 (Izin Khusus KLHK)
('sub_b3_001','B3-001','Limbah B3 (Izin Khusus)','Oli Pelumas Bekas (Limbah B3)','b3',1,'B3','Liter',3800,'Sesuai Izin KLHK','fa-biohazard'),
('sub_b3_002','B3-002','Limbah B3 (Izin Khusus)','Filter Oli Bekas (Limbah B3)','b3',1,'B3','Pcs',2500,'Sesuai Izin KLHK','fa-filter'),
('sub_b3_003','B3-003','Limbah B3 (Izin Khusus)','Sludge IPAL / Minyak Industri','b3',1,'B3','Ton',850000,'Sesuai Izin KLHK','fa-triangle-exclamation'),
('sub_b3_004','B3-004','Limbah B3 (Izin Khusus)','Solvent Bekas / Thinner','b3',1,'B3','Drum',180000,'Sesuai Izin KLHK','fa-flask-vial'),
('sub_b3_005','B3-005','Limbah B3 (Izin Khusus)','Aki Bekas Asam Sulfat','b3',1,'B3','Kg',12500,'Sesuai Izin KLHK','fa-car-battery'),
('sub_b3_006','B3-006','Limbah B3 (Izin Khusus)','Lampu Neon TL Bekas Merkuri','b3',1,'B3','Pcs',1500,'Sesuai Izin KLHK','fa-lightbulb'),
('sub_b3_007','B3-007','Limbah B3 (Izin Khusus)','Bahan Kimia Kedaluwarsa','b3',1,'B3','Kg',5500,'Sesuai Izin KLHK','fa-skull-crossbones')
ON DUPLICATE KEY UPDATE
  main_category = VALUES(main_category),
  sub_category  = VALUES(sub_category),
  group_type    = VALUES(group_type),
  is_b3         = VALUES(is_b3),
  grade_default = VALUES(grade_default),
  unit          = VALUES(unit),
  avg_price     = VALUES(avg_price),
  price_range   = VALUES(price_range),
  icon          = VALUES(icon);

-- ====================================================================
-- SELESAI: Database bursalimbahdb siap digunakan
-- Jalankan database/seed_demo.sql untuk data demo (opsional)
-- ====================================================================
SELECT CONCAT('Setup selesai: ', COUNT(*), ' kategori tersimpan.') AS status FROM `categories`;
