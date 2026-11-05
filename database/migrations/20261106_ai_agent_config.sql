-- Konfigurasi tunggal agent AI. Nilai API key disimpan sebagai AES-256-GCM ciphertext.
CREATE TABLE IF NOT EXISTS `ai_agent_config` (
  `id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `provider` VARCHAR(40) NOT NULL DEFAULT 'inferx',
  `base_url` VARCHAR(255) NOT NULL DEFAULT 'https://model.inferx.net/endpoints/v1',
  `model_name` VARCHAR(120) NOT NULL DEFAULT 'deepseek-v4.1-flash',
  `api_key_encrypted` TEXT DEFAULT NULL,
  `api_key_iv` VARCHAR(64) DEFAULT NULL,
  `api_key_tag` VARCHAR(64) DEFAULT NULL,
  `site_help_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `product_search_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `product_posting_assist_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `ai_agent_config` (`id`) VALUES (1);
