-- ================================================================
-- Migration: payment_request_items 金額自動同步 + 保護
-- ================================================================
-- Applied: 2026-04-20
--
-- 目的：
--   目前 items.subtotal 和 parent.amount 都靠 JS 算、沒 DB 保護。
--   Corner 現在資料一致（22 items / 7 parent 都對）、但若 JS 有 bug 或直接改 DB 會壞。
--
-- 加三層保護：
--   1. subtotal 自動 = quantity × unitprice（防止手改 subtotal 但沒同步）
--   2. 變動時自動算 parent.amount = SUM(subtotals)
--   3. 父表 confirmed/billed/paid 時、items 全鎖（繞不過去）
--
-- 跟請款單 lock trigger (20260419f) 搭配：
--   - 父鎖：amount/supplier/tour/type 不能改
--   - 子鎖：items 不能 insert/update/delete
--   → 父子都鎖、確認後真的改不動
-- ================================================================


-- ========== Trigger 1：自動算 subtotal ==========
CREATE OR REPLACE FUNCTION public.auto_compute_request_item_subtotal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- subtotal = quantity × unitprice（如果有資料）
  IF NEW.quantity IS NOT NULL AND NEW.unitprice IS NOT NULL THEN
    NEW.subtotal := NEW.quantity * NEW.unitprice;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_request_items_compute_subtotal ON public.payment_request_items;
CREATE TRIGGER payment_request_items_compute_subtotal
  BEFORE INSERT OR UPDATE ON public.payment_request_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_compute_request_item_subtotal();


-- ========== Trigger 2：lock items when parent is confirmed/billed/paid ==========
CREATE OR REPLACE FUNCTION public.enforce_payment_request_items_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_status text;
  v_request_id uuid;
BEGIN
  -- 取決於事件：OLD 或 NEW 的 request_id
  IF TG_OP = 'DELETE' THEN
    v_request_id := OLD.request_id;
  ELSE
    v_request_id := NEW.request_id;
  END IF;

  IF v_request_id IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  SELECT status INTO v_parent_status
  FROM public.payment_requests
  WHERE id = v_request_id;

  IF v_parent_status IN ('confirmed', 'billed', 'paid') THEN
    RAISE EXCEPTION
      '請款單 status=% 後不可修改明細（items）。請先解除確認。',
      v_parent_status;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS payment_request_items_enforce_lock ON public.payment_request_items;
CREATE TRIGGER payment_request_items_enforce_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.payment_request_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_request_items_lock();


-- ========== Trigger 3：cascade sum → parent.amount ==========
CREATE OR REPLACE FUNCTION public.cascade_items_to_parent_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- 跳 RLS 以便 update parent
AS $$
DECLARE
  v_request_id uuid;
  v_new_amount numeric;
BEGIN
  -- 決定是哪個 parent
  IF TG_OP = 'DELETE' THEN
    v_request_id := OLD.request_id;
  ELSE
    v_request_id := NEW.request_id;
  END IF;

  IF v_request_id IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- 重算 parent.amount
  SELECT COALESCE(SUM(COALESCE(subtotal, 0)), 0)
  INTO v_new_amount
  FROM public.payment_request_items
  WHERE request_id = v_request_id;

  -- 只在 parent 還是 pending 時 update（否則被 lock trigger 擋、反而拋 exception）
  UPDATE public.payment_requests
  SET amount = v_new_amount,
      updated_at = now()
  WHERE id = v_request_id
    AND status = 'pending';

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS payment_request_items_cascade_amount ON public.payment_request_items;
CREATE TRIGGER payment_request_items_cascade_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_request_items
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_items_to_parent_amount();


-- ========== 驗證 ==========
DO $$
DECLARE
  t1 boolean; t2 boolean; t3 boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'payment_request_items_compute_subtotal') INTO t1;
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'payment_request_items_enforce_lock') INTO t2;
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'payment_request_items_cascade_amount') INTO t3;

  IF NOT (t1 AND t2 AND t3) THEN
    RAISE EXCEPTION '❌ trigger 缺：subtotal=% lock=% cascade=%', t1, t2, t3;
  END IF;

  RAISE NOTICE '✅ payment_request_items 三 trigger 建立完成';
END $$;
