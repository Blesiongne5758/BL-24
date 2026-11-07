-- Permit manual QRIS invoices that are not attached to an order (tier purchases).
-- Forward-only: after tier payment records exist, restoring order_id to NOT NULL is unsafe.
-- If rollback is required before any tier payment is recorded, drop idx_order_payment_tier_review,
-- drop tier_id, then change order_id back to NOT NULL.
ALTER TABLE order_payment_records
  MODIFY COLUMN order_id VARCHAR(64) NULL,
  ADD COLUMN tier_id VARCHAR(50) NULL AFTER payment_type;

CREATE INDEX idx_order_payment_tier_review
  ON order_payment_records (buyer_id, payment_type, tier_id, status);
