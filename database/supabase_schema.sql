-- =======================================================
-- CIRCULINK / BURSA LIMBAH — SUPABASE POSTGRESQL SCHEMA
-- Ready to run in Supabase SQL Editor
-- =======================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- 1. Table: users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  company TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  subscription_tier TEXT NOT NULL DEFAULT 'tier_starter',
  subscription_active BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_expiry DATE,
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verification_type TEXT,
  ktp_number TEXT,
  npwp_number TEXT,
  verification_doc_url TEXT,
  verified_badge TEXT,
  verified_at TEXT,
  bank_account TEXT,
  location TEXT,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  avatar TEXT,
  payment_methods JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. Table: categories
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  unit TEXT NOT NULL DEFAULT 'Kg',
  min_price NUMERIC(15, 2) DEFAULT 0,
  max_price NUMERIC(15, 2) DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. Table: products
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  seller_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  seller_type TEXT,
  source_type TEXT,
  volume NUMERIC(15, 2) DEFAULT 0,
  weight NUMERIC(15, 2) DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Kg',
  offer_price NUMERIC(15, 2) NOT NULL,
  total_price NUMERIC(15, 2) NOT NULL,
  container_type TEXT,
  condition TEXT,
  grade TEXT,
  description TEXT,
  address TEXT,
  location TEXT,
  origin TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  status TEXT NOT NULL DEFAULT 'pending',
  listing_status TEXT NOT NULL DEFAULT 'Tersedia',
  evidences JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 4. Table: orders
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  booking_code TEXT UNIQUE NOT NULL,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_title TEXT NOT NULL,
  seller_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  seller_name TEXT NOT NULL,
  buyer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  total_price NUMERIC(15, 2) NOT NULL,
  dp_amount NUMERIC(15, 2) NOT NULL,
  dp_percent NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
  remaining_amount NUMERIC(15, 2) NOT NULL,
  handling_fee NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
  status TEXT NOT NULL DEFAULT 'DP Terbayar (30%)',
  pickup_date DATE,
  notes TEXT,
  remaining_payment_status TEXT NOT NULL DEFAULT 'unpaid',
  remaining_payment_proof JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 5. Table: offers
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  product_title TEXT NOT NULL,
  product_code TEXT,
  seller_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  buyer_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  offer_price NUMERIC(15, 2) NOT NULL,
  quantity NUMERIC(15, 2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'Kg',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- -------------------------------------------------------
-- 6. Table: events
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  time TEXT,
  venue TEXT,
  location TEXT,
  category TEXT,
  quota INT DEFAULT 100,
  registered_count INT DEFAULT 0,
  price NUMERIC(15, 2) DEFAULT 0,
  description TEXT,
  organizer TEXT,
  image TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 7. Table: system_settings
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 8. Table: crypto_wallets
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crypto_wallets (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  address TEXT UNIQUE NOT NULL,
  network TEXT NOT NULL DEFAULT 'Polygon PoS (Matic Mainnet)',
  balance_clnk NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
  balance_usdt NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
  balance_matic NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
  unclaimed_clnk NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
  tx_history JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS and allow public access for demo / web client
-- -------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;

-- Allow read for all clients (anon & authenticated)
CREATE POLICY "Public Read Users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Read Offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Public Read Events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Wallets" ON public.crypto_wallets FOR SELECT USING (true);

-- Allow insert/update for anon & authenticated
CREATE POLICY "Public Insert/Update Users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Insert/Update Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Insert/Update Products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Insert/Update Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Insert/Update Offers" ON public.offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Insert/Update Events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Insert/Update Settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Insert/Update Wallets" ON public.crypto_wallets FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------
-- SEED DATA: 10 Categories
-- -------------------------------------------------------
INSERT INTO public.categories (id, name, icon, unit, min_price, max_price) VALUES
('cat_jelantah', 'Minyak Jelantah (UCO)', 'fa-solid fa-bottle-droplet', 'Liter', 7500, 11500),
('cat_oli', 'Oli Bekas (Pelumas B3)', 'fa-solid fa-oil-can', 'Liter', 2000, 4500),
('cat_kardus', 'Kardus & Box (OCC)', 'fa-solid fa-box', 'Kg', 1500, 2800),
('cat_plastik', 'Plastik Industri (PET/HDPE)', 'fa-solid fa-recycle', 'Kg', 3500, 8000),
('cat_besi', 'Besi & Logam Scrap', 'fa-solid fa-industry', 'Kg', 4000, 6800),
('cat_aluminium', 'Aluminium Scrap', 'fa-solid fa-cubes-stacked', 'Kg', 14000, 22000),
('cat_tembaga', 'Tembaga Super (Cu 99%)', 'fa-solid fa-bolt', 'Kg', 85000, 125000),
('cat_kertas', 'Kertas HVS & Arsip', 'fa-solid fa-newspaper', 'Kg', 1800, 3200),
('cat_elektronik', 'Limbah Elektronik (E-Waste)', 'fa-solid fa-microchip', 'Kg', 15000, 50000),
('cat_lainnya', 'Limbah Padat Lainnya', 'fa-solid fa-warehouse', 'Kg', 1000, 5000)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- SEED DATA: Akun Pengguna Bawaan (Default Password: [REDACTED])
-- -------------------------------------------------------
INSERT INTO public.users (id, name, email, phone, company, role, auth_provider, subscription_tier, subscription_active, identity_verified, verification_status, verified_badge, location) VALUES
('user_buyer_1', 'Budi Santoso (Purchasing)', 'pengadaan@hijaulestari.co.id', '+62 811-2345-678', 'PT Hijau Lestari Biofuel', 'buyer', 'local', 'tier_pro', TRUE, TRUE, 'verified', 'Mitra Terverifikasi (KTP/NPWP)', 'Kawasan Industri Cikarang, Jawa Barat'),
('user_buyer_2', 'Hendro Wijaya (Procurement)', 'purchasing@daurnusantara.co.id', '+62 812-9876-543', 'PT Daur Nusantara Tbk', 'buyer', 'local', 'tier_enterprise', TRUE, TRUE, 'verified', 'Mitra Terverifikasi (KTP/NPWP)', 'Surabaya Industrial Estate Rungkut (SIER), Jawa Timur'),
('user_seller_1', 'Ahmad Hidayat (Pengepul Utama)', 'sentra.jelantah@gmail.com', '+62 813-1122-3344', 'Sentra Jelantah Sejahtera', 'seller', 'local', 'tier_starter', TRUE, TRUE, 'verified', 'Pemasok Terverifikasi', 'Pulo Gadung, Jakarta Timur'),
('user_seller_2', 'Dedi Mulyadi', 'logam.jaya.scrap@gmail.com', '+62 815-5566-7788', 'UD Logam Abadi Scrap', 'seller', 'local', 'tier_starter', TRUE, TRUE, 'verified', 'Pemasok Terverifikasi', 'Kopo, Kota Bandung, Jawa Barat'),
('user_admin_1', 'Administrator Bursa Limbah', 'admin@bursalimbah.id', '+62 812-0000-9999', 'Pusat Operasional Bursa Limbah', 'admin', 'local', 'tier_enterprise', TRUE, TRUE, 'verified', 'Pusat Kurasi', 'Jakarta Pusat')
ON CONFLICT (id) DO NOTHING;
