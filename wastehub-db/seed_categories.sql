-- ====================================================================
-- WasteHub Seed Categories
-- 1. Kategori Utama (12)
-- 2. Kategori Khusus Industri B2B (3)
-- 3. Kategori Limbah B3 Izin Khusus (1)
-- Plus data 10 Kategori Paling Laris Saat MVP
-- ====================================================================

INSERT INTO categories 
(category_code, main_category, sub_category, group_type, is_b3, grade_default, unit, avg_price, price_range, icon)
VALUES
-- --- 1. MINYAK & CAIRAN BEKAS (6 Sub-Kategori) ---
('OIL-001', 'Minyak & Cairan Bekas', 'Minyak Jelantah', 'utama', FALSE, 'A', 'Liter', 9500, 'Rp8.500 - Rp11.500 / Liter', 'fa-droplet'),
('OIL-002', 'Minyak & Cairan Bekas', 'Oli Bekas', 'utama', TRUE, 'B', 'Liter', 3500, 'Rp2.500 - Rp4.500 / Liter', 'fa-oil-can'),
('OIL-003', 'Minyak & Cairan Bekas', 'Coolant Bekas', 'utama', FALSE, 'B', 'Liter', 2200, 'Rp1.800 - Rp2.800 / Liter', 'fa-snowflake'),
('OIL-004', 'Minyak & Cairan Bekas', 'Grease Bekas', 'utama', FALSE, 'C', 'Kg', 1800, 'Rp1.200 - Rp2.500 / Kg', 'fa-brush'),
('OIL-005', 'Minyak & Cairan Bekas', 'Solar Bekas (Sesuai Regulasi)', 'utama', FALSE, 'B', 'Liter', 6800, 'Rp5.500 - Rp7.800 / Liter', 'fa-gas-pump'),
('OIL-006', 'Minyak & Cairan Bekas', 'Cairan Hidrolik', 'utama', FALSE, 'A', 'Liter', 5500, 'Rp4.500 - Rp7.000 / Liter', 'fa-gears'),

-- --- 2. KERTAS & KARTON (7 Sub-Kategori) ---
('PPR-001', 'Kertas & Karton', 'Kardus OCC', 'utama', FALSE, 'A', 'Kg', 2600, 'Rp2.000 - Rp3.200 / Kg', 'fa-box-open'),
('PPR-002', 'Kertas & Karton', 'HVS Bekas', 'utama', FALSE, 'A', 'Kg', 3200, 'Rp2.800 - Rp3.800 / Kg', 'fa-file-lines'),
('PPR-003', 'Kertas & Karton', 'Koran Bekas', 'utama', FALSE, 'B', 'Kg', 2000, 'Rp1.600 - Rp2.400 / Kg', 'fa-newspaper'),
('PPR-004', 'Kertas & Karton', 'Majalah Bekas', 'utama', FALSE, 'B', 'Kg', 1800, 'Rp1.400 - Rp2.200 / Kg', 'fa-book-open'),
('PPR-005', 'Kertas & Karton', 'Duplex', 'utama', FALSE, 'B', 'Kg', 1500, 'Rp1.200 - Rp1.800 / Kg', 'fa-scroll'),
('PPR-006', 'Kertas & Karton', 'Arsip Kertas Kantor', 'utama', FALSE, 'A', 'Kg', 3000, 'Rp2.500 - Rp3.500 / Kg', 'fa-folder-closed'),
('PPR-007', 'Kertas & Karton', 'Paper Core', 'utama', FALSE, 'A', 'Kg', 1400, 'Rp1.000 - Rp1.800 / Kg', 'fa-circle-notch'),

