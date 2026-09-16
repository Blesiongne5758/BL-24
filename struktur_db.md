# WasteHub Marketplace Database Blueprint (PostgreSQL)

Dokumen ini berisi struktur database siap deploy untuk **WasteHub Waste
Trading Marketplace** menggunakan PostgreSQL/Supabase.

## Ringkasan

-   18 tabel utama
-   UUID sebagai Primary Key
-   Siap untuk PostgreSQL, Supabase, Neon, Railway
-   Mendukung seller, buyer, admin, langganan, DP 30%, foto eviden, dan
    kategori limbah.

## Daftar Tabel

1.  users
2.  subscriptions
3.  addresses
4.  categories
5.  products
6.  product_images
7.  offers
8.  orders
9.  payments
10. transactions
11. pickup_schedules
12. reviews
13. favorites
14. notifications
15. chat_rooms
16. chat_messages
17. admin_logs
18. system_settings

------------------------------------------------------------------------

## 1. Extension

``` sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 2. users

``` sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(20) NOT NULL CHECK(role IN ('buyer','seller','admin')),
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
```

## 3. subscriptions

``` sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50),
    price NUMERIC(12,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 4. addresses

``` sql
CREATE TABLE addresses (
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
```

## 5. categories

``` sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(20) UNIQUE,
    main_category VARCHAR(100),
    sub_category VARCHAR(150),
    grade_default VARCHAR(5),
    unit VARCHAR(20)
);
```

Contoh seed:

``` sql
INSERT INTO categories
(category_code,main_category,sub_category,grade_default,unit)
VALUES
('OIL-001','Minyak','Minyak Jelantah Bersih','A','Liter'),
('PLS-001','Plastik','PET Bening','A','kg'),
('MTL-001','Logam','Besi Tua Tebal','A','kg'),
('PPR-001','Kertas','Kardus OCC','A','kg');
```

## 6. products

``` sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    title VARCHAR(200),
    description TEXT,
    grade VARCHAR(5),
    container_type VARCHAR(100),
    weight NUMERIC(12,2),
    volume NUMERIC(12,2),
    unit VARCHAR(20),
    origin_source VARCHAR(200),
    location TEXT,
    asking_price NUMERIC(14,2),
    minimum_order NUMERIC(12,2),
    status VARCHAR(30) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 7. product_images

``` sql
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT,
    is_evidence BOOLEAN DEFAULT FALSE
);
```

## 8. offers

``` sql
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    buyer_id UUID REFERENCES users(id),
    offer_price NUMERIC(14,2),
    evidence_photo TEXT,
    waste_origin TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 9. orders

``` sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    seller_id UUID REFERENCES users(id),
    buyer_id UUID REFERENCES users(id),
    offer_id UUID REFERENCES offers(id),
    total_amount NUMERIC(14,2),
    dp_amount NUMERIC(14,2),
    service_fee NUMERIC(14,2) DEFAULT 10000,
    status VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 10. payments

``` sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    payment_type VARCHAR(30),
    amount NUMERIC(14,2),
    payment_method VARCHAR(50),
    payment_status VARCHAR(30),
    paid_at TIMESTAMP
);
```

## 11. transactions

``` sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    gross_amount NUMERIC(14,2),
    service_fee NUMERIC(14,2),
    seller_receive NUMERIC(14,2),
    transaction_status VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 12. pickup_schedules

``` sql
CREATE TABLE pickup_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    pickup_date DATE,
    pickup_time VARCHAR(20),
    pickup_address TEXT,
    driver_name VARCHAR(100),
    vehicle_number VARCHAR(30),
    status VARCHAR(30)
);
```

## 13. reviews

``` sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    reviewer_id UUID REFERENCES users(id),
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 14. favorites

``` sql
CREATE TABLE favorites (
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    PRIMARY KEY(user_id,product_id)
);
```

## 15. notifications

``` sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(200),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 16. chat

``` sql
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES chat_rooms(id),
    sender_id UUID REFERENCES users(id),
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 17. admin_logs

``` sql
CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(200),
    target_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 18. system_settings

``` sql
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(200)
);

INSERT INTO system_settings VALUES
('dp_percentage','30'),
('service_fee','10000'),
('buyer_subscription_fee','99000');
```

## Index

``` sql
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
```

## Relasi

`users → products → offers → orders → payments`

## Struktur Folder

``` text
wastehub-db/
├── schema.sql
├── seed_categories.sql
├── seed_settings.sql
├── indexes.sql
├── triggers.sql
└── README.md
```

## Roadmap Berikutnya

-   Trigger otomatis DP 30%
-   Row Level Security (Supabase)
-   Seed 200 kategori limbah
-   View dashboard admin
-   ERD profesional
-   OpenAPI & backend siap deploy
