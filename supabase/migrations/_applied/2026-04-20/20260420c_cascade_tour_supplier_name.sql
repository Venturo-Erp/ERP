-- ================================================================
-- Migration: tour_name / supplier_name 改名自動同步下游
-- ================================================================
-- Applied: 2026-04-20
--
-- 業務規則（William 確認）：
--   改團名 / 供應商名 → 下游同步更新
--   但：已 billed / paid 的歷史紀錄不動（生命週期結束、不回朔）
--
-- 快取欄位位置：
--   orders.tour_name
--   payment_requests.tour_name、tour_code
--   payment_requests.supplier_name
--   payment_request_items.supplier_name
--
-- 同步條件：
--   - orders：一律同步（無「死」概念）
--   - payment_requests：status NOT IN ('billed', 'paid')
--   - payment_request_items：透過 parent payment_requests 判斷、同上
--
-- 不改的：
--   - disbursement_orders：沒有 tour_name / supplier_name 欄位（用 FK）
-- ================================================================


-- ========== Trigger A：tours.name / code 改變 → cascade ==========
CREATE OR REPLACE FUNCTION public.cascade_tour_rename()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_name_changed boolean;
  v_code_changed boolean;
BEGIN
  v_name_changed := NEW.name IS DISTINCT FROM OLD.name;
  v_code_changed := NEW.code IS DISTINCT FROM OLD.code;

  IF NOT (v_name_changed OR v_code_changed) THEN
    RETURN NEW;
  END IF;

  -- 1. orders.tour_name 同步（無狀態限制）
  IF v_name_changed THEN
    UPDATE public.orders
    SET tour_name = NEW.name,
        updated_at = now()
    WHERE tour_id = NEW.id
      AND (tour_name IS DISTINCT FROM NEW.name);
  END IF;

  -- 2. payment_requests.tour_name / tour_code 同步（只改活的）
  IF v_name_changed THEN
    UPDATE public.payment_requests
    SET tour_name = NEW.name,
        updated_at = now()
    WHERE tour_id = NEW.id
      AND status NOT IN ('billed', 'paid')
      AND (tour_name IS DISTINCT FROM NEW.name);
  END IF;

  IF v_code_changed THEN
    UPDATE public.payment_requests
    SET tour_code = NEW.code,
        updated_at = now()
    WHERE tour_id = NEW.id
      AND status NOT IN ('billed', 'paid')
      AND (tour_code IS DISTINCT FROM NEW.code);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.cascade_tour_rename() IS
  'tours 改名 / 改碼 → 同步更新 orders + payment_requests 的 cache 欄位。已 billed/paid 的不動。';

DROP TRIGGER IF EXISTS tours_cascade_rename ON public.tours;
CREATE TRIGGER tours_cascade_rename
  AFTER UPDATE ON public.tours
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_tour_rename();


-- ========== Trigger B：suppliers.name 改變 → cascade ==========
-- 前提：suppliers 表存在。先驗證 suppliers schema 有 name 欄位
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'suppliers'
      AND column_name = 'name'
  ) THEN
    RAISE NOTICE '⚠️ suppliers 表或 name 欄位不存在、supplier cascade 不建';
    RETURN;
  END IF;
END $$;


CREATE OR REPLACE FUNCTION public.cascade_supplier_rename()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.name IS NOT DISTINCT FROM OLD.name THEN
    RETURN NEW;
  END IF;

  -- payment_requests.supplier_name（只改活的）
  UPDATE public.payment_requests
  SET supplier_name = NEW.name,
      updated_at = now()
  WHERE supplier_id = NEW.id::text
    AND status NOT IN ('billed', 'paid')
    AND (supplier_name IS DISTINCT FROM NEW.name);

  -- payment_request_items.supplier_name（parent 活的才更新）
  UPDATE public.payment_request_items i
  SET supplier_name = NEW.name,
      updated_at = now()
  FROM public.payment_requests p
  WHERE i.request_id = p.id
    AND i.supplier_id = NEW.id::text
    AND p.status NOT IN ('billed', 'paid')
    AND (i.supplier_name IS DISTINCT FROM NEW.name);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.cascade_supplier_rename() IS
  'suppliers 改名 → 同步 payment_requests + items 的 cache 欄位。已 billed/paid 不動。';

DROP TRIGGER IF EXISTS suppliers_cascade_rename ON public.suppliers;
CREATE TRIGGER suppliers_cascade_rename
  AFTER UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_supplier_rename();


-- ========== 驗證 ==========
DO $$
DECLARE
  t_tour boolean;
  t_supplier boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'tours_cascade_rename') INTO t_tour;
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'suppliers_cascade_rename') INTO t_supplier;

  IF NOT t_tour THEN RAISE EXCEPTION '❌ tour cascade trigger 未建立'; END IF;
  IF NOT t_supplier THEN RAISE EXCEPTION '❌ supplier cascade trigger 未建立'; END IF;

  RAISE NOTICE '✅ tour + supplier 改名 cascade trigger 建立完成';
END $$;
