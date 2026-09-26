const mysql = require('mysql2/promise');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  host:             process.env.DB_HOST     || '108.136.70.118',
  port:             parseInt(process.env.DB_PORT, 10) || 3306,
  user:             process.env.DB_USER     || 'admin',
  password:         [REDACTED]
  database:         process.env.DB_NAME     || 'bursalimbahdb',
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  connectTimeout:   10000,
  // Reconnect otomatis jika koneksi terputus
  enableKeepAlive:  true,
  keepAliveInitialDelay: 30000
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
    console.log(`║  Waktu DB : ${new Date(rows[0].server_time).toLocaleString('id-ID')}`.padEnd(54) + '║');
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
    console.error('║  3. Jalankan: database/setup_complete.sql            ║');
    console.error('║  4. Periksa file server/.env                         ║');
    console.error('╚══════════════════════════════════════════════════════╝');
    console.warn('[DB WARN] Server tetap berjalan tanpa koneksi database.');
    console.warn('[DB WARN] API /api/auth/* akan mengembalikan error 503.');
    return false;
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
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('[DB Query Error]', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  dbConfig,
  testConnection,
  query
};
