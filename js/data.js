/**
 * Circulink Data Seed & Initial Store (100% Bahasa Indonesia)
 * Versi 3: 3-Tier Berlangganan Pembeli, Gated Access Publik, Kontak WA, Postingan Pembeli & Chat Interaktif
 */

const INITIAL_CATEGORIES = [
  {
    id: "cat_jelantah",
    name: "Minyak Jelantah (UCO)",
    unit: "Liter",
    icon: "droplet",
    description: "Used Cooking Oil (UCO) dari restoran, hotel, dan katering bersertifikasi.",
    avgPrice: 9500,
    priceRange: "Rp8.500 - Rp11.000 / Liter",
    color: "amber",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    badge: "Bahan Baku Biodiesel",
    changePercent: "+2.4%",
    trend: "up"
  },
  {
    id: "cat_oli",
    name: "Oli Pelumas Bekas",
    unit: "Liter",
    icon: "fuel",
    description: "Limbah pelumas mesin kendaraan, genset, dan mesin industri pabrik.",
    avgPrice: 3200,
    priceRange: "Rp2.800 - Rp4.000 / Liter",
    color: "zinc",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    badge: "Limbah B3 Terdaftar",
    changePercent: "-0.8%",
    trend: "down"
  },
  {
    id: "cat_kardus",
    name: "Kardus (OCC Corrugated)",
    unit: "Kg",
    icon: "box",
    description: "Kardus cokelat tebal (OCC), kardus packaging logistik & pabrik kemasan.",
    avgPrice: 2400,
    priceRange: "Rp2.000 - Rp2.800 / Kg",
    color: "yellow",
    image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80",
    badge: "Daur Ulang Kertas Pulp",
    changePercent: "+1.2%",
    trend: "up"
  },
  {
    id: "cat_plastik",
    name: "Plastik (PET / HDPE)",
    unit: "Kg",
    icon: "recycle",
    description: "Botol PET bening, jerigen HDPE, emberan PP, dan plastik film bal press.",
    avgPrice: 5800,
    priceRange: "Rp4.500 - Rp7.200 / Kg",
    color: "emerald",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80",
    badge: "Biji Plastik Sirkular",
    changePercent: "+3.5%",
    trend: "up"
  },
  {
    id: "cat_besi",
    name: "Besi Rongsok (Scrap WF)",
    unit: "Kg",
    icon: "hammer",
    description: "Scrap besi potongan WF, plat baja tebal, pipa, dan besi cor industri.",
    avgPrice: 6200,
    priceRange: "Rp5.500 - Rp7.000 / Kg",
    color: "slate",
    image: "https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=600&q=80",
    badge: "Peleburan Baja Logam",
    changePercent: "-1.1%",
    trend: "down"
  },
  {
    id: "cat_aluminium",
    name: "Aluminium Scrap",
    unit: "Kg",
    icon: "layers",
    description: "Scrap profil kusen aluminium, potongan plat, velg, dan kaleng minuman.",
    avgPrice: 22000,
    priceRange: "Rp19.000 - Rp25.000 / Kg",
    color: "blue",
    image: "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=600&q=80",
    badge: "Peleburan Ingot Al",
    changePercent: "+0.8%",
    trend: "up"
  },
  {
    id: "cat_tembaga",
    name: "Tembaga Merah (Cu 99%)",
    unit: "Kg",
    icon: "zap",
    description: "Kabel tembaga merah kupas (Cu 99%), dinamo trafo, dan pipa tembaga AC.",
    avgPrice: 110000,
    priceRange: "Rp95.000 - Rp125.000 / Kg",
    color: "orange",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    badge: "Super Komoditas Tinggi",
    changePercent: "+4.2%",
    trend: "up"
  },
  {
    id: "cat_kertas",
    name: "Kertas Arsip & HVS",
    unit: "Kg",
    icon: "file-text",
    description: "Arsip kantor HVS putih, kertas koran, buku majalah, dan duplex.",
    avgPrice: 1900,
    priceRange: "Rp1.600 - Rp2.300 / Kg",
    color: "stone",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
    badge: "Bahan Bubur Kertas",
    changePercent: "+0.4%",
    trend: "up"
  },
  {
    id: "cat_elektronik",
    name: "Limbah Elektronik (E-Waste)",
    unit: "Kg",
    icon: "cpu",
    description: "Papan sirkuit PCB komputer, telepon genggam bekas, baterai litium, inverter.",
    avgPrice: 45000,
    priceRange: "Rp35.000 - Rp65.000 / Kg",
    color: "cyan",
    image: "https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80",
    badge: "Pemulihan Logam Mulia",
    changePercent: "+2.9%",
    trend: "up"
  },
  {
    id: "cat_lainnya",
    name: "Waste Lainnya",
    unit: "Kg",
    icon: "package-plus",
    description: "Karet ban bekas, palet kayu sisa industri, dan kain majun sisa tekstil.",
    avgPrice: 3500,
    priceRange: "Sesuai Penawaran",
    color: "teal",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80",
    badge: "Limbah Beragam",
    changePercent: "0.0%",
    trend: "neutral"
  }
];

