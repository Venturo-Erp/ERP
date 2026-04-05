-- =============================================
-- RLS 完整狀態查詢
-- 請在 Supabase SQL Editor 執行
-- =============================================

-- 1. 列出所有有 workspace_id 的表
SELECT 
    t.table_name,
    t.table_schema,
    pg_tables.rowsecurity as rls_enabled
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
LEFT JOIN pg_tables 
    ON pg_tables.tablename = t.table_name
    AND pg_tables.schemaname = t.table_schema
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

-- 3. 列出核心表的所有 RLS policies
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

-- 4. 檢查 role_tab_permissions 的 FK 關聯（推斷隔離方式）
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'role_tab_permissions';

-- 5. 檢查 employees 表結構（確認欄位）
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name IN ('workspace_id', 'user_id', 'id')
ORDER BY ordinal_position;

-- 6. 檢查 workspace_tasks 表結構
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'workspace_tasks'
ORDER BY ordinal_position;

-- 7. 統計：所有表的 RLS 啟用狀態
SELECT 
    CASE WHEN rowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_status,
    COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY rowsecurity;

-- 8. 列出所有沒啟用 RLS 且有 workspace_id 的表（高風險）
SELECT DISTINCT
    t.tablename,
    'HIGH RISK' as risk_level,
    'Has workspace_id but RLS disabled' as reason
FROM pg_tables t
JOIN information_schema.columns c 
    ON t.tablename = c.table_name 
WHERE t.schemaname = 'public'
    AND c.column_name = 'workspace_id'
    AND t.rowsecurity = false
ORDER BY t.tablename;
