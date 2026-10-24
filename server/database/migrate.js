// SPDX-License-Identifier: MIT
/**
 * PostgreSQL/Supabase schema migration runner.
 * Base tables and seed data live in database/supabase_schema.sql.
 * This runner only applies additive compatibility changes required by the API.
 */

const { pool } = require('../db');

async function hasColumn(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
        AND column_name = $2
      LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function hasIndex(indexName) {
  const [rows] = await pool.query(
    `SELECT 1
       FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = $1
      LIMIT 1`,
    [indexName]
  );
  return rows.length > 0;
}

async function runMigrations() {
  console.log('[Migration] Memeriksa skema PostgreSQL/Supabase dan indeks optimasi...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT NULL,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) DEFAULT NULL,
      target_id VARCHAR(64) DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      user_agent VARCHAR(255) DEFAULT NULL,
      details JSONB DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const userColumns = [
    { name: 'payment_methods', definition: 'TEXT DEFAULT NULL' },
    { name: 'verification_type', definition: 'VARCHAR(30) DEFAULT NULL' },
    { name: 'ktp_number', definition: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'npwp_number', definition: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'verification_doc_url', definition: 'TEXT DEFAULT NULL' },
    { name: 'verified_badge', definition: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'verified_at', definition: 'VARCHAR(50) DEFAULT NULL' }
  ];

  for (const column of userColumns) {
    if (!(await hasColumn('users', column.name))) {
      await pool.query(`ALTER TABLE "users" ADD COLUMN "${column.name}" ${column.definition}`);
      console.log(`[Migration] Menambahkan kolom users.${column.name}.`);
    }
  }

  const orderColumns = [
    { name: 'remaining_payment_status', definition: "VARCHAR(50) NOT NULL DEFAULT 'unpaid'" },
    { name: 'remaining_payment_proof', definition: 'TEXT DEFAULT NULL' },
    { name: 'remaining_payment_notes', definition: 'TEXT DEFAULT NULL' },
    { name: 'remaining_payment_submitted_at', definition: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'remaining_payment_verified_at', definition: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'remaining_payment_verified_by', definition: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'remaining_payment_ref', definition: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'remaining_payment_bank', definition: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'co2_reduction_kg', definition: 'DECIMAL(10, 2) DEFAULT 0.00' }
  ];

  for (const column of orderColumns) {
    if (!(await hasColumn('orders', column.name))) {
      await pool.query(`ALTER TABLE "orders" ADD COLUMN "${column.name}" ${column.definition}`);
      console.log(`[Migration] Menambahkan kolom orders.${column.name}.`);
    }
  }

  const indexes = [
    ['idx_audit_user', 'audit_logs', '(user_id)'],
    ['idx_audit_action', 'audit_logs', '(action)'],
    ['idx_audit_created', 'audit_logs', '(created_at)'],
    ['idx_perf_products_status', 'products', '(status, created_at DESC)'],
    ['idx_perf_products_seller', 'products', '(seller_id)'],
    ['idx_perf_products_category', 'products', '(category_id)'],
    ['idx_perf_orders_buyer', 'orders', '(buyer_id, created_at DESC)'],
    ['idx_perf_orders_seller', 'orders', '(seller_id, created_at DESC)'],
    ['idx_perf_orders_status', 'orders', '(status)'],
    ['idx_perf_chats_product', 'chat_rooms', '(product_id, created_at)']
  ];

  for (const [indexName, tableName, expression] of indexes) {
    if (!(await hasIndex(indexName))) {
      await pool.query(`CREATE INDEX "${indexName}" ON "${tableName}" ${expression}`);
      console.log(`[Migration] Membuat indeks ${indexName}.`);
    }
  }

  console.log('[Migration] Migrasi PostgreSQL/Supabase selesai.');
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(async error => {
      console.error('[Migration Error]', error);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runMigrations };