/**
 * 3 Pilihan Jenis Berlangganan Pembeli
 * Ditentukan dan dapat diatur batas rentang nilai jualnya oleh Admin
 */
const INITIAL_SUBSCRIPTION_TIERS = [
  {
    id: "tier_starter",
    name: "Paket Starter (Pemula)",
    badge: "Starter",
    monthlyFee: 99000,
    maxPriceLimit: 15000000, // s/d Rp 15.000.000
    allowAddress: "area_only", // Hanya kota/kabupaten umum
    allowGpsMap: false, // Peta GPS terkunci
    allowWhatsapp: false, // WA terkunci
    allowInAppChat: true, // Layar chat aktif
    tagline: "Nilai Transaksi s/d Rp15 Juta",
    description: "Ideal untuk perintis UMKM daur ulang & pengumpul skala kecil pemula.",
    color: "slate",
    popular: false
  },
  {
    id: "tier_pro",
    name: "Paket Bisnis Pro",
    badge: "Terpopuler",
    monthlyFee: 249000,
    maxPriceLimit: 50000000, // s/d Rp 50.000.000
    allowAddress: "full", // Alamat lengkap gudang terbuka
    allowGpsMap: true, // Peta GPS interaktif Leaflet aktif
    allowWhatsapp: false, // Disamarkan, gunakan Fitur Layar Chat
    allowInAppChat: true, // Layar chat aktif
    tagline: "Nilai Transaksi s/d Rp50 Juta + Peta GPS",
    description: "Pilihan paling diminati pengolah pabrik daur ulang reguler dengan armada logistik.",
    color: "emerald",
    popular: true
  },
  {
    id: "tier_enterprise",
    name: "Paket Korporat Enterprise",
    badge: "Akses Penuh",
    monthlyFee: 499000,
    maxPriceLimit: 0, // 0 = Unlimited / Tanpa Batas Rentang Nilai
    allowAddress: "full", // Alamat lengkap 100%
    allowGpsMap: true, // Peta GPS presisi + rute
    allowWhatsapp: true, // Nomor WhatsApp penjual tampil & tombol direct chat wa.me
    allowInAppChat: true, // Layar chat aktif
    tagline: "Semua Nilai Transaksi + Direct WhatsApp Penjual",
    description: "Akses tanpa batasan untuk off-taker korporasi, volume masif & prioritas ekspor.",
    color: "amber",
    popular: false
  }
];

const INITIAL_SETTINGS = {
  appName: "Circulink",
  tagline: "Limbah Terverifikasi. Transaksi Tepercaya.",
  // Data Rekening Bank Pengelola (Escrow DP 30%)
  escrowBankName: "Bank Central Asia (BCA)",
  escrowAccountNumber: "8271-9920-1122",
  escrowAccountHolder: "PT Circulink Transaksi Sirkular (Rekening Bersama Escrow)",
  escrowBankBranch: "KCP Sentra Bisnis Pulogadung, Jakarta",
  // Struktur Biaya & Jasa Logistik
  downPaymentPercent: 30, // 30% DP
  handlingFeePerTransaction: 10000, // Biaya Penanganan
  appFeePerTransaction: 5000, // Fee Aplikasi
  shippingServiceEnabled: true, // Jasa Pengiriman
  shippingFlatFee: 250000, // Tarif Jasa Pengiriman Flat Mitra Circulink
  contactEmail: "kemitraan@circulink.com",
  contactPhone: "+62 812-3456-7890",
  address: "Sentra Inovasi Hijau Circulink Lt. 5, Kawasan Industri Pulogadung, Jakarta Timur",
  subscriptionTiers: [...INITIAL_SUBSCRIPTION_TIERS]
};

