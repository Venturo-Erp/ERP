-- ================================================================
-- Migration: order_members 變動時自動重算 order.member_count + total_amount
-- ================================================================
-- Applied: 2026-04-19
-- Author: William (@Venturo-Erp)
--
-- 目的：
--   目前 order.member_count 只在 JavaScript 端的 recalculateOrderAmount()
--   被呼叫時才會更新。如果某個 handler 漏呼叫（e.g. passport 上傳、批量匯入）、
--   人數就不同步。
--
-- 解法：
--   在 order_members INSERT/UPDATE/DELETE 加 trigger、自動重算：
--     member_count = COUNT(order_members WHERE order_id = X)
--     total_amount = member_count × tour.selling_price_per_person
--     remaining_amount = total_amount - paid_amount
--
-- 影響：
--   ✅ 不動任何 row、只加 function + trigger
--   ✅ 未來 order_members 變動才觸發
--   ⚠️ 現有資料的 member_count 可能跟實際不符（舊 bug 造成）
--      → 這個 migration 不 backfill、backfill 另開 step 做 dry-run
-- ================================================================

-- ========== 1. 重算函式 ==========
CREATE OR REPLACE FUNCTION public.recalculate_order_totals(p_order_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_count integer;
  v_selling_price numeric;
  v_paid_amount numeric;
  v_tour_id text;
  v_total numeric;
BEGIN
  -- 取 order 當前狀態 + tour 售價
  SELECT o.tour_id, COALESCE(o.paid_amount, 0)
  INTO v_tour_id, v_paid_amount
  FROM public.orders o
  WHERE o.id = p_order_id;

  -- 若訂單已被刪除、安靜跳過
  IF v_tour_id IS NULL THEN
    RETURN;
  END IF;

  -- 算人數
  SELECT COUNT(*)::integer INTO v_member_count
  FROM public.order_members
  WHERE order_id = p_order_id;

  -- 取 tour 售價（null 視為 0）
  SELECT COALESCE(selling_price_per_person, 0)
  INTO v_selling_price
  FROM public.tours
  WHERE id = v_tour_id;

  v_total := v_member_count * v_selling_price;

  -- 更新
  UPDATE public.orders
  SET member_count = v_member_count,
      total_amount = v_total,
      remaining_amount = v_total - v_paid_amount,
      updated_at = now()
  WHERE id = p_order_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_order_totals(text) IS
  '重算 order 的 member_count、total_amount、remaining_amount。由 order_members trigger 呼叫。';


-- ========== 2. Trigger 函式（橋接 order_members 事件 → 重算）==========
CREATE OR REPLACE FUNCTION public.trigger_recalc_order_on_member_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_order_totals(OLD.order_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 常見情況：order_id 沒變、只算 NEW
    PERFORM public.recalculate_order_totals(NEW.order_id);
    -- 罕見：member 換 order（搬移）、兩邊都要算
    IF OLD.order_id IS DISTINCT FROM NEW.order_id THEN
      PERFORM public.recalculate_order_totals(OLD.order_id);
    END IF;
    RETURN NEW;
  ELSE  -- INSERT
    PERFORM public.recalculate_order_totals(NEW.order_id);
    RETURN NEW;
  END IF;
END;
$$;


-- ========== 3. 掛 trigger 到 order_members ==========
DROP TRIGGER IF EXISTS order_members_recalc_order ON public.order_members;
CREATE TRIGGER order_members_recalc_order
  AFTER INSERT OR UPDATE OR DELETE ON public.order_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_order_on_member_change();


-- ========== 4. 驗證 ==========
DO $$
DECLARE
  trigger_exists boolean;
  function_exists boolean;
BEGIN
  -- 驗 trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'order_members_recalc_order'
      AND tgrelid = 'public.order_members'::regclass
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION '❌ trigger 未建立';
  END IF;

  -- 驗函式
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'recalculate_order_totals'
      AND pronamespace = 'public'::regnamespace
  ) INTO function_exists;

  IF NOT function_exists THEN
    RAISE EXCEPTION '❌ recalculate_order_totals 函式未建立';
  END IF;

  RAISE NOTICE '✅ Trigger + function 建立完成';
  RAISE NOTICE '   下一次 order_members INSERT/UPDATE/DELETE 會自動重算 order';
END $$;
