#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// 讀取環境變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 建立 Supabase client（使用 service role key 才能執行 DDL）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔧 開始修復 workspace_job_roles RLS...\n')

// SQL 腳本
const sql = `
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
`

try {
  // 執行 SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql })

  if (error) {
    console.error('❌ 執行失敗：', error)
    process.exit(1)
  }

  console.log('✅ RLS Policy 修復成功！\n')

  // 驗證
  console.log('🔍 驗證新的 policies...\n')
  const { data: policies, error: verifyError } = await supabase
    .from('pg_policies')
    .select('tablename, policyname, cmd, qual')
    .eq('tablename', 'workspace_job_roles')

  if (verifyError) {
    console.error('⚠️ 驗證失敗：', verifyError)
  } else {
    console.log('📋 當前 policies：')
    console.table(policies)
  }
} catch (err) {
  console.error('❌ 錯誤：', err)
  process.exit(1)
}