const INITIAL_USERS = [
  {
    id: "user_buyer_1",
    name: "PT Hijau Lestari Biofuel",
    role: "buyer",
    email: "pengadaan@hijaulestari.co.id",
    phone: "+62 811-9876-5432",
    company: "PT Hijau Lestari Biofuel Indonesia",
    nib: "9120003847291",
    location: "Kawasan Industri MM2100, Cikarang Barat",
    subscriptionActive: true,
    subscriptionTier: "tier_pro", // Default berlangganan Bisnis Pro
    subscriptionExpiry: "2026-10-15"
  },
  {
    id: "user_seller_1",
    name: "Budi Santoso (Sentra Jelantah Sejahtera)",
    role: "seller",
    email: "budi@sentrajelantah.id",
    phone: "+62 813-8822-1100",
    company: "Sentra Jelantah Sejahtera",
    identityVerified: true,
    verifiedBadge: "Pengepul Terverifikasi",
    location: "Pasar Minggu, Jakarta Selatan",
    bankAccount: "BCA 8271-992-102 a.n Budi Santoso",
    balance: 14500000
  },
  {
    id: "user_seller_2",
    name: "PT Dwi Graha Rongsok Logam",
    role: "seller",
    email: "dwigraha@rongsok.co.id",
    phone: "+62 812-7711-4455",
    company: "PT Dwi Graha Rongsok Logam",
    identityVerified: true,
    verifiedBadge: "Pemasok Industri Terverifikasi",
    location: "Cilegon, Banten",
    bankAccount: "Mandiri 137-00-982736-1 a.n PT Dwi Graha",
    balance: 42300000
  },
  {
    id: "user_admin_1",
    name: "Pengelola Utama Circulink",
    role: "admin",
    email: "admin@circulink.com",
    phone: "+62 811-1234-5678",
    accessLevel: "Administrator Utama"
  }
];

