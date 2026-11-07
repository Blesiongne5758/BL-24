# Circulink — Waste Trading Management MVP Platform

> **Tagline**: *Verified Waste. Trusted Trade.*  
> **Domain Target**: `bursalimbah.com`  
> **Referensi Blueprint**: Dokumen Perancangan `Circulink_Waste_Trading_MVP_Blueprint.md`  
> **Lisensi**: [MIT License](LICENSE) (Copyright © 2026 Bursa Limbah Team)

Circulink (Bursa Limbah) adalah platform marketplace komoditas limbah dan sirkular berbasis **traceability terverifikasi** yang mempertemukan penjual (industri manufaktur, pabrik, UMKM, bengkel, pengepul) dan pembeli (*off-taker*, pabrik daur ulang, bio-refinery) dalam satu ekosistem digital terintegrasi dengan Rekening Bersama Escrow dan verifikasi standar mutu.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi ini mendukung mode **client-side mandiri** (*standalone production-ready frontend*) maupun **arsitektur backend enterprise penuh** (Node.js Express + MySQL + Nginx/Docker) serta integrasi cloud terdistribusi (Supabase & Cloudinary).

### A. Menjalankan Langsung di Frontend (Zero-Config)
1. **Cara Paling Cepat**:
   - Double-click file `start-website.bat`, atau
   - Buka langsung file `index.html` dengan browser modern (Google Chrome, Microsoft Edge, Mozilla Firefox).
2. **Atau melalui PowerShell**:
   ```powershell
   Start-Process .\index.html
   ```

### B. Menjalankan Backend Node.js Server & Database MySQL
1. Pastikan MySQL Server aktif pada port `3306`.
2. Impor skema dan data awal:
   ```bash
   mysql -u root -p < database/setup_complete.sql
   ```
3. Konfigurasi kredensial pada `server/.env` (gunakan `server/.env.example` sebagai referensi):
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=bursalimbah
   JWT_SECRET=circulink-jwt-production-secret-key-2026
   ```
4. Jalankan backend service:
   ```bash
   cd server
   npm install
   npm start
   ```
5. Akses platform pada `http://localhost:5000` (terhubung penuh dengan REST API dan MySQL).

### C. Menjalankan via Docker Compose (Produksi Siap Pakai)
```bash
docker-compose up -d --build
```
Layanan web reverse proxy Nginx akan aktif di port `80`, backend Node.js di port `5000`, dan MySQL 8.0 di port `3306`. Detail lengkap panduan server, SSL Let's Encrypt, dan backup berkala tersedia di [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Pembayaran & Pengantaran (API PHP/MySQL)

Untuk mengaktifkan checkout di hosting PHP/MySQL:

1. Impor [migrasi pembayaran dan pengantaran](database/migrations/20261107_payment_shipping_integration.sql) satu kali setelah skema utama (`database/infinityfree_setup.sql`) terpasang.
2. Tambahkan `PAYMENT_ENCRYPTION_KEY` pada `api/config.local.php`. Buat kunci acak 32 byte dengan `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`; gunakan nilai berbeda dari `INFERX_ENCRYPTION_KEY` dan simpan cadangan aman. Mengganti kunci ini membuat rahasia gateway yang sudah tersimpan tidak dapat didekripsi.
3. Di Admin → Pengaturan, masukkan Midtrans Client Key dan Server Key, pilih sandbox atau production, aktifkan kanal pembayaran, lalu simpan. Daftarkan callback Midtrans ke `https://bursalimbah.com/api/payment/webhook`.
4. Upload QRIS statis merchant dari panel yang sama. Pembayaran manual menahan pesanan sebagai menunggu sampai admin meninjau bukti pembayaran.
5. Aktifkan kurir/pengantaran dan isi opsi nama + ongkir pada JSON yang tersedia. Rilis ini mendukung pilihan kurir/ongkir manual dan pencatatan resi/serah-terima; API live pihak ekspedisi belum dihubungkan.

Upload QRIS publik dan bukti bayar privat memerlukan kredensial server Cloudinary lengkap di `api/config.local.php`. Bukti bayar disimpan privat; URL tinjau ditandatangani dan hanya diberikan kepada pembeli pemiliknya atau admin.

