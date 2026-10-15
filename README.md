# Circulink — Waste Trading Management MVP Platform

> **Tagline**: *Verified Waste. Trusted Trade.*  
> **Domain Target**: `circulink.com`  
> **Referensi Blueprint**: Dokumen Perancangan `Circulink_Waste_Trading_MVP_Blueprint.md`  
> **Lisensi**: [MIT License](LICENSE) (Copyright © 2026 Bursa Limbah Team)

Circulink (Bursa Limbah) adalah platform marketplace komoditas limbah dan sirkular berbasis **traceability terverifikasi** yang mempertemukan penjual (industri manufaktur, pabrik, UMKM, bengkel, pengepul) dan pembeli (*off-taker*, pabrik daur ulang, bio-refinery) dalam satu ekosistem digital terintegrasi dengan Rekening Bersama Escrow dan Smart Contract Blockchain Web3.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi ini mendukung mode **client-side mandiri** (*standalone demo*) maupun **arsitektur backend enterprise penuh** (Node.js Express + MySQL + Nginx/Docker).

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
   [REDACTED]
   JWT_SECRET=[REDACTED]
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
| 12 | **Dompet Kripto & Web3** | `cryptoWallet` | Tombol dompet header, modul Web3, klaim reward daur ulang, dan escrow on-chain. |

---

## ⛓️ Integrasi Blockchain & Dompet Kripto ($CLNK Utility Token)

Circulink mengintegrasikan dompet kripto Web3 dan token utilitas sirkular untuk insentif ekonomi sirkular dan transaksi terdesentralisasi:

- **Spesifikasi Smart Contract & Jaringan**:
  - Jaringan: **Polygon PoS (Matic Mainnet)** — hemat energi dan ramah lingkungan.
  - Token Utilitas: **`$CLNK` ([REDACTED])**.
  - Kurs Acuan: Rp 1.500 per 1 `$CLNK` (dapat disesuaikan dinamis di Admin Settings).
  - Smart Contract Token: `[REDACTED]`.
  - Smart Contract Escrow: `0x3A28F50B9402De069F78465C58a18357aF38ESCROW`.
  - *Gasless Relayer Sponsored*: Pengguna dapat mengklaim reward dan bertransaksi tanpa memerlukan saldo native MATIC.
- **Dompet Kripto Web3 Pengguna (`#modal-crypto-wallet`)**:
  - Alamat publik EVM unik (`0x...`) untuk setiap pengguna dengan tombol salin 1-klik.
  - Tampilan saldo real-time: `$CLNK` (dengan estimasi konversi IDR), stablecoin `USDT`, dan gas native `MATIC`.
  - **Klaim Reward Insentif Daur Ulang**: Reward 10 `$CLNK` per 100 Kg pasokan limbah terverifikasi dengan animasi confetti dan pencatatan transaksi on-chain.
  - **Transfer Token P2P**: Mengirim token antar pengguna secara instan dengan verifikasi alamat on-chain.
  - **Riwayat Transaksi Blockchain**: Log transaksi transparan mencakup jenis transaksi, nominal, stempel waktu, dan TxHash.
- **Pusat Distribusi Token Airdrop Admin (`#modal-admin-airdrop`)**:
  - Mengelola pool airdrop (2.500.000 `$CLNK`) untuk membagikan token insentif ke seluruh pengguna terdaftar atau ke alamat wallet spesifik.
- **Alat Transaksi & Pembayaran Escrow**:
  - Pembeli dapat memilih metode pembayaran pada saat checkout:
    1. **Rekening Bersama Escrow** (Rupiah via Transfer Bank / QRIS / VA)
    2. **Dompet Kripto Sirkular** (`$CLNK` Web3 Escrow Smart Contract)
  - Nilai pembayaran dikonversi otomatis ke `$CLNK` dan dikunci dalam smart contract hingga proses serah terima limbah tervalidasi.

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

## 🛡️ Keamanan & Kepatuhan Standar Industri

1. **Pencegahan XSS Menyeluruh (Anti-XSS Sanitization)**:
   - Seluruh titik rendering data dinamis (129+ titik pada `js/app.js`) diproteksi dengan fungsi sanitasi `esc()` (`escapeHtml`).
   - Middleware backend `server/middleware/sanitizer.js` secara otomatis membersihkan tag HTML dan injeksi script dari payload masukan JSON pengguna.
2. **Autentikasi & Otorisasi Kuat**:
   - Autentikasi berbasis **JWT (JSON Web Token)** dengan verifikasi peran berbasis RBAC (*Role-Based Access Control*).
   - Enkripsi kata sandi menggunakan `bcrypt` dengan cost factor 10.
   - Rate limiting via `express-rate-limit` (100 request/15 menit untuk API umum, 10 request/15 menit untuk endpoint autentikasi) guna memitigasi serangan *brute force* dan DoS.
