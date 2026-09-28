-- Modul event: peserta, minat, pendaftaran, dan pembayaran.
-- Jalankan setelah database/setup_complete.sql.

CREATE TABLE IF NOT EXISTS event_participants (
  id VARCHAR(64) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  company VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_participant_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_interests (
  id VARCHAR(64) NOT NULL,
  event_id VARCHAR(64) NOT NULL,
  participant_id VARCHAR(64) NOT NULL,
  attendee_count INT NOT NULL DEFAULT 1,
  note TEXT DEFAULT NULL,
  status ENUM('new','contacted','converted','cancelled') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_interest_event_status (event_id, status),
  CONSTRAINT fk_interest_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_interest_participant FOREIGN KEY (participant_id) REFERENCES event_participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_registrations_v2 (
  id VARCHAR(64) NOT NULL,
  event_id VARCHAR(64) NOT NULL,
  participant_id VARCHAR(64) NOT NULL,
  attendee_count INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  registration_status ENUM('awaiting_payment','payment_review','confirmed','cancelled') NOT NULL DEFAULT 'awaiting_payment',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_participant_registration (event_id, participant_id),
  KEY idx_registration_event_status (event_id, registration_status),
  CONSTRAINT fk_registration_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_registration_participant FOREIGN KEY (participant_id) REFERENCES event_participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_payments (
  id VARCHAR(64) NOT NULL,
  registration_id VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
  payment_reference VARCHAR(100) DEFAULT NULL,
  payment_status ENUM('pending','submitted','paid','rejected','expired') NOT NULL DEFAULT 'pending',
  paid_at DATETIME DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_payment_registration (registration_id),
  CONSTRAINT fk_payment_registration FOREIGN KEY (registration_id) REFERENCES event_registrations_v2(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