---

## ⚙️ Pusat Kontrol Fitur Sistem (Master Feature Toggles)

Seluruh modul dan kapabilitas sistem dapat diaktifkan atau dinonaktifkan secara dinamis langsung melalui panel **Admin Settings** (`#admin-settings-form`), dilengkapi sakelar massal **"Aktifkan Semua"** dan **"Nonaktifkan Semua"**:

| # | Master Feature Flag | Kunci Konfigurasi | Deskripsi & Dampak pada Sistem |
|---|---|---|---|
| 1 | **Katalog & Marketplace** | `marketplace` | Mengontrol akses katalog pasokan limbah publik dan portal pembeli. |
| 2 | **Unggah Pasokan Penjual** | `productUpload` | Mengaktifkan/menonaktifkan formulir pasang pasokan limbah penjual. |
| 3 | **Rekening Bersama Escrow & DP** | `escrowDp` | Menghidupkan/mematikan mekanisme DP (Uang Muka) dan rekening bersama. |
| 4 | **Negosiasi & Tawar Harga** | `offersNegotiation` | Fitur tawar harga interaktif antara pembeli dan penjual terverifikasi. |
| 5 | **Sistem Chat Real-Time** | `chatSystem` | Menampilkan atau menyembunyikan drawer chat langsung antar mitra. |
| 6 | **Paket Berlangganan Pembeli** | `buyerSubscription` | Penerapan batas kuota volume & nilai booking berdasarkan tier pembeli. |
| 7 | **Event & Edukasi Sirkular** | `eventsModule` | Modul seminar, workshop, pameran daur ulang, dan green lifestyle. |
| 8 | **Layanan Tiket Pengaduan** | `supportTickets` | Sistem penanganan aduan kendala transaksi dan tiket bantuan pengguna. |
| 9 | **Ticker Harga Pasar Terkini** | `marketTicker` | Bar running ticker harga pasar komoditas daur ulang di header atas. |
| 10 | **Pendaftaran Akun Baru** | `userRegistration` | Membuka atau membatasi pendaftaran akun baru bagi mitra publik. |
| 11 | **Layanan Ekspedisi & Logistik** | `logisticsService` | Fitur cek ongkir armada truk dan kurir penjemputan limbah. |

---

## 🔐 Keamanan, Autentikasi & Perlindungan Data

Platform Bursa Limbah telah diperketat secara komprehensif mengikuti standar keamanan web modern:

1. **Pemisahan Kredensial & Rahasia (Credential Hardening)**:
   - Kredensial sensitif (Cloudinary API Secret, Supabase Keys, Kredensial FTP) dipisahkan ke dalam berkas konfigurasi lokal (`*.local.php`, `*.local.ps1`) yang otomatis diabaikan oleh `.gitignore`.
   - Repositori publik aman dari kebocoran token rahasia (*zero hardcoded secrets*).
2. **Pembersihan Halaman Login**:
   - Akses cepat akun demo (1-klik) dan pembocoran kata sandi bawaan telah dihapus total dari tampilan login antarmuka pengguna.
   - Autentikasi Google OAuth dinonaktifkan (`403 Forbidden`) untuk mencegah kerentanan autentikasi pihak ketiga tanpa verifikasi domain.
3. **Pencegahan Akses Berkas HTTP Terlarang (`.htaccess`)**:
   - Memblokir akses langsung HTTP ke berkas berekstensi sensitif: `.env*`, `.sql`, `.ps1`, `.bat`, `.log`, dan `config.local.php`.
4. **Proteksi Injeksi & XSS**:
   - Seluruh titik rendering data dinamis pada antarmuka diproteksi dengan fungsi sanitasi `esc()` (`escapeHtml`).
   - Middleware backend membersihkan tag HTML berbahaya dan injeksi script dari payload masukan JSON.
5. **Autentikasi & Otorisasi Kuat**:
   - Autentikasi berbasis **JWT (JSON Web Token)** dengan verifikasi peran berbasis RBAC (*Role-Based Access Control*).
   - Enkripsi kata sandi menggunakan `bcrypt` dengan cost factor 10.
   - Rate limiting via `express-rate-limit` guna memitigasi serangan *brute force* dan DoS.