-- --- 3. PLASTIK (10 Sub-Kategori) ---
('PLS-001', 'Plastik', 'PET (Botol Bening / Bal Press)', 'utama', FALSE, 'A', 'Kg', 6200, 'Rp4.500 - Rp8.500 / Kg', 'fa-bottle-water'),
('PLS-002', 'Plastik', 'HDPE (Jerigen / Tutup)', 'utama', FALSE, 'A', 'Kg', 5800, 'Rp4.000 - Rp7.500 / Kg', 'fa-jug-detergent'),
('PLS-003', 'Plastik', 'PP (Emberan / Gelas)', 'utama', FALSE, 'A', 'Kg', 4800, 'Rp3.500 - Rp6.000 / Kg', 'fa-glass-water'),
('PLS-004', 'Plastik', 'LDPE (Film / Plastik Bening)', 'utama', FALSE, 'A', 'Kg', 5200, 'Rp3.800 - Rp6.800 / Kg', 'fa-layer-group'),
('PLS-005', 'Plastik', 'PVC (Pipa / Talang Air)', 'utama', FALSE, 'B', 'Kg', 3500, 'Rp2.500 - Rp4.500 / Kg', 'fa-lines-leaning'),
('PLS-006', 'Plastik', 'ABS (Casing Elektronik)', 'utama', FALSE, 'A', 'Kg', 8500, 'Rp6.500 - Rp11.000 / Kg', 'fa-laptop'),
('PLS-007', 'Plastik', 'PS (Styrofoam / Wadah)', 'utama', FALSE, 'B', 'Kg', 2800, 'Rp1.800 - Rp3.500 / Kg', 'fa-cube'),
('PLS-008', 'Plastik', 'Plastik Campur (Mixed)', 'utama', FALSE, 'C', 'Kg', 2200, 'Rp1.500 - Rp3.000 / Kg', 'fa-recycle'),
('PLS-009', 'Plastik', 'Karung Plastik (Woven Bag)', 'utama', FALSE, 'B', 'Kg', 2500, 'Rp1.800 - Rp3.200 / Kg', 'fa-bag-shopping'),
('PLS-010', 'Plastik', 'Stretch Film Industri', 'utama', FALSE, 'A', 'Kg', 5500, 'Rp4.000 - Rp7.000 / Kg', 'fa-film'),

-- --- 4. LOGAM (9 Sub-Kategori) ---
('MTL-001', 'Logam', 'Besi Tua (Scrap WF / Balok)', 'utama', FALSE, 'A', 'Kg', 7200, 'Rp6.000 - Rp8.500 / Kg', 'fa-cubes-stacked'),
('MTL-002', 'Logam', 'Baja Scrap (Plat / Konstruksi)', 'utama', FALSE, 'A', 'Kg', 8500, 'Rp7.000 - Rp10.000 / Kg', 'fa-shield'),
('MTL-003', 'Logam', 'Aluminium (Profil Kusen / Velg)', 'utama', FALSE, 'A', 'Kg', 24500, 'Rp18.000 - Rp32.000 / Kg', 'fa-car-side'),
('MTL-004', 'Logam', 'Tembaga (Kabel Merah Cu 99%)', 'utama', FALSE, 'Super', 'Kg', 115000, 'Rp95.000 - Rp135.000 / Kg', 'fa-bolt'),
('MTL-005', 'Logam', 'Kuningan Scrap', 'utama', FALSE, 'A', 'Kg', 62000, 'Rp50.000 - Rp75.000 / Kg', 'fa-coins'),
('MTL-006', 'Logam', 'Stainless Steel (SUS 304/316)', 'utama', FALSE, 'A', 'Kg', 19500, 'Rp15.000 - Rp25.000 / Kg', 'fa-utensils'),
('MTL-007', 'Logam', 'Timah Scrap', 'utama', FALSE, 'B', 'Kg', 45000, 'Rp35.000 - Rp55.000 / Kg', 'fa-ring'),
('MTL-008', 'Logam', 'Seng Scrap', 'utama', FALSE, 'B', 'Kg', 14000, 'Rp10.000 - Rp18.000 / Kg', 'fa-sheet-plastic'),
('MTL-009', 'Logam', 'Kabel Bekas Kupas', 'utama', FALSE, 'A', 'Kg', 38000, 'Rp25.000 - Rp65.000 / Kg', 'fa-ethernet'),

-- --- 5. KACA (5 Sub-Kategori) ---
('GLS-001', 'Kaca', 'Kaca Bening Lembaran', 'utama', FALSE, 'A', 'Kg', 950, 'Rp700 - Rp1.300 / Kg', 'fa-window-maximize'),
('GLS-002', 'Kaca', 'Kaca Warna Lembaran', 'utama', FALSE, 'B', 'Kg', 750, 'Rp500 - Rp1.000 / Kg', 'fa-palette'),
('GLS-003', 'Kaca', 'Botol Kaca Kemasan', 'utama', FALSE, 'A', 'Pcs', 800, 'Rp500 - Rp1.500 / Pcs', 'fa-wine-bottle'),
('GLS-004', 'Kaca', 'Pecahan Kaca (Cullet)', 'utama', FALSE, 'A', 'Kg', 850, 'Rp600 - Rp1.200 / Kg', 'fa-shapes'),
('GLS-005', 'Kaca', 'Kaca Tempered', 'utama', FALSE, 'B', 'Kg', 600, 'Rp400 - Rp900 / Kg', 'fa-shield-halved'),

