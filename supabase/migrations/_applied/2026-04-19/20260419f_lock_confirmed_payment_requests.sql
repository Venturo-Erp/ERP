-- ================================================================
-- Migration: 鎖定 confirmed/billed/paid 狀態的請款單關鍵欄位
-- ================================================================
-- Applied: 2026-04-19
--
-- 目的：
--   Finance audit 發現 UI 鎖了 confirmed 請款單的編輯、但 API 層完全無檢查。
--   會寫程式的人可直接打 Supabase API 偷改金額 / 供應商 / 團、bypass 整個狀態機。
--
-- 解法：
--   BEFORE UPDATE trigger 在 DB 層強制：
--     當 OLD.status IN ('confirmed', 'billed', 'paid') 且關鍵欄位改動 → 拒絕
--
--   關鍵欄位：
--     - amount（金額）
--     - supplier_id（供應商）
--     - tour_id（團）
--     - request_type（類型）
--
--   允許改的：
--     - status 本身（轉換流程；解除確認要先 status → pending 再改其他）
--     - notes / paid_at / paid_by / approved_at / accounting_* (流程追蹤)
--     - updated_at / updated_by
--
-- 解除方式：
--   UI / API 要改金額 → 先把 status 改回 'pending' → 再改金額
--   （鎖 key fields 但不鎖 status 本身）
-- ================================================================

CREATE OR REPLACE FUNCTION public.enforce_payment_request_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 只在 OLD 是鎖定狀態時檢查
  IF OLD.status IN ('confirmed', 'billed', 'paid') THEN
    -- 檢查關鍵欄位有沒有動
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      RAISE EXCEPTION
        '請款單 status=% 後不可修改金額（% → %）。請先解除確認（status 改回 pending）再編輯。',
        OLD.status, OLD.amount, NEW.amount;
    END IF;

    IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
      RAISE EXCEPTION
        '請款單 status=% 後不可修改供應商。請先解除確認。',
        OLD.status;
    END IF;

    IF NEW.tour_id IS DISTINCT FROM OLD.tour_id THEN
      RAISE EXCEPTION
        '請款單 status=% 後不可修改團。請先解除確認。',
        OLD.status;
    END IF;

    IF NEW.request_type IS DISTINCT FROM OLD.request_type THEN
      RAISE EXCEPTION
        '請款單 status=% 後不可修改類型。請先解除確認。',
        OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_payment_request_lock() IS
  '鎖定 confirmed/billed/paid 請款單的金額/供應商/團/類型。解除需先改 status 回 pending。';


-- 掛 trigger
DROP TRIGGER IF EXISTS payment_requests_enforce_lock ON public.payment_requests;
CREATE TRIGGER payment_requests_enforce_lock
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_request_lock();


-- 驗證
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'payment_requests_enforce_lock'
  ) THEN
    RAISE EXCEPTION '❌ trigger 未建立';
  END IF;
  RAISE NOTICE '✅ 請款單鎖定 trigger 建立完成';
  RAISE NOTICE '   confirmed/billed/paid 後的請款單無法從任何層面偷改金額/供應商/團';
END $$;