6. **Hardened Row Level Security (RLS) pada Supabase**:
   - Kebijakan RLS ketat pada setiap tabel: data sensitif (`users`, `system_settings`) hanya dapat dimodifikasi oleh `service_role` atau pengguna terautentikasi.
7. **Pencegahan Error Leakage**:
   - Penanganan error database PDO pada backend PHP tidak membocorkan informasi struktur tabel atau kredensial ke respon JSON publik (dialihkan ke `error_log()`).

---

## ☁️ Arsitektur Penyimpanan Cloud Terpisah (Decoupled Object Storage & Media)

Circulink menerapkan arsitektur penyimpanan berkas terpisah (*decoupled storage architecture*) berstandar enterprise tanpa menyimpan berkas unggahan pada sistem berkas lokal (*local filesystem*) server web:

1. **Penyedia Cloud Object Storage (S3-Compatible)**:
   - Mendukung **AWS S3**, **DigitalOcean Spaces**, **MinIO**, dan **Cloudflare R2**.
   - Menghilangkan *memory overload* dan kejenuhan bandwidth pada server web Node.js.
2. **Mekanisme Unggah Langsung via Pre-Signed URLs (Direct Client-to-Bucket)**:
   - Klien meminta Pre-Signed PUT URL bertanda tangan AWS SigV4 (`POST /api/storage/presigned-upload`).
   - Peramban mengalirkan berkas biner secara langsung ke bucket cloud storage (`PUT`).
3. **Strategi 2-Bucket & Keamanan Bertingkat**:
   - **Public Bucket** (`circulink-public-media`): Foto eviden limbah, foto katalog komoditas, dan foto profil mitra publik. Diakselerasi CDN.
   - **Private Bucket / Vault** (`circulink-private-vault`): Dokumen identitas rahasia KYC (KTP, NPWP, NIB), dokumen izin lingkungan B3, dan bukti pelunasan transaksi.
   - **Akses Dokumen Privat**: Akses berkas privat HANYA diberikan melalui **Pre-Signed GET URL berumur pendek** (TTL 15 menit) yang diterbitkan server (`GET /api/storage/private-url`) setelah memverifikasi kepemilikan dokumen atau status pembayaran DP pesanan terkait.
4. **Validasi Berkas Ganda (Client & Server)**:
   - **Validasi Sisi Klien (`js/storageClient.js`)**: Skema validasi untuk memeriksa MIME type yang diizinkan (JPEG, PNG, WebP, HEIC, PDF), batas ukuran berkas (maks. 10MB foto, maks. 20MB dokumen), dan pemblokiran ekstensi ganda/berbahaya.
   - **Validasi Sisi Server (`storage.service.js`)**: Pemeriksaan *magic bytes* (header signature biner) untuk mencegah penyamaran skrip/berkas berbahaya (*polyglot injection*).
5. **Optimasi Media Otomatis (ImageKit / Cloudinary)**:
   - Konversi format otomatis ke **WebP / AVIF** dengan kompresi mutu cerdas (`q_auto`, `f_auto`).
   - Pembuatan thumbnail otomatis berasio presisi (400x300) untuk kartu katalog marketplace.

---

## 📦 10 Kategori Komoditas Limbah Terverifikasi

1. **Minyak Jelantah (UCO)** (Liter) — FFA (<3%, 3-5%, >5%) & Kadar Air
2. **Oli Bekas** (Liter) — Pelumas mesin, hidrolik & oli industri (B3)
3. **Kardus (OCC)** (Kg) — Brown corrugated box bal press
4. **Plastik Industri** (Kg) — PET bening, HDPE blow, PP injeksi
5. **Besi Rongsok (Scrap)** (Kg) — Besi super WF, plat kapal, scrap cor
6. **Aluminium** (Kg) — Profil kusen, kaleng UBC, velg mobil
7. **Tembaga** (Kg) — Tembaga merah Cu 99% kupas, bakar, pipa
8. **Kertas & Dokumen** (Kg) — HVS arsip, koran, duplex, buku
9. **Limbah Elektronik (E-Waste)** (Kg) — PCB grade A/B, server, baterai
10. **Limbah Industri Lainnya** (Kg) — Palet kayu, karet ban, kain majun

