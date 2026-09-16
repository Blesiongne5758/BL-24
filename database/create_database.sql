-- ====================================================================
-- BURSA LIMBAH / WASTEHUB — DATABASE SETUP SCRIPT (MySQL 8.4 LTS)
-- Sesuai cetak biru struktur_db.md: 18 Tabel Lengkap, 3-Tier, DP 30%, 
-- 10 Atribut Wajib Listing, Master 16 Kategori (Utama, B2B, B3)
-- Target Database: bursalimbahdb
-- Target User: admin@% (Password: [REDACTED])
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `bursalimbahdb`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY '[REDACTED]';
ALTER USER 'admin'@'%' IDENTIFIED BY '[REDACTED]';
GRANT ALL PRIVILEGES ON `bursalimbahdb`.* TO 'admin'@'%';
FLUSH PRIVILEGES;

USE `bursalimbahdb`;

-- 1. TABEL: users
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `role` ENUM('buyer', 'seller', 'admin') NOT NULL DEFAULT 'buyer',
  `full_name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(150) DEFAULT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `npwp` VARCHAR(50) DEFAULT NULL,
  `verified` TINYINT(1) NOT NULL DEFAULT 0,
  `subscription_active` TINYINT(1) NOT NULL DEFAULT 1,
  `subscription_tier` VARCHAR(50) NOT NULL DEFAULT 'tier_starter',
  `subscription_expiry` DATE DEFAULT NULL,
  `bank_account` VARCHAR(100) DEFAULT NULL,
  `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL: subscriptions
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `plan_name` VARCHAR(50) NOT NULL,
  `price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subs_user` (`user_id`),
  CONSTRAINT `fk_subs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL: addresses
CREATE TABLE IF NOT EXISTS `addresses` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `province` VARCHAR(100) DEFAULT NULL,
  `city` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) DEFAULT NULL,
  `postal_code` VARCHAR(10) DEFAULT NULL,
  `address` TEXT NOT NULL,
  `latitude` DECIMAL(10, 7) DEFAULT NULL,
  `longitude` DECIMAL(10, 7) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addr_user` (`user_id`),
  CONSTRAINT `fk_addr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL: categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) NOT NULL,
  `category_code` VARCHAR(20) NOT NULL,
  `main_category` VARCHAR(100) NOT NULL,
  `sub_category` TEXT DEFAULT NULL,
  `group_type` ENUM('utama', 'industri', 'b3') NOT NULL DEFAULT 'utama',
  `is_b3` TINYINT(1) NOT NULL DEFAULT 0,
  `grade_default` VARCHAR(10) NOT NULL DEFAULT 'A',
  `unit` VARCHAR(20) NOT NULL DEFAULT 'Kg',
  `description` TEXT DEFAULT NULL,
  `avg_price` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `price_range` VARCHAR(100) DEFAULT NULL,
  `icon` VARCHAR(50) DEFAULT NULL,
  `image` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_cat_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL: products (10 Atribut Wajib Listing)
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `category_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `condition` ENUM('bersih', 'campur', 'terpress', 'cacah', 'baled') NOT NULL DEFAULT 'bersih',
  `grade` VARCHAR(50) DEFAULT 'Grade A',
  `container_type` VARCHAR(100) DEFAULT 'Jerigen / Drum / Bal',
  `weight` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `volume` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'Kg',
  `origin_source` VARCHAR(200) DEFAULT NULL,
  `location` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `latitude` DECIMAL(10, 7) DEFAULT NULL,
  `longitude` DECIMAL(10, 7) DEFAULT NULL,
  `asking_price` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `minimum_order` DECIMAL(12, 2) NOT NULL DEFAULT 1.00,
  `pickup_schedule` VARCHAR(100) NOT NULL DEFAULT 'Siap Angkut Segera',
  `status` ENUM('tersedia', 'terjual', 'kontrak', 'draft', 'pending', 'approved', 'booked') NOT NULL DEFAULT 'tersedia',
  `is_b3` TINYINT(1) NOT NULL DEFAULT 0,
  `b3_permit_number` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_products_code` (`code`),
  KEY `idx_products_seller` (`seller_id`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_status` (`status`),
  CONSTRAINT `fk_prod_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_prod_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL: product_images
CREATE TABLE IF NOT EXISTS `product_images` (
  `id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `image_url` TEXT NOT NULL,
  `caption` VARCHAR(200) DEFAULT NULL,
  `is_evidence` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_img_product` (`product_id`),
  CONSTRAINT `fk_img_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL: offers