const INITIAL_PRODUCTS = [
  {
    id: "PRD-2026-001",
    code: "CIR-UCO-01",
    title: "Minyak Jelantah Kualitas Resto Cepat Saji (FFA < 3%)",
    categoryId: "cat_jelantah",
    categoryName: "Minyak Jelantah (UCO)",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    containerType: "IBC Tank (1000L)",
    containerQty: 4,
    weight: 3600,
    volume: 4000,
    unit: "Liter",
    origin: "Restoran Cepat Saji & Pusat Kuliner Mall Jabodetabek",
    address: "Jl. Margasatwa Barat No. 45, Jagakarsa, Jakarta Selatan",
    lat: -6.3265,
    lng: 106.8286,
    offerPrice: 9800,
    totalPrice: 39200000,
    status: "approved",
    evidences: [
      {
        type: "Wadah Keseluruhan",
        url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80",
        notes: "4 unit kontainer IBC Tank bersegel oranye utuh tanpa kebocoran"
      },
      {
        type: "Kualitas Sampel & Kejernihan",
        url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
        notes: "Warna kuning keemasan, kadar air minimal, bebas endapan kasar"
      },
      {
        type: "Tera Timbangan & Barcode",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        notes: "Segel tera digital terpasang dengan barcode batch pengumpulan"
      }
    ],
    qualitySpecs: {
      "Kadar Asam Lemak Bebas (FFA)": "< 2.8%",
      "Kadar Air & Kotoran (M&I)": "< 1.5%",
      "Warna": "Kuning Keemasan Kecoklatan",
      "Dokumen Ketertelusuran": "Sertifikasi Standar ISCC Siap Ekspor"
    },
    createdAt: "2026-09-08 14:30",
    verifiedAt: "2026-09-08 16:15",
    verifiedBy: "Tim Verifikasi Circulink"
  },
  {
    id: "PRD-2026-002",
    code: "CIR-SCR-02",
    title: "Besi Scrap Potongan WF & Plat Baja Tebal (Grade Super A)",
    categoryId: "cat_besi",
    categoryName: "Besi Rongsok (Scrap WF)",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    containerType: "Curah / Truk Fuso",
    containerQty: 1,
    weight: 8500,
    volume: 0,
    unit: "Kg",
    origin: "Pembongkaran Konstruksi Pabrik Industri Karawang",
    address: "Kawasan Industri KIIC Kav. C-12, Karawang Barat",
    lat: -6.3421,
    lng: 107.2912,
    offerPrice: 6500,
    totalPrice: 55250000,
    status: "approved",
    evidences: [
      {
        type: "Tumpukan Material Besi",
        url: "https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80",
        notes: "Potongan scrap besi padat tanpa campuran karat lapuk"
      },
      {
        type: "Detail Potongan Balok WF",
        url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
        notes: "Ketebalan rata-rata 10mm - 16mm siap masuk tungku lebur"
      },
      {
        type: "Struk Jembatan Timbang",
        url: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80",
        notes: "Slip jembatan timbang digital tertera netto 8.500 Kg"
      }
    ],
    qualitySpecs: {
      "Kualitas Mutu": "Grade Super A (Besi Tebal)",
      "Ketebalan Rata-Rata": "10 - 18 mm",
      "Kadar Karat": "Sangat Rendah (Bongkaran Baru)",
      "Alat Muat Gudang": "Crane magnetik kapasitas 10 ton siap di lokasi"
    },
    createdAt: "2026-09-09 09:20",
    verifiedAt: "2026-09-09 11:00",
    verifiedBy: "Tim Verifikasi Circulink"
  },
  {
    id: "PRD-2026-003",
    code: "CIR-PLS-03",
    title: "Plastik Botol PET Bening Bal Press Padat Kering",
    categoryId: "cat_plastik",
    categoryName: "Plastik (PET / HDPE)",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    containerType: "Bal Press Padat",
    containerQty: 18,
    weight: 4200,
    volume: 0,
    unit: "Kg",
    origin: "Sortir Mitra Bank Sampah & Pengepul Kota Tangerang",
    address: "Kawasan Pergudangan Cipondoh Blok F No. 8, Kota Tangerang",
    lat: -6.1824,
    lng: 106.6627,
    offerPrice: 6200,
    totalPrice: 26040000,
    status: "approved",
    evidences: [
      {
        type: "Bal Press di Gudang",
        url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
        notes: "Kerapatan bal tinggi, terikat kawat baja 4 sisi kuat"
      },
      {
        type: "Kondisi Tutup & Label",
        url: "https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=800&q=80",
        notes: "Sudah melalui proses pelepasan label dan tutup botol 90%"
      },
      {
        type: "Bukti Tera Timbangan Bal",
        url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
        notes: "Rata-rata 233 Kg per bal press"
      }
    ],
    qualitySpecs: {
      "Jenis Polimer": "Polyethylene Terephthalate (PET Bersih)",
      "Warna Material": "Bening Transparan 95%",
      "Kadar Air": "< 1% (Kering Gudang)",
      "Kemasan": "Bal Press Tali Kawat Baja"
    },
    createdAt: "2026-09-09 15:45",
    verifiedAt: "2026-09-09 17:00",
    verifiedBy: "Tim Verifikasi Circulink"
  },
  {
    id: "PRD-2026-004",
    code: "CIR-KRD-04",
    title: "Kardus OCC Corrugated Tebal Kering Gudang Logistik",
    categoryId: "cat_kardus",
    categoryName: "Kardus (OCC Corrugated)",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    containerType: "Bal Press Jumbo",
    containerQty: 10,
    weight: 5000,
    volume: 0,
    unit: "Kg",
    origin: "Gudang Logistik & Fulfillment Center E-Commerce Marunda",
    address: "Kawasan Berikat Marunda Center Blok D-4, Bekasi",
    lat: -6.1132,
    lng: 106.9854,
    offerPrice: 2500,
    totalPrice: 12500000, // Termasuk dalam Tier Starter (<15Jt)
    status: "booked",
    evidences: [
      {
        type: "Tumpukan Bal Kardus",
        url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
        notes: "Tersimpan dalam gudang kering tertutup kanopi bebas hujan"
      },
      {
        type: "Serat & Lapisan Kraft",
        url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
        notes: "OCC brown kraft liner tebal dua gelombang"
      },
      {
        type: "Segel Batch Circulink",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        notes: "Stiker barcode muat Circulink terverifikasi"
      }
    ],
    qualitySpecs: {
      "Kadar Air": "< 12% (Kardus Kering Standar Ekspor)",
      "Bahan Pengotor (Outthrow)": "< 1%",
      "Kondisi": "Press bal padat rapi siap muat forklift"
    },
    createdAt: "2026-09-07 10:00",
    verifiedAt: "2026-09-07 11:30",
    verifiedBy: "Tim Verifikasi Circulink"
  },
  {
    id: "PRD-2026-005",
    code: "CIR-OLI-05",
    title: "Oli Pelumas Bekas Mesin Genset Pabrik & Truk Ekspedisi",
    categoryId: "cat_oli",
    categoryName: "Oli Pelumas Bekas",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    containerType: "Drum Besi (200L)",
    containerQty: 15,
    weight: 2700,
    volume: 3000,
    unit: "Liter",
    origin: "Depot Perawatan Truk Logistik Antar Kota Cakung",
    address: "Jl. Raya Cakung Cilincing Km. 3, Jakarta Timur",
    lat: -6.1738,
    lng: 106.9452,
    offerPrice: 3400,
    totalPrice: 10200000, // Termasuk dalam Tier Starter (<15Jt)
    status: "approved",
    evidences: [
      {
        type: "15 Drum Besi Tertutup",
        url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
        notes: "Drum besi tersegel rapi di atas palet, tidak rembes"
      },
      {
        type: "Viskositas Pelumas",
        url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
        notes: "Kekentalan SAE 15W-40 murni tanpa tercampur air radiator"
      },
      {
        type: "Draf Manifes Limbah B3",
        url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
        notes: "Draf surat jalan pengangkutan limbah B3 siap ditandatangani"
      }
    ],
    qualitySpecs: {
      "Jenis": "Pelumas Mesin Bekas Heavy Duty",
      "Kadar Air": "< 2%",
      "Kadar Lumpur / Residu": "< 1.5%",
      "Golongan": "Limbah B3 Terdaftar Regulasi KLHK"
    },
    createdAt: "2026-09-11 08:30",
    verifiedAt: "2026-09-11 10:00",
    verifiedBy: "Tim Verifikasi Circulink"
  },
  {
    id: "PRD-2026-006",
    code: "CIR-TBG-06",
    title: "Tembaga Kupas Merah Ex-Kabel Trafo Gardu (Kadar Cu 99%)",
    categoryId: "cat_tembaga",
    categoryName: "Tembaga Merah (Cu 99%)",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    containerType: "Karung Jumbo",
    containerQty: 2,
    weight: 650,
    volume: 0,
    unit: "Kg",
    origin: "Peremajaan Instalasi Gardu Listrik Pabrik Cikarang",
    address: "Delta Silicon Industrial Park Blok L-2, Cikarang Pusat",
    lat: -6.3571,
    lng: 107.1518,
    offerPrice: 115000,
    totalPrice: 74750000, // Hanya terbuka di Tier Enterprise (>50Jt)
    status: "approved",
    evidences: [
      {
        type: "Karung Jumbo Siap Muat",
        url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
        notes: "Tembaga tersimpan rapi dalam karung jumbo anti sobek"
      },
      {
        type: "Detail Kawat Tembaga Kupas",
        url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
        notes: "Kawat tembaga merah mengkilap, 100% terkupas tanpa kulit PVC"
      },
      {
        type: "Tera Timbangan Digital",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        notes: "Timbangan platform tera kalibrasi menunjukkan 650 Kg"
      }
    ],
    qualitySpecs: {
      "Kadar Kemurnian Cu": "99.2% (Tembaga Merah Millberry)",
      "Sisa Kulit Isolator": "0% (Kupas Bersih Sempurna)",
      "Diameter Kawat": "1.2 - 2.5 mm",
      "Kondisi Fisik": "Bebas minyak, cat, dan oksidasi asam"
    },
    createdAt: "2026-09-10 11:15",
    verifiedAt: "2026-09-10 13:40",
    verifiedBy: "Tim Verifikasi Circulink"
  }
];

