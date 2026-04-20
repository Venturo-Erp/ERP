-- ================================================================
-- Migration: 財務三表欄位清理 + constraint
-- ================================================================
-- Applied: 2026-04-19
--
-- 目的：
--   1. 清掉 payment_requests.items (JSONB、0 筆在用、舊 schema 殘留)
--   2. disbursement_orders.status 加 NOT NULL + DEFAULT + CHECK
--
-- 不做的：
--   - payment_requests.total_amount 目前還有 1 個 SELECT 在用、先保留、
--     等 code 統一用 amount 之後再 drop（另一個 phase）
--
-- 驗證資料：
--   - payment_requests.items 全域 0 筆有資料（已驗證）
--   - disbursement_orders.status 真租戶 2 筆值都是 'pending' 或 'paid'、
--     加 NOT NULL + DEFAULT 不會破壞既有資料
-- ================================================================

-- ========== 1. Drop payment_requests.items ==========
ALTER TABLE public.payment_requests DROP COLUMN IF EXISTS items;


-- ========== 2. disbursement_orders.status 加固 ==========

-- 先補 default（既有 NULL 先變 'pending'、但現況 0 NULL、僅保險用）
UPDATE public.disbursement_orders SET status = 'pending' WHERE status IS NULL;

-- 加 NOT NULL
ALTER TABLE public.disbursement_orders
  ALTER COLUMN status SET NOT NULL;

-- 加 DEFAULT
ALTER TABLE public.disbursement_orders
  ALTER COLUMN status SET DEFAULT 'pending';

-- 加 CHECK（允許值：pending / paid / cancelled）
-- 註：既有值是 pending 和 paid、不會破壞
ALTER TABLE public.disbursement_orders
  ADD CONSTRAINT disbursement_orders_status_check
  CHECK (status IN ('pending', 'paid', 'cancelled'));


-- ========== 3. 驗證 ==========
DO $$
DECLARE
  items_col_exists boolean;
  status_not_null boolean;
  status_check_exists boolean;
BEGIN
  -- items 欄位已消失
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_requests' AND column_name = 'items'
  ) INTO items_col_exists;
  IF items_col_exists THEN
    RAISE EXCEPTION '❌ payment_requests.items 未刪除';
  END IF;

  -- disbursement_orders.status NOT NULL
  SELECT is_nullable = 'NO' INTO status_not_null
  FROM information_schema.columns
  WHERE table_name = 'disbursement_orders' AND column_name = 'status';
  IF NOT status_not_null THEN
    RAISE EXCEPTION '❌ disbursement_orders.status 仍為 NULL 允許';
  END IF;

  -- CHECK constraint 存在
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'disbursement_orders_status_check'
  ) INTO status_check_exists;
  IF NOT status_check_exists THEN
    RAISE EXCEPTION '❌ CHECK constraint 未建立';
  END IF;

  RAISE NOTICE '✅ 欄位清理完成';
END $$;
