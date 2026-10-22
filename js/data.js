// SPDX-License-Identifier: MIT
/**
 * BURSA LIMBAH Data Seed & Initial Store (100% Bahasa Indonesia)
 * Versi 3: 3-Tier Berlangganan Pembeli, Gated Access Publik, Kontak WA, Postingan Pembeli & Chat Interaktif
 */

/**
 * 10 Kategori Paling Laris saat MVP
 * Fokus 10 komoditas limbah dengan volume transaksi terbesar di Indonesia
 */
const MVP_HOT_CATEGORIES = [
  { id: "hot_jelantah", name: "Minyak Jelantah", catId: "cat_minyak_cairan", keyword: "jelantah", icon: "fa-droplet", color: "amber" },
  { id: "hot_oli", name: "Oli Bekas", catId: "cat_limbah_b3", keyword: "oli", icon: "fa-oil-can", color: "zinc" },
  { id: "hot_kardus", name: "Kardus", catId: "cat_kertas_karton", keyword: "kardus", icon: "fa-box-open", color: "yellow" },
  { id: "hot_pet", name: "PET Botol", catId: "cat_plastik", keyword: "pet", icon: "fa-wine-bottle", color: "emerald" },
  { id: "hot_hdpe", name: "HDPE", catId: "cat_plastik", keyword: "hdpe", icon: "fa-bottle-water", color: "teal" },
  { id: "hot_besi", name: "Besi Tua", catId: "cat_logam", keyword: "besi", icon: "fa-cubes-stacked", color: "slate" },
  { id: "hot_aluminium", name: "Aluminium", catId: "cat_logam", keyword: "aluminium", icon: "fa-layer-group", color: "blue" },
  { id: "hot_tembaga", name: "Tembaga", catId: "cat_logam", keyword: "tembaga", icon: "fa-bolt", color: "orange" },
  { id: "hot_pallet", name: "Pallet Kayu", catId: "cat_kayu", keyword: "pallet", icon: "fa-pallet", color: "amber" },
  { id: "hot_drum", name: "Drum & IBC Bekas", catId: "cat_kemasan_industri", keyword: "drum", icon: "fa-boxes-packing", color: "cyan" }
];

/**
 * Master Kategori Bursa Limbah:
 * 1. Kategori Utama (12)
 * 2. Kategori Khusus Industri B2B (3)
 * 3. Kategori Limbah B3 Izin Khusus (1)
 */
const INITIAL_CATEGORIES = [
  // --- KATEGORI UTAMA (12) ---
  {
    id: "cat_minyak_cairan",
    code: "OIL-001",
    name: "Minyak & Cairan Bekas",
    group: "utama",
    subItems: ["Minyak jelantah", "Oli bekas", "Coolant bekas", "Grease bekas", "Solar bekas", "Cairan hidrolik"],
    unit: "Liter",
    icon: "droplet",
    faIcon: "fa-droplet",
    description: "Minyak jelantah (UCO) bersertifikasi, minyak pelumas bekas, coolant & cairan hidrolik mesin pabrik.",
    avgPrice: 9500,
    priceRange: "Rp8.500 - Rp11.500 / Liter",
    color: "amber",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    badge: "Bahan Baku Biodiesel",
    changePercent: "+2.4%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_kertas_karton",
    code: "PPR-001",
    name: "Kertas & Karton",
    group: "utama",
    subItems: ["Kardus OCC", "HVS bekas", "Koran", "Majalah", "Duplex", "Arsip kertas", "Paper core"],
    unit: "Kg",
    icon: "box",
    faIcon: "fa-box-open",
    description: "Kardus kemasan OCC corrugated, kertas arsip kantor HVS putih, koran, dan tabung paper core pulp.",
    avgPrice: 2600,
    priceRange: "Rp2.000 - Rp3.200 / Kg",
    color: "yellow",
    image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80",
    badge: "Daur Ulang Pulp",
    changePercent: "+1.2%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_plastik",
    code: "PLS-001",
    name: "Plastik",
    group: "utama",
    subItems: ["PET", "HDPE", "PP", "LDPE", "PVC", "ABS", "PS", "Plastik campur", "Karung plastik", "Stretch film"],
    unit: "Kg",
    icon: "recycle",
    faIcon: "fa-recycle",
    description: "Botol PET bal press, jerigen HDPE daur ulang, emberan PP, karung jumbo, dan plastik stretch film industri.",
    avgPrice: 6200,
    priceRange: "Rp4.500 - Rp8.500 / Kg",
    color: "emerald",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80",
    badge: "Biji Plastik Sirkular",
    changePercent: "+3.5%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_logam",
    code: "MTL-001",
    name: "Logam",
    group: "utama",
    subItems: ["Besi tua", "Baja", "Aluminium", "Tembaga", "Kuningan", "Stainless steel", "Timah", "Seng", "Kabel bekas"],
    unit: "Kg",
    icon: "hammer",
    faIcon: "fa-cubes-stacked",
    description: "Besi scrap potongan WF, plat baja tebal, kusen aluminium, kawat tembaga merah Cu 99%, dan kabel kupas.",
    avgPrice: 18500,
    priceRange: "Rp6.000 - Rp125.000 / Kg",
    color: "slate",
    image: "https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=600&q=80",
    badge: "Peleburan Smelter",
    changePercent: "+0.9%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_kaca",
    code: "GLS-001",
    name: "Kaca",
    group: "utama",
    subItems: ["Kaca bening", "Kaca warna", "Botol kaca", "Pecahan kaca (cullet)", "Kaca tempered"],
    unit: "Kg",
    icon: "wine",
    faIcon: "fa-wine-bottle",
    description: "Botol kaca kemasan pabrik, pecahan cullet kaca bening/warna siap lebur ulang, dan kaca lembaran.",
    avgPrice: 850,
    priceRange: "Rp600 - Rp1.200 / Kg",
    color: "cyan",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80",
    badge: "Pabrik Kaca Cullet",
    changePercent: "0.0%",
    trend: "neutral",
    isB3: false
  },
  {
    id: "cat_karet",
    code: "RBR-001",
    name: "Karet",
    group: "utama",
    subItems: ["Ban bekas", "Crumb rubber", "Selang bekas", "Gasket karet", "Conveyor belt"],
    unit: "Kg",
    icon: "circle-dot",
    faIcon: "fa-circle-dot",
    description: "Ban luar truk, serbuk crumb rubber aspal sirkular, selang industri hidrolik, dan karet conveyor belt pabrik.",
    avgPrice: 3200,
    priceRange: "Rp2.500 - Rp4.500 / Kg",
    color: "zinc",
    image: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80",
    badge: "Daur Ulang Ban",
    changePercent: "+1.1%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_kayu",
    code: "WOD-001",
    name: "Kayu",
    group: "utama",
    subItems: ["Pallet kayu", "Peti kayu", "Kayu bekas proyek", "Serbuk kayu", "Potongan kayu"],
    unit: "Pcs",
    icon: "tree",
    faIcon: "fa-pallet",
    description: "Pallet kayu standar ekspor ISPM 15, peti kemasan logistik, serbuk gergaji biomassa, dan balok kayu proyek.",
    avgPrice: 45000,
    priceRange: "Rp35.000 - Rp75.000 / Pcs",
    color: "amber",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80",
    badge: "Pallet Rekondisi",
    changePercent: "+0.5%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_tekstil",
    code: "TXT-001",
    name: "Tekstil",
    group: "utama",
    subItems: ["Kain perca", "Pakaian bekas industri", "Benang sisa", "Karpet bekas"],
    unit: "Kg",
    icon: "shirt",
    faIcon: "fa-shirt",
    description: "Sisa potongan kain garmen katun untuk kain majun pembersih mesin industri dan benang serat daur ulang.",
    avgPrice: 4800,
    priceRange: "Rp3.500 - Rp6.500 / Kg",
    color: "rose",
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80",
    badge: "Majun Pabrik",
    changePercent: "+0.8%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_elektronik",
    code: "ELC-001",
    name: "Elektronik (E-Waste)",
    group: "utama",
    subItems: ["Laptop", "HP", "PCB", "Server", "Printer", "Kabel elektronik"],
    unit: "Kg",
    icon: "cpu",
    faIcon: "fa-microchip",
    description: "Papan PCB komputer & server, perangkat keras elektronik rusak, inverter, dan kabel transmisi data.",
    avgPrice: 48000,
    priceRange: "Rp35.000 - Rp85.000 / Kg",
    color: "indigo",
    image: "https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80",
    badge: "Recovery Logam Mulia",
    changePercent: "+2.9%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_baterai_aki",
    code: "BAT-001",
    name: "Baterai & Aki",
    group: "utama",
    subItems: ["Aki kendaraan", "Baterai lithium", "UPS battery", "Baterai industri"],
    unit: "Kg",
    icon: "battery",
    faIcon: "fa-car-battery",
    description: "Aki basah bekas kendaraan otomotif, modul baterai lithium ion, dan baterai cadangan UPS BTS telekomunikasi.",
    avgPrice: 14500,
    priceRange: "Rp12.000 - Rp18.000 / Kg",
    color: "red",
    image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80",
    badge: "Pemulihan Timbal / Li",
    changePercent: "+1.7%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_organik",
    code: "ORG-001",
    name: "Organik",
    group: "utama",
    subItems: ["Sisa makanan", "Limbah kebun", "Sekam padi", "Ampas kopi", "Ampas tebu"],
    unit: "Kg",
    icon: "seedling",
    faIcon: "fa-seedling",
    description: "Limbah organik agroindustri berskala besar untuk pakan budidaya maggot BSF, biogas reaktor, dan kompos.",
    avgPrice: 900,
    priceRange: "Rp500 - Rp1.500 / Kg",
    color: "lime",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80",
    badge: "Biogas & Pakan Maggot",
    changePercent: "0.0%",
    trend: "neutral",
    isB3: false
  },
  {
    id: "cat_kemasan_industri",
    code: "PKG-001",
    name: "Kemasan Industri Bekas",
    group: "utama",
    subItems: ["Drum besi", "Drum plastik", "IBC tank", "Jerigen", "Karung jumbo (FIBC)"],
    unit: "Pcs",
    icon: "package",
    faIcon: "fa-boxes-packing",
    description: "Kontainer IBC tank 1000L rekondisi bersih, drum besi 200L tebal, jerigen kimia, dan karung jumbo 1 ton.",
    avgPrice: 185000,
    priceRange: "Rp45.000 - Rp750.000 / Pcs",
    color: "blue",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
    badge: "Kemasan Rekondisi",
    changePercent: "+1.5%",
    trend: "up",
    isB3: false
  },

  // --- KATEGORI KHUSUS INDUSTRI (B2B) (3) ---
  {
    id: "cat_scrap_produksi",
    code: "IND-001",
    name: "Scrap Produksi (B2B)",
    group: "industri",
    subItems: ["Reject molding", "Runner plastik", "Scrap stamping", "Sisa material pabrik"],
    unit: "Kg",
    icon: "factory",
    faIcon: "fa-industry",
    description: "Material sisa proses pabrikasi manufaktur, reject cetakan injeksi plastik, scrap plat stamping presisi.",
    avgPrice: 8500,
    priceRange: "Rp6.500 - Rp12.000 / Kg",
    color: "purple",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    badge: "Kontrak Rutin B2B",
    changePercent: "+2.0%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_material_recovery",
    code: "REC-001",
    name: "Material Recovery (B2B)",
    group: "industri",
    subItems: ["Katalis bekas", "Resin bekas", "Karbon aktif", "Filter bekas"],
    unit: "Kg",
    icon: "filter",
    faIcon: "fa-filter",
    description: "Material kimia industri bernilai tinggi dari kilang & proses filtrasi untuk recovery logam mulia dan reaktivasi.",
    avgPrice: 32000,
    priceRange: "Rp20.000 - Rp55.000 / Kg",
    color: "teal",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80",
    badge: "Recovery Kimia",
    changePercent: "+3.8%",
    trend: "up",
    isB3: false
  },
  {
    id: "cat_limbah_konstruksi",
    code: "CST-001",
    name: "Limbah Konstruksi (B2B)",
    group: "industri",
    subItems: ["Beton bongkaran", "Aspal bekas", "Bata", "Gypsum", "Besi proyek"],
    unit: "Ton",
    icon: "building",
    faIcon: "fa-trowel-bricks",
    description: "Puing beton bongkaran bersih, kupasan aspal jalan (RAP), sisa gypsum, dan besi potongan proyek sipil.",
    avgPrice: 1200000,
    priceRange: "Rp800.000 - Rp1.800.000 / Rit Truk",
    color: "stone",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
    badge: "Agregat Sirkular",
    changePercent: "0.0%",
    trend: "neutral",
    isB3: false
  },

  // --- KATEGORI LIMBAH B3 (IZIN KHUSUS) (1) ---
  {
    id: "cat_limbah_b3",
    code: "B3-001",
    name: "Limbah B3 (Izin Khusus)",
    group: "b3",
    subItems: ["Oli bekas", "Filter oli bekas", "Sludge", "Solvent bekas", "Aki bekas", "Lampu neon", "Bahan kimia kedaluwarsa"],
    unit: "Liter / Drum / Kg",
    icon: "biohazard",
    faIcon: "fa-biohazard",
    description: "Limbah Bahan Berbahaya dan Beracun berizin resmi. Verifikasi dokumen izin pengolahan & transporter KLHK wajib sebelum transaksi.",
    avgPrice: 3800,
    priceRange: "Sesuai Izin KLHK",
    color: "rose",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    badge: "⚠️ Wajib Izin KLHK",
    changePercent: "-0.5%",
    trend: "down",
    isB3: true,
    permitRequired: "Izin Pengelolaan Limbah B3 / Transporter KLHK"
  }
];

