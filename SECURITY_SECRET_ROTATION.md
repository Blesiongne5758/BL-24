# Rotasi Secret dan Kredensial BL-24

## Apa yang dilakukan skrip

`scripts/rotate_repository_secrets.js` secara default hanya melakukan **dry-run**. Dengan `--apply`, skrip dapat membuat JWT signing secret baru dan merotasi password **satu akun MySQL per eksekusi**. Password baru hanya ditulis ke `.env` dan `server/.env`, keduanya harus diabaikan Git; file dibuat dengan permission `0600`. Nilai secret tidak dicetak ke terminal. Sebelum mengubah database, skrip meminta konfirmasi interaktif `ROTATE BL-24`.

Skrip ini tidak menjalankan rotasi provider eksternal, tidak men-deploy atau me-restart service, dan tidak mengubah riwayat Git. Jangan menganggap rotasi selesai sebelum langkah provider, deployment, dan verifikasi di bawah tuntas.

## Prasyarat dan pemakaian

Instal dependency backend terlebih dahulu agar `mysql2` tersedia:

```bash
cd server
npm ci
cd ..
```

Untuk merotasi password akun aplikasi MySQL, sediakan kredensial administrator database lewat environment shell—jangan memasukkannya ke command history atau file repository:

```bash
export ROTATE_DB_ADMIN_HOST=127.0.0.1
export ROTATE_DB_ADMIN_PORT=3306
export ROTATE_DB_ADMIN_USER=<akun-administrator-database>
read -s ROTATE_DB_ADMIN_PASSWORD
export ROTATE_DB_ADMIN_PASSWORD
export ROTATE_DB_TARGET_USER=<akun-database-aplikasi>
export ROTATE_DB_TARGET_HOST=<host-account-mysql-yang-tepat>
export ROTATE_TARGET_ENV_KEY=DB_PASSWORD
```

Jika database berada di host non-lokal, aktifkan verifikasi TLS:

```bash
export ROTATE_DB_TLS=true
```

Tinjau rencana terlebih dahulu, lalu jalankan secara interaktif:

```bash
node scripts/rotate_repository_secrets.js --dry-run
node scripts/rotate_repository_secrets.js --apply
```

Gunakan akun aplikasi berhak minimum, bukan `root`. Pastikan nama akun dan host pada `ROTATE_DB_TARGET_USER`/`ROTATE_DB_TARGET_HOST` persis cocok dengan akun MySQL yang ada. Untuk memutar password MySQL root secara terpisah, set `ROTATE_TARGET_ENV_KEY=MYSQL_ROOT_PASSWORD` dan targetkan akun root yang benar. Rotasi JWT saja dapat dijalankan dengan `--jwt-only --apply`; ini membatalkan validitas token lama. Opsi `--skip-jwt` mengecualikan rotasi JWT saat password database diputar.

Setelah rotasi, verifikasi file `.env` tetap tidak tracked, restart service secara terencana, lalu tes login, koneksi database, upload, dan alur transaksi. Rotasi JWT akan mengakhiri sesi/token aktif. Perubahan environment Compose tidak otomatis mengubah akun MySQL pada volume yang sudah ada; itulah sebabnya password database perlu benar-benar diubah oleh skrip.

## Rotasi yang harus dilakukan di provider

Nilai berikut harus dicabut/diganti pada panel provider masing-masing terlebih dahulu; skrip lokal tidak dapat membuat credential provider baru atau membuktikan rotasi telah berlaku:

- **Cloudinary:** cabut API secret/key yang bocor, buat credential baru melalui console provider, lalu masukkan credential baru ke environment server/deployment secret store.
- **Supabase:** rotate/revoke service-role key melalui project dashboard, periksa policy RLS, dan simpan key baru hanya sebagai secret server-side. Jangan pernah mengirimkannya ke frontend.
- **FTP/hosting:** ganti password FTP pada panel hosting; gunakan FTPS/SFTP dengan verifikasi sertifikat. Skrip deployment kini membaca `BL24_FTP_HOST`, `BL24_FTP_USERNAME`, dan `BL24_FTP_PASSWORD` dari environment dan mengaktifkan TLS.
- **Database provider/production:** jalankan rotasi terhadap database yang benar-benar dipakai oleh aplikasi production. Menjalankan skrip pada checkout lokal tidak mengubah server production.

Jangan menaruh credential pengganti di commit, issue, chat publik, atau `.env.example`.

## Riwayat Git

Commit baru menghapus literal rahasia dari **versi file saat ini**, tetapi secret yang pernah dikomit tetap dapat dibaca dari commit lama, fork, cache, atau clone lain. Cabut/ganti credential meskipun file kini telah dibersihkan. Membersihkan riwayat dengan `git filter-repo` dan force-push berisiko mengubah riwayat bersama; prosedur itu belum dijalankan dalam perubahan ini. Setelah rotasi dan koordinasi kolaborator, lakukan pembersihan riwayat secara terpisah dan perbarui semua clone/deployment.

## Seed akun demo

Seed UI/SQL yang berada di repository tidak lagi menerbitkan credential demo yang dapat dipakai: nilai lokal dihapus dan hash seed ditandai non-login. Perubahan repository ini **tidak** mengubah akun atau password hash pada database yang sudah terpasang; reset/nonaktifkan akun lama secara terpisah dan verifikasi hasilnya sebelum deployment dianggap aman. Buat akun baru melalui proses normal dan provision admin melalui jalur administratif terkontrol. File SQL bootstrap tidak lagi membuat akun database berpassword statis atau memberi grant luas; provision akun database aplikasi secara terpisah dengan privilege minimum.
