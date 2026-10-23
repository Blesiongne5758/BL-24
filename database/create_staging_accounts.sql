-- SPDX-License-Identifier: MIT
-- Provisioning akun staging BL-24
--
-- KEAMANAN:
-- 1. Jangan isi password plaintext di file ini.
-- 2. Ganti hanya tiga nilai *_password_hash dengan bcrypt hash hasil secret manager.
-- 3. Hash harus bcrypt $2a$, $2b$, atau $2y$ dengan panjang 60 karakter.
-- 4. Jalankan hanya pada database staging yang sudah dibuat oleh setup_complete.sql.
-- 5. Skrip berhenti jika ID/email sudah ada; tidak melakukan overwrite akun lama.

USE `bursalimbah_staging`;

SET @buyer_password_hash = 'REPLACE_WITH_BUYER_BCRYPT_HASH';
SET @seller_password_hash = 'REPLACE_WITH_SELLER_BCRYPT_HASH';
SET @admin_password_hash = 'REPLACE_WITH_ADMIN_BCRYPT_HASH';

DELIMITER $$

DROP PROCEDURE IF EXISTS provision_staging_accounts$$

CREATE PROCEDURE provision_staging_accounts()
SQL SECURITY INVOKER
BEGIN
  DECLARE duplicate_count INT DEFAULT 0;

  -- Fail closed jika hash belum diganti atau bukan bcrypt 60 karakter.
  IF CHAR_LENGTH(@buyer_password_hash) <> 60
     OR LEFT(@buyer_password_hash, 4) NOT IN ('$2a$', '$2b$', '$2y$')
     OR CHAR_LENGTH(@seller_password_hash) <> 60
     OR LEFT(@seller_password_hash, 4) NOT IN ('$2a$', '$2b$', '$2y$')
     OR CHAR_LENGTH(@admin_password_hash) <> 60
     OR LEFT(@admin_password_hash, 4) NOT IN ('$2a$', '$2b$', '$2y$') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Semua password hash wajib bcrypt valid 60 karakter; password plaintext tidak diterima.';
  END IF;

  SELECT COUNT(*) INTO duplicate_count
  FROM users
  WHERE id IN ('stg_buyer_01', 'stg_seller_01', 'stg_admin_01')
     OR email IN (
       'stg.buyer@example.test',
       'stg.seller@example.test',
       'stg.admin@example.test'
     );

  IF duplicate_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Salah satu ID/email akun staging sudah ada; skrip tidak melakukan overwrite.';
  END IF;

  START TRANSACTION;

  INSERT INTO users (
    id, role, name, company, email, phone, password_hash, auth_provider,
    subscription_tier, subscription_active, subscription_expiry,
    identity_verified, verification_status, verified_badge,
    bank_account, location, balance
  ) VALUES
  (
    'stg_buyer_01', 'buyer', 'Staging Buyer', 'BL-24 Staging Buyer',
    'stg.buyer@example.test', '+62 811-0000-0001', @buyer_password_hash, 'local',
    'tier_starter', 1, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY),
    0, 'unverified', 'Akun Staging', '-', 'Staging', 0.00
  ),
  (
    'stg_seller_01', 'seller', 'Staging Seller', 'BL-24 Staging Seller',
    'stg.seller@example.test', '+62 811-0000-0002', @seller_password_hash, 'local',
    'tier_starter', 1, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY),
    0, 'unverified', 'Akun Staging', '-', 'Staging', 0.00
  ),
  (
    'stg_admin_01', 'admin', 'Staging Administrator', 'BL-24 Staging Operations',
    'stg.admin@example.test', '+62 811-0000-0003', @admin_password_hash, 'local',
    'tier_starter', 1, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY),
    0, 'unverified', 'Akun Staging Admin', '-', 'Staging', 0.00
  );

  COMMIT;
END$$

DELIMITER ;

CALL provision_staging_accounts();
DROP PROCEDURE provision_staging_accounts;

-- Verifikasi tanpa menampilkan password hash.
SELECT id, role, email, auth_provider, identity_verified, verification_status
FROM users
WHERE id IN ('stg_buyer_01', 'stg_seller_01', 'stg_admin_01')
ORDER BY FIELD(role, 'buyer', 'seller', 'admin');