/**
 * 3 Pilihan Jenis Berlangganan Pembeli
 * Ditentukan dan dapat diatur batas rentang nilai jualnya oleh Admin
 */
const INITIAL_SUBSCRIPTION_TIERS = [
  {
    id: "tier_starter",
    name: "Paket Gratis (Starter)",
    badge: "Gratis Rp 0",
    monthlyFee: 0,
    minPriceLimit: 1,
    maxPriceLimit: 200000, // s/d Rp 200.000
    minBookingOfferPrice: 1,
    maxBookingOfferPrice: 200000,
    canBooking: true,
    minBookingVolume: 1,
    maxBookingVolume: 200,
    volumeUnit: "Kg",
    allowAddress: "area_only", // Hanya kota/kabupaten umum
    allowGpsMap: false, // Peta GPS terkunci
    allowWhatsapp: false, // WA terkunci
    allowInAppChat: true, // Layar chat aktif
    tagline: "Gratis — Harga Penawaran Rp 1 s/d Rp 200.000",
    description: "Khusus pembeli pemula & UMKM, membuka akses harga penawaran Rp 1 hingga Rp 200.000.",
    color: "slate",
    popular: false,
    isFree: true
  },
  {
    id: "tier_pro",
    name: "Paket Bisnis Pro",
    badge: "Terpopuler",
    monthlyFee: 249000,
    maxPriceLimit: 50000000, // s/d Rp 50.000.000
    minBookingOfferPrice: 1,
    maxBookingOfferPrice: 50000000,
    canBooking: true,
    minBookingVolume: 10,
    maxBookingVolume: 5000,
    volumeUnit: "Kg",
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
    minBookingOfferPrice: 1,
    maxBookingOfferPrice: 0, // 0 = Unlimited
    canBooking: true,
    minBookingVolume: 50,
    maxBookingVolume: 0, // 0 = Unlimited
    volumeUnit: "Kg",
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

/**
 * 3-Tier Sumber Limbah — Profil Formulir Adaptif
 * Mengatur opsi dropdown, field yang tampil, placeholder, dan default value per tier
 */
const WASTE_SOURCE_TIERS = [
  {
    id: "source_household",
    name: "Limbah Rumah Tangga",
    emoji: "🏠",
    label: "Rumah Tangga / Perorangan",
    description: "Pengepul perorangan, bank sampah, warga RT/RW",
    icon: "fa-house-chimney",
    color: "emerald",
    containers: [
      "Karung Plastik",
      "Jerigen 18 L",
      "Ember / Tong (20L)",
      "Kantong Plastik Besar",
      "Goni / Karung Goni",
      "Kardus Ikat",
      "Galon Bekas"
    ],
    units: ["Kg", "Liter", "Pcs"],
    conditions: [
      { value: "Campur", label: "Campur (Belum Dipilah)" },
      { value: "Sudah Dipilah", label: "Sudah Dipilah per Jenis" },
      { value: "Bersih", label: "Bersih (Sudah Dicuci)" }
    ],
    schedules: [
      { value: "Dijemput Kapan Saja", label: "Dijemput Kapan Saja (Fleksibel)" },
      { value: "Pengambilan Mingguan", label: "Pengambilan Rutin Mingguan" },
      { value: "Setor ke Bank Sampah", label: "Setor Mandiri ke Bank Sampah" }
    ],
    defaultUnit: "Kg",
    defaultMOQ: 5,
    defaultPrice: 3000,
    defaultQty: 50,
    showFields: { grade: false, b3: false, gps: true, nib: false, tpsPermit: false },
    placeholders: {
      title: "Contoh: Botol Plastik PET Bersih dari Perumahan",
      origin: "Contoh: Perumahan Griya Indah RT 05/RW 03, Depok",
      city: "Contoh: Depok",
      grade: ""
    }
  },
  {
    id: "source_medium_industry",
    name: "Limbah Industri Menengah",
    emoji: "🏢",
    label: "Industri Menengah / UMKM",
    description: "Bengkel, percetakan, restoran, manufaktur skala menengah",
    icon: "fa-building",
    color: "blue",
    containers: [
      "Drum Plastik (200L)",
      "Jerigen (20L - 30L)",
      "Karung Jumbo",
      "Bal Press Padat",
      "Pallet Kayu",
      "Bak Truk Pickup"
    ],
    units: ["Kg", "Liter", "Ton", "Pcs"],
    conditions: [
      { value: "Bersih", label: "Bersih (Tanpa Campuran / Siap Olah)" },
      { value: "Campur", label: "Campur (Perlu Pemilahan / Sortir)" },
      { value: "Terpress", label: "Terpress (Bal Padat Siap Muat)" },
      { value: "Cacah", label: "Cacah (Flakes / Crushed)" }
    ],
    schedules: [
      { value: "Siap Angkut (H+1 s/d H+3)", label: "Siap Angkut (H+1 - H+3)" },
      { value: "Pengambilan Rutin Mingguan", label: "Pengambilan Rutin Mingguan" },
      { value: "Kontrak Pasokan Berkala Bulanan", label: "Kontrak Pasokan Berkala" }
    ],
    defaultUnit: "Kg",
    defaultMOQ: 50,
    defaultPrice: 6000,
    defaultQty: 500,
    showFields: { grade: true, b3: true, gps: true, nib: true, tpsPermit: false },
    placeholders: {
      title: "Contoh: Serbuk Besi Bubut dari Bengkel CNC",
      origin: "Contoh: Bengkel CNC Presisi Jaya, Jl. Raya Industri No. 12",
      city: "Contoh: Tangerang",
      grade: "Contoh: Grade B, Kadar Air < 5%"
    }
  },
  {
    id: "source_large_industry",
    name: "Limbah Industri Besar",
    emoji: "🏭",
    label: "Industri Besar / Korporat",
    description: "Pabrik, kawasan industri, kontraktor proyek besar",
    icon: "fa-industry",
    color: "amber",
    containers: [
      "IBC Tank (1000L)",
      "Drum Besi (200L)",
      "Curah / Bak Truk Fuso",
      "Kontainer 20ft",
      "Bal Press Jumbo",
      "Karung Jumbo (FIBC)"
    ],
    units: ["Ton", "Kg", "Liter"],
    conditions: [
      { value: "Bersih", label: "Bersih (Siap Olah Langsung)" },
      { value: "Terpress", label: "Terpress (Bal Padat Siap Muat)" },
      { value: "Baled", label: "Baled (Terikat Rapi Standar Ekspor)" },
      { value: "Cacah", label: "Cacah (Flakes / Crushed)" },
      { value: "Campur", label: "Campur (Perlu Sortir)" }
    ],
    schedules: [
      { value: "Siap Angkut Segera (H+0)", label: "Siap Angkut Segera (H+0)" },
      { value: "Terjadwal Crane/Forklift (H+2)", label: "Terjadwal Crane/Forklift (H+2)" },
      { value: "Kontrak Pasokan Berkala Bulanan", label: "Kontrak Pasokan Berkala Bulanan" },
      { value: "Wajib Manifest KLHK (B3)", label: "Wajib Manifest KLHK (Limbah B3)" }
    ],
    defaultUnit: "Ton",
    defaultMOQ: 500,
    defaultPrice: 9500,
    defaultQty: 5000,
    showFields: { grade: true, b3: true, gps: true, nib: true, tpsPermit: true },
    placeholders: {
      title: "Contoh: Besi Scrap WF Bongkaran Pabrik (Grade Super A)",
      origin: "Contoh: PT Krakatau Industrial Estate, Cilegon",
      city: "Contoh: Cilegon",
      grade: "Contoh: FFA < 3%, Kadar Air < 1.5%, Tebal 10mm"
    }
  }
];

const INITIAL_SETTINGS = {
  appName: "BURSA LIMBAH",
  tagline: "Limbah Terverifikasi. Transaksi Terpercaya.",
  // Data Rekening Bank Pengelola (Escrow DP 30%)
  escrowBankName: "Bank Central Asia (BCA)",
  escrowAccountNumber: "8271-9920-1122",
  escrowAccountHolder: "PT BURSA LIMBAH Transaksi Sirkular (Rekening Bersama Escrow)",
  escrowBankBranch: "KCP Sentra Bisnis Pulogadung, Jakarta",
  // Sakelar Master Semua Fitur Platform (Dapat diaktifkan & dinonaktifkan Admin)
  features: {
    marketplace: true,          // Katalog limbah publik & pencarian
    productUpload: true,        // Unggah pasokan limbah baru oleh penjual
    escrowDp: false,            // Fitur DP Escrow & Rekber (SET OFF default)
    offersNegotiation: true,    // Sistem negosiasi penawaran harga
    chatSystem: true,           // Layanan obrolan interaktif pembeli - penjual
    buyerSubscription: true,    // Paket berlangganan 3-tier pembeli
    eventsModule: true,         // Agenda event, webinar, & workshop sirkular
    supportTickets: true,       // Pusat bantuan & tiket aduan
    marketTicker: true,         // Ticker harga pasar acuan
    userRegistration: true,     // Buka / tutup pendaftaran akun baru
    logisticsService: true,     // Layanan pengiriman & logistik armada
    cryptoWallet: true          // Dompet Kripto & Pembayaran Blockchain Web3
  },
  // Konfigurasi Blockchain & Dompet Kripto Bursa Limbah
  cryptoConfig: {
    enabled: true,
    networkName: "Polygon PoS (Matic Mainnet)",
    networkRpc: "https://polygon-rpc.com",
    chainId: 137,
    currencySymbol: "CLNK",
    tokenName: [REDACTED]
    tokenContractAddress: [REDACTED]
    escrowContractAddress: "0x3A28F50B9402De069F78465C58a18357aF38ESCROW",
    rewardPer100Kg: 10,         // 10 CLNK reward per 100 Kg limbah terverifikasi
    tokenRateIdr: [REDACTED]
    gasSponsorEnabled: true,    // Bebas gas fee (disponsori relayer platform)
    airdropPoolBalance: 2500000 // 2.500.000 CLNK Pool Reward Daur Ulang
  },
  // Konfigurasi Cloudinary (Gambar & Multimedia)
  cloudinaryConfig: {
    enabled: true,
    cloudName: "v1pwadqp",
    uploadPreset: "circulink_preset",
    apiKey: [REDACTED]
    folder: "circulink",
    autoOptimize: true
  },
  // Konfigurasi Database Supabase (PostgreSQL & REST API)
  supabaseConfig: {
    enabled: false,
    url: "",
    anonKey: "",
    syncEnabled: false
  },
  // Struktur Biaya & Jasa Logistik
  dpEnabled: false, // Status DP saat ini: SET OFF (Nonaktif) sesuai instruksi
  downPaymentPercent: 30, // Persentase DP jika diaktifkan
  handlingFeePerTransaction: 10000, // Biaya Penanganan
  // Gateway pembayaran: kunci rahasia selalu disimpan di environment server.
  paymentGatewayEnabled: false,
  paymentGatewayProvider: "midtrans",
  paymentGatewayEnvironment: "sandbox",
  paymentGatewayClientKey: "",
  paymentGatewayServerKey: "",
  paymentGatewayMerchantId: "",
  paymentGatewayChannels: ["qris", "bank_transfer", "gopay"],
  paymentGatewayWebhookUrl: "https://bursalimbah.id/api/payment/webhook",
  // Konfigurasi API Ekspedisi & Logistik
  expeditionApiEnabled: false,
  expeditionApiProvider: "rajaongkir",
  expeditionApiKey: [REDACTED]
  expeditionApiOrigin: "Jakarta Pusat (ID: 151)",
  expeditionApiCouriers: ["jne", "jnt", "sicepat", "lalamove"],
  expeditionApiWebhookUrl: "https://bursalimbah.id/api/shipping/webhook",
  // Ticker harga pasar pada halaman publik
    tickerEnabled: true,
    tickerTitle: "Harga Pasar Terkini",
    tickerRefreshMinutes: 15,
    termsTitle: "Syarat dan Ketentuan Penggunaan Bursa Limbah",
    termsVersion: "1.0",
    termsContent: "Dengan membuat akun, Anda menyatakan bahwa data yang diberikan benar, mematuhi ketentuan perdagangan limbah yang berlaku, dan menggunakan Bursa Limbah secara bertanggung jawab. Anda menyetujui verifikasi data serta kebijakan pembayaran dan penyelesaian transaksi platform.",
  handlingFeeByTier: {
    tier_starter: 15000,
    tier_basic: 10000,
    tier_pro: 7500,
    tier_enterprise: 5000
  },
  appFeePerTransaction: 5000, // Fee Aplikasi
  shippingServiceEnabled: true, // Jasa Pengiriman
  shippingFlatFee: 250000, // Tarif Jasa Pengiriman Flat Mitra BURSA LIMBAH
  supportSectionTitle: "Pusat Layanan Resmi",
  contactEmail: "kemitraan@bursalimbah.id",
  contactPhone: "+62 812-3456-7890",
  contactWaNumber: "628[REDACTED]7890",
  contactWaMessage: "Halo Admin Bursa Limbah, saya ingin konsultasi transaksi",
  address: "Sentra Inovasi Hijau BURSA LIMBAH Lt. 5, Jakarta Timur",
  supportGuideBtnText: "Panduan Transaksi Aman",
  supportGuideBtnAction: "modal", // 'modal' | 'url'
  supportGuideBtnUrl: "",
  supportGuideBtnEnabled: true,
  supportOperationalHours: "Senin – Jumat: 08.00 – 17.00 WIB",
  subscriptionTiers: [...INITIAL_SUBSCRIPTION_TIERS],
  customFees: [
    {
      id: "fee_handling",
      name: "Biaya Penanganan Rekber",
      type: "fixed",
      value: 10000,
      target: "buyer",
      enabled: true,
      description: "Biaya administrasi penanganan rekening bersama escrow per transaksi"
    },
    {
      id: "fee_app",
      name: "Biaya Layanan Aplikasi",
      type: "fixed",
      value: 5000,
      target: "buyer",
      enabled: true,
      description: "Pemeliharaan infrastruktur dan operasional platform Bursa Limbah"
    },
    {
      id: "fee_escrow_protection",
      name: "Jaminan Escrow & Proteksi Transaksi",
      type: "percentage",
      value: 0.5,
      target: "buyer",
      enabled: true,
      description: "Garansi perlindungan dana escrow dan kesesuaian muatan limbah"
    },
    {
      id: "fee_qc_check",
      name: "Verifikasi Mutu & Sampel Tera (Opsional)",
      type: "fixed",
      value: 25000,
      target: "buyer",
      enabled: false,
      description: "Uji lab dan inspeksi tera sampel di depo sebelum serah terima muatan"
    }
  ]
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
    subscriptionExpiry: "2026-10-15",
    password: [REDACTED]
  },
  {
    id: "user_buyer_2",
    name: "PT Daur Nusantara Sukses",
    role: "buyer",
    email: "purchasing@daurnusantara.co.id",
    phone: "+62 812-3344-5566",
    company: "PT Daur Nusantara Sukses",
    nib: "9120005541829",
    location: "Kawasan Industri SIER, Surabaya",
    subscriptionActive: true,
    subscriptionTier: "tier_enterprise",
    subscriptionExpiry: "2026-12-31",
    password: [REDACTED]
  },
  {
    id: "user_buyer_free",
    name: "Ahmad Fauzi (UMKM Daur Mandiri)",
    role: "buyer",
    email: "ahmad@daurmandiri.id",
    phone: "+62 813-5566-7788",
    company: "UMKM Daur Mandiri",
    nib: "9120007712345",
    location: "Pasar Rebo, Jakarta Timur",
    subscriptionActive: true,
    subscriptionTier: "tier_starter", // Akun Pembeli Tier Gratis
    subscriptionExpiry: "2027-12-31",
    password: [REDACTED]
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
    paymentMethods: {
      cash: {
        enabled: true,
        notes: "Pembayaran tunai di lokasi depo/gudang saat serah terima timbangan"
      },
      bankTransfer: {
        enabled: true,
        bankName: "Bank Central Asia (BCA)",
        accountNumber: "8271-992-102",
        accountHolder: "Budi Santoso"
      },
      qris: {
        enabled: true,
        merchantName: "Sentra Jelantah Sejahtera",
        imageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021126570014ID.LINKAJA.WWW01189360091800000188210210Bursalimbah5204549953033605802ID5925Sentra%20Jelantah%20Sejahtera6007Jakarta61051254062070703A016304"
      }
    },
    balance: 14500000,
    password: [REDACTED]
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
    paymentMethods: {
      cash: {
        enabled: true,
        notes: "Pembayaran tunai kasir timbangan gudang pabrik"
      },
      bankTransfer: {
        enabled: true,
        bankName: "Bank Mandiri",
        accountNumber: "137-00-982736-1",
        accountHolder: "PT Dwi Graha Rongsok Logam"
      },
      qris: {
        enabled: true,
        merchantName: "PT Dwi Graha Rongsok Logam",
        imageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021126570014ID.LINKAJA.WWW01189360091800000188210210Bursalimbah5204549953033605802ID5926PT%20Dwi%20Graha%20Rongsok6007Cilegon61051254062070703A016304"
      }
    },
    balance: 42300000,
    password: [REDACTED]
  },
  {
    id: "user_admin_1",
    name: "Pengelola Utama BURSA LIMBAH",
    role: "admin",
    email: "admin@bursalimbah.com",
    phone: "+62 811-1234-5678",
    accessLevel: "Administrator Utama",
    password: [REDACTED]
  }
];

const INITIAL_PRODUCTS = [
  {
    id: "PRD-2026-001",
    code: "CIR-UCO-01",
    title: "Minyak Jelantah Kualitas Resto Cepat Saji (FFA < 3%)",
    categoryId: "cat_minyak_cairan",
    categoryName: "Minyak & Cairan Bekas",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    condition: "bersih",
    grade: "FFA < 2.8%, M&I < 1.5%",
    containerType: "IBC Tank (1000L)",
    containerQty: 4,
    weight: 3600,
    volume: 4000,
    unit: "Liter",
    origin: "Restoran Cepat Saji & Pusat Kuliner Mall Jabodetabek",
    city: "Jakarta Selatan",
    address: "Jl. Margasatwa Barat No. 45, Jagakarsa, Jakarta Selatan",
    lat: -6.3265,
    lng: 106.8286,
    offerPrice: 9800,
    totalPrice: 39200000,
    minimumOrder: 1000,
    minimumOrderUnit: "Liter",
    pickupSchedule: "Siap Angkut Segera (H+0)",
    status: "approved",
    listingStatus: "tersedia",
    sourceType: "source_medium_industry",
    nib: "9120003847291",
    tpsPermit: null,
    isB3: false,
    b3PermitNumber: null,
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
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-002",
    code: "CIR-SCR-02",
    title: "Besi Scrap Potongan WF & Plat Baja Tebal (Grade Super A)",
    categoryId: "cat_logam",
    categoryName: "Logam",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    condition: "terpress",
    grade: "Grade Super A (Tebal > 10mm)",
    containerType: "Curah / Truk Fuso",
    containerQty: 1,
    weight: 8500,
    volume: 0,
    unit: "Kg",
    origin: "Pembongkaran Konstruksi Pabrik Industri Karawang",
    city: "Karawang Barat",
    address: "Kawasan Industri KIIC Kav. C-12, Karawang Barat",
    lat: -6.3421,
    lng: 107.2912,
    offerPrice: 6500,
    totalPrice: 55250000,
    minimumOrder: 2000,
    minimumOrderUnit: "Kg",
    pickupSchedule: "Terjadwal H+2 Muat Crane",
    status: "approved",
    listingStatus: "tersedia",
    sourceType: "source_large_industry",
    nib: "9120005541829",
    tpsPermit: "SK.KLHK/TPS/2026/8912",
    isB3: false,
    b3PermitNumber: null,
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
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-003",
    code: "CIR-PLS-03",
    title: "Plastik Botol PET Bening Bal Press Padat Kering",
    categoryId: "cat_plastik",
    categoryName: "Plastik",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    condition: "baled",
    grade: "PET Bening A (Kering < 12%)",
    containerType: "Bal Press Padat",
    containerQty: 18,
    weight: 4200,
    volume: 0,
    unit: "Kg",
    origin: "Sortir Mitra Bank Sampah & Pengepul Kota Tangerang",
    city: "Kota Tangerang",
    address: "Kawasan Pergudangan Cipondoh Blok F No. 8, Kota Tangerang",
    lat: -6.1824,
    lng: 106.6627,
    offerPrice: 6200,
    totalPrice: 26040000,
    minimumOrder: 1000,
    minimumOrderUnit: "Kg",
    pickupSchedule: "Siap Angkut Segera",
    status: "approved",
    listingStatus: "tersedia",
    sourceType: "source_household",
    nib: null,
    tpsPermit: null,
    isB3: false,
    b3PermitNumber: null,
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
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-004",
    code: "CIR-KRD-04",
    title: "Kardus OCC Corrugated Tebal Kering Gudang Logistik",
    categoryId: "cat_kertas_karton",
    categoryName: "Kertas & Karton",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    condition: "terpress",
    grade: "OCC Kraft Kering",
    containerType: "Bal Press Jumbo",
    containerQty: 10,
    weight: 5000,
    volume: 0,
    unit: "Kg",
    origin: "Gudang Logistik & Fulfillment Center E-Commerce Marunda",
    city: "Bekasi",
    address: "Kawasan Berikat Marunda Center Blok D-4, Bekasi",
    lat: -6.1132,
    lng: 106.9854,
    offerPrice: 2500,
    totalPrice: 12500000,
    minimumOrder: 1000,
    minimumOrderUnit: "Kg",
    pickupSchedule: "Jadwal Rutin Mingguan",
    status: "booked",
    listingStatus: "kontrak",
    isB3: false,
    b3PermitNumber: null,
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
        type: "Segel Batch BURSA LIMBAH",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        notes: "Stiker barcode muat BURSA LIMBAH terverifikasi"
      }
    ],
    qualitySpecs: {
      "Kadar Air": "< 12% (Kardus Kering Standar Ekspor)",
      "Bahan Pengotor (Outthrow)": "< 1%",
      "Kondisi": "Press bal padat rapi siap muat forklift"
    },
    createdAt: "2026-09-07 10:00",
    verifiedAt: "2026-09-07 11:30",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-005",
    code: "CIR-OLI-05",
    title: "Oli Pelumas Bekas Mesin Genset Pabrik & Truk Ekspedisi",
    categoryId: "cat_limbah_b3",
    categoryName: "Limbah B3 (Izin Khusus)",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    condition: "campur",
    grade: "SAE 15W-40 (Air < 2%)",
    containerType: "Drum Besi (200L)",
    containerQty: 15,
    weight: 2700,
    volume: 3000,
    unit: "Liter",
    origin: "Depot Perawatan Truk Logistik Antar Kota Cakung",
    city: "Jakarta Timur",
    address: "Jl. Raya Cakung Cilincing Km. 3, Jakarta Timur",
    lat: -6.1738,
    lng: 106.9452,
    offerPrice: 3400,
    totalPrice: 10200000,
    minimumOrder: 1000,
    minimumOrderUnit: "Liter",
    pickupSchedule: "Wajib Manifest KLHK (H+3)",
    status: "approved",
    listingStatus: "tersedia",
    isB3: true,
    b3PermitNumber: "KLHK-B3-TRANS-2026/0491",
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
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-006",
    code: "CIR-TBG-06",
    title: "Tembaga Kupas Merah Ex-Kabel Trafo Gardu (Kadar Cu 99%)",
    categoryId: "cat_logam",
    categoryName: "Logam",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    condition: "bersih",
    grade: "Cu 99.2% Millberry Bersih",
    containerType: "Karung Jumbo",
    containerQty: 2,
    weight: 650,
    volume: 0,
    unit: "Kg",
    origin: "Peremajaan Instalasi Gardu Listrik Pabrik Cikarang",
    city: "Cikarang Pusat",
    address: "Delta Silicon Industrial Park Blok L-2, Cikarang Pusat",
    lat: -6.3571,
    lng: 107.1518,
    offerPrice: 115000,
    totalPrice: 74750000,
    minimumOrder: 200,
    minimumOrderUnit: "Kg",
    pickupSchedule: "Siap Angkut Segera (H+0)",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
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
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-007",
    code: "CIR-UCO-07",
    title: "Minyak Jelantah Jerigen Mini Resto (Kualitas Jernih Disaring)",
    categoryId: "cat_minyak_cairan",
    categoryName: "Minyak & Cairan Bekas",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    condition: "bersih",
    grade: "Grade A Saring Halus",
    containerType: "Jerigen Segel (15L)",
    containerQty: 1,
    weight: 14,
    volume: 15,
    unit: "Liter",
    origin: "Resto Ayam Goreng Crispy Tebet, Jakarta Selatan",
    city: "Jakarta Selatan",
    address: "Jl. Tebet Barat Dalam Raya No. 12, Jakarta Selatan",
    lat: -6.2384,
    lng: 106.8528,
    offerPrice: 9500,
    totalPrice: 142500,
    minimumOrder: 15,
    minimumOrderUnit: "Liter",
    pickupSchedule: "Siap Angkut Segera",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Wadah Keseluruhan",
        url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
        notes: "1 jerigen putih bersih bersegel rapat"
      },
      {
        type: "Kualitas Sampel",
        url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80",
        notes: "Warna jernih keemasan hasil penyaringan kain kasa halus"
      },
      {
        type: "Tera Timbangan",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        notes: "Timbangan tera 14 Kg (15 Liter)"
      }
    ],
    qualitySpecs: {
      "Kadar FFA": "< 2.0%",
      "Kadar Air": "< 1%",
      "Warna": "Kuning Jernih",
      "Kondisi": "Siap angkut pickup"
    },
    createdAt: "2026-09-12 10:00",
    verifiedAt: "2026-09-12 11:15",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-008",
    code: "CIR-KRD-08",
    title: "Kardus Arsip & Dokumen Polos Sortiran Kantor (OCC Bersih)",
    categoryId: "cat_kertas_karton",
    categoryName: "Kertas & Karton",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    condition: "bersih",
    grade: "OCC Single & Double Wall",
    containerType: "Ikat Tali Rafia",
    containerQty: 4,
    weight: 48,
    volume: 0,
    unit: "Kg",
    origin: "Sortiran Dokumen Gedung Perkantoran Kuningan",
    city: "Jakarta Selatan",
    address: "Kawasan Rasuna Said Kav. 8, Kuningan, Jakarta Selatan",
    lat: -6.2215,
    lng: 106.8312,
    offerPrice: 2400,
    totalPrice: 115200,
    minimumOrder: 48,
    minimumOrderUnit: "Kg",
    pickupSchedule: "H+1 Penjemputan",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Tumpukan Material",
        url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
        notes: "Kardus cokelat tebal terikat rapi 4 bundel"
      },
      {
        type: "Kualitas Serat",
        url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
        notes: "Kering, tanpa basah air hujan, bebas isolasi berlebih"
      },
      {
        type: "Tera Timbangan",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        notes: "Tera timbangan jarum netto 48 Kg"
      }
    ],
    qualitySpecs: {
      "Kadar Air": "< 10%",
      "Kerapian": "Terlipat rapi terikat kuat",
      "Jenis": "OCC Single & Double Wall"
    },
    createdAt: "2026-09-13 14:20",
    verifiedAt: "2026-09-13 15:30",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-009",
    code: "CIR-PLS-09",
    title: "Sampel Biji Cacahan Plastik PET Bening Sortir Bersih",
    categoryId: "cat_plastik",
    categoryName: "Plastik",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    condition: "cacah",
    grade: "Flakes 12mm Cuci Panas",
    containerType: "Karung Sak (25Kg)",
    containerQty: 1,
    weight: 25,
    volume: 0,
    unit: "Kg",
    origin: "Pabrik Penggilingan Plastik Mitra Cipondoh",
    city: "Kota Tangerang",
    address: "Jl. KH Hasyim Ashari No. 88, Cipondoh, Kota Tangerang",
    lat: -6.1895,
    lng: 106.6710,
    offerPrice: 7200,
    totalPrice: 180000,
    minimumOrder: 25,
    minimumOrderUnit: "Kg",
    pickupSchedule: "Siap Angkut Segera",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Karung Sak",
        url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
        notes: "1 karung sak jahit mesin rapi"
      },
      {
        type: "Detail Flakes / Cacahan",
        url: "https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=800&q=80",
        notes: "Flakes PET bening ukuran 12mm cuci air panas bebas lem"
      },
      {
        type: "Tera Timbangan",
        url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
        notes: "Tera timbangan digital netto 25.00 Kg"
      }
    ],
    qualitySpecs: {
      "Ukuran Flakes": "10 - 14 mm",
      "Kadar Pengotor (PVC)": "< 50 ppm",
      "Kadar Air": "< 1%"
    },
    createdAt: "2026-09-14 09:00",
    verifiedAt: "2026-09-14 10:15",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-010",
    code: "CIR-PLT-10",
    title: "Pallet Kayu Standar Ekspor 110x110 ISPM 15 (Grade A Utuh)",
    categoryId: "cat_kayu",
    categoryName: "Kayu",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    condition: "bersih",
    grade: "Grade A Utuh (ISPM 15 Heat Treated)",
    containerType: "Tumpukan Ikat 20 Pcs",
    containerQty: 12,
    weight: 250,
    volume: 0,
    unit: "Pcs",
    origin: "Depot Pergudangan MM2100 Cikarang Barat",
    city: "Bekasi",
    address: "Kawasan Industri MM2100 Blok DD-5, Cikarang Barat",
    lat: -6.3056,
    lng: 107.0987,
    offerPrice: 48000,
    totalPrice: 12000000,
    minimumOrder: 50,
    minimumOrderUnit: "Pcs",
    pickupSchedule: "Siap Angkut Segera (H+0)",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Tumpukan Pallet Rapi",
        url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
        notes: "Pallet tersusun tegak bebas lapuk dan bebas jamur"
      },
      {
        type: "Cap Stempel ISPM 15",
        url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
        notes: "Stempel sertifikasi heat treatment resmi tertera jelas"
      },
      {
        type: "Fisik Papan Kayu",
        url: "https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80",
        notes: "Paku kokoh tidak berkarat lepas"
      }
    ],
    qualitySpecs: {
      "Dimensi": "110 x 110 x 12 cm",
      "Kapasitas Beban": "1.500 Kg Dinamis",
      "Perlakuan": "Heat Treatment HT ISPM 15"
    },
    createdAt: "2026-09-14 11:30",
    verifiedAt: "2026-09-14 13:00",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-011",
    code: "CIR-IBC-11",
    title: "IBC Tank 1000 Liter Rekondisi Bersih Food Grade (Kempu Sirup)",
    categoryId: "cat_kemasan_industri",
    categoryName: "Kemasan Industri Bekas",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    condition: "bersih",
    grade: "Grade Food Grade Bersih",
    containerType: "Unit Satuan",
    containerQty: 35,
    weight: 35,
    volume: 0,
    unit: "Pcs",
    origin: "Depo Rekondisi Drum & IBC Pulogadung",
    city: "Jakarta Timur",
    address: "Jl. Rawa Terate II No. 18, Kawasan Industri Pulogadung",
    lat: -6.1956,
    lng: 106.9124,
    offerPrice: 680000,
    totalPrice: 23800000,
    minimumOrder: 5,
    minimumOrderUnit: "Pcs",
    pickupSchedule: "H+1 Pengambilan Gudang",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Barisan IBC Tank",
        url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
        notes: "Kerangka besi galvanis utuh tanpa karat dan tabung HDPE putih bening"
      },
      {
        type: "Kran & Tutup",
        url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80",
        notes: "Kran ball valve 2 inch berfungsi normal bebas bocor"
      },
      {
        type: "Kondisi Dalam Tabung",
        url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
        notes: "Dicuci air panas bertekanan tinggi bebas bau"
      }
    ],
    qualitySpecs: {
      "Kapasitas": "1000 Liter",
      "Bahan Tabung": "HDPE High Molecular",
      "Kran": "DN50 Ball Valve"
    },
    createdAt: "2026-09-14 14:00",
    verifiedAt: "2026-09-14 15:30",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-012",
    code: "CIR-ALU-12",
    title: "Scrap Aluminium Profil Kusen 6063 & Velg Mobil Bersih",
    categoryId: "cat_logam",
    categoryName: "Logam",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    condition: "bersih",
    grade: "Aluminium 6063 Scrap Bersih (Al 98%)",
    containerType: "Ikat Bundel Balok",
    containerQty: 5,
    weight: 2800,
    volume: 0,
    unit: "Kg",
    origin: "Pabrik Ekstrusi Aluminium Cikarang",
    city: "Cikarang",
    address: "Kawasan Industri Jababeka Tahap II Blok J-8, Cikarang",
    lat: -6.2987,
    lng: 107.1345,
    offerPrice: 24500,
    totalPrice: 68600000,
    minimumOrder: 500,
    minimumOrderUnit: "Kg",
    pickupSchedule: "Terjadwal H+2",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Bundel Profil Aluminium",
        url: "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=800&q=80",
        notes: "Profil kusen aluminium bersih tanpa cat dan tanpa baut besi"
      },
      {
        type: "Uji Densitas Logam",
        url: "https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80",
        notes: "Paduan Al 6063 murni siap langsung masuk furnace"
      },
      {
        type: "Tera Timbangan Digital",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        notes: "Timbangan platform terkalibrasi 2.800 Kg"
      }
    ],
    qualitySpecs: {
      "Kemurnian": "Al 98.2%",
      "Kadar Besi (Fe)": "< 0.2%",
      "Tipe": "Ekstrusi Kusen & Velg"
    },
    createdAt: "2026-09-15 08:30",
    verifiedAt: "2026-09-15 09:45",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-013",
    code: "CIR-HDP-13",
    title: "Jerigen Plastik HDPE 30L Biru Bekas Bahan Baku Pabrik",
    categoryId: "cat_plastik",
    categoryName: "Plastik",
    sellerId: "user_seller_1",
    sellerName: "Sentra Jelantah Sejahtera",
    sellerType: "Pengepul Terverifikasi",
    sellerPhone: "+62 813-8822-1100",
    sellerWhatsapp: "6281388221100",
    condition: "bersih",
    grade: "HDPE Blow Molding Tebal",
    containerType: "Tumpukan 50 Pcs",
    containerQty: 6,
    weight: 450,
    volume: 0,
    unit: "Pcs",
    origin: "Industri Deterjen & Cairan Pembersih Sentul",
    city: "Bogor",
    address: "Kawasan Industri Sentul Kav. 12, Sentul, Bogor",
    lat: -6.5342,
    lng: 106.8612,
    offerPrice: 16500,
    totalPrice: 4950000,
    minimumOrder: 50,
    minimumOrderUnit: "Pcs",
    pickupSchedule: "Siap Angkut Segera",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Tumpukan Jerigen Biru",
        url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
        notes: "Jerigen biru 30 liter tebal dengan tutup ganda lengkap"
      },
      {
        type: "Kebersihan Dalam",
        url: "https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=800&q=80",
        notes: "Sudah dibilas bersih dan dikeringkan"
      },
      {
        type: "Kondisi Handle & Drat",
        url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
        notes: "Handle kokoh tidak ada yang retak atau pecah"
      }
    ],
    qualitySpecs: {
      "Material": "High Density Polyethylene (HDPE)",
      "Kapasitas": "30 Liter",
      "Berat Bersih Satuan": "1.5 Kg / unit"
    },
    createdAt: "2026-09-15 11:00",
    verifiedAt: "2026-09-15 12:15",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-014",
    code: "CIR-MTR-14",
    title: "Material Katalis Bekas Unit Hydrotreater Kilang Minyak",
    categoryId: "cat_material_recovery",
    categoryName: "Material Recovery (B2B)",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    condition: "bersih",
    grade: "Spent Catalyst Ni-Mo / Co-Mo",
    containerType: "Drum Baja Tertutup Rapat",
    containerQty: 4,
    weight: 800,
    volume: 0,
    unit: "Kg",
    origin: "Unit Kilang Petrokimia Cilegon",
    city: "Cilegon",
    address: "Kawasan Industri Anyer Km. 11, Cilegon",
    lat: -6.0456,
    lng: 105.9812,
    offerPrice: 42000,
    totalPrice: 33600000,
    minimumOrder: 200,
    minimumOrderUnit: "Kg",
    pickupSchedule: "Terjadwal H+3 Sesuai MoU",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Drum Penyimpanan Khusus",
        url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80",
        notes: "Drum tersegel anti uap dengan gas nitrogen inert"
      },
      {
        type: "Sampel Butiran Katalis",
        url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
        notes: "Ekstrudat bentuk bintang 1.3mm bebas karbon berlebih"
      },
      {
        type: "Sertifikat Analisis Lab",
        url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
        notes: "Hasil XRF kandungan Mo > 12%, Ni > 3%"
      }
    ],
    qualitySpecs: {
      "Kandungan Mo": "> 12.5%",
      "Kandungan Ni": "> 3.2%",
      "Bentuk": "Extrudate 1.3 mm"
    },
    createdAt: "2026-09-15 13:30",
    verifiedAt: "2026-09-15 15:00",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
  },
  {
    id: "PRD-2026-015",
    code: "CIR-CST-15",
    title: "Puing Beton Bongkaran Gedung Bersih untuk Agregat Sirkular",
    categoryId: "cat_limbah_konstruksi",
    categoryName: "Limbah Konstruksi (B2B)",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    sellerType: "Pemasok Industri Terverifikasi",
    sellerPhone: "+62 812-7711-4455",
    sellerWhatsapp: "6281277114455",
    condition: "campur",
    grade: "Beton K-300 Bebas Sampah",
    containerType: "Dump Truck Tronton",
    containerQty: 5,
    weight: 35,
    volume: 0,
    unit: "Ton",
    origin: "Proyek Revitalisasi Gedung Komersial Sudirman",
    city: "Jakarta Pusat",
    address: "Kawasan CBD Sudirman Kav. 22, Jakarta Pusat",
    lat: -6.2145,
    lng: 106.8189,
    offerPrice: 950000,
    totalPrice: 4750000,
    minimumOrder: 1,
    minimumOrderUnit: "Truk",
    pickupSchedule: "Siap Angkut Armada Pembeli (Malam)",
    status: "approved",
    listingStatus: "tersedia",
    isB3: false,
    b3PermitNumber: null,
    evidences: [
      {
        type: "Tumpukan Puing Beton",
        url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
        notes: "Puing pecahan beton padat bebas kayu dan bebas plastik"
      },
      {
        type: "Ukuran Pecahan",
        url: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80",
        notes: "Ukuran rata-rata 10 - 30 cm siap masuk mobile crusher"
      },
      {
        type: "Akses Muat Excavator",
        url: "https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80",
        notes: "Excavator stand by untuk muat ke dump truck"
      }
    ],
    qualitySpecs: {
      "Mutu Asal Beton": "K-300 s/d K-350",
      "Kadar Pengotor Kayu/Plastik": "0% (Sortir Bersih)",
      "Estimasi Berat per Rit": "25 - 30 Ton"
    },
    createdAt: "2026-09-15 15:45",
    verifiedAt: "2026-09-15 16:30",
    verifiedBy: "Tim Verifikasi BURSA LIMBAH"
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
    appFee: 5000,
    shippingFee: 250000,
    shippingMethod: "Jasa Pengiriman Mitra BURSA LIMBAH",
    totalPaidNow: 4015000,
    remainingPayment: 8750000,
    paymentStatus: "DP Terbayar (30%)",
    bookingStatus: "Dikirim oleh Pihak ke-3 / Ekspedisi",
    shippingStatus: "shipped_third_party",
    deliveryDetails: {
      dispatchType: "third_party",
      courierName: "PT Logistik Sirkular Nusantara",
      trackingNumber: "LSN-EXP-2026-88912",
      dispatchedAt: "2026-09-12 11:30",
      notes: "Muatan 5 ton kardus bal press sudah diangkut armada fuso flatbed B 9301 UIK.",
      proofImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80"
    },
    pickupDate: "2026-09-14",
    createdAt: "2026-09-10 16:20",
    qrCodeTrace: "CIR-QR-BK9921-TERVERIFIKASI",
    sellerHandoverQr: "QR-HANDOVER-ORD-2026-0901",
    notes: "Armada truk logistik mitra mengangkut dari gudang Marunda Center."
  },
  {
    id: "ORD-2026-0902",
    bookingCode: "CIR-BK-9922",
    productId: "PRD-2026-001",
    productTitle: "Minyak Jelantah Kualitas Resto Cepat Saji (FFA < 3%)",
    categoryName: "Minyak Jelantah (UCO)",
    buyerId: "user_buyer_1",
    buyerName: "PT Hijau Lestari Biofuel",
    sellerId: "user_seller_1",
    sellerName: "Budi Santoso (Sentra Jelantah Sejahtera)",
    quantity: 4000,
    unit: "Liter",
    unitPrice: 9500,
    totalPrice: 38000000,
    downPaymentRate: 30,
    downPaymentAmount: 11400000,
    handlingFee: 10000,
    appFee: 5000,
    shippingFee: 0,
    shippingMethod: "Armada Mandiri Pembeli",
    totalPaidNow: 11415000,
    remainingPayment: 26600000,
    paymentStatus: "DP Terbayar (30%)",
    bookingStatus: "Diserahkan Langsung ke Pembeli",
    shippingStatus: "handed_over",
    deliveryDetails: {
      dispatchType: "direct",
      courierName: "Serah Terima Langsung di Depo",
      trackingNumber: "DEP-BJS-JKT-0902",
      dispatchedAt: "2026-09-18 10:15",
      notes: "4 IBC Tank @1000L telah dimuat ke armada tangki pembeli B 9871 KLA. Siap validasi pembeli.",
      proofImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
      handoverRecipient: "Supriyadi (Driver PT Hijau Lestari Biofuel)"
    },
    pickupDate: "2026-09-18",
    createdAt: "2026-09-16 09:40",
    qrCodeTrace: "CIR-QR-BK9922-TERVERIFIKASI",
    sellerHandoverQr: "QR-HANDOVER-ORD-2026-0902",
    qrCompletionReady: true,
    notes: "Telah diuji tera refractometer FFA 2.4% di lokasi."
  },
  {
    id: "ORD-2026-0903",
    bookingCode: "CIR-BK-9923",
    productId: "PRD-2026-002",
    productTitle: "Scrap Besi Tua Campur Konstruksi & H-Beam",
    categoryName: "Besi & Logam Scrap",
    buyerId: "user_buyer_2",
    buyerName: "PT Daur Nusantara Sukses",
    sellerId: "user_seller_1",
    sellerName: "Budi Santoso (Sentra Jelantah Sejahtera)",
    quantity: 8000,
    unit: "Kg",
    unitPrice: 6500,
    totalPrice: 52000000,
    downPaymentRate: 30,
    downPaymentAmount: 15600000,
    handlingFee: 10000,
    appFee: 5000,
    shippingFee: 350000,
    shippingMethod: "Jasa Pengiriman Mitra BURSA LIMBAH",
    totalPaidNow: 15965000,
    remainingPayment: 36400000,
    paymentStatus: "DP Terbayar (30%)",
    bookingStatus: "Menunggu Pengiriman / Serah Terima",
    shippingStatus: "pending_dispatch",
    pickupDate: "2026-10-06",
    createdAt: "2026-10-02 14:10",
    qrCodeTrace: "CIR-QR-BK9923-TERVERIFIKASI",
    sellerHandoverQr: "QR-HANDOVER-ORD-2026-0903",
    notes: "Penjual menyiapkan muatan scrap di depo Pasar Minggu."
  },
  {
    id: "ORD-2026-0904",
    bookingCode: "CIR-BK-9924",
    productId: "PRD-2026-003",
    productTitle: "Botol Plastik PET Bening Bal Press Kering Bersih",
    categoryName: "Plastik PET (Polyethylene)",
    buyerId: "user_buyer_free",
    buyerName: "Ahmad Fauzi (UMKM Daur Mandiri)",
    sellerId: "user_seller_1",
    sellerName: "Budi Santoso (Sentra Jelantah Sejahtera)",
    quantity: 2500,
    unit: "Kg",
    unitPrice: 5200,
    totalPrice: 13000000,
    downPaymentRate: 30,
    downPaymentAmount: 3900000,
    handlingFee: 15000,
    appFee: 5000,
    shippingFee: 0,
    shippingMethod: "Armada Mandiri Pembeli",
    totalPaidNow: 13000000,
    remainingPayment: 0,
    paymentStatus: "Lunas (Selesai)",
    bookingStatus: "Selesai (Lunas)",
    shippingStatus: "delivered",
    escrowStatus: "completed",
    actualReceivedWeight: 2500,
    completedAt: "2026-09-29 16:45",
    deliveryDetails: {
      dispatchType: "direct",
      courierName: "Serah Terima Mandiri UMKM",
      trackingNumber: "TRX-SLS-2026-0904",
      dispatchedAt: "2026-09-29 14:00",
      notes: "Barang telah diterima dan diverifikasi sesuai tera jembatan timbang.",
      handoverRecipient: "Ahmad Fauzi"
    },
    pickupDate: "2026-09-29",
    createdAt: "2026-09-25 11:00",
    qrCodeTrace: "CIR-QR-BK9924-TERVERIFIKASI",
    sellerHandoverQr: "QR-HANDOVER-ORD-2026-0904",
    qrCompletionReady: true,
    notes: "Transaksi tuntas, dana escrow telah diteruskan ke saldo dompet penjual."
  }
];

