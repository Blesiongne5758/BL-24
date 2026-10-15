# Circulink — Waste Trading Management MVP Platform

> **Tagline**: *Verified Waste. Trusted Trade.*  
> **Domain Target**: `circulink.com`  
> **Referensi Blueprint**: Berdasarkan dokumen perancangan `Circulink_Waste_Trading_MVP_Blueprint.md`

Platform marketplace limbah berbasis **traceability** yang mempertemukan penjual (industri, pabrik, bengkel, pengepul) dan pembeli (*off-taker*, pabrik daur ulang) dalam satu ekosistem digital terverifikasi.

---

## 🚀 Cara Menjalankan Website

Website ini dibangun secara mandiri (*standalone client-side application*) tanpa membutuhkan dependensi runtime yang rumit.

1. **Cara Paling Cepat**:
   - Double-click file `start-website.bat`, atau
   - Buka langsung file `index.html` dengan peramban favorit Anda (Google Chrome, Microsoft Edge, Mozilla Firefox).
2. **Atau melalui terminal PowerShell**:
   ```powershell
   Start-Process .\index.html
   ```

---

## 📦 Peta Fitur & Keselarasan dengan Dokumen Blueprint

### 1. 10 Kategori Awal Komoditas Limbah
Platform mengintegrasikan ke-10 kategori awal lengkap dengan satuan standar dan rentang harga pasar Indonesia:
1. **Minyak Jelantah** (Liter) — FFA & Kadar Air
2. **Oli Bekas** (Liter) — Pelumas mesin & B3
3. **Kardus** (Kg) — OCC Brown Corrugated
4. **Plastik** (Kg) — PET bening, HDPE, PP bal press
5. **Besi Rongsok** (Kg) — Scrap WF, plat, cor
6. **Aluminium** (Kg) — Profil kusen, kaleng, velg
7. **Tembaga** (Kg) — Kabel kupas merah Cu 99%
8. **Kertas** (Kg) — HVS kantor, koran, duplex
9. **Limbah Elektronik** (Kg) — PCB, motherboard, baterai
10. **Waste Lainnya** (Kg) — Karet, palet kayu, kain majun

---

### 2. Model Bisnis & Monetisasi (Revenue Blueprint)
- **Langganan Buyer (Rp99.000 / bulan)**:
  - Membuka akses harga penawaran marketplace secara real-time.
  - Membuka koordinat GPS lokasi gudang seller.
  - Memberikan hak checkout & booking langsung.
  - *Tersedia tombol aktivasi/simulasi instan di header & profil buyer.*
- **Biaya Handling (Rp10.000 / transaksi)**:
  - Biaya flat platform untuk pengelolaan rekening escrow aman, verifikasi kurasi eviden, dan penerbitan kode token QR traceability.
- **Down Payment (DP 30%) Escrow**:
  - Saat checkout, buyer mengamankan stok dengan membayar DP 30% dari total nilai limbah + Rp10.000 handling fee.
- **Pelunasan 70%**:
  - Dilunasi setelah armada buyer sampai di lokasi seller dan memeriksa kesesuaian fisik timbangan.

---

### 3. Alur 4 Peran Pengguna (Role Switcher Demo)
Di bagian atas navigasi disediakan **Mode Selector** instan untuk simulasi demo:

#### A. Mode Publik (Landing Page)
- Hero section dengan value proposition bursa limbah terpercaya.
- **Live Price Ticker**: Indeks perkiraan harga komoditas terkini.
- **Kalkulator Transaksi Interaktif**:
  - Pilih kategori dan masukkan tonase/volume.
  - Otomatis menghitung: Nilai Gross, DP 30%, Handling Fee Rp10.000, Pembayaran Saat Booking, Sisa 70%, dan Estimasi Reduksi Emisi CO2e (ESG metrics).
- Edukasi arsitektur **4 Tahap Traceability**.

#### B. Mode Buyer (Pembeli / Off-Taker)
- Katalog marketplace dengan filter kategori, pencarian kata kunci, dan pengurutan harga.
- Detail limbah lengkap dengan **3 foto eviden interaktif** dan **peta OpenStreetMap Leaflet GPS**.
- Formulir checkout DP 30% dengan pemilihan tanggal penjemputan armada.
- Tab **Booking Saya**: Pemantauan pesanan, status escrow, pelunasan 70%, dan tombol cetak **Surat Jalan / Manifes Digital**.

#### C. Mode Seller (Penjual / Pengepul)
- Ringkasan statistik: Listing aktif, menunggu kurasi, status booked, dan saldo dompet.
- **Formulir Upload Waste Terverifikasi**:
  - Wajib kategori, jenis wadah (IBC, Drum, Bal, Jumbo Bag, Truk Fuso), berat/volume, harga satuan.
  - Wajib 3 foto eviden (Wadah utuh, sampel mutu dekat, timbangan/segel).
  - Alamat dan koordinat titik GPS.
