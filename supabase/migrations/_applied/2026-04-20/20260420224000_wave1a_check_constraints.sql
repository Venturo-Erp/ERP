-- ============================================================
-- Wave 1a: CHECK constraints (防呆規則、純新增、零風險、idempotent)
-- 依據：VENTURO_ROUTE_AUDIT/00-SUMMARY.md Phase B
-- 策略：NOT VALID，不檢查既有資料、只擋未來寫入
--       以 pg_constraint 查存在性、重跑安全
-- ============================================================

DO $$
BEGIN
  -- quote_type 值域：standard / quick
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotes_quote_type_check'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_quote_type_check
      CHECK (quote_type IN ('standard', 'quick')) NOT VALID;
  END IF;

  -- tour_type 值域：template / official / proposal
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tours_tour_type_check'
  ) THEN
    ALTER TABLE public.tours
      ADD CONSTRAINT tours_tour_type_check
      CHECK (tour_type IN ('template', 'official', 'proposal')) NOT VALID;
  END IF;

  -- travel_invoices.items 必為 jsonb array（0 列、安全）
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'travel_invoices_items_array_check'
  ) THEN
    ALTER TABLE public.travel_invoices
      ADD CONSTRAINT travel_invoices_items_array_check
      CHECK (items IS NULL OR jsonb_typeof(items) = 'array') NOT VALID;
  END IF;

  -- travel_invoices.buyer_info 必為 jsonb object
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'travel_invoices_buyer_info_object_check'
  ) THEN
    ALTER TABLE public.travel_invoices
      ADD CONSTRAINT travel_invoices_buyer_info_object_check
      CHECK (buyer_info IS NULL OR jsonb_typeof(buyer_info) = 'object') NOT VALID;
  END IF;
END $$;