3. **Pencadangan & Pemulihan Database Otomatis**:
   - `server/scripts/backup.js`: Utilitas pencadangan otomatis skema dan data MySQL dengan kompresi gzip.
   - `server/scripts/restore.js`: Utilitas restorasi cepat database dari file cadangan (*snapshot*).
4. **Perhitungan Metrik ESG Teruji**:
   - Perhitungan reduksi jejak karbon (CO2e) otomatis per kilogram/liter komoditas yang diperdagangkan, dikonversi menjadi ekuivalensi pohon tertanam.

---

## 📁 Struktur Direktori & File Proyek

```text
bursalimbah/
├── .gitignore                               # Konfigurasi file yang diabaikan Git
├── DEPLOYMENT.md                            # Panduan deployment produksi (Nginx, PM2, Docker)
├── LICENSE                                  # Lisensi Open-Source MIT
├── README.md                                # Dokumentasi komprehensif proyek
├── docker-compose.yml                       # Konfigurasi orkestrasi container Docker
├── start-website.bat                        # Launcher 1-klik Windows
├── index.html                               # Antarmuka SPA utama (Tailwind CSS + FontAwesome)
│
├── css/
│   └── style.css                            # Styling khusus tema Bursa Limbah & animasi
├── js/
│   ├── data.js                              # Seed data awal kategori, produk, fitur, dan Web3 config
│   ├── store.js                             # State manager reaktif, feature flags, dan Web3 crypto wallet
│   └── app.js                               # Controller UI, modal checkout, airdrop, dan mitigasi XSS
│
├── server/
│   ├── Dockerfile                           # Definisi Docker container backend
│   ├── ecosystem.config.js                  # Konfigurasi clustering proses PM2
│   ├── package.json                         # Dependensi backend Node.js
│   ├── .env.example                         # Template variabel lingkungan aman
│   ├── server.js                            # Express server API RESTful
│   ├── db.js                                # Koneksi pool MySQL (mysql2/promise)
│   ├── database/
│   │   └── migrate.js                       # Skrip migrasi database otomatis
│   ├── middleware/
│   │   ├── auth.js                          # Middleware verifikasi Bearer Token JWT & peran
│   │   ├── rateLimiter.js                   # Proteksi rate limiting terhadap DDoS/Brute Force
│   │   └── sanitizer.js                     # Middleware pembersih input Anti-XSS
│   ├── services/
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
│   └── create_database.sql                  # Skrip pembuatan database bursalimbah
│
├── nginx/
│   └── nginx.conf                           # Konfigurasi reverse proxy, gzip, dan header keamanan
│
└── api/                                     # Alternatif backend ringan PHP (XAMPP / cPanel)
    ├── db.php                               # Koneksi PDO MySQL
    ├── login.php                            # Endpoint login pengguna
    ├── register.php                         # Endpoint registrasi akun baru
    └── google.php                           # Endpoint autentikasi Google OAuth
```

---

## 🧪 Rangkaian Pengujian Otomatis (QA Test Suites)

Platform ini dilengkapi 4 suite pengujian unit mandiri untuk menjamin stabilitas dan keandalan kode:

1. **Audit Kepatuhan & Lisensi (`test_audit.js`)**:
   - Memvalidasi 97 parameter: lisensi MIT, integritas skema database, keselarasan ID elemen QRIS/metode bayar, versi skrip cache-busting, dan sanitasi DOM.
   - Hasil: **97/97 PASS** (100%).
2. **Logika Bisnis & Alur Transaksi (`test_logic.js`)**:
   - Menguji validasi batas kuota tier, penerbitan pesanan DP 30%, pengunggahan bukti pelunasan sisa 70%, dan verifikasi admin.
   - Hasil: **5/5 PASS** (100%).
3. **Layanan Backend Modular (`test_backend_services.js`)**:
   - Menguji layanan JWT, mesin status transaksi escrow, kalkulator dampak lingkungan ESG, engine validasi tier rules, dan sanitasi input Anti-XSS.
   - Hasil: **10/10 PASS** (100%).
4. **Fitur Sakelar Admin & Dompet Kripto (`test_crypto_and_features.js`)**:
   - Menguji master feature toggle on/off, konfigurasi blockchain, pembuatan dompet publik pengguna, transfer P2P token $CLNK, klaim insentif daur ulang, distribusi airdrop admin, dan pembayaran pemesanan via crypto escrow.
   - Hasil: **7/7 PASS** (100%).

Jalankan seluruh pengujian dengan satu perintah:
```bash
node test_audit.js; node test_logic.js; node test_backend_services.js; node test_crypto_and_features.js
```

---

## 📄 Lisensi

Platform ini dirilis sebagai perangkat lunak sumber terbuka di bawah ketentuan **[Lisensi MIT](LICENSE)**.  
Hak Cipta © 2026 **Bursa Limbah Team (Circulink)**.
