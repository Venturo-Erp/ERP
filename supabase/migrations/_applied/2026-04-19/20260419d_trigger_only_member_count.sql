-- ================================================================
-- Migration: 把 recalculate_order_totals 改成「只動 member_count」
-- ================================================================
-- Applied: 2026-04-19
-- Author: William (@Venturo-Erp)
--
-- 背景：
--   前一個 migration (20260419c) 的 recalculate_order_totals 函式
--   會同時更新 member_count 和 total_amount。
--
--   但 William 指出 SSOT 原則：
--     - 售價的真相來源應該是「報價單」(quotes)
--     - order.total_amount 應該是衍生值、從 quote 推算
--     - 不該由 order 自己計算 total_amount
--
-- 修正：
--   函式改成只更新 member_count。
--   total_amount / remaining_amount 暫時不動、等未來 Quote-based pricing 完成再處理。
--
-- 影響：
--   ✅ 不動任何 row、只重定義 function
--   ✅ Trigger 不用動（掛的還是同一個 function）
-- ================================================================

CREATE OR REPLACE FUNCTION public.recalculate_order_totals(p_order_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_count integer;
BEGIN
  -- 確認 order 存在（被刪除就靜靜跳過）
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RETURN;
  END IF;

  -- 算人數
  SELECT COUNT(*)::integer INTO v_member_count
  FROM public.order_members
  WHERE order_id = p_order_id;

  -- 只更新 member_count（total_amount 由未來 Quote-based 邏輯處理）
  UPDATE public.orders
  SET member_count = v_member_count,
      updated_at = now()
  WHERE id = p_order_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_order_totals(text) IS
  '重算 order.member_count（依 order_members 實際筆數）。total_amount 不動、由報價單 SSOT 流程負責。';

-- 驗證
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'recalculate_order_totals'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION '❌ 函式更新後不存在';
  END IF;
  RAISE NOTICE '✅ recalculate_order_totals 改成只動 member_count';
END $$;
