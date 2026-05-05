-- ============================================================================
-- 2026-05-05 William 拍板：HR 大砍 — DB 表移除草稿
-- ============================================================================
-- 範圍：DROP 不再使用的 HR 表（出勤/請假/加班/補打卡）
-- 風險：紅線 #0 — DROP TABLE 有資料的表、不可逆
-- 須由 William 審核資料殘留後再決定 apply
--
-- ⚠️ 保留（不要砍）：
--   - payslips         → /payslip 頁面用
--   - payroll_runs     → payslips 的父表（FK CASCADE、砍 runs 會連動砍 payslips）
--   - attendance_records 的 clock-in 寫入路徑：/api/hr/clock-in 還在跑（dashboard widget）
--     ⚠️ 如果保留 clock-in widget、attendance_records 也要保留
--     如果 clock-in widget 也廢、再 DROP attendance_records
--
-- 安全 DROP（無 FK 連動、純孤兒）：
-- ============================================================================

BEGIN;

-- 請假系統（leave_requests → leave_balances → leave_types 串）
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.leave_balances CASCADE;
DROP TABLE IF EXISTS public.leave_types CASCADE;

-- 加班 / 補打卡審核
DROP TABLE IF EXISTS public.overtime_requests CASCADE;
DROP TABLE IF EXISTS public.missed_clock_requests CASCADE;

-- ⚠️ 以下要 William 二次確認、再決定要不要 DROP：
-- DROP TABLE IF EXISTS public.attendance_records CASCADE;  -- 看 clock-in widget 命運

COMMIT;

-- ============================================================================
-- Capability + workspace_features 清理（純加減資料、不刪表）
-- ============================================================================

-- 砍 HR 子模組 capability codes
DELETE FROM public.role_capabilities
WHERE capability_code IN (
  'hr.attendance.read', 'hr.attendance.write',
  'hr.leave.read', 'hr.leave.write',
  'hr.overtime.read', 'hr.overtime.write',
  'hr.missed-clock.read', 'hr.missed-clock.write',
  'hr.payroll.read', 'hr.payroll.write',
  'hr.reports.read', 'hr.reports.write'
);

-- 砍 capability registry（如果有獨立表）
DELETE FROM public.capabilities
WHERE code IN (
  'hr.attendance.read', 'hr.attendance.write',
  'hr.leave.read', 'hr.leave.write',
  'hr.overtime.read', 'hr.overtime.write',
  'hr.missed-clock.read', 'hr.missed-clock.write',
  'hr.payroll.read', 'hr.payroll.write',
  'hr.reports.read', 'hr.reports.write'
);

-- 砍 workspace_features
DELETE FROM public.workspace_features
WHERE feature_code IN ('hr.attendance', 'hr.leave', 'hr.payroll');

-- 砍 features registry
DELETE FROM public.features
WHERE code IN ('hr.attendance', 'hr.leave', 'hr.payroll');
