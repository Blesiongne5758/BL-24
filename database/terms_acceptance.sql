-- Jalankan pada database yang sudah ada untuk fitur persetujuan Syarat & Ketentuan.
ALTER TABLE system_settings MODIFY COLUMN setting_value TEXT NOT NULL;

INSERT INTO system_settings (setting_key, setting_value) VALUES
('terms_title', 'Syarat dan Ketentuan Penggunaan Bursa Limbah'),
('terms_version', '1.0'),
('terms_content', 'Dengan membuat akun, Anda menyatakan data yang diberikan benar dan menyetujui ketentuan penggunaan Bursa Limbah.')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

CREATE TABLE IF NOT EXISTS user_terms_acceptances (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  terms_version VARCHAR(20) NOT NULL,
  terms_title VARCHAR(200) NOT NULL,
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_terms_version (user_id, terms_version),
  CONSTRAINT fk_terms_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
