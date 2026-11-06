-- Payment gateway credentials and buyer manual payment review records.
-- Run once against the existing MySQL database before deploying the API/UI.
CREATE TABLE IF NOT EXISTS payment_gateway_config (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  provider VARCHAR(32) NOT NULL DEFAULT 'midtrans',
  environment VARCHAR(16) NOT NULL DEFAULT 'sandbox',
  merchant_id VARCHAR(120) DEFAULT NULL,
  client_key VARCHAR(255) DEFAULT NULL,
  server_key_ciphertext TEXT DEFAULT NULL,
  server_key_iv VARCHAR(64) DEFAULT NULL,
  server_key_tag VARCHAR(64) DEFAULT NULL,
  static_qris_url TEXT DEFAULT NULL,
  static_qris_label VARCHAR(180) DEFAULT NULL,
  payment_channels TEXT DEFAULT NULL,
  expedition_enabled TINYINT(1) NOT NULL DEFAULT 0,
  expedition_provider VARCHAR(32) NOT NULL DEFAULT 'manual',
  expedition_key_ciphertext TEXT DEFAULT NULL,
  expedition_key_iv VARCHAR(64) DEFAULT NULL,
  expedition_key_tag VARCHAR(64) DEFAULT NULL,
  expedition_origin VARCHAR(180) DEFAULT NULL,
  expedition_couriers TEXT DEFAULT NULL,
  manual_shipping_options LONGTEXT DEFAULT NULL,
  updated_by VARCHAR(64) DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_payment_records (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  buyer_id VARCHAR(64) NOT NULL,
  payment_type VARCHAR(32) NOT NULL DEFAULT 'initial',
  amount DECIMAL(14,2) NOT NULL,
  method VARCHAR(32) NOT NULL,
  provider VARCHAR(32) DEFAULT NULL,
  gateway_order_id VARCHAR(64) DEFAULT NULL,
  provider_transaction_id VARCHAR(120) DEFAULT NULL,
  provider_transaction_status VARCHAR(40) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  proof_storage_key VARCHAR(512) DEFAULT NULL,
  payment_reference VARCHAR(120) DEFAULT NULL,
  metadata LONGTEXT DEFAULT NULL,
  reviewed_by VARCHAR(64) DEFAULT NULL,
  review_note TEXT DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_payment_gateway_order (gateway_order_id),
  KEY idx_order_payment_review (status, created_at),
  KEY idx_order_payment_buyer (buyer_id, created_at),
  CONSTRAINT fk_order_payment_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_payment_buyer FOREIGN KEY (buyer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_fulfillments (
  order_id VARCHAR(64) NOT NULL PRIMARY KEY,
  shipping_method VARCHAR(100) NOT NULL DEFAULT 'Armada Mandiri Pembeli',
  courier_code VARCHAR(40) DEFAULT NULL,
  courier_name VARCHAR(100) DEFAULT NULL,
  shipping_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
  shipping_status VARCHAR(40) NOT NULL DEFAULT 'pending_dispatch',
  tracking_number VARCHAR(120) DEFAULT NULL,
  delivery_details LONGTEXT DEFAULT NULL,
  dispatched_at DATETIME DEFAULT NULL,
  received_at DATETIME DEFAULT NULL,
  actual_received_weight DECIMAL(12,2) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fulfillment_order FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO payment_gateway_config (id) VALUES (1) ON DUPLICATE KEY UPDATE id=VALUES(id);