const INITIAL_OFFERS = [
  {
    id: "OFF-2026-001",
    productId: "PRD-2026-001",
    productTitle: "Minyak Jelantah Kualitas Resto Cepat Saji (FFA < 3%)",
    productCode: "PRD-UCO-001",
    sellerId: "user_seller_1",
    sellerName: "Budi Santoso (Sentra Jelantah Sejahtera)",
    buyerId: "user_buyer_1",
    buyerName: "PT Hijau Lestari Biofuel",
    originalPrice: 9500,
    offerPrice: 9200,
    quantity: 4000,
    unit: "Liter",
    note: "Volume 4000 Liter siap ambil rutin tiap minggu jika harga disetujui Rp9.200/Liter.",
    status: "accepted",
    isConvertedToOrder: false,
    createdAt: "2026-09-28 10:15",
    respondedAt: "2026-09-28 14:30"
  },
  {
    id: "OFF-2026-002",
    productId: "PRD-2026-002",
    productTitle: "Scrap Besi Tua Campur Konstruksi & H-Beam",
    productCode: "PRD-FE-002",
    sellerId: "user_seller_1",
    sellerName: "Budi Santoso (Sentra Jelantah Sejahtera)",
    buyerId: "user_buyer_2",
    buyerName: "PT Daur Nusantara Sukses",
    originalPrice: 6500,
    offerPrice: 6200,
    quantity: 8000,
    unit: "Kg",
    note: "Truk tronton kami siap ambil muatan 8 Ton langsung di gudang Pasar Minggu.",
    status: "accepted",
    isConvertedToOrder: true,
    convertedOrderId: "ORD-2026-0903",
    createdAt: "2026-10-01 11:00",
    respondedAt: "2026-10-01 13:20"
  },
  {
    id: "OFF-2026-003",
    productId: "PRD-2026-004",
    productTitle: "Kardus OCC Corrugated Tebal Kering Gudang Logistik",
    productCode: "PRD-OCC-004",
    sellerId: "user_seller_2",
    sellerName: "PT Dwi Graha Rongsok Logam",
    buyerId: "user_buyer_1",
    buyerName: "PT Hijau Lestari Biofuel",
    originalPrice: 2500,
    offerPrice: 2400,
    quantity: 6000,
    unit: "Kg",
    note: "Untuk kebutuhan bahan pulp daur ulang pabrik kertas mitra.",
    status: "accepted",
    isConvertedToOrder: false,
    createdAt: "2026-10-02 09:20",
    respondedAt: "2026-10-02 11:45"
  },
  {
    id: "OFF-2026-004",
    productId: "PRD-2026-003",
    productTitle: "Botol Plastik PET Bening Bal Press Kering Bersih",
    productCode: "PRD-PET-003",
    sellerId: "user_seller_1",
    sellerName: "Budi Santoso (Sentra Jelantah Sejahtera)",
    buyerId: "user_buyer_free",
    buyerName: "Ahmad Fauzi (UMKM Daur Mandiri)",
    originalPrice: 5200,
    offerPrice: 4900,
    quantity: 1500,
    unit: "Kg",
    note: "Mohon pertimbangan harga penawaran khusus UMKM pencacah plastik daur ulang.",
    status: "pending",
    isConvertedToOrder: false,
    createdAt: "2026-10-04 15:40"
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

/**
 * Daftar Data Agenda & Event Bursa Limbah
 */
const INITIAL_EVENTS = [
  {
    id: "evt_1",
    title: "Workshop Pengelolaan & Monetisasi Minyak Jelantah (UCO) untuk Biodiesel",
    category: "workshop",
    categoryLabel: "Workshop",
    date: "2026-09-22",
    day: "22",
    monthYear: "Sep 2026",
    time: "09.00 – 15.00 WIB",
    location: "Balai Kartini, Jakarta Selatan",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
    description: "Pelajari standar sertifikasi ISCC, teknik pengujian kadar FFA, dan cara terhubung langsung dengan pembeli ekspor biodiesel berkualitas tinggi.",
    priceLabel: "Gratis (Terbatas 80 Kursi)",
    isFree: true,
    status: "published"
  },
  {
    id: "evt_2",
    title: "Business Matching: Pengepul Limbah Logam Jawa Timur × Smelter Nasional",
    category: "business-matching",
    categoryLabel: "Business Matching",
    date: "2026-10-05",
    day: "05",
    monthYear: "Okt 2026",
    time: "08.00 – 17.00 WIB",
    location: "Hotel Grand Mercure, Surabaya",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80",
    description: "Forum pertemuan terstruktur antara 50+ pengepul besi, tembaga, dan aluminium dengan 12 smelter dan pabrik peleburan logam nasional.",
    priceLabel: "Rp 150.000 / peserta",
    isFree: false,
    status: "published"
  },
  {
    id: "evt_3",
    title: "Webinar: Update Regulasi Limbah B3 PP No. 22/2021 & Implikasinya bagi Pengepul",
    category: "webinar",
    categoryLabel: "Webinar Online",
    date: "2026-10-10",
    day: "10",
    monthYear: "Okt 2026",
    time: "13.00 – 15.30 WIB",
    location: "Zoom Meeting (Online)",
    image: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=800&q=80",
    description: "Narasumber: Direktur PSLB3 KLHK. Pahami persyaratan izin pengumpulan, manifest elektronik, dan sanksi terbaru bagi pengepul limbah B3 tidak terdaftar.",
    priceLabel: "Gratis — Daftar via WhatsApp",
    isFree: true,
    status: "published"
  },
  {
    id: "evt_4",
    title: "INDONESIA RECYCLE EXPO 2026 — Pameran Daur Ulang & Ekonomi Sirkular Nasional",
    category: "pameran",
    categoryLabel: "Pameran & Expo",
    date: "2026-11-20",
    day: "20",
    monthYear: "Nov 2026",
    time: "3 Hari (20–22 Nov)",
    location: "JIExpo Kemayoran, Jakarta Pusat",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    description: "300+ booth dari pabrik daur ulang, pengepul, dan produsen mesin cacah plastik. Bursa Limbah hadir sebagai platform digital resmi mitra Expo.",
    priceLabel: "Pengunjung Umum: Gratis",
    isFree: true,
    status: "published"
  },
  {
    id: "evt_5",
    title: "Seminar Nasional: Peluang Bisnis Ekonomi Sirkular Indonesia 2026 – 2030",
    category: "seminar",
    categoryLabel: "Seminar",
    date: "2026-11-14",
    day: "14",
    monthYear: "Nov 2026",
    time: "09.00 – 16.00 WIB",
    location: "Grand Ballroom Trans Luxury Hotel, Bandung",
    image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
    description: "Pembicara dari Kementerian LHK, BRIN, dan pelaku industri daur ulang papan atas. Bahas peta jalan ekonomi sirkular dan peluang bisnis limbah bernilai tinggi.",
    priceLabel: "Rp 350.000 / orang",
    isFree: false,
    status: "published"
  },
  {
    id: "evt_6",
    title: "Workshop: Cara Upload Pasokan Limbah Bermutu Tinggi di Bursa Limbah (Foto & GPS)",
    category: "workshop",
    categoryLabel: "Workshop",
    date: "2026-10-29",
    day: "29",
    monthYear: "Okt 2026",
    time: "10.00 – 14.00 WIB",
    location: "Kantor Bursa Limbah, Kuningan, Jakarta",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
    description: "Panduan langsung dari tim kurator: teknik foto eviden 3 sisi, kalibrasi timbangan digital, pengambilan titik GPS gudang, dan cara mengisi manifest digital.",
    priceLabel: "Gratis untuk Mitra Penjual",
    isFree: true,
    status: "published"
  }
];

/**
 * Antrean Permohonan Verifikasi & Approval Langganan Pembeli
 */
const INITIAL_SUBSCRIPTION_REQUESTS = [
  {
    id: "sub_req_1",
    userId: "user_buyer_1",
    userName: "PT Hijau Semesta Industri",
    company: "PT Hijau Semesta Industri",
    email: "procurement@hijausemesta.co.id",
    phone: "+62 812-9988-7766",
    tierId: "tier_pro",
    tierName: "Paket Bisnis Pro",
    monthlyFee: 249000,
    paymentProof: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
    paymentMethod: "Transfer Bank BCA Rekber",
    requestedAt: "2026-09-23 14:30 WIB",
    status: "pending", // 'pending' | 'approved' | 'rejected'
    approvedAt: null
  },
  {
    id: "sub_req_2",
    userId: "user_buyer_2",
    userName: "CV Berkah Daur Ulang Mandiri",
    company: "CV Berkah Daur Ulang",
    email: "admin@berkahdaurulang.com",
    phone: "+62 813-7766-5544",
    tierId: "tier_enterprise",
    tierName: "Paket Korporat Enterprise",
    monthlyFee: 499000,
    paymentProof: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
    paymentMethod: "Transfer Bank Mandiri",
    requestedAt: "2026-09-23 11:15 WIB",
    status: "pending",
    approvedAt: null
  },
  {
    id: "sub_req_3",
    userId: "user_buyer_3",
    userName: "PT Daur Jaya Nusantara",
    company: "PT Daur Jaya Nusantara",
    email: "finance@daurjaya.co.id",
    phone: "+62 811-2233-4455",
    tierId: "tier_starter",
    tierName: "Paket Gratis (Starter)",
    monthlyFee: 0,
    paymentProof: null,
    paymentMethod: "Pendaftaran Gratis",
    requestedAt: "2026-09-22 09:00 WIB",
    status: "approved",
    approvedAt: "2026-09-22 09:05 WIB"
  }
];

// ====================================================================
// DATA AWAL: TIKET EVENT RESMI & QR CODE PRESENSI KEDATANGAN
// ====================================================================
const INITIAL_EVENT_TICKETS = [
  {
    id: "tkt_1",
    ticketCode: "BL-TKT-2026-9812",
    eventId: "evt_1",
    eventTitle: "Workshop Pengelolaan & Monetisasi Minyak Jelantah (UCO) untuk Biodiesel",
    eventDate: "2026-09-22",
    eventTime: "09.00 – 15.00 WIB",
    eventLocation: "Balai Kartini, Jakarta Selatan",
    ticketType: "entry",
    ticketTypeLabel: "Tiket Masuk Resmi (Entrance Pass)",
    holderName: "Budi Santoso, S.T.",
    companyName: "PT Hijau Lestari Biofuel",
    phone: "+62 811-9876-5432",
    email: "pengadaan@hijaulestari.co.id",
    gateOrSeat: "Gate A - Meja Registrasi 01",
    notes: "Tunjukkan QR Code ini kepada panitia registrasi di pintu masuk acara.",
    status: "checked_in",
    checkedInAt: "2026-09-22 08:42 WIB",
    createdAt: "2026-09-20 10:15:00"
  },
  {
    id: "tkt_2",
    ticketCode: "BL-TKT-2026-5524",
    eventId: "evt_2",
    eventTitle: "Business Matching: Pengepul Limbah Logam Jawa Timur × Smelter Nasional",
    eventDate: "2026-10-05",
    eventTime: "08.00 – 17.00 WIB",
    eventLocation: "Hotel Grand Mercure, Surabaya",
    ticketType: "attendance",
    ticketTypeLabel: "Tiket Absen Kedatangan (Attendance Check-In)",
    holderName: "Dewi Maharani, M.M.",
    companyName: "PT Karawang Steel Perkasa",
    phone: "+62 813-8822-1144",
    email: "dewi@karawangsteel.co.id",
    gateOrSeat: "Lobby Utama - Meja Presensi 2",
    notes: "Pindai QR Code untuk verifikasi presensi kehadiran & pengambilan seminar kit.",
    status: "issued",
    checkedInAt: null,
    createdAt: "2026-10-02 14:30:00"
  },
  {
    id: "tkt_3",
    ticketCode: "BL-TKT-2026-7731",
    eventId: "evt_4",
    eventTitle: "INDONESIA RECYCLE EXPO 2026 — Pameran Daur Ulang & Ekonomi Sirkular Nasional",
    eventDate: "2026-11-20",
    eventTime: "3 Hari (20–22 Nov)",
    eventLocation: "JIExpo Kemayoran, Jakarta Pusat",
    ticketType: "vip",
    ticketTypeLabel: "VIP Guest & Buyer Pass",
    holderName: "Ir. Hendra Kusuma",
    companyName: "Asosiasi Daur Ulang Plastik Indonesia (ADUPI)",
    phone: "+62 812-3456-7890",
    email: "hendra@adupi.or.id",
    gateOrSeat: "VIP Lounge - Hall B3",
    notes: "Akses prioritas VIP Lounge, ruang temu bisnis, dan jamuan makan siang.",
    status: "issued",
    checkedInAt: null,
    createdAt: "2026-10-03 09:10:00"
  }
];

