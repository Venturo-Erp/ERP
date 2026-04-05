#!/usr/bin/env node
/**
 * RLS 安全檢測腳本
 * 檢測日期：2026-04-04
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Query error:', error);
    return null;
  }
  return data;
}

async function checkRLS() {
  console.log('# RLS 安全檢測報告');
  console.log(`檢測時間：${new Date().toISOString()}`);
  console.log('');

  // 1. 列出所有有 workspace_id 的表
  console.log('## 1. 所有有 workspace_id 的表');
  const tablesQuery = `
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
  `;
  
  const tables = await runQuery(tablesQuery);
  console.log(JSON.stringify(tables, null, 2));
  console.log('');

  // 2. 檢查核心表的 RLS 狀態
  console.log('## 2. 核心表 RLS 狀態');
  const rlsStatusQuery = `
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
  `;
  
  const rlsStatus = await runQuery(rlsStatusQuery);
  console.log(JSON.stringify(rlsStatus, null, 2));
  console.log('');

  // 3. 列出所有 RLS policies
  console.log('## 3. RLS Policies（核心表）');
  const policiesQuery = `
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
  `;
  
  const policies = await runQuery(policiesQuery);
  console.log(JSON.stringify(policies, null, 2));
  console.log('');

  // 4. 列出有 workspace_id 但沒有 RLS 的表
  console.log('## 4. 有 workspace_id 但沒啟用 RLS 的表');
  const noRLSQuery = `
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
  `;
  
  const noRLS = await runQuery(noRLSQuery);
  console.log(JSON.stringify(noRLS, null, 2));
}

checkRLS().catch(console.error);
