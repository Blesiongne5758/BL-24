# Walkthrough: Transformasi MVP Mobile App BURSA LIMBAH

Implementasi transformasi tampilan BURSA LIMBAH menjadi antarmuka **MVP Mobile App** modern dengan navigasi 4 dashboard utama telah selesai dikerjakan sesuai spesifikasi.

---

## 1. Ringkasan Perubahan

### A. Pembersihan Elemen Legacy
1. **Ticker Harga & Kurs Dihilangkan**: Menghapus strip ticker pasar komoditas dan kurs mata uang asing yang padat di bagian paling atas (`#price-ticker-strip`).
2. **Frame Iklan Sponsor Dihilangkan**: Menghapus slider banner sponsor iklan (`#sponsor-ad-bar`).
3. **Role Switcher Legacy di Header Dihilangkan**: Menghapus tombol pemilihan peran (*Publik, Pembeli, Penjual, Admin*) dari navigasi depan agar antarmuka fokus ke pengalaman aplikasi mobile.
4. **Dashboard Statik Bawah Dihilangkan**: Menghapus panel statis dock bawah yang lama (`#mobile-static-bottom-hub`).

---

### B. 4 Tab Screen Dashboard Mobile App
Seluruh tampilan depan (`#view-public`) kini dibagi ke dalam 4 wadah tab dinamis (`app-tab-pane`):

| Tab | Elemen ID | Konten & Fungsionalitas |
|---|---|---|
| **1. Home** | `#tab-home` | Sorotan Cerita Komoditas (*Stories*), Hero Banner, Fitur Keunggulan, Chip Kategori, Katalog Pasokan Terverifikasi, dan Kalender Event. |
| **2. Mulai Jual** | `#tab-sell` | Layar pendaftaran pasokan mandiri dengan formulir adaptif **3-Tier Sumber Limbah** (Rumah Tangga, Industri Menengah, Industri Besar) lengkap dengan foto fisik tera timbangan, estimasi nilai bruto, dan pengiriman kurasi. |
| **3. Berlangganan** | `#tab-subscription` | 3 Pilihan Paket Langganan Pembeli: *Starter* (Rp 0), *Bisnis Pro* (Rp 249rb/bln), *Korporat Enterprise* (Rp 499rb/bln) beserta tabel transparansi biaya penanganan rekening bersama. |
| **4. Simulasi** | `#tab-simulation` | Kalkulator transaksi interaktif dengan slider tonase & preset cepat (500, 1.000, 2.500, 5.000, 10.000), estimasi nilai transaksi bruto, alokasi DP 30% Rekber, biaya penanganan, pelunasan 70%, dan metrik reduksi emisi karbon ESG (CO2e). |

---

### C. Navigasi Docked Mobile Bottom Bar & Header
- **Docked Bottom Navigation Bar (`#mobile-app-bottom-nav`)**: Tersemat melayang di bagian bawah dengan 4 tombol tap (*Home, Mulai Jual, Berlangganan, Simulasi*) yang dilengkapi indikator dot aktif dan mikro-animasi.
- **Top App Bar**: Header modern dengan logo aplikasi, sinkronisasi tab desktop (`dnav-*`), tombol Chat Interaktif dengan badge pesan belum dibaca, tautan WhatsApp CS, dan tombol Masuk/Profil.
- **Logika Navigasi di `js/app.js` (`app.switchAppTab(tabKey)`)**:
  - Mengatur visibilitas antar panel tab secara mulus.
  - Memperbarui status aktif baik pada bottom bar mobile (`bnav-*`) maupun desktop top bar (`dnav-*`).
  - Menghubungkan fungsi `navigateToSection('kalkulator')` dan `navigateToSection('tarif')` langsung ke tab masing-masing (`sim` dan `sub`).
  - Mengarahkan `showUploadModal()` langsung membuka layar tab **Mulai Jual** (`sell`).

---

### D. Optimasi 3-Tier Sumber Limbah
- Pilihan kartu interaktif:
  - 🏠 **Rumah Tangga**: Wadah jerigen/kantong/galon, satuan Liter/Kg, MOQ 5 Kg, tanpa izin industri.
  - 🏢 **Industri Menengah**: Wadah drum/jerigen/karung, NIB UMKM, MOQ 50 Kg.
  - 🏭 **Industri Besar**: Wadah IBC Tank/kontainer/curah fuso, NIB Korporat, No. Izin TPS KLHK/Manifes, MOQ 500 Kg.

---

## 2. Hasil Verifikasi & Uji Coba

- **Uji Sintaks JavaScript**:
  ```bash
  node -c js/data.js js/store.js js/app.js
  # Status: BERHASIL (Exit Code 0, Tanpa Syntax Error)
  ```
- **Uji Siklus Navigasi Tab**:
  - Simulasi eksekusi `app.switchAppTab('sell')` -> Tab aktif: `sell`.
  - Simulasi eksekusi `app.switchAppTab('sub')` -> Tab aktif: `sub`.
  - Simulasi eksekusi `app.switchAppTab('sim')` -> Tab aktif: `sim`.
  - Simulasi eksekusi `app.switchAppTab('home')` -> Tab aktif: `home`.
  - Status: Semua metode tab dan controller DOM berjalan tanpa galat.
- **Verifikasi Integritas Elemen DOM**:
  - `price-ticker-strip`: 0
  - `sponsor-ad-bar`: 0
  - `mobile-static-bottom-hub`: 0
  - `modal-upload`: 0 (dihilangkan, digantikan oleh tab screen `#tab-sell` tanpa duplikasi ID)
  - `mobile-app-bottom-nav`: 1 (aktif terpasang)

---

## 3. Cara Menguji di Browser
1. Buka `index.html` di browser Anda (atau melalui Live Server).
2. Perhatikan bagian bawah layar: terdapat **Docked Bottom Navigation Bar** dengan 4 menu utama:
   - Ketuk **Home**: Menampilkan etalase pasokan limbah dan agenda event.
   - Ketuk **Mulai Jual**: Menampilkan dashboard pendaftaran pasokan limbah dengan 3 pilihan sumber limbah adaptif.
   - Ketuk **Berlangganan**: Menampilkan paket langganan Starter, Bisnis Pro, dan Korporat Enterprise.
   - Ketuk **Simulasi**: Menampilkan kalkulator interaktif DP 30% dan metrik ESG.
3. Di perangkat desktop, tab navigasi pada bagian atas bar juga tersinkronisasi otomatis dengan pilihan tab yang sedang aktif.
