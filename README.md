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
├── Circulink_Waste_Trading_MVP_Blueprint.md  # Dokumen acuan bisnis MVP
├── index.html                               # Halaman antarmuka utama aplikasi
├── css/
│   └── style.css                            # Styling khusus tema Circulink, badge, map container
├── js/
│   ├── data.js                              # Initial seed data 10 kategori, produk, order, user
│   ├── store.js                             # State management localStorage & business logic
│   └── app.js                               # Controller interaksi UI, Leaflet map, filter & kalkulator
├── start-website.bat                        # Launcher Windows 1-klik
└── README.md                                # Dokumentasi lengkap proyek
```

---

## 🌿 Rencana Pengembangan Berikutnya (Future Features)
Sesuai roadmap blueprint tahap lanjutan:
1. Integrasi gateway pembayaran riil (Midtrans / Xendit API).
2. Autentikasi JWT / Laravel Sanctum backend.
3. Fitur Tiket Timbang Digital (*Digital Weighing Ticket*) dengan scan barcode QR langsung oleh supir armada.
4. Dashboard ESG & Penerbitan Sertifikat Daur Ulang resmi (*Certificate of Recycling*).
