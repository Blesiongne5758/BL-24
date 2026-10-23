# Security remediation — BL-24

Tanggal audit: 2026-10-23

## Perbaikan yang diterapkan

- Menghapus kredensial Cloudinary, Supabase service role, dan database yang tertanam dari kode/config yang dilacak Git. Konfigurasi PHP sekarang mengambil nilai dari environment dan gagal aman bila secret wajib tidak tersedia.
- Menonaktifkan fallback password `[REDACTED]` dan penerimaan password plaintext pada login PHP/Node. Password baru wajib 8–128 karakter dan hashing bcrypt menggunakan cost yang lebih kuat.
- Mengubah `DEMO_MODE` menjadi opt-in (`DEMO_MODE=true` hanya untuk lingkungan lokal terisolasi); production default tidak mengaktifkan bypass demo.
- Menghapus fallback JWT secret statis. Production sekarang wajib memakai `JWT_SECRET` minimal 32 karakter; development memakai secret acak per proses bila belum dikonfigurasi.
- Membatasi CORS Node ke origin yang dikonfigurasi, menghapus CORS wildcard dari `.htaccess`, dan menonaktifkan `x-powered-by`.
- Menambahkan autentikasi/RBAC untuk profile, verifikasi identitas, upload, pembuatan produk, perubahan status produk, serta operasi order yang mengubah data. Profile/booking juga memeriksa kepemilikan sesi.
- Upload kategori privat tidak lagi dapat memperoleh presigned URL secara anonim. Storage non-mock wajib memiliki access key dan secret.
- Endpoint Google Node/PHP tidak lagi mempercayai email/nama/avatar dari request body; endpoint memerlukan Google ID token yang diverifikasi terhadap issuer, status email, dan `GOOGLE_CLIENT_ID` bila dikonfigurasi.
- Menghapus password default dari form login/register frontend dan menyelaraskan `minlength`/`maxlength` dengan backend.

## Dampak kontrak integrasi yang disengaja

1. Klien login/register harus mengirim password 8–128 karakter.
2. Klien Google OAuth harus mengirim `idToken`/`id_token` hasil autentikasi Google. Email, nama, dan avatar tidak boleh lagi digunakan sebagai bukti identitas.
3. Endpoint mutasi yang dilindungi harus mengirim `Authorization: Bearer <token>` dan role yang sesuai.
4. Deployment harus menyediakan environment variables yang sebelumnya disimpan di source/config.

Bentuk respons JSON dan URL endpoint dipertahankan agar integrasi yang sudah ada tetap kompatibel selain persyaratan keamanan di atas.

## Tindakan wajib sebelum production

- Rotasi segera Cloudinary API secret, Supabase service-role key, password database, dan secret lain yang pernah ter-commit. Menghapus nilai dari working tree tidak membatalkan paparan di riwayat Git.
- Set `NODE_ENV=production`, `DEMO_MODE=false`, `JWT_SECRET` acak minimal 32 karakter, `CORS_ORIGIN` ke origin frontend resmi, `GOOGLE_CLIENT_ID`, serta semua credential storage/PHP melalui secret manager.
- Ganti placeholder `[REDACTED]` pada setup SQL sebelum menjalankan script database; jangan menggantinya dengan secret yang dikomit.
- Jalankan migrasi password untuk akun lama yang masih menyimpan plaintext hash sebelum mengaktifkan login production.

## Validasi lokal

- Semua file JavaScript server lolos `node --check`.
- `npm audit --omit=dev --audit-level=high` tidak menemukan vulnerability high/critical.
- Scan source setelah perubahan tidak menemukan secret/password default yang sebelumnya teridentifikasi.
- PHP lint belum dapat dijalankan di sandbox ini karena binary `php` tidak tersedia; jalankan `php -l` untuk file PHP pada CI/deployment host.

## Hasil penetration testing login dan panel admin

- Route `/api/admin/backups`, `/api/admin/audit-logs`, dan `PUT /api/settings` diuji tanpa token; seluruhnya menolak request dengan HTTP 401.
- JWT `alg:none`, JWT bertanda tangan secret yang salah, dan refresh token yang dikirim sebagai access token ditolak.
- Access token yang dikirim ke endpoint refresh juga ditolak; endpoint refresh tidak lagi crash ketika menerima token yang tidak sesuai tipe.
- Fallback login/register lokal dan kredensial admin demo pada UI dihapus agar kegagalan backend tidak berubah menjadi bypass autentikasi.
- Google login tanpa ID token ditolak; opsi Google tetap OFF secara default dan backend mengikuti pengaturan admin.
- Server tetap hidup setelah seluruh probe negatif dan `git diff --check` serta validasi sintaks berhasil.

Pengujian endpoint dengan akun valid dan database MySQL aktif tetap perlu dijalankan di staging, karena sandbox audit ini tidak memiliki koneksi database aplikasi.
