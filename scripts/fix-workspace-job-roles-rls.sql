-- 直接在 Supabase SQL Editor 執行此檔案
-- 修復 workspace_job_roles RLS Policy
-- 問題：原 Policy 使用 USING (true)，無租戶隔離

-- 1. 刪除現有的寬鬆 policy
DROP POLICY IF EXISTS "workspace_job_roles_all" ON workspace_job_roles;

-- 2. SELECT Policy
CREATE POLICY "workspace_job_roles_tenant_select" 
ON workspace_job_roles
FOR SELECT
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 3. INSERT Policy
CREATE POLICY "workspace_job_roles_tenant_insert" 
ON workspace_job_roles
FOR INSERT
WITH CHECK (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 4. UPDATE Policy
CREATE POLICY "workspace_job_roles_tenant_update" 
ON workspace_job_roles
FOR UPDATE
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 5. DELETE Policy
CREATE POLICY "workspace_job_roles_tenant_delete" 
ON workspace_job_roles
FOR DELETE
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 驗證
SELECT 
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'workspace_job_roles'
ORDER BY policyname;
