# Workflow Deployment InfinityFree, Supabase, dan Cloudinary

Workflow GitHub Actions berada di `.github/workflows/deploy-services.yml`.

## Arsitektur yang digunakan

InfinityFree hanya menerima frontend statis melalui FTP. Backend Node.js BL-24 tidak dijalankan di InfinityFree; backend harus tetap berada di Railway, Render, VPS, atau host Node.js lain. Frontend InfinityFree memakai `BACKEND_API_URL` untuk memanggil backend tersebut.

Supabase menerima migration PostgreSQL dari `database/supabase_schema.sql`. Workflow membuat bridge migration awal di runner lalu menjalankan `supabase db push` menggunakan connection string Supabase.

Cloudinary bukan target deployment source code. Cloudinary menyimpan media saat runtime. Workflow hanya memvalidasi Cloudinary public configuration dan menghasilkan konfigurasi browser pada `config.js`. API secret Cloudinary tetap berada di environment backend dan tidak pernah masuk ke bundle InfinityFree.

## GitHub Variables

Buat Variables pada repository atau environment `staging` berikut:

```text
BACKEND_API_URL=https://backend-staging.example.com
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=<Supabase publishable/anon key>
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_UPLOAD_PRESET=<unsigned preset khusus frontend>
```

`BACKEND_API_URL` wajib menunjuk ke backend Node.js yang benar-benar aktif. Jangan isi dengan URL InfinityFree jika Node.js backend belum tersedia di sana.

## GitHub Secrets

Buat Secrets pada environment `staging` berikut:

```text
INFINITYFREE_FTP_SERVER=ftpupload.net
INFINITYFREE_FTP_USERNAME=<FTP username InfinityFree>
INFINITYFREE_FTP_PASSWORD=<FTP password InfinityFree>
SUPABASE_DB_URL=postgresql://postgres.[PROJECT_REF]:<PASSWORD>@<POOLER_HOST>:6543/postgres
```

InfinityFree menggunakan hostname FTP `ftpupload.net` menurut forum dukungan InfinityFree. Folder tujuan workflow adalah `/htdocs/`.

Pada host backend Node.js, konfigurasi rahasia berikut harus diatur terpisah dan tidak dimasukkan ke GitHub Variables frontend:

```text
SUPABASE_DB_URL=...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Upload preset Cloudinary

Buat upload preset khusus frontend sebagai **unsigned** hanya untuk file yang memang boleh diunggah browser. Batasi folder, format, ukuran, dan transformation pada preset. Jangan menaruh `CLOUDINARY_API_SECRET` di `config.js`, JavaScript browser, GitHub Variables publik, atau InfinityFree.

Untuk dokumen privat seperti identitas/KYC, gunakan authenticated signed upload melalui backend Node.js. Jangan menggunakan unsigned preset untuk dokumen privat.

## Cara menjalankan

Workflow akan berjalan ketika ada push ke branch `main` atau `security-hardening-2026-10-23`. Workflow juga bisa dijalankan manual melalui tab **Actions** dengan environment `staging`.

Urutan job:

1. `validate`: memasang dependency backend, memeriksa sintaks JavaScript, dan menjalankan `npm audit`.
2. `deploy-infinityfree`: membuat `config.js` dari public variables lalu mengunggah hanya frontend statis via FTP.
3. `migrate-supabase`: menjalankan schema/migration PostgreSQL pada Supabase.
4. `cloudinary-runtime-config`: memastikan Cloudinary public variables tersedia.

Workflow tidak mengunggah folder `server`, `database`, `supabase`, `api`, dependency Node.js, atau file dokumentasi ke InfinityFree.

## Catatan migration Supabase

Bridge migration awal mengambil isi `database/supabase_schema.sql` dan menyalinnya ke migration timestamp pada runner. Setelah schema staging sudah tercatat pada `supabase_migrations.schema_migrations`, perubahan berikutnya sebaiknya dibuat sebagai file migration baru yang versioned di repository, bukan mengubah migration awal.

Supabase merekomendasikan agar perubahan remote tidak dilakukan langsung melalui SQL Editor setelah workflow migration dipakai. Perubahan selanjutnya harus dibuat sebagai migration dan dikirim melalui `supabase db push`.

## Verifikasi pascadeploy

Periksa hal berikut setelah workflow selesai:

```bash
curl -fsS https://backend-staging.example.com/api/health
curl -I https://frontend-staging.example.com/
```

Kemudian buka frontend dan uji login, pemuatan produk, upload media publik, upload dokumen privat, serta satu alur transaksi. Jika frontend tampil tetapi request API menuju `localhost:5000`, berarti `BACKEND_API_URL` belum dibuat atau belum terbaca sebagai GitHub Variable.

## Referensi

- [1]: https://forum.infinityfree.com/t/where-is-the-ftp-server-name-in-my-inifinityfree/98899 "InfinityFree FTP hostname"
- [2]: https://supabase.com/docs/guides/deployment/database-migrations "Supabase database migrations"
- [3]: https://cloudinary.com/documentation/upload_images "Cloudinary Upload API"
- [4]: https://cloudinary.com/documentation/upload_presets "Cloudinary upload presets"
