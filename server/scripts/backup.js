// SPDX-License-Identifier: MIT
/**
 * PostgreSQL/Supabase backup engine.
 * Uses pg_dump so schema, constraints, indexes, functions, and data are
 * exported in a format that can be restored by PostgreSQL/psql.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { pool, dbConfig } = require('../db');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const execFileAsync = promisify(execFile);
const BACKUP_DIR = path.resolve(__dirname, '..', process.env.BACKUP_DIR || 'backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 7;

function postgresDumpArgs(filePath) {
  const args = ['--format=plain', '--no-owner', '--no-privileges', '--file', filePath];
  if (dbConfig.connectionString) {
    args.push(dbConfig.connectionString);
  } else {
    args.push(
      '--host', dbConfig.host,
      '--port', String(dbConfig.port),
      '--username', dbConfig.user,
      '--dbname', dbConfig.database
    );
  }
  return args;
}

function postgresCommandEnv() {
  const env = { ...process.env };
  if (!dbConfig.connectionString && dbConfig.password) env.PGPASSWORD = dbConfig.password;
  return env;
}

async function runBackup() {
  const startTime = Date.now();
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_bursalimbah_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  try {
    await execFileAsync('pg_dump', postgresDumpArgs(filePath), {
      env: postgresCommandEnv(),
      maxBuffer: 1024 * 1024 * 10
    });
  } catch (error) {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) { /* best effort */ }
    if (error.code === 'ENOENT') {
      throw new Error('pg_dump tidak tersedia pada host backend. Instal PostgreSQL client tools sebelum mengaktifkan backup.');
    }
    throw new Error(`pg_dump gagal: ${error.stderr || error.message}`.trim());
  }

  let tablesCount = 0;
  let totalRecords = 0;
  try {
    const [tableRows] = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
    `);
    tablesCount = tableRows.length;
    const [countRows] = await pool.query(`
      SELECT COALESCE(SUM(n_live_tup), 0)::bigint AS total_records
      FROM pg_stat_user_tables
    `);
    totalRecords = Number(countRows[0]?.total_records || 0);
  } catch (_) {
    // The dump itself is authoritative; metadata is informational only.
  }

  const stats = fs.statSync(filePath);
  const elapsedMs = Date.now() - startTime;
  pruneOldBackups();

  return { filename, filePath, sizeBytes: stats.size, tablesCount, totalRecords, elapsedMs };
}

function pruneOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const now = Date.now();
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const file of fs.readdirSync(BACKUP_DIR)) {
      if (!file.endsWith('.sql') && !file.endsWith('.sql.gz')) continue;
      const fullPath = path.join(BACKUP_DIR, file);
      if (now - fs.statSync(fullPath).mtimeMs > maxAgeMs) {
        fs.unlinkSync(fullPath);
        console.log(`[Backup Prune] Menghapus backup usang: ${file}`);
      }
    }
  } catch (err) {
    console.error('[Backup Prune Error]', err.message);
  }
}

if (require.main === module) {
  runBackup()
    .then(res => {
      console.log(`Backup PostgreSQL selesai: ${res.filename} (${(res.sizeBytes / 1024).toFixed(1)} KB, ${res.tablesCount} tabel) dalam ${res.elapsedMs}ms`);
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch(async err => {
      console.error('Gagal membuat backup PostgreSQL:', err.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runBackup, pruneOldBackups, BACKUP_DIR };