-- --- 6. KARET (5 Sub-Kategori) ---
('RBR-001', 'Karet', 'Ban Bekas (Truk / Bus)', 'utama', FALSE, 'B', 'Pcs', 35000, 'Rp25.000 - Rp50.000 / Pcs', 'fa-circle-notch'),
('RBR-002', 'Karet', 'Crumb Rubber (Serbuk Karet)', 'utama', FALSE, 'A', 'Kg', 3200, 'Rp2.500 - Rp4.500 / Kg', 'fa-circle-dot'),
('RBR-003', 'Karet', 'Selang Karet Bekas', 'utama', FALSE, 'B', 'Kg', 2000, 'Rp1.500 - Rp2.800 / Kg', 'fa-ring'),
('RBR-004', 'Karet', 'Gasket Karet Industri', 'utama', FALSE, 'B', 'Kg', 2800, 'Rp2.000 - Rp3.800 / Kg', 'fa-gears'),
('RBR-005', 'Karet', 'Conveyor Belt Bekas', 'utama', FALSE, 'A', 'Meter', 45000, 'Rp35.000 - Rp65.000 / Meter', 'fa-arrows-left-right'),

-- --- 7. KAYU (5 Sub-Kategori) ---
('WOD-001', 'Kayu', 'Pallet Kayu Standar Ekspor', 'utama', FALSE, 'A', 'Pcs', 45000, 'Rp35.000 - Rp75.000 / Pcs', 'fa-tree'),
('WOD-002', 'Kayu', 'Peti Kayu Kemasan Mesin', 'utama', FALSE, 'A', 'Pcs', 60000, 'Rp40.000 - Rp90.000 / Pcs', 'fa-box'),
('WOD-003', 'Kayu', 'Kayu Bekas Proyek / Balok', 'utama', FALSE, 'B', 'Batang', 18000, 'Rp12.000 - Rp28.000 / Batang', 'fa-cubes'),
('WOD-004', 'Kayu', 'Serbuk Kayu Biomassa', 'utama', FALSE, 'B', 'Kg', 450, 'Rp300 - Rp700 / Kg', 'fa-wind'),
('WOD-005', 'Kayu', 'Potongan Kayu (Wood Chips)', 'utama', FALSE, 'B', 'Ton', 650000, 'Rp450.000 - Rp850.000 / Ton', 'fa-fire'),

-- --- 8. TEKSTIL (4 Sub-Kategori) ---
('TXT-001', 'Tekstil', 'Kain Perca / Majun Katun', 'utama', FALSE, 'A', 'Kg', 4800, 'Rp3.500 - Rp6.500 / Kg', 'fa-shirt'),
('TXT-002', 'Tekstil', 'Pakaian Bekas Industri', 'utama', FALSE, 'B', 'Kg', 3200, 'Rp2.200 - Rp4.500 / Kg', 'fa-vest'),
('TXT-003', 'Tekstil', 'Benang Sisa Gulungan', 'utama', FALSE, 'B', 'Kg', 6500, 'Rp4.500 - Rp8.500 / Kg', 'fa-scroll'),
('TXT-004', 'Tekstil', 'Karpet Bekas', 'utama', FALSE, 'C', 'M2', 15000, 'Rp10.000 - Rp25.000 / M2', 'fa-rug'),

-- --- 9. ELEKTRONIK (E-WASTE) (6 Sub-Kategori) ---
('ELC-001', 'Elektronik (E-Waste)', 'Laptop & Notebook Bekas', 'utama', FALSE, 'A', 'Unit', 150000, 'Rp80.000 - Rp350.000 / Unit', 'fa-laptop'),
('ELC-002', 'Elektronik (E-Waste)', 'HP & Smartphone Bekas', 'utama', FALSE, 'A', 'Unit', 45000, 'Rp25.000 - Rp90.000 / Unit', 'fa-mobile-screen'),
('ELC-003', 'Elektronik (E-Waste)', 'Papan Sirkuit PCB Komputer', 'utama', FALSE, 'Super', 'Kg', 48000, 'Rp35.000 - Rp85.000 / Kg', 'fa-microchip'),
('ELC-004', 'Elektronik (E-Waste)', 'Server & Rack Bekas', 'utama', FALSE, 'A', 'Unit', 450000, 'Rp250.000 - Rp850.000 / Unit', 'fa-server'),
('ELC-005', 'Elektronik (E-Waste)', 'Printer & Mesin Fotokopi', 'utama', FALSE, 'B', 'Unit', 85000, 'Rp50.000 - Rp150.000 / Unit', 'fa-print'),
('ELC-006', 'Elektronik (E-Waste)', 'Kabel Elektronik & Data', 'utama', FALSE, 'A', 'Kg', 28000, 'Rp20.000 - Rp45.000 / Kg', 'fa-network-wired'),

