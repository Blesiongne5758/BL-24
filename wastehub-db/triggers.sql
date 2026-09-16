-- ====================================================================
-- WasteHub Triggers
-- 1. Otomatisasi Perhitungan DP 30% pada tabel orders
-- 2. Pembuatan record transaksi escrow otomatis
-- ====================================================================

-- Fungsi Perhitungan DP 30% Otomatis
CREATE OR REPLACE FUNCTION calculate_order_dp()
RETURNS TRIGGER AS $$
BEGIN
    -- DP default 30% dari total_amount jika belum diisi atau 0
    IF NEW.dp_amount IS NULL OR NEW.dp_amount = 0 THEN
        NEW.dp_amount := ROUND(NEW.total_amount * 0.30, 2);
    END IF;
    
    -- Biaya penanganan sistem Rp 10.000
    IF NEW.service_fee IS NULL THEN
        NEW.service_fee := 10000;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_dp ON orders;
CREATE TRIGGER trg_order_dp
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION calculate_order_dp();
