// SPDX-License-Identifier: MIT
/**
 * PostgreSQL/Supabase restore engine.
 * Restores plain SQL files produced by server/scripts/backup.js using psql.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { dbConfig, pool } = require('../db');

const execFileAsync = promisify(execFile);

function postgresRestoreArgs(sqlFilePath) {
  const args = ['--set', 'ON_ERROR_STOP=1', '--file', sqlFilePath];
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
  if (!dbConfig.connectionString && [REDACTED]) env.PGPASSWORD = [REDACTED];
  return env;
}

async function restoreDatabase(sqlFilePath) {
  if (!fs.existsSync(sqlFilePath)) throw new Error(`Berkas cadangan tidak ditemukan: ${sqlFilePath}`);
  const stats = fs.statSync(sqlFilePath);
  if (!stats.isFile() || !sqlFilePath.toLowerCase().endsWith('.sql')) {
    throw new Error('Restore hanya menerima berkas dump PostgreSQL plain SQL dengan ekstensi .sql.');
  }

  try {
    await execFileAsync('psql', postgresRestoreArgs(sqlFilePath), {
      env: postgresCommandEnv(),
      maxBuffer: 1024 * 1024 * 10
    });
    return { success: true, file: sqlFilePath };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('psql tidak tersedia pada host backend. Instal PostgreSQL client tools sebelum mengaktifkan restore.');
    }
    throw new Error(`psql restore gagal: ${error.stderr || error.message}`.trim());
  }
}

if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Penggunaan: node server/scripts/restore.js <path_to_postgresql_dump.sql>');
    process.exit(1);
  }
  restoreDatabase(path.resolve(fileArg))
    .then(async res => {
      console.log(`Database PostgreSQL berhasil dipulihkan dari ${res.file}.`);
      await pool.end();
      process.exit(0);
    })
    .catch(async err => {
      console.error('Gagal memulihkan database PostgreSQL:', err.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { restoreDatabase };
