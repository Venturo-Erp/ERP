-- RLS 安全檢測腳本
-- 檢測日期：2026-04-04

-- 1. 列出所有有 workspace_id 的表
SELECT 
    t.table_name,
    c.column_name,
    t.table_schema
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
    AND c.column_name = 'workspace_id'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- 2. 檢查核心表的 RLS 狀態
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'workspace_job_roles',
        'employees',
        'role_tab_permissions',
        'workspace_tasks'
    )
ORDER BY tablename;

-- 3. 列出所有 RLS policies（核心表）
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'workspace_job_roles',
        'employees',
        'role_tab_permissions',
        'workspace_tasks'
    )
ORDER BY tablename, policyname;

-- 4. 列出所有有 workspace_id 但沒有 RLS 的表
SELECT DISTINCT
    t.tablename,
    CASE WHEN t.rowsecurity THEN 'Enabled' ELSE 'DISABLED' END as rls_status
FROM pg_tables t
JOIN information_schema.columns c 
    ON t.tablename = c.table_name 
WHERE t.schemaname = 'public'
    AND c.column_name = 'workspace_id'
    AND t.rowsecurity = false
ORDER BY t.tablename;
