# Database Bursa Limbah

Database MySQL untuk platform Bursa Limbah. Berisi 20 tabel lengkap untuk mengelola user, produk, transaksi, chat, event, dan konfigurasi sistem.

## Koneksi Database

| Setting | Nilai |
|---------|-------|
| Host | Atur melalui `DB_HOST` pada environment deployment |
| Port | `3306` |
| Database | `bursalimbahdb` |
| User | Akun aplikasi khusus dengan privilege minimum |
| Password | Simpan di secret manager; jangan tulis di repository |

> Konfigurasi tersimpan di `server/.env`

---

## Cara Setup Database

### Langkah 1: Jalankan Setup Awal (sebagai root MySQL)

```bash
mysql -h "$DB_HOST" -u "$DB_ADMIN_USER" -p < database/setup_complete.sql
```

Atau jika menggunakan MySQL lokal:
```bash
mysql -u root -p < database/setup_complete.sql
```

### Langkah 2: Tambahkan Data Demo (opsional)

```bash
mysql -h "$DB_HOST" -u "$DB_ADMIN_USER" -p bursalimbahdb < database/seed_demo.sql
```

### Langkah 3: Verifikasi

```bash
mysql -h "$DB_HOST" -u "$DB_ADMIN_USER" -p bursalimbahdb -e "SHOW TABLES;"
```

---

## Daftar Script SQL

| File | Fungsi |
|------|--------|
| `setup_complete.sql` | **Setup utama** — Buat database, user, 20 tabel, 91 kategori, dan pengaturan sistem |
| `seed_demo.sql` | Data demo — 1 admin, 2 penjual, 2 pembeli, 5 produk, 1 event |
| `reset.sql` | ⚠️ Hapus semua tabel (hanya untuk development) |

---

## Struktur 20 Tabel

| # | Tabel | Fungsi |
|---|-------|--------|
| 1 | `users` | Semua pengguna (buyer, seller, admin) |
| 2 | `categories` | 91 sub-kategori limbah (16 kategori utama) |
| 3 | `products` | Listing produk/limbah dari penjual |
| 4 | `product_images` | Foto bukti dan galeri produk |
| 5 | `offers` | Penawaran harga dari pembeli |
| 6 | `orders` | Order resmi setelah offer disetujui |
| 7 | `payments` | Pembayaran DP dan pelunasan |
| 8 | `transactions` | Rekap keuangan platform |
| 9 | `subscriptions` | Riwayat paket berlangganan |
| 10 | `pickup_schedules` | Jadwal pengambilan barang |
| 11 | `reviews` | Ulasan dan rating transaksi |
| 12 | `favorites` | Produk favorit pembeli |
| 13 | `notifications` | Notifikasi untuk semua user |
| 14 | `chat_rooms` | Ruang percakapan buyer-seller |
| 15 | `chat_messages` | Pesan dalam ruang chat |
| 16 | `events` | Event, webinar, pameran |
| 17 | `event_registrations` | Peserta event |
| 18 | `admin_logs` | Log aktivitas admin |
| 19 | `system_settings` | Konfigurasi platform |
| 20 | `addresses` | Alamat pengiriman/penjemputan |

---

## Akun Demo

Seed repository tidak lagi menerbitkan credential demo yang bisa dipakai. Perubahan ini tidak mengubah database yang sudah terpasang; reset atau nonaktifkan akun lama secara terpisah melalui prosedur admin sebelum deployment dianggap aman. Buat akun baru melalui proses registrasi dan provision administrator melalui jalur terkontrol.

---

## Kategori Limbah (16 Utama)

1. Minyak & Cairan Bekas (6 sub)
2. Kertas & Karton (7 sub)
3. Plastik (10 sub)
4. Logam (9 sub)
5. Kaca (5 sub)
6. Karet (5 sub)
7. Kayu (5 sub)
8. Tekstil (4 sub)
9. Elektronik E-Waste (6 sub)
10. Baterai & Aki (4 sub)
11. Organik (5 sub)
12. Kemasan Industri Bekas (5 sub)
13. Scrap Produksi — Industri (4 sub)
14. Material Recovery — Industri (4 sub)
15. Limbah Konstruksi — Industri (5 sub)
16. **Limbah B3 (Izin Khusus KLHK)** (7 sub)

**Total: 91 sub-kategori**
