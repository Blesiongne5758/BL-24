-- ====================================================================
-- BURSA LIMBAH — RESET DATABASE (reset.sql)
-- ⚠️  HATI-HATI: Script ini menghapus SEMUA data!
-- Gunakan hanya di environment development / testing
-- ====================================================================

USE `bursalimbahdb`;

-- Nonaktifkan foreign key check sementara
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus semua tabel
DROP TABLE IF EXISTS `event_registrations`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `admin_logs`;
DROP TABLE IF EXISTS `chat_messages`;
DROP TABLE IF EXISTS `chat_rooms`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `pickup_schedules`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `offers`;
DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `addresses`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `users`;

-- Aktifkan kembali foreign key check
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Reset selesai. Jalankan setup_complete.sql untuk membuat ulang semua tabel.' AS pesan;
