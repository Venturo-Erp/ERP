-- ================================================================
-- Migration C: Rollback capability flags → Use role_tab_permissions only
-- ================================================================
-- Blueprint: docs/blueprints/16-hr-roles.md (ADR-R5 updated 2026-04-18)
-- Decided by William「職務管理頁、勾幾個能力點、勾了就出現在下拉」
--
-- 架構改變：
--   之前: employees.is_salesperson / ... (capability flags on employee)
--   現在: role_tab_permissions 多幾個 tab (tours.as_sales / ...)
--   差別: 改職務權限、該職務所有人自動跟著變（不用逐員工勾）
--
-- Risk: 🟢 LOW
--   - DROP 的 5 個欄位都剛建（~30 分內）、全預設 false、無員工勾過
--   - 純撤回
-- ================================================================


-- ============ Step 1: Drop capability flag indexes ============

DROP INDEX IF EXISTS public.idx_employees_is_salesperson;
DROP INDEX IF EXISTS public.idx_employees_is_tour_controller;
DROP INDEX IF EXISTS public.idx_employees_is_tour_leader;
DROP INDEX IF EXISTS public.idx_employees_is_tour_guide;
DROP INDEX IF EXISTS public.idx_employees_is_accountant;


-- ============ Step 2: Drop capability flag columns ============

ALTER TABLE public.employees DROP COLUMN IF EXISTS is_salesperson;
ALTER TABLE public.employees DROP COLUMN IF EXISTS is_tour_controller;
ALTER TABLE public.employees DROP COLUMN IF EXISTS is_tour_leader;
ALTER TABLE public.employees DROP COLUMN IF EXISTS is_tour_guide;
ALTER TABLE public.employees DROP COLUMN IF EXISTS is_accountant;


-- ============ Step 3: Reload schema cache ============

NOTIFY pgrst, 'reload schema';


-- ============ 驗證（apply 後跑）============

-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='employees' AND column_name LIKE 'is_%';
-- 預期: 只看到 is_active, is_bot 這些原本的、沒有 is_salesperson/tour_*
