// SPDX-License-Identifier: MIT
/**
 * BURSA LIMBAH / CIRCULINK — PostgreSQL/Supabase connection pool.
 *
 * The adapter intentionally preserves the existing legacy-shaped return value:
 *   const [rows, metadata] = await pool.query(sql, params)
 * so endpoint refactoring can happen incrementally. SQL syntax migration is
 * while endpoint queries are migrated incrementally.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
const isSupabaseConnection = /supabase\.(co|in|net)$/i.test(connectionString) || /supabase/i.test(connectionString);
const useSsl = String(process.env.PGSSL || '').toLowerCase() === 'true' || isSupabaseConnection;

const dbConfig = connectionString
  ? {
      connectionString,
      max: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      application_name: process.env.PGAPPNAME || 'bursalimbah-api'
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'postgres',
      max: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      application_name: process.env.PGAPPNAME || 'bursalimbah-api'
    };

const rawPool = new Pool(dbConfig);

/**
 * Convert legacy `?` placeholders to PostgreSQL `$1..$n` while
 * ignoring question marks inside SQL string literals.
 */
function toPostgresPlaceholders(sql) {
  let output = '';
  let parameterIndex = 0;
  let inSingleQuote = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === "'") {
      output += char;
      if (inSingleQuote && next === "'") {
        output += next;
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (char === '?' && !inSingleQuote) {
      parameterIndex += 1;
      output += `$${parameterIndex}`;
    } else {
      output += char;
    }
  }

  return output;
}

function normalizeParameters(params) {
  return Array.isArray(params) ? params.map(value => (value === undefined ? null : value)) : params;
}

async function execute(target, sql, params = []) {
  const result = await target.query(toPostgresPlaceholders(sql), normalizeParameters(params));
  const metadata = {
    affectedRows: result.rowCount,
    rowCount: result.rowCount,
    insertId: null,
    command: result.command,
    fields: result.fields
  };
  return [result.rows || [], metadata];
}

function wrapClient(client) {
  return {
    query: (sql, params = []) => execute(client, sql, params),
    execute: (sql, params = []) => execute(client, sql, params),
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release()
  };
}

// Compatibility facade for existing server modules. New code should use the
// returned rows and rowCount metadata directly rather than relying on a
// database-specific result shape.
const pool = {
  query: (sql, params = []) => execute(rawPool, sql, params),
  execute: (sql, params = []) => execute(rawPool, sql, params),
  getConnection: async () => wrapClient(await rawPool.connect()),
  end: () => rawPool.end(),
  raw: rawPool
};

async function testConnection() {
  try {
    const connection = await rawPool.connect();
    const result = await connection.query('SELECT version() AS version, NOW() AS server_time');
    const row = result.rows[0];
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  ✅  PostgreSQL/Supabase Database Terhubung          ║');
    console.log(`║  Host     : ${connectionString ? 'DATABASE_URL' : `${dbConfig.host}:${dbConfig.port}`}`.padEnd(54) + '║');
    console.log(`║  Database : ${connectionString ? 'Supabase PostgreSQL' : dbConfig.database}`.padEnd(54) + '║');
    console.log(`║  PostgreSQL: ${String(row.version).slice(0, 39)}`.padEnd(54) + '║');
    console.log(`║  Waktu DB : ${String(row.server_time)}`.padEnd(54) + '║');
    console.log('╚══════════════════════════════════════════════════════╝');
    connection.release();
    return true;
  } catch (error) {
    console.error('╔══════════════════════════════════════════════════════╗');
    console.error('║  ❌  GAGAL Terhubung ke PostgreSQL/Supabase          ║');
    console.error(`║  Error: ${error.message}`.substring(0, 53).padEnd(53) + '║');
    console.error('║                                                      ║');
    console.error('║  Pastikan DATABASE_URL/SUPABASE_DB_URL atau DB_*     ║');
    console.error('║  dan SSL Supabase sudah dikonfigurasi dengan benar.  ║');
    console.error('╚══════════════════════════════════════════════════════╝');
    return false;
  }
}

async function ping() {
  const start = Date.now();
  try {
    const result = await rawPool.query('SELECT 1');
    return { healthy: result.rowCount === 1, latencyMs: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message, latencyMs: Date.now() - start };
  }
}

async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('[DB Query Error]', error.message);
    throw error;
  }
}

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
  withTransaction,
  toPostgresPlaceholders
};
