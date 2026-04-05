#!/usr/bin/env node
/**
 * RLS Policy 詳細檢測
 * 使用 Supabase SQL Editor API
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

const coreTables = [
  'workspace_job_roles',
  'employees',
  'role_tab_permissions',
  'workspace_tasks'
];

async function queryDB(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) throw error;
    return data;
  } catch (err) {
    // exec_sql 可能不存在，嘗試直接用 postgres REST API
    return null;
  }
}

async function checkTableRLS(tableName) {
  console.log(`\n### ${tableName}`);
  console.log('');
  
  const result = {
    table: tableName,
    exists: false,
    rlsEnabled: null,
    policies: [],
    issues: [],
    recommendations: []
  };

  try {
    // 1. 檢查表是否存在
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError && countError.message.includes('does not exist')) {
      console.log('❌ **表不存在**');
      result.issues.push({ severity: 'critical', message: '表不存在' });
      return result;
    }

    result.exists = true;
    console.log(`✅ 表存在（${count || 0} 筆記錄）`);

    // 2. 嘗試查詢不同 workspace_id（RLS 測試）
    const currentWorkspace = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'; // Corner 的 workspace
    const fakeWorkspace = '00000000-0000-0000-0000-000000000000';

    // 查當前 workspace
    const { data: ownData, error: ownError } = await supabase
      .from(tableName)
      .select('workspace_id')
      .eq('workspace_id', currentWorkspace)
      .limit(1);

    // 嘗試查其他 workspace
    const { data: otherData, error: otherError } = await supabase
      .from(tableName)
      .select('workspace_id')
      .eq('workspace_id', fakeWorkspace)
      .limit(1);

    if (!ownError && ownData !== null) {
      console.log('✅ 可以查詢自己的 workspace 資料');
    }

    if (otherError) {
      console.log('✅ **RLS 已啟用**（無法查詢其他 workspace）');
      result.rlsEnabled = true;
    } else if (otherData && otherData.length === 0) {
      console.log('⚠️  **RLS 狀態不明**（查詢成功但無資料）');
      result.rlsEnabled = 'unknown';
    } else {
      console.log('❌ **RLS 可能未啟用或配置錯誤**（可查詢其他 workspace）');
      result.rlsEnabled = false;
      result.issues.push({
        severity: 'critical',
        message: '可以查詢其他 workspace 的資料，RLS 未正確啟用'
      });
    }

    // 3. 嘗試查詢 schema 檢查 RLS 設定
    console.log('');
    console.log('**Schema 檢查：**');
    
    // 檢查是否有 workspace_id 欄位
    const { data: columns } = await supabase
      .from('columns')
      .select('column_name')
      .eq('table_name', tableName)
      .eq('column_name', 'workspace_id')
      .maybeSingle();

    if (columns) {
      console.log('✅ 有 workspace_id 欄位');
    } else {
      console.log('⚠️  **無 workspace_id 欄位**（可能不需要 RLS）');
      result.issues.push({
        severity: 'low',
        message: '表沒有 workspace_id 欄位，可能不是多租戶表'
      });
    }

  } catch (err) {
    console.log(`❌ 檢測失敗：${err.message}`);
    result.issues.push({
      severity: 'high',
      message: `檢測異常：${err.message}`
    });
  }

  // 4. 生成建議
  if (result.rlsEnabled === false) {
    result.recommendations.push({
      priority: 'high',
      action: 'enable-rls',
      sql: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`
    });
    result.recommendations.push({
      priority: 'high',
      action: 'create-select-policy',
      sql: `
CREATE POLICY "${tableName}_tenant_isolation_select" 
ON ${tableName}
FOR SELECT
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
  )
);`.trim()
    });
  }

  return result;
}

async function main() {
  console.log('# RLS Security Audit Report');
  console.log(`**檢測時間：** ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
  console.log('');

  const allResults = [];

  for (const table of coreTables) {
    const result = await checkTableRLS(table);
    allResults.push(result);
  }

  // 輸出摘要
  console.log('\n---\n');
  console.log('## 📊 檢測摘要');
  console.log('');
  
  const totalTables = allResults.filter(r => r.exists).length;
  const withRLS = allResults.filter(r => r.rlsEnabled === true).length;
  const withoutRLS = allResults.filter(r => r.rlsEnabled === false).length;
  const unknown = allResults.filter(r => r.rlsEnabled === 'unknown').length;
  const totalIssues = allResults.reduce((sum, r) => sum + r.issues.length, 0);

  console.log(`- 檢測表數：${coreTables.length}`);
  console.log(`- 存在的表：${totalTables}`);
  console.log(`- RLS 已啟用：${withRLS}`);
  console.log(`- RLS 未啟用：${withoutRLS}`);
  console.log(`- 狀態不明：${unknown}`);
  console.log(`- 發現問題：${totalIssues} 個`);
  console.log('');

  // 風險等級
  let riskLevel = 'low';
  if (withoutRLS > 0) riskLevel = 'critical';
  else if (unknown > 0) riskLevel = 'medium';
  
  console.log(`**風險等級：** ${riskLevel.toUpperCase()}`);
  console.log('');

  // 問題清單
  if (totalIssues > 0) {
    console.log('## ⚠️ 發現的問題\n');
    allResults.forEach(r => {
      if (r.issues.length > 0) {
        console.log(`### ${r.table}`);
        r.issues.forEach(issue => {
          console.log(`- [${issue.severity.toUpperCase()}] ${issue.message}`);
        });
        console.log('');
      }
    });
  }

  // 修復建議
  const tablesNeedingFix = allResults.filter(r => r.recommendations.length > 0);
  if (tablesNeedingFix.length > 0) {
    console.log('## 🔧 修復建議\n');
    tablesNeedingFix.forEach(r => {
      console.log(`### ${r.table}`);
      r.recommendations.forEach(rec => {
        console.log(`**優先級：** ${rec.priority.toUpperCase()}`);
        console.log(`**動作：** ${rec.action}`);
        console.log('```sql');
        console.log(rec.sql);
        console.log('```');
        console.log('');
      });
    });
  }

  // 輸出 JSON
  console.log('\n## 📋 完整結果（JSON）\n');
  console.log('```json');
  console.log(JSON.stringify(allResults, null, 2));
  console.log('```');
}

main().catch(err => {
  console.error('❌ 檢測失敗：', err);
  process.exit(1);
});
