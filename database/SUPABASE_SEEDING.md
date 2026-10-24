# Seeding data awal Supabase

Seed runner berada di `server/scripts/seed-supabase.js` dan dapat dijalankan melalui script npm:

```bash
cd server
npm ci
npm run seed:supabase
```

Runner ini mengisi data demo/staging berikut secara idempotent:

- 5 user: 1 admin, 2 seller, dan 2 buyer.
- 5 produk listing aktif.
- 1 event webinar.
- 4 notifikasi.
- 2 histori subscription.

Kategori wajib sudah tersedia lebih dulu. Jalankan schema PostgreSQL `database/supabase_schema.sql` atau migration Supabase sebelum menjalankan seed.

## Konfigurasi environment

Jangan menulis password ke file SQL, repository, command history, atau GitHub Variables. Runner membuat bcrypt hash saat runtime. Setiap role seed dapat menggunakan password berbeda.

Contoh di shell interaktif:

```bash
cd server
read -r -s -p 'Password admin staging: ' SEED_ADMIN_PASSWORD; echo
read -r -s -p 'Password seller staging: ' SEED_SELLER_PASSWORD; echo
read -r -s -p 'Password buyer staging: ' SEED_BUYER_PASSWORD; echo
export SEED_ADMIN_PASSWORD SEED_SELLER_PASSWORD SEED_BUYER_PASSWORD
export SUPABASE_DB_URL='postgresql://postgres.[PROJECT_REF]:PASSWORD@POOLER_HOST:6543/postgres'
export ALLOW_DEMO_SEED=true
npm run seed:supabase
unset SEED_ADMIN_PASSWORD SEED_SELLER_PASSWORD SEED_BUYER_PASSWORD SUPABASE_DB_URL
```

Password harus minimal 12 karakter. Script berhenti jika `ALLOW_DEMO_SEED=true` belum diberikan. Pada `NODE_ENV=production`, script juga berhenti kecuali `ALLOW_DEMO_SEED_IN_PRODUCTION=true` diatur secara eksplisit. Default yang aman adalah menjalankan seed ini hanya pada database staging.

## Perilaku aman

Script menggunakan transaksi PostgreSQL. Jika satu bagian gagal, seluruh perubahan di-rollback. Upsert memakai primary key yang sudah ditentukan sehingga menjalankan script ulang tidak menggandakan data. Password hanya diproses menjadi bcrypt hash dan tidak pernah dicetak ke log.

Script tidak memasukkan KTP, NPWP, rekening bank nyata, dokumen identitas, file Cloudinary, order, payment, atau transaksi finansial. Data user yang dibuat adalah data demo dan harus diganti atau dihapus sebelum production.

## Verifikasi tanpa menampilkan password

```sql
select id, role, email, auth_provider, identity_verified, verification_status
from users
where id in (
  'user_admin_001',
  'user_seller_001',
  'user_seller_002',
  'user_buyer_001',
  'user_buyer_002'
)
order by role, id;

select count(*) as products_seeded
from products
where id like 'prod_%';
```

Gunakan `SUPABASE_DB_URL` hanya pada backend/runner yang dipercaya. Jangan memasukkan connection string PostgreSQL, `SUPABASE_SECRET_KEY`, JWT secret, atau Cloudinary API secret ke bundle frontend InfinityFree.
