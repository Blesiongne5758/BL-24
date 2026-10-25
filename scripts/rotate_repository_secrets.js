#!/usr/bin/env node
'use strict';

/**
 * Rotate one MySQL account password and/or the application JWT signing secret.
 *
 * Safe defaults:
 * - dry-run unless --apply is explicitly provided;
 * - requires an interactive confirmation before changing a database;
 * - reads the current DB admin credential from process environment only;
 * - writes generated values only to ignored .env files with mode 0600;
 * - never prints secret values.
 *
 * Cloud-provider credentials (Cloudinary, Supabase, FTP) are deliberately not
 * changed here: those must first be rotated in their provider consoles or a
 * provider-supported administrative API. See SECURITY_SECRET_ROTATION.md.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const repoRoot = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const jwtOnly = args.has('--jwt-only');
const skipJwt = args.has('--skip-jwt');
const allowedArgs = new Set(['--apply', '--jwt-only', '--skip-jwt', '--dry-run']);

for (const arg of args) {
  if (!allowedArgs.has(arg)) {
    console.error(`Opsi tidak dikenal: ${arg}`);
    process.exit(2);
  }
}
if (jwtOnly && skipJwt) {
  console.error('--jwt-only tidak dapat digunakan bersama --skip-jwt.');
  process.exit(2);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Environment ${name} wajib diisi.`);
  return value.trim();
}

function assertIgnoredAndUntracked(relativePath) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', relativePath], {
      cwd: repoRoot,
      stdio: 'ignore'
    });
  } catch {
    throw new Error(`${relativePath} tidak tercakup oleh .gitignore; batal agar secret tidak masuk Git.`);
  }
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', relativePath], {
      cwd: repoRoot,
      stdio: 'ignore'
    });
    throw new Error(`${relativePath} sudah tracked oleh Git; keluarkan dari index sebelum rotasi.`);
  } catch (error) {
    if (error.message.includes('sudah tracked')) throw error;
    // A non-zero exit is expected when the path is not tracked.
  }
}

function upsertEnv(text, key, value) {
  const lines = text ? text.split(/\r?\n/) : [];
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*=`);
  let found = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i])) {
      lines[i] = `${key}=${value}`;
      found = true;
    }
  }
  if (!found) lines.push(`${key}=${value}`);
  return `${lines.filter((line, index, all) => !(line === '' && index === all.length - 1)).join('\n')}\n`;
}

function sqlAccountPart(value, label) {
  if (!/^[A-Za-z0-9_.:%-]{1,128}$/.test(value)) {
    throw new Error(`${label} berisi karakter yang tidak diizinkan.`);
  }
  return `'${value}'`;
}

function loadEnvFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function stageEnvFiles(values) {
  const targets = [path.join(repoRoot, '.env'), path.join(repoRoot, 'server', '.env')];
  const staged = [];
  try {
    for (const filePath of targets) {
      const relative = path.relative(repoRoot, filePath).split(path.sep).join('/');
      assertIgnoredAndUntracked(relative);
      const tempPath = `${filePath}.rotate-${process.pid}`;
      const tempRelative = path.relative(repoRoot, tempPath).split(path.sep).join('/');
      assertIgnoredAndUntracked(tempRelative);
      let content = loadEnvFile(filePath);
      for (const [key, value] of Object.entries(values)) content = upsertEnv(content, key, value);
      staged.push({ filePath, tempPath });
      fs.writeFileSync(tempPath, content, { mode: 0o600, flag: 'wx' });
      fs.chmodSync(tempPath, 0o600);
    }
    return staged;
  } catch (error) {
    cleanStaged(staged);
    throw error;
  }
}

function cleanStaged(staged) {
  for (const item of staged) {
    try { fs.unlinkSync(item.tempPath); } catch { /* absent or already renamed */ }
  }
}

function printPlan() {
  console.log('Mode: DRY-RUN (tidak ada file atau database yang diubah).');
  console.log('- Membuat JWT_SECRET baru secara acak, kecuali memakai --skip-jwt.');
  if (jwtOnly) {
    console.log('- Memperbarui JWT_SECRET pada .env dan server/.env yang diabaikan Git.');
  } else {
    console.log('- Merotasi satu akun MySQL yang ditentukan melalui environment.');
    console.log('- Memperbarui .env dan server/.env dengan password baru serta JWT_SECRET.');
    console.log('- Variabel yang diperlukan untuk --apply: ROTATE_DB_ADMIN_HOST, ROTATE_DB_ADMIN_USER, ROTATE_DB_ADMIN_PASSWORD, ROTATE_DB_TARGET_USER, ROTATE_DB_TARGET_HOST.');
    console.log('- ROTATE_TARGET_ENV_KEY opsional: DB_PASSWORD (default) atau MYSQL_ROOT_PASSWORD.');
  }
  console.log('- Tidak mengubah Cloudinary, Supabase, FTP, kredensial provider, deployment remote, atau riwayat Git.');
}