/**
 * Postingan Kebutuhan / Permintaan Pasokan Limbah dari Pembeli (RFQ)
 * Ditampilkan di halaman publik bersama postingan penjual, dengan data terproteksi
 */
const INITIAL_BUYER_REQUESTS = [
  {
    id: "REQ-2026-001",
    code: "DEM-UCO-01",
    title: "Dibutuhkan Rutin Kontrak: Minyak Jelantah UCO Bersertifikasi",
    categoryId: "cat_jelantah",
    categoryName: "Minyak Jelantah (UCO)",
    buyerId: "user_buyer_1",
    buyerName: "PT Hijau Lestari Biofuel",
    buyerCompany: "PT Hijau Lestari Biofuel Indonesia",
    buyerPhone: "+62 811-9876-5432",
    buyerWhatsapp: "6281198765432",
    volume: 10000,
    unit: "Liter",
    budgetPrice: 9700,
    totalBudget: 97000000,
    city: "Cikarang Barat, Bekasi",
    address: "Kawasan Industri MM2100 Blok B2 No. 15, Cikarang",
    lat: -6.3120,
    lng: 107.1025,
    specRequirements: "FFA < 3%, air < 1.5%, siap jemput armada tangki sendiri",
    createdAt: "2026-09-12 09:00",
    status: "active"
  },
  {
    id: "REQ-2026-002",
    code: "DEM-SCR-02",
    title: "Dicari Pasokan Mingguan: Scrap Besi WF & Plat Tebal Siap Lebur",
    categoryId: "cat_besi",
    categoryName: "Besi Rongsok (Scrap WF)",
    buyerId: "user_buyer_2",
    buyerName: "PT Cilegon Steel Mill",
    buyerCompany: "PT Cilegon Steel Mill Perkasa",
    buyerPhone: "+62 812-3344-5566",
    buyerWhatsapp: "6281233445566",
    volume: 20000,
    unit: "Kg",
    budgetPrice: 6400,
    totalBudget: 128000000,
    city: "Cilegon, Banten",
    address: "Kawasan Industri Krakatau Steel Kav. 7, Cilegon",
    lat: -6.0024,
    lng: 106.0125,
    specRequirements: "Tebal minimal 8mm, bebas beton & limbah B3",
    createdAt: "2026-09-13 14:15",
    status: "active"
  },
  {
    id: "REQ-2026-003",
    code: "DEM-PLS-03",
    title: "Pengadaan Pabrik Daur Ulang: Botol PET Bening Bal Press Kering",
    categoryId: "cat_plastik",
    categoryName: "Plastik (PET / HDPE)",
    buyerId: "user_buyer_3",
    buyerName: "PT Polimer Sirkular Nusantara",
    buyerCompany: "PT Polimer Sirkular Nusantara",
    buyerPhone: "+62 817-8899-0011",
    buyerWhatsapp: "6281788990011",
    volume: 5000,
    unit: "Kg",
    budgetPrice: 6100,
    totalBudget: 30500000,
    city: "Karawang Timur",
    address: "Kawasan Industri Surya Cipta Kav. E-4, Karawang",
    lat: -6.3712,
    lng: 107.3325,
    specRequirements: "PET bening bersih tanpa tutup, press bal minimal 200kg/bal",
    createdAt: "2026-09-14 08:30",
    status: "active"
  }
];