-- --- 10. BATERAI & AKI (4 Sub-Kategori) ---
('BAT-001', 'Baterai & Aki', 'Aki Kendaraan (Accu)', 'utama', FALSE, 'A', 'Kg', 14500, 'Rp12.000 - Rp18.000 / Kg', 'fa-car-battery'),
('BAT-002', 'Baterai & Aki', 'Baterai Lithium (Li-Ion)', 'utama', FALSE, 'A', 'Kg', 38000, 'Rp25.000 - Rp55.000 / Kg', 'fa-battery-full'),
('BAT-003', 'Baterai & Aki', 'UPS Battery Telecom', 'utama', FALSE, 'A', 'Unit', 65000, 'Rp45.000 - Rp95.000 / Unit', 'fa-tower-cell'),
('BAT-004', 'Baterai & Aki', 'Baterai Industri Forklift', 'utama', FALSE, 'A', 'Unit', 850000, 'Rp500.000 - Rp1.500.000 / Unit', 'fa-truck-ramp-box'),

-- --- 11. ORGANIK (5 Sub-Kategori) ---
('ORG-001', 'Organik', 'Sisa Makanan Restoran / Hotel', 'utama', FALSE, 'B', 'Kg', 600, 'Rp300 - Rp1.000 / Kg', 'fa-utensils'),
('ORG-002', 'Organik', 'Limbah Kebun & Ranting Cacah', 'utama', FALSE, 'B', 'Ton', 350000, 'Rp200.000 - Rp500.000 / Ton', 'fa-leaf'),
('ORG-003', 'Organik', 'Sekam Padi', 'utama', FALSE, 'A', 'Karung', 12000, 'Rp8.000 - Rp16.000 / Karung', 'fa-wheat-awn'),
('ORG-004', 'Organik', 'Ampas Kopi Olahan', 'utama', FALSE, 'A', 'Kg', 1200, 'Rp800 - Rp2.000 / Kg', 'fa-mug-hot'),
('ORG-005', 'Organik', 'Ampas Tebu (Bagasse)', 'utama', FALSE, 'A', 'Ton', 420000, 'Rp300.000 - Rp600.000 / Ton', 'fa-seedling'),

-- --- 12. KEMASAN INDUSTRI BEKAS (5 Sub-Kategori) ---
('PKG-001', 'Kemasan Industri Bekas', 'Drum Besi 200L', 'utama', FALSE, 'A', 'Pcs', 95000, 'Rp75.000 - Rp135.000 / Pcs', 'fa-drum'),
('PKG-002', 'Kemasan Industri Bekas', 'Drum Plastik HDPE 200L', 'utama', FALSE, 'A', 'Pcs', 85000, 'Rp65.000 - Rp120.000 / Pcs', 'fa-box-archive'),
('PKG-003', 'Kemasan Industri Bekas', 'IBC Tank 1000L', 'utama', FALSE, 'A', 'Pcs', 420000, 'Rp350.000 - Rp750.000 / Pcs', 'fa-boxes-stacked'),
('PKG-004', 'Kemasan Industri Bekas', 'Jerigen Plastik 20L - 30L', 'utama', FALSE, 'A', 'Pcs', 16500, 'Rp12.000 - Rp22.000 / Pcs', 'fa-jug-detergent'),
('PKG-005', 'Kemasan Industri Bekas', 'Karung Jumbo (FIBC 1 Ton)', 'utama', FALSE, 'A', 'Pcs', 35000, 'Rp25.000 - Rp55.000 / Pcs', 'fa-boxes-packing'),

-- --- 13. KHUSUS INDUSTRI B2B: SCRAP PRODUKSI (4 Sub-Kategori) ---
('IND-001', 'Scrap Produksi', 'Reject Molding Plastik', 'industri', FALSE, 'A', 'Kg', 8500, 'Rp6.500 - Rp12.000 / Kg', 'fa-industry'),
('IND-002', 'Scrap Produksi', 'Runner Plastik Injeksi', 'industri', FALSE, 'A', 'Kg', 9200, 'Rp7.000 - Rp13.500 / Kg', 'fa-screwdriver-wrench'),
('IND-003', 'Scrap Produksi', 'Scrap Stamping Logam', 'industri', FALSE, 'A', 'Kg', 8200, 'Rp6.500 - Rp11.000 / Kg', 'fa-stamp'),
('IND-004', 'Scrap Produksi', 'Sisa Material Pabrik', 'industri', FALSE, 'A', 'Kg', 7800, 'Rp5.500 - Rp10.500 / Kg', 'fa-gears'),

