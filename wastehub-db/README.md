# WasteHub / Bursa Limbah Database Blueprint

Repositori ini memuat berkas SQL lengkap sesuai rancangan `struktur_db.md` untuk platform perdagangan limbah terverifikasi **WasteHub / BURSA LIMBAH**.

## 18 Tabel Utama
1. `users` — Akun pembeli, penjual, dan admin
2. `subscriptions` — Status paket 3-Tier berlangganan pembeli
3. `addresses` — Alamat gudang dan koordinat GPS
4. `categories` — Master 16 kategori (Utama, Industri B2B, Limbah B3)
5. `products` — Listing limbah dengan 10 atribut wajib
6. `product_images` — 3 foto eviden tera & kondisi fisik
7. `offers` — Negosiasi penawaran harga pembeli
8. `orders` — Pemesanan resmi dengan DP 30%
9. `payments` — Log pembayaran escrow & biaya penanganan
10. `transactions` — Alokasi dana rekening bersama pengelola
11. `pickup_schedules` — Penjadwalan armada truk & pengemudi
12. `reviews` — Penilaian mutu dan keandalan penjual
13. `favorites` — Daftar simpan produk pembeli
14. `notifications` — Notifikasi transaksi realtime
15. `chat_rooms` — Ruang obrolan negosiasi per produk
16. `chat_messages` — Pesan interaktif antar mitra
17. `admin_logs` — Audit trail kurasi dan verifikasi
18. `system_settings` — Konfigurasi tarif escrow dan persentase DP

## Cara Eksekusi (PostgreSQL / Supabase / Neon)
```bash
psql -h <HOST> -U <USER> -d <DBNAME> -f schema.sql
psql -h <HOST> -U <USER> -d <DBNAME> -f seed_categories.sql
psql -h <HOST> -U <USER> -d <DBNAME> -f seed_settings.sql
psql -h <HOST> -U <USER> -d <DBNAME> -f indexes.sql
psql -h <HOST> -U <USER> -d <DBNAME> -f triggers.sql
```