---

## 📁 Struktur Direktori & File Proyek

```text
bursalimbah/
├── .gitignore                               # Konfigurasi file sensitif & lokal yang diabaikan Git
├── .htaccess                                # Header keamanan Apache, kompresi Gzip & proteksi berkas rahasia
├── DEPLOYMENT.md                            # Panduan deployment produksi (Nginx, PM2, Docker)
├── LICENSE                                  # Lisensi Open-Source MIT
├── README.md                                # Dokumentasi komprehensif proyek
├── docker-compose.yml                       # Konfigurasi orkestrasi container Docker
├── start-website.bat                        # Launcher 1-klik Windows
├── index.html                               # Antarmuka SPA utama (Tailwind CSS + FontAwesome Vector Icons)
│
├── css/
│   └── style.css                            # Styling khusus tema Bursa Limbah & animasi
├── js/
│   ├── data.js                              # Seed data awal kategori, produk, komoditas, dan fitur
│   ├── store.js                             # State manager reaktif, persistence, dan filter logic
│   ├── storageClient.js                     # Klien direct upload Cloud Storage & validasi berkas
│   ├── supabaseClient.js                    # Klien sinkronisasi cloud real-time PostgreSQL Supabase
│   └── app.js                               # Controller UI utama, alur checkout, dan mitigasi XSS
│
├── scripts/
│   ├── deploy_infinityfree.ps1              # Skrip deployment otomatis ke InfinityFree via FTP
│   └── deploy_infinityfree.local.ps1        # Berkas kredensial FTP lokal (diabaikan oleh Git)
│
├── server/
│   ├── Dockerfile                           # Definisi Docker container backend
│   ├── ecosystem.config.js                  # Konfigurasi clustering proses PM2
│   ├── package.json                         # Dependensi backend Node.js (AWS SDK, Express, MySQL2)
│   ├── .env.example                         # Template variabel lingkungan aman (S3, CDN, DB)
│   ├── server.js                            # Express server API RESTful (Storage & Presigned Endpoints)
│   ├── db.js                                # Koneksi pool MySQL (mysql2/promise)
│   ├── database/
│   │   └── migrate.js                       # Skrip migrasi database otomatis
│   ├── middleware/
│   │   ├── auth.js                          # Middleware verifikasi Bearer Token JWT & peran
│   │   ├── rateLimiter.js                   # Proteksi rate limiting terhadap DDoS/Brute Force
│   │   └── sanitizer.js                     # Middleware pembersih input Anti-XSS
│   ├── services/
│   │   ├── storage.service.js               # Layanan Cloud Storage Decoupled (AWS S3/Spaces/MinIO)
│   │   ├── mediaOptimization.service.js     # Layanan optimasi media WebP (Cloudinary/ImageKit)
│   │   ├── jwt.service.js                   # Layanan penerbitan & verifikasi token JWT
│   │   ├── escrow.service.js                # State machine & kalkulasi rekening bersama escrow
│   │   ├── tierRules.service.js             # Engine validasi kuota & limit transaksi paket buyer
│   │   └── esg.service.js                   # Kalkulasi reduksi emisi karbon CO2e & ekuivalensi pohon
│   └── scripts/
│       ├── backup.js                        # Script pencadangan database MySQL
│       └── restore.js                       # Script pemulihan database dari backup
│
├── database/
│   ├── setup_complete.sql                   # Skrip inisialisasi lengkap database MySQL
│   ├── schema.sql                           # Skema struktur tabel database
│   ├── supabase_schema.sql                  # Skema PostgreSQL Supabase dengan Hardened RLS Policies
│   └── create_database.sql                  # Skrip pembuatan database bursalimbah
│
├── nginx/
│   └── nginx.conf                           # Konfigurasi reverse proxy, gzip, dan header keamanan
│
└── api/                                     # Backend ringan PHP (cPanel / Apache / InfinityFree)
    ├── config.php                           # Loader konfigurasi dinamis (env var / config.local.php)
    ├── db.php                               # Koneksi PDO MySQL aman (error logging tertutup)
    ├── login.php                            # Endpoint login terproteksi
    ├── register.php                         # Endpoint registrasi akun mitra baru
    └── google.php                           # Endpoint dinonaktifkan (403 Forbidden)
```