CREATE TABLE IF NOT EXISTS `offers` (
  `id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `buyer_id` VARCHAR(64) NOT NULL,
  `offer_price` DECIMAL(14, 2) NOT NULL,
  `evidence_photo` TEXT DEFAULT NULL,
  `waste_origin` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_offers_prod` (`product_id`),
  KEY `idx_offers_buyer` (`buyer_id`),
  CONSTRAINT `fk_off_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_off_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABEL: orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `buyer_id` VARCHAR(64) NOT NULL,
  `offer_id` VARCHAR(64) DEFAULT NULL,
  `total_amount` DECIMAL(14, 2) NOT NULL,
  `dp_amount` DECIMAL(14, 2) NOT NULL,
  `service_fee` DECIMAL(14, 2) NOT NULL DEFAULT 10000.00,
  `status` VARCHAR(30) NOT NULL DEFAULT 'dp_pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_seller` (`seller_id`),
  KEY `idx_orders_buyer` (`buyer_id`),
  KEY `idx_orders_prod` (`product_id`),
  CONSTRAINT `fk_ord_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ord_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ord_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABEL: payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(64) NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `payment_type` VARCHAR(30) NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `payment_status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_order` (`order_id`),
  CONSTRAINT `fk_pay_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABEL: transactions
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(64) NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `gross_amount` DECIMAL(14, 2) NOT NULL,
  `service_fee` DECIMAL(14, 2) NOT NULL DEFAULT 10000.00,
  `seller_receive` DECIMAL(14, 2) NOT NULL,
  `transaction_status` VARCHAR(30) NOT NULL DEFAULT 'escrow_hold',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tx_order` (`order_id`),
  CONSTRAINT `fk_tx_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABEL: pickup_schedules
CREATE TABLE IF NOT EXISTS `pickup_schedules` (
  `id` VARCHAR(64) NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `pickup_date` DATE DEFAULT NULL,
  `pickup_time` VARCHAR(20) DEFAULT NULL,
  `pickup_address` TEXT DEFAULT NULL,
  `driver_name` VARCHAR(100) DEFAULT NULL,
  `vehicle_number` VARCHAR(30) DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pickup_order` (`order_id`),
  CONSTRAINT `fk_pick_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABEL: reviews
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(64) NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `reviewer_id` VARCHAR(64) NOT NULL,
  `rating` INT NOT NULL CHECK(`rating` BETWEEN 1 AND 5),
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rev_order` (`order_id`),
  KEY `idx_rev_user` (`reviewer_id`),
  CONSTRAINT `fk_rev_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_rev_user` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TABEL: favorites
CREATE TABLE IF NOT EXISTS `favorites` (
  `user_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `product_id`),
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. TABEL: notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. TABEL: chat_rooms
CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id` VARCHAR(64) NOT NULL,
  `buyer_id` VARCHAR(64) NOT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_users` (`buyer_id`, `seller_id`),
  CONSTRAINT `fk_cr_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_cr_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. TABEL: chat_messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` VARCHAR(64) NOT NULL,
  `room_id` VARCHAR(64) NOT NULL,
  `sender_id` VARCHAR(64) NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_room` (`room_id`),
  CONSTRAINT `fk_msg_room` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. TABEL: admin_logs
CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id` VARCHAR(64) NOT NULL,
  `admin_id` VARCHAR(64) NOT NULL,
  `action` VARCHAR(200) NOT NULL,
  `target_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_admin` (`admin_id`),
  CONSTRAINT `fk_log_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. TABEL: system_settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` VARCHAR(200) NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
