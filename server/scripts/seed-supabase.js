// SPDX-License-Identifier: MIT
/**
 * Safe initial data seeder for Supabase/PostgreSQL.
 *
 * Usage:
 *   ALLOW_DEMO_SEED=true \
 *   [REDACTED]='...' \
 *   [REDACTED]='...' \
 *   [REDACTED]='...' \
 *   node server/scripts/seed-supabase.js
 *
 * Passwords are hashed at runtime and are never written to this repository.
 * The explicit ALLOW_DEMO_SEED gate prevents accidental production seeding.
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const DEMO_USERS = [
  {
    id: 'user_admin_001',
    role: 'admin',
    name: 'Admin Bursa Limbah',
    company: 'PT Bursa Limbah Indonesia',
    email: 'admin@bursalimbah.id',
    phone: '+62 811-0000-0001',
    tier: 'tier_enterprise',
    expiryDays: 365,
    verified: 1,
    verificationStatus: 'verified',
    verificationType: 'npwp',
    badge: 'Admin Platform',
    location: 'Jakarta Selatan',
    balance: 50000000,
    passwordEnv: [REDACTED]
  },
  {
    id: 'user_seller_001',
    role: 'seller',
    name: 'Budi Santoso',
    company: 'CV Jaya Logam Mandiri',
    email: 'budi.seller@demo.id',
    phone: '+62 812-1111-2222',
    tier: 'tier_pro',
    expiryDays: 90,
    verified: 1,
    verificationStatus: 'verified',
    verificationType: 'ktp',
    badge: 'Mitra Terverifikasi (KTP)',
    location: 'Surabaya, Jawa Timur',
    balance: 12500000,
    passwordEnv: [REDACTED]
  },
  {
    id: 'user_seller_002',
    role: 'seller',
    name: 'Siti Rahayu',
    company: 'UD Sumber Plastik Jaya',
    email: 'siti.seller@demo.id',
    phone: '+62 813-2222-3333',
    tier: 'tier_basic',
    expiryDays: 30,
    verified: 0,
    verificationStatus: 'unverified',
    verificationType: null,
    badge: 'Pemasok Baru',
    location: 'Bekasi, Jawa Barat',
    balance: 3200000,
    passwordEnv: [REDACTED]
  },
  {
    id: 'user_buyer_001',
    role: 'buyer',
    name: 'PT Hijau Lestari',
    company: 'PT Hijau Lestari Nusantara',
    email: 'hijau.buyer@demo.id',
    phone: '+62 821-3333-4444',
    tier: 'tier_pro',
    expiryDays: 60,
    verified: 1,
    verificationStatus: 'verified',
    verificationType: 'npwp',
    badge: 'Pembeli Terverifikasi',
    location: 'Tangerang, Banten',
    balance: 75000000,
    passwordEnv: [REDACTED]
  },
  {
    id: 'user_buyer_002',
    role: 'buyer',
    name: 'Ahmad Yusuf',
    company: 'UD Yusuf Recycle',
    email: 'ahmad.buyer@demo.id',
    phone: '+62 857-4444-5555',
    tier: 'tier_starter',
    expiryDays: 30,
    verified: 0,
    verificationStatus: 'unverified',
    verificationType: null,
    badge: 'Pembeli Terdaftar',
    location: 'Bandung, Jawa Barat',
    balance: 1500000,
    passwordEnv: [REDACTED]
  }
];

const PRODUCTS = [
  ['prod_001', 'BL-MTL-001', 'user_seller_001', 'MTL-001', 'Besi Scrap Kualitas A — 5 Ton Siap Angkut', 'Besi scrap bekas konstruksi gedung bertingkat. Sudah dipisahkan dari beton, kondisi kering dan bebas kotoran.', 'Surabaya', 7500, 5000, 'Proyek Konstruksi Gedung Surabaya', -7.2575, 112.7521],
  ['prod_002', 'BL-MTL-002', 'user_seller_001', 'MTL-004', 'Kabel Tembaga Cu 99% — 500 Kg', 'Kabel tembaga bekas kupas dari proyek instalasi listrik. Kemurnian Cu 99%.', 'Surabaya', 120000, 500, 'Proyek Instalasi Listrik Pabrik', -7.2575, 112.7521],
  ['prod_003', 'BL-PPR-001', 'user_seller_002', 'PPR-001', 'Kardus OCC Grade A — 2 Ton', 'Kardus bekas kemasan industri makanan. Kondisi kering, bersih, dan sudah dipress.', 'Bekasi', 2800, 2000, 'Pabrik Kemasan Makanan Bekasi', -6.2350, 107.0020],
  ['prod_004', 'BL-PLS-001', 'user_seller_002', 'PLS-001', 'Botol PET Bening Press — 1 Ton', 'Botol air mineral PET sudah dipress dan dipisahkan dari tutup.', 'Bekasi', 6500, 1000, 'Bank Sampah & Pengepul Wilayah Bekasi', -6.2388, 107.0240],
  ['prod_005', 'BL-OIL-001', 'user_seller_001', 'OIL-001', 'Minyak Jelantah — 500 Liter (Drum)', 'Minyak jelantah yang sudah disaring dari kotoran dan cocok untuk biodiesel.', 'Surabaya', 10000, 450, 'Restoran & Katering Surabaya Raya', -7.3210, 112.7800]
];

function requireSeedAuthorization() {
  if (String(process.env.ALLOW_DEMO_SEED).toLowerCase() !== 'true') {
    throw new Error('Seed diblokir. Set ALLOW_DEMO_SEED=true secara eksplisit untuk staging/demo.');
  }
  if (process.env.NODE_ENV === 'production' && String(process.env.ALLOW_DEMO_SEED_IN_PRODUCTION).toLowerCase() !== 'true') {
    throw new Error('Seed demo diblokir pada NODE_ENV=production. Gunakan environment staging atau set ALLOW_DEMO_SEED_IN_PRODUCTION=true secara sadar.');
  }
}

function readSeedPasswords() {
  const names = [...new Set(DEMO_USERS.map(user => user.passwordEnv))];
  const passwords = {};
  for (const name of names) {
    const value = process.env[name];
    if (!value || value.length < 12) {
      throw new Error(`${name} wajib tersedia dan minimal 12 karakter; password plaintext tidak disimpan di script.`);
    }
    passwords[name] = value;
  }
  return passwords;
}

function dateAfterDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function assertCategories(connection) {
  for (const code of ['MTL-001', 'MTL-004', 'PPR-001', 'PLS-001', 'OIL-001']) {
    const [rows] = await connection.query('SELECT id FROM categories WHERE category_code = ?', [code]);
    if (!rows.length) throw new Error(`Kategori ${code} belum tersedia. Jalankan database/supabase_schema.sql terlebih dahulu.`);
  }
}

async function seedUsers(connection, passwords) {
  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(passwords[user.passwordEnv], 12);
    await connection.query(`
      INSERT INTO users (
        id, role, name, company, email, phone, password_hash, auth_provider,
        subscription_tier, subscription_active, subscription_expiry,
        identity_verified, verification_status, verification_type, verified_badge,
        location, balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', ?, 1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        password_hash = [REDACTED]
        subscription_tier = EXCLUDED.subscription_tier,
        subscription_active = EXCLUDED.subscription_active,
        subscription_expiry = EXCLUDED.subscription_expiry,
        identity_verified = EXCLUDED.identity_verified,
        verification_status = EXCLUDED.verification_status,
        verification_type = EXCLUDED.verification_type,
        verified_badge = EXCLUDED.verified_badge,
        location = EXCLUDED.location,
        balance = EXCLUDED.balance`,
      [user.id, user.role, user.name, user.company, user.email, user.phone, passwordHash,
        user.tier, dateAfterDays(user.expiryDays), user.verified, user.verificationStatus,
        user.verificationType, user.badge, user.location, user.balance]
    );
  }
}

async function seedProducts(connection) {
  for (const [id, code, sellerId, categoryCode, title, description, city, askingPrice, weight, origin, latitude, longitude] of PRODUCTS) {
    const [categoryRows] = await connection.query('SELECT id FROM categories WHERE category_code = ?', [categoryCode]);
    const categoryId = categoryRows[0].id;
    await connection.query(`
      INSERT INTO products (
        id, code, seller_id, category_id, title, description, condition, grade,
        container_type, weight, volume, unit, origin_source, location, city,
        latitude, longitude, asking_price, minimum_order, pickup_schedule, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'bersih', 'Grade A', 'Bal Press', ?, ?, 'Kg', ?, ?, ?, ?, ?, ?, ?, 'Siap Angkut Segera', 'tersedia')
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        seller_id = EXCLUDED.seller_id,
        category_id = EXCLUDED.category_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        city = EXCLUDED.city,
        asking_price = EXCLUDED.asking_price,
        weight = EXCLUDED.weight,
        volume = EXCLUDED.volume,
        origin_source = EXCLUDED.origin_source,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        status = EXCLUDED.status`,
      [id, code, sellerId, categoryId, title, description, weight, weight, origin,
        origin, city, latitude, longitude, askingPrice, Math.max(1, Math.round(weight * 0.1))]
    );
  }
}

async function seedEvent(connection) {
  await connection.query(`
    INSERT INTO events (
      id, title, description, event_type, location, event_date, event_time,
      quota, registered, price, status, created_by
    ) VALUES (?, ?, ?, 'webinar', 'Online via Zoom', ?, '14.00 - 16.00 WIB', 200, 0, 0, 'aktif', ?)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      event_date = EXCLUDED.event_date,
      status = EXCLUDED.status`,
    ['evt_001', 'Webinar: Peluang Bisnis Daur Ulang Plastik',
      'Diskusi tren harga, regulasi, dan peluang industri daur ulang.', dateAfterDays(14), 'user_admin_001']
  );
}

async function seedNotifications(connection) {
  const notifications = [
    ['notif_001', 'user_seller_001', 'success', 'Selamat datang di Bursa Limbah!', 'Akun Penjual Anda sudah aktif. Mulai pasang listing pertama Anda sekarang.'],
    ['notif_002', 'user_seller_002', 'info', 'Lengkapi Profil Anda', 'Verifikasi KTP/NPWP untuk mendapatkan badge Mitra Terverifikasi.'],
    ['notif_003', 'user_buyer_001', 'success', 'Akun Pembeli Aktif', 'Anda sudah bisa melihat detail harga dan menghubungi penjual.'],
    ['notif_004', 'user_buyer_002', 'info', 'Upgrade ke Tier Basic', 'Dengan Basic Anda dapat mengakses lebih banyak listing.']
  ];
  for (const values of notifications) {
    await connection.query(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type, title = EXCLUDED.title, message = EXCLUDED.message`, values);
  }
}

async function seedSubscriptions(connection) {
  const subscriptions = [
    ['sub_demo_001', 'user_seller_001', 'tier_pro', 299000, 90],
    ['sub_demo_002', 'user_buyer_001', 'tier_pro', 299000, 60]
  ];
  for (const [id, userId, plan, price, days] of subscriptions) {
    await connection.query(`
      INSERT INTO subscriptions (id, user_id, plan_name, price, start_date, end_date, status)
      VALUES (?, ?, ?, ?, CURRENT_DATE, ?, 'active')
      ON CONFLICT (id) DO UPDATE SET
        plan_name = EXCLUDED.plan_name, price = EXCLUDED.price,
        end_date = EXCLUDED.end_date, status = EXCLUDED.status`,
      [id, userId, plan, price, dateAfterDays(days)]);
  }
}

async function run() {
  requireSeedAuthorization();
  const passwords = readSeedPasswords();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await assertCategories(connection);
    await seedUsers(connection, passwords);
    await seedProducts(connection);
    await seedEvent(connection);
    await seedNotifications(connection);
    await seedSubscriptions(connection);
    await connection.commit();
    console.log('Supabase initial seed selesai: 5 users, 5 products, 1 event, 4 notifications, 2 subscriptions.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  run()
    .catch(error => {
      console.error('[Supabase Seed Error]', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { run, DEMO_USERS, PRODUCTS };
