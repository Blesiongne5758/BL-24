// SPDX-License-Identifier: MIT
/**
 * BURSA LIMBAH / CIRCULINK — Database Connection Pool & Query Manager
 * Production-ready MySQL connection management with connection pooling,
 * reconnect resilience, transaction manager, and healthcheck probing.
 */

const mysql = require('mysql2/promise');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  host:             process.env.DB_HOST     || 'localhost',
  port:             parseInt(process.env.DB_PORT, 10) || 3306,
  user:             process.env.DB_USER     || 'root',
  password:         [REDACTED]
  database:         process.env.DB_NAME     || 'bursalimbahdb',
  waitForConnections: true,
  connectionLimit:  parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 15,
  queueLimit:       0,
  connectTimeout:   10000,
  enableKeepAlive:  true,
  keepAliveInitialDelay: 30000,
  dateStrings:      true
};

// Buat pool koneksi MySQL
const pool = mysql.createPool(dbConfig);

/**
 * Uji koneksi ke database MySQL.
 * Dipanggil saat server pertama kali start.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT VERSION() AS version, NOW() AS server_time');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  ✅  MySQL Database Terhubung                        ║');
    console.log(`║  Host     : ${dbConfig.host}:${dbConfig.port}`.padEnd(54) + '║');
    console.log(`║  Database : ${dbConfig.database}`.padEnd(54) + '║');
    console.log(`║  MySQL    : ${rows[0].version}`.padEnd(54) + '║');
    console.log(`║  Waktu DB : ${rows[0].server_time}`.padEnd(54) + '║');
    console.log('╚══════════════════════════════════════════════════════╝');
    connection.release();
    return true;
  } catch (error) {
    console.error('╔══════════════════════════════════════════════════════╗');
    console.error('║  ❌  GAGAL Terhubung ke Database MySQL               ║');
    console.error(`║  Error: ${error.message}`.substring(0, 53).padEnd(53) + '║');
    console.error('║                                                      ║');
    console.error('║  Pastikan:                                           ║');
    console.error('║  1. Server MySQL aktif di host yang dikonfigurasi    ║');
    console.error('║  2. Database "bursalimbahdb" sudah dibuat            ║');
    console.error('║  3. Periksa file server/.env                         ║');
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
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message, latencyMs: Date.now() - start };
  }
}

/**
 * Eksekusi query tunggal dengan error handling.
 * @param {string} sql   Query SQL
 * @param {Array}  params Parameter bind
 * @returns {Promise<Array>} Rows hasil query
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('[DB Query Error]', error.message);
    throw error;
  }
}

/**
 * Eksekutor Transaksi Terkelola (ACID compliant).
 * Menjalankan sejumlah operasi query dalam 1 transaction; otomatis commit atau rollback saat error.
 * @param {Function} callback function(connection)
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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