---

## 🌐 Deployment InfinityFree (frontend + PHP API + MySQL)

InfinityFree menjalankan file statis dan PHP; backend Express di `server/` tidak digunakan pada deployment ini. Frontend memakai URL relatif `/api/...`; `api/.htaccess` meneruskannya ke router PHP agar login, produk, pesanan, penawaran, event, chat, dan pengaturan menggunakan API yang sama-origin.

1. Buat database MySQL melalui panel InfinityFree dan impor `database/infinityfree_setup.sql` di phpMyAdmin setelah memilih database yang dibuat. Skrip ini tidak mencoba membuat database atau user.
2. Salin `api/config.local.php.example` menjadi `api/config.local.php`, lalu isi host, nama database, user, dan password persis dari panel. File rahasia ini diabaikan Git dan diblokir oleh `.htaccess`; unggah file itu secara terpisah melalui File Manager/FTP ke `/htdocs/api/config.local.php` karena skrip deploy sengaja mengecualikannya.
3. Untuk membuat administrator awal, daftarkan akun biasa melalui aplikasi, lalu ubah `users.role` menjadi `admin` untuk akun itu di phpMyAdmin. Pendaftaran publik hanya mengizinkan buyer/seller.
4. Atur unsigned upload preset di Cloudinary hanya untuk **foto publik** dan isi Cloud Name/preset pada pengaturan platform. Dokumen KTP/NPWP serta bukti pembayaran memakai signed upload bertipe `authenticated`; isi Cloud Name, API Key, dan API Secret di `api/config.local.php`. Jangan unggah dokumen sensitif melalui preset unsigned.
5. Unggah file dengan skrip `scripts/deploy_infinityfree.ps1`. Skrip menyertakan folder bersarang dan `hero.jpg`, mengecualikan `config.local.php`, dan berhenti dengan error jika ada file gagal diunggah. Variabel FTP yang dipakai: `INFINITYFREE_FTP_HOST`, `INFINITYFREE_FTP_USER`, dan `INFINITYFREE_FTP_PASS`.

Untuk database yang sudah dibuat sebelum pembaruan form **Mulai Jual**, jalankan sekali `database/migrations/20261107_product_submission_fields.sql` di phpMyAdmin. Migrasi ini menambahkan kolom sumber pasokan, jumlah wadah, NIB, dan izin TPS yang dipakai API produk.

Contoh file konfigurasi lokal `scripts/deploy_infinityfree.local.ps1`:
```powershell
$ftpHost = 'ftpupload.net'
$ftpUser = 'akun-ftp-dari-panel'
$ftpPass = 'kata-sandi-ftp'
```

Supabase client/schema dan Express server tetap ada sebagai eksperimen/opsi terpisah; keduanya bukan jalur data yang digunakan konfigurasi InfinityFree ini. Jangan menaruh Service Role Key Supabase atau Cloudinary API Secret pada JavaScript frontend.

---

## 📄 Lisensi

Platform ini dirilis sebagai perangkat lunak sumber terbuka di bawah ketentuan **[Lisensi MIT](LICENSE)**.  
Hak Cipta © 2026 **Bursa Limbah Team (Circulink)**.

### Asisten bantuan AI Bursa Limbah

Widget bantuan mendukung pertanyaan seputar situs, pencarian kandidat produk dari katalog publik, dan panduan menyiapkan posting jual. Agent tidak menerbitkan listing; penjual tetap meninjau dan mengirim formulir Jual.

Pada deployment InfinityFree, impor `database/migrations/20261106_ai_agent_config.sql` bila tabel belum tersedia. Buat kunci enkripsi server 32 byte acak (`php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`) dan isi `INFERX_ENCRYPTION_KEY` pada `api/config.local.php`. Setelah deploy, buka **Admin → Pengaturan → LLM AI Agent**, isi API key, base URL, model, dan sakelar fitur. API key dienkripsi AES-256-GCM di tabel `ai_agent_config`, tidak pernah dikembalikan ke browser, dan pesan chat dikirim ke InferX untuk dijawab. Batasi chat 20 permintaan per sesi setiap 10 menit.
