# Rencana Implementasi: Transformasi MVP Tampilan Mobile App (Home, Mulai Jual, Berlangganan, Simulasi)

## Ringkasan Proyek

Transformasi antarmuka Bursa Limbah dari format portal desktop multi-halaman tradisional menjadi **MVP Mobile App layout** yang ramping, modern, dan berfokus pada 4 fungsi utama pengguna:
1. **Home (Beranda)** — Eksplorasi katalog komoditas limbah terverifikasi, pencarian, dan status ketersediaan.
2. **Mulai Jual** — Formulir pendaftaran pasokan limbah dengan pemilih 3-Tier Sumber Adaptif (Rumah Tangga, Industri Menengah, Industri Besar).
3. **Berlangganan** — Pemilihan paket akses data bursa (Starter Rp 0, Bisnis Pro Rp 249rb, Korporat Enterprise Rp 499rb).
4. **Simulasi** — Kalkulator finansial transaksi, perhitungan DP 30% Escrow, estimasi sisa pelunasan, dan reduksi emisi karbon ESG.

Sesuai instruksi pengguna, elemen-elemen berikut akan dihilangkan:
- ❌ Ticker market harga komoditas dan bar pengumuman kurs atas
- ❌ Frame banner slider iklan sponsor
- ❌ Switcher dashboard peran lama (*Publik, Pembeli, Penjual, Admin*) pada navigasi depan
- ❌ Dashboard pintasan static di bagian paling bawah halaman (`mobile-static-bottom-hub`)

---

## User Review Required

> [!IMPORTANT]
> **Akses Akun Penjual, Pembeli, dan Admin**:
> Modul khusus (seperti panel admin kurasi limbah dan profil penjual/pembeli) tetap dapat diakses melalui tombol **Profil / Masuk** di Top App Bar dan modal autentikasi, namun navigasi utama aplikasi sepenuhnya beralih ke 4 tab MVP: **Home**, **Mulai Jual**, **Berlangganan**, dan **Simulasi**.

---

## Proposed Changes

### 1. Struktur Antarmuka (`index.html`)

#### [MODIFY] [index.html](file:///c:/Users/yuliu/Documents/bursalimbah-awal/bursalimbah/index.html)

- **Hapus**:
  - Bar pengumuman & ticker harga pasar (`#announcement-bar` / `#price-ticker-strip`).
  - Frame iklan sponsor slider (`#sponsor-ad-bar` dan script `adSlider`).
  - Role switcher lama pada navbar (`role-btn-public`, `role-btn-buyer`, `role-btn-seller`, `role-btn-admin`, dan mobile selector `mob-role-*`).
  - Hub statik di bagian bawah halaman (`#mobile-static-bottom-hub`).
- **Tambahkan Mobile App Shell**:
  - **Top App Bar**: Header modern bergaya mobile app dengan logo Bursa Limbah, slogan *Verified Waste. Trusted Trade.*, tombol notifikasi, dan tombol akun/login.
  - **Tab View Containers**:
    1. `<div id="tab-home">`: Menampilkan search bar, chip filter kategori populer, dan kartu katalog pasokan limbah terverifikasi.
    2. `<div id="tab-sell">`: Halaman mandiri formulir **Mulai Jual** lengkap dengan 3 Kartu Sumber Limbah adaptif yang baru dioptimasi.
    3. `<div id="tab-subscription">`: Halaman perbandingan dan pendaftaran 3-tier langganan pembeli.
    4. `<div id="tab-simulation">`: Halaman kalkulator simulasi transaksi DP 30%, jasa penanganan, dan metrik ESG.
  - **Bottom Navigation Bar (Docked App Bar)**:
    - Bar navigasi bawah melayang (*fixed bottom*) dengan 4 menu ikon & label:
      - 🏠 **Home**
      - 📦 **Mulai Jual**
      - 💎 **Berlangganan**
      - 🧮 **Simulasi**
    - Desain responsif, padding aman untuk mobile display, dan status aktif dengan aksen warna brand.

---

### 2. Logika Navigasi & Controller (`js/app.js`)

#### [MODIFY] [app.js](file:///c:/Users/yuliu/Documents/bursalimbah-awal/bursalimbah/js/app.js)

- Menambahkan properti state `currentAppTab: 'home'` di constructor `BursaLimbahApp`.
- Membuat fungsi utama `switchAppTab(tabId)`:
  - Menyembunyikan tab yang tidak aktif dan menampilkan tab yang dipilih (`tab-home`, `tab-sell`, `tab-subscription`, `tab-simulation`).
  - Memperbarui status kelas aktif/inaktif pada ikon dan label di Bottom Navigation Bar.
  - Scroll ke atas dengan transisi halus (*smooth scroll*).
  - Menginisialisasi modul yang sesuai saat tab dibuka (misal: merender ulang katalog di Home, mereset/menginisialisasi form jual di Mulai Jual, memperbarui kalkulator di Simulasi).
- Membersihkan pemanggilan fungsi `renderPriceTicker()` dan event listener slider iklan agar tidak menimbulkan error.
- Mengarahkan tombol CTA di landing page (misal: "Jual Limbah Sekarang", "Hitung Simulasi", "Lihat Paket Langganan") langsung ke tab yang relevan via `switchAppTab`.

---

### 3. Styling & Mobile UX (`css/style.css`)

#### [MODIFY] [style.css](file:///c:/Users/yuliu/Documents/bursalimbah-awal/bursalimbah/css/style.css)

- Menambahkan gaya untuk:
  - `.mobile-bottom-nav`: Docked navigation bar dengan blur background, border atas tipis, dan safe area padding.
  - `.mobile-nav-item`: Efek touch feedback aktif (`active:scale-90`), ikon indikator aktif berwarna hijau emerald.
  - Penyesuaian `padding-bottom` pada container utama agar konten terbawah tidak tertutup oleh bottom navigation bar.

---

## Verification Plan

### Automated Verification
- Validasi sintaks JavaScript menggunakan `node -c js/data.js`, `node -c js/store.js`, `node -c js/app.js`.

### Manual Verification
1. Buka `index.html` di browser dan aktifkan mode inspeksi mobile (responsive design view, e.g. iPhone / Android viewport).
2. Pastikan **ticker harga, kurs, dan frame iklan sponsor tidak lagi muncul**.
3. Pastikan **selector peran legacy (Publik, Pembeli, Penjual, Admin) di header depan telah hilang**.
4. Pastikan **bagian statik paling bawah (`mobile-static-bottom-hub`) telah hilang**.
5. Uji klik ke-4 tab pada Bottom Navigation Bar:
   - **Home**: Memuat katalog limbah, filter kategori, dan pencarian.
   - **Mulai Jual**: Menampilkan formulir pendaftaran 3-tier sumber limbah (Rumah Tangga, Industri Menengah, Industri Besar).
   - **Berlangganan**: Menampilkan 3 kartu pilihan paket langganan.
   - **Simulasi**: Menampilkan kalkulator transaksi interaktif & ESG.
6. Pastikan perpindahan tab mulus, indikator aktif pada bottom bar berubah, dan konten tidak terpotong.
