-- ====================================================================
-- WasteHub / Bursa Limbah Marketplace Database Schema (PostgreSQL)
-- Sesuai cetak biru struktur_db.md
-- Mendukung: 18 Tabel Utama, UUID PK, 3-Tier Berlangganan, Escrow DP 30%,
-- Ketertelusuran Eviden Tera, Kategori B3, dan 10 Atribut Wajib Listing.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(20) NOT NULL CHECK(role IN ('buyer', 'seller', 'admin')),
    full_name VARCHAR(150),
    company_name VARCHAR(150),
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    password_hash TEXT NOT NULL,
    npwp VARCHAR(30),
    verified BOOLEAN DEFAULT FALSE,
    subscription_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. SUBSCRIPTIONS (3-Tier Berlangganan Pembeli)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50),
    price NUMERIC(12,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. ADDRESSES
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    province VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),
    postal_code VARCHAR(10),
    address TEXT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7)
);

-- 4. CATEGORIES (Kategori Utama, Khusus Industri B2B, Limbah B3)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(20) UNIQUE,
    main_category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(150),
    group_type VARCHAR(30) DEFAULT 'utama' CHECK(group_type IN ('utama', 'industri', 'b3')),
    is_b3 BOOLEAN DEFAULT FALSE,
    grade_default VARCHAR(10) DEFAULT 'A',
    unit VARCHAR(20) DEFAULT 'Kg',
    description TEXT,
    avg_price NUMERIC(14,2) DEFAULT 0,
    price_range VARCHAR(100),
    icon VARCHAR(50),
    image TEXT
);

-- 5. PRODUCTS (Dengan 10 Atribut Wajib Listing & Verifikasi B3)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    condition VARCHAR(50) DEFAULT 'bersih' CHECK(condition IN ('bersih', 'campur', 'terpress', 'cacah', 'baled')),
    grade VARCHAR(50),
    container_type VARCHAR(100),
    weight NUMERIC(12,2) DEFAULT 0,
    volume NUMERIC(12,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'Kg',
    origin_source VARCHAR(200),
    location TEXT,
    city VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    asking_price NUMERIC(14,2) NOT NULL,
    minimum_order NUMERIC(12,2) DEFAULT 1,
    pickup_schedule VARCHAR(100) DEFAULT 'Siap Angkut Segera',
    status VARCHAR(30) DEFAULT 'tersedia' CHECK(status IN ('tersedia', 'terjual', 'kontrak', 'draft', 'pending', 'approved', 'booked')),
    is_b3 BOOLEAN DEFAULT FALSE,
    b3_permit_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. PRODUCT_IMAGES (Foto Eviden Tera 3 Sisi & Dokumentasi Fisik)
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(200),
    is_evidence BOOLEAN DEFAULT FALSE
);

-- 7. OFFERS
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    buyer_id UUID REFERENCES users(id),
    offer_price NUMERIC(14,2) NOT NULL,
    evidence_photo TEXT,
    waste_origin TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. ORDERS (Dengan Escrow DP 30% & Biaya Penanganan Rp10.000)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    seller_id UUID REFERENCES users(id),
    buyer_id UUID REFERENCES users(id),
    offer_id UUID REFERENCES offers(id),
    total_amount NUMERIC(14,2) NOT NULL,
    dp_amount NUMERIC(14,2) NOT NULL,
    service_fee NUMERIC(14,2) DEFAULT 10000,
    status VARCHAR(30) DEFAULT 'dp_pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    payment_type VARCHAR(30),
    amount NUMERIC(14,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(30) DEFAULT 'pending',
    paid_at TIMESTAMP
);

-- 10. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    gross_amount NUMERIC(14,2) NOT NULL,
    service_fee NUMERIC(14,2) DEFAULT 10000,
    seller_receive NUMERIC(14,2) NOT NULL,
    transaction_status VARCHAR(30) DEFAULT 'escrow_hold',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. PICKUP_SCHEDULES
CREATE TABLE IF NOT EXISTS pickup_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    pickup_date DATE,
    pickup_time VARCHAR(20),
    pickup_address TEXT,
    driver_name VARCHAR(100),
    vehicle_number VARCHAR(30),
    status VARCHAR(30) DEFAULT 'scheduled'
);

-- 12. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    reviewer_id UUID REFERENCES users(id),
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(user_id, product_id)
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(200),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 15. CHAT_ROOMS
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 16. CHAT_MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 17. ADMIN_LOGS
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(200) NOT NULL,
    target_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 18. SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(200) NOT NULL
);
