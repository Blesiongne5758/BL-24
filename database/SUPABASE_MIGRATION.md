# Migrasi PostgreSQL/Supabase BL-24

## Status tahap pertama

Tahap pertama sudah menyediakan:

- `supabase_schema.sql`: 21 tabel inti dari schema MySQL, tabel event tambahan, seed settings/kategori, index, dan trigger `updated_at`.
- `server/db.js`: pool `pg` dengan dukungan `DATABASE_URL`/`SUPABASE_DB_URL`, SSL Supabase, health check, transaksi, dan adapter placeholder legacy `?` ke `$1`.
- `server/database/migrate.js`: migration runner PostgreSQL idempotent untuk `audit_logs`, kolom kompatibilitas order/user, dan index performa.
- Driver `mysql2` dihapus; driver `pg` digunakan.

Adapter query hanya membantu transisi parameter dan bentuk return value. Adapter tidak menerjemahkan semua sintaks MySQL. Query dengan `UPDATE ... JOIN`, `SHOW TABLES`, `SHOW CREATE TABLE`, `ON DUPLICATE KEY UPDATE`, dan backup/restore dump MySQL masih perlu direfactor pada tahap berikutnya.

## Menjalankan schema di Supabase

1. Buka Supabase Dashboard untuk project staging.
2. Buka **SQL Editor**.
3. Jalankan isi `database/supabase_schema.sql` satu kali.
4. Verifikasi jumlah tabel, settings, dan kategori:

```sql
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

SELECT setting_key, setting_value
FROM public.system_settings
WHERE setting_key = 'google_login_enabled';

SELECT count(*) AS category_count FROM public.categories;
```

Nilai `google_login_enabled` harus `false` secara default. Jangan menjalankan script MySQL `setup_complete.sql` pada Supabase.

## Environment backend

Salin `server/.env.staging.example` ke environment backend, bukan ke frontend:

```dotenv
SUPABASE_DB_URL=postgresql://postgres.[PROJECT_REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:6543/postgres
DB_CONNECTION_LIMIT=10
PGSSL=true
NODE_ENV=production
DEMO_MODE=false
JWT_SECRET=[REDACTED]
CORS_ORIGIN=https://domain-frontend-staging-anda
```

`DATABASE_URL` mengambil prioritas jika didefinisikan. Jangan menaruh connection string, database password, atau Supabase secret key di GitHub Pages/InfinityFree frontend.

## Menjalankan migration runner

Dari direktori `server`:

```bash
npm ci
node database/migrate.js
```

Runner membutuhkan koneksi Supabase aktif. Jika gagal, periksa URL pooler, password database, SSL, dan firewall/provider deployment.

## Smoke test koneksi

```bash
node -e "require('./db').testConnection().then(ok => { process.exit(ok ? 0 : 1); })"
```

Health endpoint backend:

```bash
curl -fsS https://api-staging.example.com/api/health | jq
```

Expected response memiliki `database: "connected"`.

## Tahap berikutnya sebelum integrasi penuh

Refactor endpoint secara bertahap dan uji setiap kelompok:

1. Auth dan user profile.
2. Products, categories, offers.
3. Orders, payments, transactions.
4. Events dan registrations.
5. Notifications dan chat.
6. Settings, audit logs, backup/restore.

Khusus endpoint backup/restore, script yang ada masih berasumsi MySQL dump dan harus diganti dengan `pg_dump`/`pg_restore` atau backup native Supabase. Jangan mengaktifkan backup admin di production sebelum refactor tersebut selesai.