async function confirmApply() {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error('--apply hanya boleh dijalankan pada terminal interaktif.');
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question('Perubahan dapat memutus sesi dan koneksi aplikasi. Ketik ROTATE BL-24 untuk lanjut: ');
    if (answer !== 'ROTATE BL-24') throw new Error('Konfirmasi tidak cocok; tidak ada rotasi yang dilakukan.');
  } finally {
    rl.close();
  }
}

async function main() {
  if (!apply) {
    printPlan();
    return;
  }

  await confirmApply();
  const envValues = {};
  if (!skipJwt) envValues.JWT_SECRET = crypto.randomBytes(64).toString('base64url');

  let dbConfig = null;
  if (!jwtOnly) {
    const host = requiredEnv('ROTATE_DB_ADMIN_HOST');
    const user = requiredEnv('ROTATE_DB_ADMIN_USER');
    const password = requiredEnv('ROTATE_DB_ADMIN_PASSWORD');
    const targetUser = requiredEnv('ROTATE_DB_TARGET_USER');
    const targetHost = requiredEnv('ROTATE_DB_TARGET_HOST');
    const envKey = process.env.ROTATE_TARGET_ENV_KEY || 'DB_PASSWORD';
    if (!['DB_PASSWORD', 'MYSQL_ROOT_PASSWORD'].includes(envKey)) {
      throw new Error('ROTATE_TARGET_ENV_KEY hanya boleh DB_PASSWORD atau MYSQL_ROOT_PASSWORD.');
    }
    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const tls = process.env.ROTATE_DB_TLS === 'true';
    if (!localHosts.has(host) && !tls) {
      throw new Error('Koneksi database non-lokal wajib memakai ROTATE_DB_TLS=true.');
    }
    dbConfig = {
      host,
      port: Number(process.env.ROTATE_DB_ADMIN_PORT || 3306),
      user,
      password,
      ssl: tls ? { rejectUnauthorized: true } : undefined,
      targetUser,
      targetHost,
      envKey,
      newPassword: [REDACTED]
    };
    envValues[envKey] = dbConfig.newPassword;
    if (envKey === 'DB_PASSWORD') envValues.DB_USER = targetUser;
  }

  const staged = stageEnvFiles(envValues);
  let dbChanged = false;
  try {
    if (dbConfig) {
      const mysql = require(path.join(repoRoot, 'server', 'node_modules', 'mysql2', 'promise'));
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: [REDACTED]
        ssl: dbConfig.ssl,
        connectTimeout: 10000
      });
      try {
        const userSql = sqlAccountPart(dbConfig.targetUser, 'ROTATE_DB_TARGET_USER');
        const hostSql = sqlAccountPart(dbConfig.targetHost, 'ROTATE_DB_TARGET_HOST');
        // Generated base64url passwords contain only SQL-safe characters.
        await connection.query(`ALTER USER ${userSql}@${hostSql} IDENTIFIED BY '[REDACTED]'`);
        dbChanged = true;
      } finally {
        await connection.end();
      }
    }

    for (const item of staged) fs.renameSync(item.tempPath, item.filePath);
    console.log('Rotasi lokal selesai. File .env berisi secret baru dan tidak dicetak ke terminal.');
    console.log('Langkah berikutnya: restart service, verifikasi login/DB, lalu rotasi provider eksternal secara terpisah.');
  } catch (error) {
    if (dbChanged) {
      console.error('Database sudah berubah tetapi penulisan konfigurasi belum tuntas. JANGAN hapus file .env.rotate-*; file staging berizin 0600 berisi nilai pemulihan.');
    } else {
      cleanStaged(staged);
    }
    console.error(`Rotasi gagal${error.code ? ` (kode ${error.code})` : ''}: ${error.code ? 'periksa koneksi/izin database dan file staging.' : error.message}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Rotasi dibatalkan: ${error.message}`);
  process.exitCode = 1;
});
