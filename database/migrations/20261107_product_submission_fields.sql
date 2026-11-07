-- Jalankan sekali pada database MySQL Bursa Limbah yang sudah aktif.
-- Menyimpan pilihan tier, jumlah wadah, NIB, dan izin TPS dari form Mulai Jual.
ALTER TABLE `products`
  MODIFY COLUMN `condition` ENUM('bersih','campur','terpress','cacah','baled','sudah_dipilah') NOT NULL DEFAULT 'bersih',
  ADD COLUMN `container_qty` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `container_type`,
  ADD COLUMN `source_type` VARCHAR(40) DEFAULT NULL AFTER `origin_source`,
  ADD COLUMN `nib` VARCHAR(50) DEFAULT NULL AFTER `source_type`,
  ADD COLUMN `tps_permit` VARCHAR(100) DEFAULT NULL AFTER `nib`;