- Produk yang baru diupload otomatis berstatus **Pending Review** sebelum disetujui Admin.

#### D. Mode Admin (Circulink Master Control)
- **Pusat Verifikasi**: Daftar pengajuan limbah dari seller dengan tombol *Periksa Eviden*, *Approve* (langsung tayang di marketplace), dan *Reject* (dengan catatan alasan).
- **Monitoring Transaksi**: Pemantauan dana DP 30% yang tertampung di escrow dan pendapatan komisi handling fee Rp10.000.
- **Konfigurasi Tarif**: Pengaturan langsung biaya langganan buyer, handling fee, dan persentase DP.
- **Reset Demo Data**: Mengembalikan seluruh data ke kondisi awal kapan saja.

---

## 🛠️ Struktur File Proyek
```text
bursalimbah/
├── database/
│   └── schema.sql                           # Skema database MySQL & initial seed users
├── server/
│   ├── server.js                            # Express REST API server untuk autentikasi MySQL
│   ├── db.js                                # Koneksi pool MySQL2/promise
│   ├── package.json                         # Dependensi backend Node.js
│   └── .env                                 # Konfigurasi koneksi MySQL (host, port, user, db)
├── api/                                     # Alternatif backend PHP (XAMPP/Laragon)
│   ├── db.php                               # Koneksi PDO MySQL
│   ├── login.php                            # Endpoint login pengguna
│   ├── register.php                         # Endpoint pendaftaran (signup) pengguna
│   └── google.php                           # Endpoint autentikasi Google
├── index.html                               # Halaman antarmuka utama aplikasi
├── css/
│   └── style.css                            # Styling tema Bursa Limbah & komponen dinamis
├── js/
│   ├── data.js                              # Initial seed data 10 kategori, produk, order, user
│   ├── store.js                             # State management hybrid (MySQL API + LocalStorage fallback)
│   └── app.js                               # Controller interaksi UI, filter, kurasi & autentikasi
├── start-website.bat                        # Launcher Windows 1-klik
└── README.md                                # Dokumentasi lengkap proyek
```

---

## 🗄️ Panduan Integrasi Database MySQL

Platform Bursa Limbah dilengkapi dukungan database relasional **MySQL** untuk menangani **Pendaftaran (Signup)** dan **Login Pengguna** (Pembeli, Penjual, dan Admin) dengan enkripsi kata sandi `bcrypt`.

### 1. Impor Skema Database
Pastikan layanan MySQL Anda aktif (misalnya via XAMPP, Laragon, Docker, atau MySQL Server lokal port 3306), lalu jalankan file skema:
```bash
mysql -u root -p < database/schema.sql
```
*Atau buka phpMyAdmin (`http://localhost/phpmyadmin`), buat database `bursalimbah`, lalu impor file `database/schema.sql`.*

Tabel `users` otomatis terisi 6 akun demo bawaan (password default: `123456`).

### 2. Menjalankan Backend Node.js (Express + MySQL)
1. Masuk ke direktori `server`:
   ```bash
   cd server
   npm install
   ```
2. Sesuaikan kredensial di file `.env` jika diperlukan:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=bursalimbah
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
4. Buka peramban pada `http://localhost:5000` — frontend dan API backend langsung aktif secara terintegrasi!

### 3. Pilihan Alternatif via PHP (XAMPP / Laragon)
Jika menggunakan web server Apache/XAMPP, letakkan folder `bursalimbah` di `htdocs` / `www`. Endpoint API di folder `api/` (`api/login.php`, `api/register.php`) siap digunakan langsung tanpa instalasi tambahan.

### 4. Arsitektur Hybrid / Graceful Fallback
Frontend di `js/store.js` dibangun secara cerdas:
- Jika server MySQL aktif, autentikasi diproses secara penuh melalui database MySQL.
- Jika server MySQL sedang offline, aplikasi otomatis beralih ke penyimpanan lokal (`localStorage`) sehingga presentasi demo tidak pernah terganggu (*zero downtime*).

---

## 🌿 Rencana Pengembangan Berikutnya (Future Features)
Sesuai roadmap blueprint tahap lanjutan:
1. Integrasi gateway pembayaran riil (Midtrans / Xendit API).
2. Autentikasi JWT / Bearer Token session.
3. Fitur Tiket Timbang Digital (*Digital Weighing Ticket*) dengan scan barcode QR langsung oleh supir armada.
4. Dashboard ESG & Penerbitan Sertifikat Daur Ulang resmi (*Certificate of Recycling*).

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah ketentuan [Lisensi MIT](LICENSE).  
Copyright (c) 2026 Bursa Limbah Team (Circulink).
