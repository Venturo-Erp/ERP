-- ============================================================
-- RLS 模擬測試套件（2026-05-02）
--
-- 目的：邏輯驗證 RLS 修復後、跨 workspace 真的擋住
-- 方法：不切 role、用 SQL 模擬 auth.uid() 算 RLS function 結果
-- 跑法：透過 Management API POST、看每個 SECTION 結果
-- ============================================================

-- TEST 1: is_super_admin() 對每個 active user 的預期結果
-- 預期：admin role employees → true、其他 → false
SELECT
  '=== TEST 1: is_super_admin() expected ===' AS section,
  w.code AS workspace,
  e.display_name,
  wr.name AS role,
  wr.is_admin AS role_is_admin,
  EXISTS (
    SELECT 1 FROM employees e2
    JOIN workspace_roles wr2 ON wr2.id = e2.role_id
    WHERE e2.user_id = e.user_id
      AND wr2.is_admin = true
      AND e2.status = 'active'
  ) AS expected_is_super_admin
FROM employees e
LEFT JOIN workspaces w ON w.id = e.workspace_id
LEFT JOIN workspace_roles wr ON wr.id = e.role_id
WHERE e.user_id IS NOT NULL AND e.status = 'active'
ORDER BY w.code, wr.is_admin DESC NULLS LAST;
