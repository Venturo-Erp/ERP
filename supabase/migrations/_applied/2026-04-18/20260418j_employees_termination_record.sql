-- ================================================================
-- Migration J: 員工離職紀錄欄位
-- ================================================================
-- Applied: 2026-04-18
--
-- Goal:
--   離職流程要有紀錄（誰在何時讓誰離職）
--   移除硬刪除、只留離職（soft delete、保留歷史資料）
--
-- Risk: 🟢 LOW（純新增 nullable 欄位、不動任何現有 row）
-- ================================================================


ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terminated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.employees.terminated_at IS '離職生效時間';
COMMENT ON COLUMN public.employees.terminated_by IS '執行離職動作的管理員 employee.id';


-- ============ Reload schema ============

NOTIFY pgrst, 'reload schema';
