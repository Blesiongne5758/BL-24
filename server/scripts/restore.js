// SPDX-License-Identifier: MIT
/**
 * Database Restore Engine (Bursa Limbah / Circulink)
 * Memulihkan database MySQL dari berkas dump SQL cadangan.
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

/**
 * Pulihkan database dari file dump SQL
 * @param {string} sqlFilePath Path berkas SQL
 */
async function restoreDatabase(sqlFilePath) {
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`Berkas cadangan tidak ditemukan: ${sqlFilePath}`);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  const connection = await pool.getConnection();

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS=0');

    // Pisahkan statement SQL
    const statements = sqlContent
      .split(/;\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`[Restore] Mengeksekusi ${statements.length} perintah SQL...`);
    for (const stmt of statements) {
      if (stmt.length > 0) {
        await connection.query(stmt);
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS=1');
    return { success: true, statementsExecuted: statements.length };
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Penggunaan: node server/scripts/restore.js <path_to_backup.sql>');
    process.exit(1);
  }
  restoreDatabase(path.resolve(fileArg))
    .then(res => {
      console.log(`✅ Database berhasil dipulihkan (${res.statementsExecuted} statements dieksekusi).`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Gagal memulihkan database:', err.message);
      process.exit(1);
    });
}

module.exports = {
  restoreDatabase
};
