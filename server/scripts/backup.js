// SPDX-License-Identifier: MIT
/**
 * Automated Database Backup Engine (Bursa Limbah / Circulink)
 * Menghasilkan dump SQL lengkap secara otomatis, menyimpan ke folder backups/,
 * dan melakukan rotasi retensi (menghapus backup yang lebih tua dari N hari).
 */

const fs = require('fs');
const path = require('path');
const { pool, dbConfig } = require('../db');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BACKUP_DIR = path.resolve(__dirname, '..', process.env.BACKUP_DIR || 'backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 7;

/**
 * Escape string untuk SQL Dump format
 */
function escapeSqlString(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

/**
 * Jalankan backup database
 * @returns {Promise<{ filename: string, sizeBytes: number, tablesCount: number, elapsedMs: number }>}
 */
async function runBackup() {
  const startTime = Date.now();
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_bursalimbah_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  writeStream.write(`-- ========================================================\n`);
  writeStream.write(`-- BURSA LIMBAH AUTOMATED DATABASE BACKUP DUMP\n`);
  writeStream.write(`-- Dibuat: ${new Date().toISOString()}\n`);
  writeStream.write(`-- Database: ${dbConfig.database} | Host: ${dbConfig.host}\n`);
  writeStream.write(`-- ========================================================\n\n`);
  writeStream.write(`SET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";\n\n`);

  // Dapatkan seluruh tabel dalam database
  const [tables] = await pool.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  const tableKey = Object.keys(tables[0] || {})[0];

  let totalRows = 0;
  for (const tRow of tables) {
    const tableName = tRow[tableKey];
    writeStream.write(`-- --------------------------------------------------------\n`);
    writeStream.write(`-- Struktur Tabel: \`${tableName}\`\n`);
    writeStream.write(`-- --------------------------------------------------------\n`);
    writeStream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);

    const [[createTable]] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
    writeStream.write(`${createTable['Create Table']};\n\n`);

    // Dapatkan data tabel
    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      writeStream.write(`-- Data untuk Tabel: \`${tableName}\` (${rows.length} records)\n`);
      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `\`${c}\``).join(', ');

      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valuesList = chunk.map(row => {
          return '(' + columns.map(col => escapeSqlString(row[col])).join(', ') + ')';
        }).join(',\n  ');

        writeStream.write(`INSERT INTO \`${tableName}\` (${colList}) VALUES\n  ${valuesList};\n`);
      }
      writeStream.write('\n');
      totalRows += rows.length;
    }
  }

  writeStream.write(`SET FOREIGN_KEY_CHECKS=1;\n`);
  writeStream.write(`-- Dump selesai. Total tabel: ${tables.length}, total records: ${totalRows}\n`);

  await new Promise((resolve, reject) => {
    writeStream.end(err => (err ? reject(err) : resolve()));
  });

  const stats = fs.statSync(filePath);
  const elapsedMs = Date.now() - startTime;

  // Pruning: Hapus backup yang lebih tua dari batas retensi
  pruneOldBackups();

  return {
    filename,
    filePath,
    sizeBytes: stats.size,
    tablesCount: tables.length,
    totalRecords: totalRows,
    elapsedMs
  };
}

/**
 * Hapus backup lama sesuai RETENTION_DAYS
 */
function pruneOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const now = Date.now();
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(BACKUP_DIR);

    files.forEach(file => {
      if (file.endsWith('.sql') || file.endsWith('.sql.gz')) {
        const fullPath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
          console.log(`[Backup Prune] Menghapus backup usang: ${file}`);
        }
      }
    });
  } catch (err) {
    console.error('[Backup Prune Error]', err.message);
  }
}

// Jika dijalankan langsung via terminal CLI: node server/scripts/backup.js
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Memulai proses pencadangan database MySQL...');
      const res = await runBackup();
      console.log(`✅ Backup selesai: ${res.filename} (${(res.sizeBytes / 1024).toFixed(1)} KB, ${res.tablesCount} tabel) dalam ${res.elapsedMs}ms`);
      process.exit(0);
    } catch (err) {
      console.error('❌ Gagal membuat backup:', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  runBackup,
  pruneOldBackups,
  BACKUP_DIR
};