-- --- 14. KHUSUS INDUSTRI B2B: MATERIAL RECOVERY (4 Sub-Kategori) ---
('REC-001', 'Material Recovery', 'Katalis Bekas (Spent Catalyst)', 'industri', FALSE, 'Super', 'Kg', 42000, 'Rp25.000 - Rp65.000 / Kg', 'fa-flask'),
('REC-002', 'Material Recovery', 'Resin Penukar Ion Bekas', 'industri', FALSE, 'B', 'Kg', 18000, 'Rp12.000 - Rp28.000 / Kg', 'fa-vial'),
('REC-003', 'Material Recovery', 'Karbon Aktif Bekas', 'industri', FALSE, 'B', 'Kg', 12000, 'Rp8.000 - Rp18.000 / Kg', 'fa-filter'),
('REC-004', 'Material Recovery', 'Filter Industri Bekas', 'industri', FALSE, 'B', 'Pcs', 25000, 'Rp15.000 - Rp45.000 / Pcs', 'fa-fan'),

-- --- 15. KHUSUS INDUSTRI B2B: LIMBAH KONSTRUKSI (5 Sub-Kategori) ---
('CST-001', 'Limbah Konstruksi', 'Beton Bongkaran Gedung', 'industri', FALSE, 'B', 'Ton', 95000, 'Rp70.000 - Rp130.000 / Ton', 'fa-trowel-bricks'),
('CST-002', 'Limbah Konstruksi', 'Aspal Bekas Kupasan (RAP)', 'industri', FALSE, 'B', 'Ton', 110000, 'Rp80.000 - Rp150.000 / Ton', 'fa-road'),
('CST-003', 'Limbah Konstruksi', 'Puing Bata & Hebel', 'industri', FALSE, 'C', 'Truk', 450000, 'Rp350.000 - Rp650.000 / Truk', 'fa-building-crack'),
('CST-004', 'Limbah Konstruksi', 'Gypsum Board Bekas', 'industri', FALSE, 'C', 'M2', 8500, 'Rp5.000 - Rp14.000 / M2', 'fa-square'),
('CST-005', 'Limbah Konstruksi', 'Besi Tulangan Proyek', 'industri', FALSE, 'A', 'Kg', 6800, 'Rp5.500 - Rp8.000 / Kg', 'fa-bars'),

-- --- 16. LIMBAH B3 (IZIN KHUSUS KLHK) (7 Sub-Kategori) ---
('B3-001', 'Limbah B3 (Izin Khusus)', 'Oli Pelumas Bekas (Limbah B3)', 'b3', TRUE, 'B3', 'Liter', 3800, 'Sesuai Izin KLHK', 'fa-biohazard'),
('B3-002', 'Limbah B3 (Izin Khusus)', 'Filter Oli Bekas (Limbah B3)', 'b3', TRUE, 'B3', 'Pcs', 2500, 'Sesuai Izin KLHK', 'fa-filter'),
('B3-003', 'Limbah B3 (Izin Khusus)', 'Sludge IPAL / Minyak Industri', 'b3', TRUE, 'B3', 'Ton', 850000, 'Sesuai Izin KLHK', 'fa-triangle-exclamation'),
('B3-004', 'Limbah B3 (Izin Khusus)', 'Solvent Bekas / Thinner', 'b3', TRUE, 'B3', 'Drum', 180000, 'Sesuai Izin KLHK', 'fa-flask-vial'),
('B3-005', 'Limbah B3 (Izin Khusus)', 'Aki Bekas Asam Sulfat', 'b3', TRUE, 'B3', 'Kg', 12500, 'Sesuai Izin KLHK', 'fa-car-battery'),
('B3-006', 'Limbah B3 (Izin Khusus)', 'Lampu Neon TL Bekas Merkuri', 'b3', TRUE, 'B3', 'Pcs', 1500, 'Sesuai Izin KLHK', 'fa-lightbulb'),
('B3-007', 'Limbah B3 (Izin Khusus)', 'Bahan Kimia Kedaluwarsa', 'b3', TRUE, 'B3', 'Kg', 5500, 'Sesuai Izin KLHK', 'fa-skull-crossbones');
