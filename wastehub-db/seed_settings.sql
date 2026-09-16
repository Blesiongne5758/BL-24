-- ====================================================================
-- WasteHub Seed Settings
-- Parameter Biaya Transaksi Escrow, DP 30%, dan Paket Langganan
-- ====================================================================

INSERT INTO system_settings (setting_key, setting_value) VALUES
('dp_percentage', '30'),
('service_fee', '10000'),
('app_fee', '5000'),
('shipping_flat_fee', '250000'),
('buyer_subscription_fee', '99000'),
('tier_starter_fee', '0'),
('tier_starter_max_price', '200000'),
('tier_pro_fee', '249000'),
('tier_pro_max_price', '50000000'),
('tier_enterprise_fee', '499000'),
('tier_enterprise_max_price', '0'),
('escrow_bank_name', 'Bank Central Asia (BCA)'),
('escrow_account_number', '8271-9920-1122'),
('escrow_account_holder', 'PT BURSA LIMBAH Transaksi Sirkular (Rekening Bersama Escrow)'),
('escrow_branch', 'KCP Sentra Bisnis Pulogadung, Jakarta'),
('contact_email', 'kemitraan@bursalimbah.id'),
('contact_phone', '+62 812-3456-7890'),
('platform_version', '3.2.0');
