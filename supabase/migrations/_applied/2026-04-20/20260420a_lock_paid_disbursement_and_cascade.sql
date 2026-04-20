-- ================================================================
-- Migration: 鎖定 paid 出納單 + 自動同步下游請款單
-- ================================================================
-- Applied: 2026-04-20
--
-- 背景：
--   William 說明業務流：
--     1. 請款單 pending → 勾進出納單 → confirmed（鎖）
--     2. 出納單 pending → 按「確認出帳」→ paid
--     3. paid 後：生命週期結束、線下已出帳不能回朔
--
--   現況：
--     - 請款單鎖 (20260419f) 已處理 confirmed/billed 不可改 key fields ✓
--     - 出納單 paid 後 DB 無任何保護 ✗
--     - 狀態同步 (paid → billed) 全在 JS、中斷會半同步 ✗
--
-- 解法：
--   Trigger A：disbursement_orders BEFORE UPDATE
--     OLD.status = 'paid' → 任何 UPDATE 都拒絕（生命週期結束）
--
--   Trigger B：disbursement_orders AFTER UPDATE
--     status 從非 paid → paid → 自動把 payment_request_ids 的請款單 status → billed
--
-- 驗證資料：
--   Corner 2 筆出納單：
--     - DO260319-001 paid（已停 trigger A 保護、不會再動）
--     - DO260401-001 pending（4 筆請款單 confirmed、等確認出帳觸發 trigger B）
-- ================================================================


-- ========== Trigger A：鎖定 paid 出納單 ==========
CREATE OR REPLACE FUNCTION public.enforce_disbursement_order_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- paid 狀態後生命週期結束、不允許任何 UPDATE
  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION
      '出納單 % 已確認出帳（paid）、生命週期結束、無法修改任何欄位。線下會計已入帳、系統不允許回朔。',
      OLD.code;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_disbursement_order_lock() IS
  '鎖定 paid 狀態的出納單。業務規則：確認出帳後不可再動、線下已入帳不能回朔。';

DROP TRIGGER IF EXISTS disbursement_orders_enforce_lock ON public.disbursement_orders;
CREATE TRIGGER disbursement_orders_enforce_lock
  BEFORE UPDATE ON public.disbursement_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_disbursement_order_lock();


-- ========== Trigger B：paid → 下游請款單自動 billed ==========
CREATE OR REPLACE FUNCTION public.cascade_disbursement_paid_to_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- 用函式擁有者權限跳過 RLS、才能 update 請款單
AS $$
BEGIN
  -- 只在 status 從非 paid → paid 時觸發
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM 'paid'
     AND NEW.status = 'paid'
     AND NEW.payment_request_ids IS NOT NULL
  THEN
    UPDATE public.payment_requests
    SET status = 'billed',
        updated_at = now()
    WHERE id = ANY(NEW.payment_request_ids)
      AND status = 'confirmed';  -- 只升級 confirmed 的、其他狀態不動（保險）
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.cascade_disbursement_paid_to_requests() IS
  '出納單 → paid 時、自動把關聯請款單從 confirmed → billed。取代 JS 端迴圈、防半同步。';

DROP TRIGGER IF EXISTS disbursement_orders_cascade_to_requests ON public.disbursement_orders;
CREATE TRIGGER disbursement_orders_cascade_to_requests
  AFTER UPDATE ON public.disbursement_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_disbursement_paid_to_requests();


-- ========== 驗證 ==========
DO $$
DECLARE
  a_exists boolean;
  b_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'disbursement_orders_enforce_lock'
  ) INTO a_exists;
  IF NOT a_exists THEN RAISE EXCEPTION '❌ Trigger A 未建立'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'disbursement_orders_cascade_to_requests'
  ) INTO b_exists;
  IF NOT b_exists THEN RAISE EXCEPTION '❌ Trigger B 未建立'; END IF;

  RAISE NOTICE '✅ 出納單 paid 鎖定 + 下游同步 trigger 建立完成';
END $$;
