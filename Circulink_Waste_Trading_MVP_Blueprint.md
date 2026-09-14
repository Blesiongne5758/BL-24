# Circulink --- Waste Trading Management MVP Blueprint

## Tagline

**Verified Waste. Trusted Trade.**

------------------------------------------------------------------------

# Ringkasan

Circulink adalah platform marketplace limah berbasis traceability yang
mempertemukan penjual dan pembeli waste dalam satu ekosistem digital.

## Kategori Awal

-   Minyak Jelantah
-   Oli Bekas
-   Kardus
-   Plastik
-   Besi Rongsok
-   Aluminium
-   Tembaga
-   Kertas
-   Limbah Elektronik
-   Waste Lainnya

------------------------------------------------------------------------

# Business Model

## Revenue

  Sumber            Contoh
  ----------------- --------------------
  Langganan Buyer   Rp99.000/bulan
  Biaya Handling    Rp10.000/transaksi
  Premium Seller    Opsional
  Iklan             Fase berikutnya

------------------------------------------------------------------------

# User Roles

## Seller

-   Registrasi
-   Upload waste
-   Menentukan harga penawaran
-   Upload foto eviden
-   Melihat booking

## Buyer

-   Registrasi
-   Berlangganan
-   Melihat harga
-   Checkout DP 30%

## Admin

-   Verifikasi produk
-   Mengatur biaya
-   Monitoring transaksi

------------------------------------------------------------------------

# Seller Flow

1.  Registrasi
2.  Verifikasi identitas
3.  Upload waste
4.  Upload foto eviden
5.  Menentukan harga
6.  Menunggu approval admin
7.  Produk aktif
8.  Booking
9.  Pelunasan
10. Selesai

------------------------------------------------------------------------

# Buyer Flow

1.  Registrasi
2.  Berlangganan
3.  Melihat marketplace
4.  Checkout
5.  Bayar DP
6.  Booking
7.  Pelunasan

------------------------------------------------------------------------

# Data Waste

Setiap produk wajib memiliki:

-   Kategori
-   Jenis wadah
-   Ukuran wadah
-   Berat
-   Volume
-   Asal waste
-   GPS lokasi
-   Minimal 3 foto eviden
-   Harga penawaran

------------------------------------------------------------------------

# Status Produk

-   Draft
-   Pending
-   Approved
-   Booked
-   Completed

------------------------------------------------------------------------

# Dashboard Seller

-   Dashboard
-   Produk
-   Booking
-   Riwayat
-   Dompet
-   Profil

------------------------------------------------------------------------

# Dashboard Buyer

-   Marketplace
-   Filter
-   Wishlist
-   Booking
-   Langganan

------------------------------------------------------------------------

# Dashboard Admin

-   Dashboard
-   Verifikasi
-   Transaksi
-   Master Data
-   Settings

Admin dapat mengatur:

-   Harga langganan
-   Handling fee
-   Persentase DP

------------------------------------------------------------------------

# Database MVP

## users

-   id
-   role
-   nama
-   email
-   phone

## waste_categories

Master kategori.

## waste_products

Menyimpan seluruh data waste.

## waste_evidences

Foto dan lokasi.

## subscriptions

Status langganan buyer.

## orders

Data booking.

## payments

DP dan pelunasan.

## settings

Konfigurasi aplikasi.

------------------------------------------------------------------------

# Teknologi

## Mobile

Flutter

## Backend

Laravel 12

## Admin

Next.js

## Database

PostgreSQL

## Storage

Cloudflare R2

## Payment

Midtrans atau Xendit

## Notification

Firebase Cloud Messaging

------------------------------------------------------------------------

# Roadmap MVP

  Sprint   Output
  -------- -----------------
  1        Database
  2        Auth
  3        Upload Waste
  4        Marketplace
  5        Subscription
  6        Checkout
  7        Dashboard Admin
  8        Testing

Estimasi: **8--10 minggu**

------------------------------------------------------------------------

# Future Features

-   Pickup Management
-   Digital Weighing Ticket
-   QR Traceability
-   Certificate of Recycling
-   ESG Dashboard
-   Carbon Credit Integration

------------------------------------------------------------------------

# Brand

**Nama:** Circulink

**Domain Target:** `circulink.com`

**Tagline:** *Verified Waste. Trusted Trade.*