const INITIAL_ORDERS = [
  {
    id: "ORD-2026-0901",
    bookingCode: "CIR-BK-9921",
    productId: "PRD-2026-004",
    productTitle: "Kardus OCC Corrugated Tebal Kering Gudang Logistik",
    categoryName: "Kardus (OCC Corrugated)",
    buyerId: "user_buyer_1",
    buyerName: "PT Hijau Lestari Biofuel",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    quantity: 5000,
    unit: "Kg",
    unitPrice: 2500,
    totalPrice: 12500000,
    downPaymentRate: 30,
    downPaymentAmount: 3750000,
    handlingFee: 10000,
    totalPaidNow: 3760000,
    remainingPayment: 8750000,
    paymentStatus: "DP Terbayar (30%)",
    bookingStatus: "Jadwal Pengambilan Armada",
    pickupDate: "2026-09-14",
    createdAt: "2026-09-10 16:20",
    qrCodeTrace: "CIR-QR-BK9921-TERVERIFIKASI",
    notes: "Armada truk pembeli siap tiba pukul 09:00 WIB di gudang Marunda Center."
  }
];

/**
 * Riwayat Chat Awal antara Pembeli dan Penjual
 */
const INITIAL_CHATS = [
  {
    id: "chat_1",
    productId: "PRD-2026-001",
    productTitle: "Minyak Jelantah Kualitas Resto Cepat Saji (FFA < 3%)",
    buyerId: "user_buyer_1",
    sellerId: "user_seller_1",
    senderRole: "buyer",
    senderName: "PT Hijau Lestari Biofuel",
    text: "Halo Pak Budi, apakah pasokan 4 IBC Tank Minyak Jelantah ini sudah ada sertifikat ISCC lengkap?",
    timestamp: "10:15 WIB",
    date: "Hari Ini"
  },
  {
    id: "chat_2",
    productId: "PRD-2026-001",
    productTitle: "Minyak Jelantah Kualitas Resto Cepat Saji (FFA < 3%)",
    buyerId: "user_buyer_1",
    sellerId: "user_seller_1",
    senderRole: "seller",
    senderName: "Budi Santoso (Sentra Jelantah)",
    text: "Halo PT Hijau Lestari! Benar sekali, dokumen ISCC dan hasil uji lab FFA < 2.8% sudah terlampir lengkap. Armada bisa datang di jam kerja 08:00 - 16:00 WIB.",
    timestamp: "10:20 WIB",
    date: "Hari Ini"
  }
];
