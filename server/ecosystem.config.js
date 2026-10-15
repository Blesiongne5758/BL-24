// SPDX-License-Identifier: MIT
/**
 * PM2 Process Manager Configuration — Bursa Limbah Production Cluster
 * Mendukung load balancing multi-core, zero-downtime reload,
 * auto-restart saat crash, dan pemantauan memori.
 */

module.exports = {
  apps: [
    {
      name: 'bursalimbah-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 'max',               // Menggunakan seluruh core CPU yang tersedia (Cluster mode)
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,                   // Jangan watch file di lingkungan produksi
      max_memory_restart: '500M',     // Restart jika konsumsi RAM melebihi 500MB
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        DEMO_MODE: 'false'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5050,
        DEMO_MODE: 'true'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
