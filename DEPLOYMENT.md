# 🚀 Panduan Lengkap Backend, Server, Hosting & Keamanan — BURSA LIMBAH (Circulink)

Dokumen ini memuat panduan arsitektur teknis dan instruksi langkah-demi-langkah untuk mengelola **Database**, **Server & Hosting**, **Logika Bisnis**, **API REST**, **Otentikasi & Otorisasi**, **Keamanan Sistem**, **Pencadangan Otomatis**, dan **Optimasi Kinerja**.

---

## 📑 Daftar Isi
1. [Arsitektur Sistem & Direktori](#1-arsitektur-sistem--direktori)
2. [Pengaturan Database & Migrasi](#2-pengaturan-database--migrasi)
3. [Otentikasi, Otorisasi (RBAC) & Sesi](#3-otentikasi-otorisasi-rbac--sesi)
4. [Logika Bisnis & Transaksi Escrow](#4-logika-bisnis--transaksi-escrow)
5. [Keamanan Sistem & Hardening](#5-keamanan-sistem--hardening)
6. [Pencadangan & Pemulihan (Backup & Disaster Recovery)](#6-pencadangan--pemulihan-backup--disaster-recovery)
7. [Optimasi Kinerja & Monitoring](#7-optimasi-kinerja--monitoring)
8. [Panduan Hosting & Deployment Produksi (PM2 / Docker / Nginx)](#8-panduan-hosting--deployment-produksi)

---

## 1. Arsitektur Sistem & Direktori

```text
bursalimbah/
├── server/
│   ├── server.js                        # Express REST API Server utama
│   ├── db.js                            # Connection pool manager, transaksi, & ping probe
│   ├── .env                             # File konfigurasi rahasia lingkungan (git-ignored)
│   ├── .env.example                     # Template konfigurasi aman
│   ├── Dockerfile                       # Multi-stage Docker production image
│   ├── ecosystem.config.js              # Konfigurasi PM2 Cluster mode
│   ├── services/
│   │   ├── jwt.service.js               # Pembuat & verifikator token JWT (Access & Refresh)
│   │   ├── escrow.service.js            # Kalkulator DP 30%, handling fee, & transisi order
│   │   ├── tierRules.service.js         # Validasi kuota & limit harga 3-tier pembeli
│   │   └── esg.service.js               # Estimasi reduksi emisi gas rumah kaca (kg CO2e)
│   ├── middleware/
│   │   ├── auth.js                      # Middleware verifikasi Bearer token & RBAC
│   │   ├── rateLimiter.js               # Proteksi brute force login & DoS rate limiting
│   │   └── sanitizer.js                 # Pembersih payload masukan anti-XSS
│   ├── database/
│   │   └── migrate.js                   # Runner migrasi tabel & indeks performa otomatis
│   ├── scripts/
│   │   ├── backup.js                    # Engine pencadangan database mandiri dengan rotasi
│   │   └── restore.js                   # Engine pemulihan database dari SQL dump
│   ├── uploads/                         # Berkas eviden produk & verifikasi
│   └── backups/                         # Tempat penyimpanan dump SQL cadangan
├── nginx/
│   └── nginx.conf                       # Konfigurasi reverse proxy, SSL, Gzip, dan rate limit
├── docker-compose.yml                   # Orkestrasi Docker (API + MySQL 8.4 + Nginx)
├── test_backend_services.js             # Test suite 10 unit test modul backend
├── test_audit.js                        # Test audit 97 parameter konsistensi UI & backend
└── test_logic.js                        # Test suite 5 skenario workflow transaksi
```

---

## 2. Pengaturan Database & Migrasi

### A. Konfigurasi Connection Pool (`server/db.js`)
- Menggunakan `mysql2/promise` dengan *connection pool* yang efisien.
- Parameter penting di `.env`:
  ```env
  DB_HOST=<database-host-dari-secret-manager>
  DB_PORT=3306
  DB_USER=<akun-aplikasi-berhak-minimum>
  DB_PASSWORD=[REDACTED]
  [REDACTED]
  DB_CONNECTION_LIMIT=15
  ```
- **Fitur Tambahan**:
  - `withTransaction(callback)`: Membungkus beberapa query dalam satu transaksi database ACID (otomatis `commit` jika sukses, atau `rollback` jika gagal).
  - `ping()`: Memeriksa latensi koneksi database (ms) secara instan.

### B. Menjalankan Migrasi Skema & Indeks
Migrasi berjalan otomatis saat server pertama kali dijalankan, atau dapat dipicu secara manual:
```bash
node server/database/migrate.js
```
Migrasi ini memastikan:
1. Pembuatan tabel `audit_logs` untuk rekam jejak keamanan.
2. Kolom `payment_methods` dan kolom pelunasan DP di tabel `orders`.
3. Pemasangan indeks gabungan pada kolom pencarian (`products.status`, `orders.buyer_id`, `orders.seller_id`, `chats.product_id`).

---

## 3. Otentikasi, Otorisasi (RBAC) & Sesi

### A. Alur Autentikasi JWT
1. **Pendaftaran (`POST /api/auth/register`)**:
   - Password dienkripsi dengan `bcryptjs` (salt rounds: 10).
   - Menghasilkan `token` (akses 24 jam) dan `refreshToken` (7 hari).
2. **Masuk (`POST /api/auth/login`)**:
   - Mendukung login dengan email atau nomor WhatsApp.
   - Diproteksi oleh `authRateLimiter` (maksimal 30 percobaan per 15 menit per IP).
   - Mengembalikan data profil dan token JWT.
3. **Pemeriksaan Sesi (`GET /api/auth/me`)**:
   - Membutuhkan header `Authorization: Bearer <token>`.
4. **Pembaruan Token (`POST /api/auth/refresh`)**:
   - Menggunakan `refreshToken` untuk menerbitkan access token baru tanpa mengharuskan pengguna login ulang.

### B. Otorisasi Berbasis Peran (RBAC)
Middleware `requireRole('admin')`, `requireRole('seller')`, dan `requireRole('buyer')` mencegah pengguna mengakses data atau endpoint yang bukan haknya.

---

## 4. Logika Bisnis & Transaksi Escrow

### A. Skema Rekening Bersama (Escrow)
- **Down Payment (DP 30%)**: Buyer mengunci pasokan limbah dengan membayar DP 30% dari total nilai transaksi.
- **Biaya Penanganan (Handling Fee Rp10.000)**: Biaya flat platform untuk pengelolaan rekening bersama dan penerbitan token QR ketertelusuran.
- **Pelunasan 70%**: Dibayar oleh buyer setelah armada memeriksa kecocokan fisik limbah di lokasi seller, diverifikasi oleh Admin/Seller sebelum dana diteruskan ke saldo seller.

### B. Validasi 3-Tier Pembeli
- **Paket Starter**: Maksimal nilai transaksi Rp200.000, volume maksimal 200 Kg/L.
- **Paket Pro**: Maksimal transaksi Rp50.000.000, volume maksimal 5.000 Kg/L, membuka akses GPS & kontak langsung WA.
- **Paket Enterprise**: Tanpa batasan nominal & volume (*unlimited*).

### C. Metrik ESG (Reduksi Emisi CO2e)
Dihitung otomatis saat pesanan dibuat berdasarkan kategori limbah (misal: 1 Liter minyak jelantah setara dengan reduksi 2.85 kg CO2e).

---

## 5. Keamanan Sistem & Hardening

1. **Helmet Security Headers**: Mengaktifkan proteksi `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, dan `X-XSS-Protection`.
2. **Anti-XSS Sanitizer**: Seluruh request body, query, dan params dibersihkan dari tag `<script>` dan URI `javascript:`.
3. **CORS Terkendali**: Dibatasi hanya pada origin domain yang diizinkan melalui `CORS_ORIGIN` di `.env`.
4. **Proteksi Unggahan Berkas**: Memeriksa header magic bytes file secara riil (`hasExpectedFileSignature`) untuk mencegah pengunggahan webshell. Berkas KTP/NPWP diisolasi di folder privat.
5. **Audit Logs**: Semua aktivitas sensitif (pendaftaran, login, transaksi order, pembuatan backup) dicatat di tabel `audit_logs`.

---

## 6. Pencadangan & Pemulihan (Backup & Disaster Recovery)

### A. Membuat Cadangan Manual / Terjadwal
Jalankan perintah berikut:
```bash
node server/scripts/backup.js
```
*Atau via API Admin:* `POST http://localhost:5000/api/admin/backups` (memerlukan hak akses Admin).

- Berkas SQL dump otomatis disimpan di `server/backups/backup_bursalimbah_YYYY-MM-DDTHH-mm-ss.sql`.
- **Kebijakan Retensi**: Berkas cadangan yang lebih tua dari `BACKUP_RETENTION_DAYS` (default 7 hari) otomatis dibersihkan untuk menghemat ruang disk.

### B. Memulihkan Database dari Cadangan
```bash
node server/scripts/restore.js server/backups/backup_bursalimbah_2026-10-14T07-00-00.sql
```

---

## 7. Optimasi Kinerja & Monitoring

1. **Kompresi Gzip/Deflate**: Menghemat hingga 70% bandwidth pada respon JSON dan HTML statis.
2. **Indeks Database Optimal**: Query pencarian produk, order, dan pesan obrolan menggunakan B-Tree index.
3. **X-Response-Time**: Setiap panggilan API menyertakan header waktu respons dalam milidetik (ms).
4. **Endpoint Monitoring (`GET /api/health`)**:
   - Menampilkan status database, latensi ping (ms), pemakaian memori RAM (RSS & Heap), dan waktu uptime server.

---

## 8. Panduan Hosting & Deployment Produksi

### Opsi 1: Menjalankan dengan PM2 (Rekomendasi untuk VPS Ubuntu/Debian)

1. Pasang Node.js 20 LTS dan PM2 secara global:
   ```bash
   npm install -g pm2
   ```
2. Salin dan sesuaikan file lingkungan:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env dan set DEMO_MODE=false, NODE_ENV=production
   ```
3. Pasang dependensi dan jalankan cluster:
   ```bash
   cd server
   npm install --production
   pm2 start ecosystem.config.js --env production
   ```
4. Simpan proses agar otomatis aktif setelah server reboot:
   ```bash
   pm2 save
   pm2 startup
   ```

### Opsi 2: Menjalankan dengan Docker & Docker Compose

Jalankan seluruh stack (API + MySQL 8.4 + Nginx) dengan 1 perintah:
```bash
docker compose up -d --build
```
Untuk melihat log aktivitas:
```bash
docker compose logs -f api
```

### Opsi 3: Pengaturan Reverse Proxy Nginx & SSL Certbot

1. Pasang Nginx dan Certbot:
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx -y
   ```
2. Terapkan konfigurasi dari `nginx/nginx.conf` ke `/etc/nginx/sites-available/circulink.com`.
3. Pasang sertifikat SSL gratis (HTTPS):
   ```bash
   sudo certbot --nginx -d circulink.com -d www.circulink.com
   ```
