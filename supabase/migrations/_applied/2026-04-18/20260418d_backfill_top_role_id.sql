-- ================================================================
-- Migration D: Backfill employees.role_id from job_info.role_id
-- ================================================================
-- Context: DB 有雙軌 role_id（頂層 + job_info jsonb 裡）
--          UI 寫 job_info.role_id、hook 查頂層 → 不一致 → Carson 看不見
-- Decided by William「徹底研究、不必要的移除」
--
-- 策略：
--   Phase 1（本 migration）: 只補頂層、不刪 nested（保留 backup）
--   Phase 2（code 改完、驗證穩）: 再刪 nested（separate migration）
--
-- Risk: 🟢 LOW
--   - 只 UPDATE 頂層 role_id（WHERE role_id IS NULL、不覆蓋現有）
--   - 不刪欄位、不動 jsonb
--   - 既有頂層有值的員工不受影響
-- ================================================================


-- ============ Step 1: Backfill 頂層 role_id ============

UPDATE public.employees
SET role_id = (job_info->>'role_id')::uuid
WHERE role_id IS NULL
  AND job_info IS NOT NULL
  AND job_info ? 'role_id'
  AND job_info->>'role_id' != ''
  AND EXISTS (
    SELECT 1 FROM public.workspace_roles wr
    WHERE wr.id = (job_info->>'role_id')::uuid
  );


-- ============ Step 2: 驗證 ============

-- 應回傳 0 行（所有 job_info 有 role_id 的員工、頂層也有）
-- SELECT id, display_name, role_id, job_info->>'role_id' AS nested
-- FROM public.employees
-- WHERE role_id IS NULL
--   AND job_info IS NOT NULL
--   AND job_info ? 'role_id'
--   AND job_info->>'role_id' != '';

-- 應顯示 Carson / Jess 的頂層 role_id 已補上
-- SELECT display_name, role_id, job_info->>'role_id' AS nested
-- FROM public.employees
-- WHERE display_name IN ('Carson', 'Jess', 'William');


-- ============ Phase 2 （未來、code 改完才跑）============

-- UPDATE public.employees SET job_info = job_info - 'role_id';
-- -- 移除 jsonb 的 role_id key（保留 position, hire_date 等）
