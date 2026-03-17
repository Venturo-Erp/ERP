-- 修復 files 表 INSERT RLS policy
-- 問題：目前 INSERT 沒有限制，任何人都可以插入
-- 修復：限制只能插入自己 workspace 的檔案

-- 刪除現有 INSERT policy
DROP POLICY IF EXISTS files_insert ON files;

-- 建立新的 INSERT policy（workspace 限制）
CREATE POLICY files_insert ON files
  FOR INSERT
  WITH CHECK (
    is_super_admin() OR (workspace_id)::text = (get_current_user_workspace())::text
  );

-- 確認所有 policies
SELECT 
  policyname, 
  cmd, 
  roles,
  CASE 
    WHEN qual IS NULL THEN 'NO CHECK'
    ELSE qual::text
  END as condition
FROM pg_policies 
WHERE tablename = 'files'
ORDER BY cmd;
