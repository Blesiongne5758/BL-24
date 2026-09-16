const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || '108.136.70.118',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'admin',
  password: [REDACTED]
  database: process.env.DB_NAME || 'bursalimbahdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Buat pool koneksi MySQL
const pool = mysql.createPool(dbConfig);

/**
 * Uji koneksi ke database MySQL dan inisialisasi tabel jika belum ada
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[MySQL] Berhasil terhubung ke database "${dbConfig.database}" di ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    return true;
  } catch (error) {
    console.warn(`[MySQL WARN] Tidak dapat terhubung ke database: ${error.message}`);
    console.warn(`[MySQL WARN] Pastikan server MySQL berjalan dan database "${dbConfig.database}" telah dibuat.`);
    return false;
  }
}

module.exports = {
  pool,
  dbConfig,
  testConnection
};
