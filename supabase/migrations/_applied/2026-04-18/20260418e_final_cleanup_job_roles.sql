-- ================================================================
-- Migration E: Final cleanup - Drop employee_job_roles + Remove nested role_id
-- ================================================================
-- Context: ADR-R2 Option A 的最終執行
--          + 清 job_info.role_id 雙軌（backfill 已 100% 同步）
--
-- Pre-flight 驗證（2026-04-18）：
--   ✅ employee_job_roles: 0 rows（空表、無資料損失）
--   ✅ 頂層 vs nested role_id: 0 inconsistent（100% 一致）
--   ✅ nested 有、頂層沒: 0（backfill 完成）
--
-- Risk: 🟢 LOW（資料實際 0 筆、結構改動）
-- ================================================================


-- ============ Step 1: Backup（留歷史紀錄即使空）============

CREATE SCHEMA IF NOT EXISTS _archive;

CREATE TABLE IF NOT EXISTS _archive.employee_job_roles_backup_20260418 AS
  SELECT * FROM public.employee_job_roles;

COMMENT ON TABLE _archive.employee_job_roles_backup_20260418 IS
  'Pre-drop backup, 0 rows at time of drop (2026-04-18)';


-- ============ Step 2: Drop employee_job_roles 表 ============
-- ADR-R2 Option A: 一人一職、不做多對多兼任

DROP TABLE public.employee_job_roles;


-- ============ Step 3: 移除 employees.job_info 的 role_id key ============
-- 雙軌清乾淨、只留頂層 employees.role_id
-- job_info 保留 position + hire_date

UPDATE public.employees
SET job_info = job_info - 'role_id'
WHERE job_info ? 'role_id';


-- ============ Step 4: Reload PostgREST schema ============

NOTIFY pgrst, 'reload schema';


-- ============ Verify（apply 後跑） ============

-- 1. employee_job_roles 應不存在
-- SELECT table_name FROM information_schema.tables WHERE table_name='employee_job_roles';
-- 預期: 0 rows

-- 2. job_info 應不含 role_id key
-- SELECT display_name, job_info FROM public.employees WHERE job_info ? 'role_id';
-- 預期: 0 rows

-- 3. 頂層 role_id 應保留
-- SELECT display_name, role_id FROM public.employees WHERE role_id IS NOT NULL;
-- 預期: 之前有值的員工仍有值
