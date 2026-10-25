// SPDX-License-Identifier: MIT
/**
 * Database Migration & Performance Indexing Runner
 * Memastikan seluruh skema tabel, kolom penting, dan indeks performa
 * terpasang secara konsisten di database MySQL.
 */

const { pool, withTransaction } = require('../db');

async function runMigrations() {
  console.log('[Migration] Memeriksa skema database dan indeks optimasi...');

  // 1. Buat Tabel audit_logs jika belum ada
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT NULL,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) DEFAULT NULL,
      target_id VARCHAR(64) DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      user_agent VARCHAR(255) DEFAULT NULL,
      details JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_user (user_id),
      INDEX idx_audit_action (action),
      INDEX idx_audit_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Daftar kolom yang harus dipastikan ada di tabel users
  const userColumns = [
    { name: 'payment_methods', def: 'LONGTEXT DEFAULT NULL' },
    { name: 'verification_type', def: 'VARCHAR(30) DEFAULT NULL' },
    { name: 'ktp_number', def: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'npwp_number', def: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'verification_doc_url', def: 'TEXT DEFAULT NULL' },
    { name: 'verified_badge', def: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'verified_at', def: 'VARCHAR(50) DEFAULT NULL' }
  ];

  for (const col of userColumns) {
    const [chk] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [col.name]
    );
    if (chk.length === 0) {
      await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
      console.log(`[Migration] Menambahkan kolom '${col.name}' ke tabel users.`);
    }
  }

  // 3. Daftar kolom yang harus dipastikan ada di tabel orders
  const orderColumns = [
    { name: 'offer_id', def: 'VARCHAR(64) DEFAULT NULL' },
    { name: 'quantity', def: 'DECIMAL(12,2) NOT NULL DEFAULT 1.00' },
    { name: 'unit', def: "VARCHAR(20) NOT NULL DEFAULT 'Kg'" },
    { name: 'unit_price', def: 'DECIMAL(14,2) NOT NULL DEFAULT 0.00' },
    { name: 'remaining_payment_status', def: 'VARCHAR(50) DEFAULT "unpaid"' },
    { name: 'remaining_payment_proof', def: 'TEXT DEFAULT NULL' },
    { name: 'remaining_payment_submitted_at', def: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'remaining_payment_verified_at', def: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'remaining_payment_verified_by', def: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'remaining_payment_ref', def: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'remaining_payment_bank', def: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'co2_reduction_kg', def: 'DECIMAL(10, 2) DEFAULT 0.00' }
  ];

  for (const col of orderColumns) {
    const [chk] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = ?`,
      [col.name]
    );
    if (chk.length === 0) {
      await pool.query(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.def}`);
      console.log(`[Migration] Menambahkan kolom '${col.name}' ke tabel orders.`);
    }
  }

  // 4. Pasang Indeks Kinerja Tambahan jika belum ada
  const indexes = [
    { table: 'products', name: 'idx_perf_products_status', def: '(status, created_at DESC)' },
    { table: 'products', name: 'idx_perf_products_seller', def: '(seller_id)' },
    { table: 'products', name: 'idx_perf_products_category', def: '(category_id)' },
    { table: 'orders', name: 'idx_perf_orders_buyer', def: '(buyer_id, created_at DESC)' },
    { table: 'orders', name: 'idx_perf_orders_seller', def: '(seller_id, created_at DESC)' },
    { table: 'orders', name: 'idx_perf_orders_status', def: '(status)' },
    { table: 'chats', name: 'idx_perf_chats_product', def: '(product_id, created_at)' }
  ];

  for (const idx of indexes) {
    try {
      const [chk] = await pool.query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [idx.table, idx.name]
      );
      if (chk.length === 0) {
        await pool.query(`ALTER TABLE ${idx.table} ADD INDEX ${idx.name} ${idx.def}`);
        console.log(`[Migration] Indeks performa '${idx.name}' berhasil dibuat pada tabel '${idx.table}'.`);
      }
    } catch (_) {
      // Abaikan jika tabel belum ada atau indeks sudah ada
    }
  }

  console.log('[Migration] Migrasi dan indeks optimasi selesai.');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Migration Error]', err);
      process.exit(1);
    });
}

module.exports = {
  runMigrations
};
