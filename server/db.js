// SPDX-License-Identifier: MIT
/**
 * BURSA LIMBAH / CIRCULINK — Database Connection Pool & Query Manager
 * Production-ready PostgreSQL (Supabase) connection management with
 * connection pooling, reconnect resilience, transaction manager, and healthcheck probing.
 */

const { Pool } = require('pg');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  connectionString: process.env.DB_URL,
  max:             parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Buat pool koneksi PostgreSQL
const pool = new Pool(dbConfig);

/**
 * Uji koneksi ke database PostgreSQL.
 * Dipanggil saat server pertama kali start.
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT version() AS version, NOW() AS server_time');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  ✅  PostgreSQL Database Terhubung (Supabase)        ║');
    console.log(`║  URL      : ${dbConfig.connectionString ? 'Configured' : 'Not Set'}`.padEnd(54) + '║');
    console.log(`║  Max Pool : ${dbConfig.max}`.padEnd(54) + '║');
    console.log(`║  PG Ver   : ${res.rows[0].version}`.substring(0, 53).padEnd(54) + '║');
    console.log(`║  Waktu DB : ${res.rows[0].server_time}`.substring(0, 53).padEnd(54) + '║');
    console.log('╚══════════════════════════════════════════════════════╝');
    client.release();
    return true;
  } catch (error) {
    console.error('╔══════════════════════════════════════════════════════╗');
    console.error('║  ❌  GAGAL Terhubung ke Database PostgreSQL          ║');
    console.error(`║  Error: ${error.message}`.substring(0, 53).padEnd(53) + '║');
    console.error('║                                                      ║');
    console.error('║  Pastikan:                                           ║');
    console.error('║  1. DB_URL di server/.env sudah benar                ║');
    console.error('║  2. Akses network ke Supabase diizinkan             ║');
    console.error('║  3. DB_SSL=true jika menggunakan Supabase             ║');
    console.error('╚══════════════════════════════════════════════════════╝');
    return false;
  }
}

/**
 * Healthcheck ping untuk monitoring & load balancer probe.
 */
async function ping() {
  const start = Date.now();
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message, latencyMs: Date.now() - start };
  }
}

/**
 * Eksekusi query tunggal dengan error handling.
 * @param {string} sql   Query SQL (Use $1, $2 for placeholders)
 * @param {Array}  params Parameter bind
 * @returns {Promise<Array>} Rows hasil query
 */
async function query(sql, params = []) {
  try {
    const res = await pool.query(sql, params);
    return res.rows;
  } catch (error) {
    console.error('[DB Query Error]', error.message);
    throw error;
  }
}

/**
 * Eksekutor Transaksi Terkelola (ACID compliant).
 * Menjalankan sejumlah operasi query dalam 1 transaction; otomatis commit atau rollback saat error.
 * @param {Function} callback function(client)
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  dbConfig,
  testConnection,
  ping,
  query,
  withTransaction
};
