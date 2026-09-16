-- ====================================================================
-- WasteHub Seed Categories
-- 1. Kategori Utama (12)
-- 2. Kategori Khusus Industri B2B (3)
-- 3. Kategori Limbah B3 Izin Khusus (1)
-- Plus data 10 Kategori Paling Laris Saat MVP
-- ====================================================================

INSERT INTO categories 
(category_code, main_category, sub_category, group_type, is_b3, grade_default, unit, description, avg_price, price_range, icon)
VALUES
-- --- GROUP 1: KATEGORI UTAMA (12) ---
('OIL-001', 'Minyak & Cairan Bekas', 'Minyak jelantah, oli bekas, coolant bekas, grease bekas, solar bekas, cairan hidrolik', 'utama', FALSE, 'A', 'Liter', 'Minyak jelantah UCO bersertifikat, oli pelumas dan cairan pendingin industri', 9500, 'Rp8.500 - Rp11.500 / Liter', 'fa-droplet'),
('PPR-001', 'Kertas & Karton', 'Kardus OCC, HVS bekas, koran, majalah, duplex, arsip kertas, paper core', 'utama', FALSE, 'A', 'Kg', 'Kardus boks pengemasan logistik, kertas kantor putih, dan potongan kertas pulp', 2600, 'Rp2.000 - Rp3.200 / Kg', 'fa-box-open'),
('PLS-001', 'Plastik', 'PET, HDPE, PP, LDPE, PVC, ABS, PS, plastik campur, karung plastik, stretch film', 'utama', FALSE, 'A', 'Kg', 'Botol PET bal press, jerigen HDPE daur ulang, emberan PP, dan film plastik industri', 6200, 'Rp4.500 - Rp8.500 / Kg', 'fa-recycle'),
('MTL-001', 'Logam', 'Besi tua, baja, aluminium, tembaga, kuningan, stainless steel, timah, seng, kabel bekas', 'utama', FALSE, 'A', 'Kg', 'Scrap besi potongan WF balok, profil kusen aluminium, kawat tembaga merah Cu 99%', 18500, 'Rp6.000 - Rp125.000 / Kg', 'fa-cubes-stacked'),
('GLS-001', 'Kaca', 'Kaca bening, kaca warna, botol kaca, pecahan kaca (cullet), kaca tempered', 'utama', FALSE, 'A', 'Kg', 'Pecahan kaca siap lebur tungku botol dan botol kemasan minuman industri', 850, 'Rp600 - Rp1.200 / Kg', 'fa-wine-bottle'),
('RBR-001', 'Karet', 'Ban bekas, crumb rubber, selang bekas, gasket karet, conveyor belt', 'utama', FALSE, 'A', 'Kg', 'Ban luar truk, serbuk crumb rubber aspal, dan sisa belt konveyor pabrik', 3200, 'Rp2.500 - Rp4.500 / Kg', 'fa-circle-dot'),
('WOD-001', 'Kayu', 'Pallet kayu, peti kayu, kayu bekas proyek, serbuk kayu, potongan kayu', 'utama', FALSE, 'A', 'Pcs', 'Pallet kayu standard ekspor 110x110, peti kemasan mesin, dan biomassa serbuk kayu', 45000, 'Rp35.000 - Rp75.000 / Pcs', 'fa-tree'),
('TXT-001', 'Tekstil', 'Kain perca, pakaian bekas industri, benang sisa, karpet bekas', 'utama', FALSE, 'B', 'Kg', 'Limbah garmen potongan kain katun untuk kain majun industri pembersih mesin', 4800, 'Rp3.500 - Rp6.500 / Kg', 'fa-shirt'),
('ELC-001', 'Elektronik (E-Waste)', 'Laptop, HP, PCB, server, printer, kabel elektronik', 'utama', FALSE, 'A', 'Kg', 'Papan sirkuit PCB grade komputer & server untuk pemulihan logam berharga', 48000, 'Rp35.000 - Rp85.000 / Kg', 'fa-microchip'),
('BAT-001', 'Baterai & Aki', 'Aki kendaraan, baterai lithium, UPS battery, baterai industri', 'utama', FALSE, 'A', 'Kg', 'Aki basah bekas kendaraan otomotif dan sel baterai UPS telekomunikasi', 14500, 'Rp12.000 - Rp18.000 / Kg', 'fa-car-battery'),
('ORG-001', 'Organik', 'Sisa makanan, limbah kebun, sekam padi, ampas kopi, ampas tebu', 'utama', FALSE, 'B', 'Kg', 'Limbah organik agroindustri untuk bahan pakan maggot BSF, biogas, dan pupuk kompos', 900, 'Rp500 - Rp1.500 / Kg', 'fa-seedling'),
('PKG-001', 'Kemasan Industri Bekas', 'Drum besi, drum plastik, IBC tank, jerigen, karung jumbo (FIBC)', 'utama', FALSE, 'A', 'Pcs', 'Kontainer IBC tank 1000L rekondisi siap pakai, drum besi 200L, dan karung jumbo', 185000, 'Rp45.000 - Rp750.000 / Pcs', 'fa-boxes-packing'),

-- --- GROUP 2: KATEGORI KHUSUS INDUSTRI (B2B) (3) ---
('IND-001', 'Scrap Produksi', 'Reject molding, runner plastik, scrap stamping, sisa material pabrik', 'industri', FALSE, 'A', 'Kg', 'Bahan sisa reject cetakan pabrik manufaktur otomotif & elektronik kontrak rutin', 8500, 'Rp6.500 - Rp12.000 / Kg', 'fa-industry'),
('REC-001', 'Material Recovery', 'Katalis bekas, resin bekas, karbon aktif, filter bekas', 'industri', FALSE, 'A', 'Kg', 'Material kimia bernilai tinggi dari unit pemurnian kilang & pabrik petrokimia', 32000, 'Rp20.000 - Rp55.000 / Kg', 'fa-filter'),
('CST-001', 'Limbah Konstruksi', 'Beton bongkaran, aspal bekas, bata, gypsum, besi proyek', 'industri', FALSE, 'B', 'Ton', 'Sisa urugan puing beton bersih & aspal daur ulang pekerjaan sipil infrastruktur', 1200000, 'Rp800.000 - Rp1.800.000 / Truk', 'fa-trowel-bricks'),

-- --- GROUP 3: KATEGORI LIMBAH B3 (IZIN KHUSUS KLHK) (1) ---
('B3-001', 'Limbah B3 (Izin Khusus)', 'Oli bekas, Filter oli bekas, Sludge, Solvent bekas, Aki bekas, Lampu neon, Bahan kimia kedaluwarsa', 'b3', TRUE, 'B3', 'Liter', 'Kategori khusus limbah berbahaya & beracun. Wajib verifikasi nomor izin transporter/pengolah resmi KLHK', 3800, 'Sesuai Izin KLHK', 'fa-biohazard');
