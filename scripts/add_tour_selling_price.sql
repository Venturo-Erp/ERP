-- Add selling price per person to tours table
-- 為價格鏈實作：報價 → 團售價 → 訂單售價 → 團員分攤

ALTER TABLE tours 
ADD COLUMN selling_price_per_person NUMERIC;

COMMENT ON COLUMN tours.selling_price_per_person IS '每人售價（從報價單帶入）';