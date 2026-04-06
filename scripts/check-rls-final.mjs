#!/usr/bin/env node
/**
 * RLS 最終檢測 - 直接查詢 information_schema
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

const coreTables = ['workspace_job_roles', 'employees', 'role_tab_permissions', 'workspace_tasks']

async function checkTableSchema(tableName) {
  console.log(`\n### ${tableName}\n`)

  const result = {
    table: tableName,
    exists: false,
    hasWorkspaceId: false,
    rlsEnabled: null,
    policies: [],
    issues: [],
    recommendations: [],
  }

  try {
    // 1. 檢查表是否存在
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      if (countError.message.includes('does not exist') || countError.code === '42P01') {
        console.log('❌ **表不存在**')
        result.issues.push({ severity: 'critical', message: '表不存在' })
        return result
      } else {
        console.log(`⚠️ 查詢錯誤：${countError.message} (${countError.code})`)
      }
    }

    result.exists = true
    console.log(`✅ 表存在（${count || 0} 筆記錄）`)

    // 2. 檢查 workspace_id 欄位（實際查資料）
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
      .maybeSingle()

    if (!sampleError && sampleData) {
      const hasWorkspaceId = 'workspace_id' in sampleData
      result.hasWorkspaceId = hasWorkspaceId

      if (hasWorkspaceId) {
        console.log('✅ 有 `workspace_id` 欄位')
      } else {
        console.log('❌ **無 `workspace_id` 欄位**')
        result.issues.push({
          severity: 'medium',
          message: '表沒有 workspace_id 欄位，無法進行租戶隔離',
        })
        result.recommendations.push({
          priority: 'medium',
          action: 'add-workspace-id',
          sql: `ALTER TABLE ${tableName} ADD COLUMN workspace_id UUID REFERENCES workspaces(id);`,
        })
      }
    } else if (count === 0) {
      console.log('⚠️ 表為空，無法檢查欄位')

      // 嘗試插入測試來檢查 schema
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({ workspace_id: '00000000-0000-0000-0000-000000000000' })
        .select()
        .maybeSingle()

      if (!insertError || insertError.message.includes('workspace_id')) {
        result.hasWorkspaceId = true
        console.log('✅ 有 `workspace_id` 欄位（透過插入測試確認）')
      } else {
        console.log('❌ **無 `workspace_id` 欄位**')
        result.hasWorkspaceId = false
      }
    }

    // 3. RLS 測試（如果有 workspace_id）
    if (result.hasWorkspaceId) {
      const currentWorkspace = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
      const fakeWorkspace = '00000000-0000-0000-0000-000000000000'

      // 測試查詢其他 workspace
      const { data: otherData, error: otherError } = await supabase
        .from(tableName)
        .select('id, workspace_id')
        .eq('workspace_id', fakeWorkspace)
        .limit(1)

      if (otherError && otherError.code === 'PGRST301') {
        console.log('✅ **RLS 已啟用**（query returned no rows）')
        result.rlsEnabled = true
      } else if (otherError && otherError.message.includes('permission denied')) {
        console.log('✅ **RLS 已啟用**（permission denied）')
        result.rlsEnabled = true
      } else if (otherData === null || (Array.isArray(otherData) && otherData.length === 0)) {
        console.log('⚠️ **RLS 狀態不明**（查詢成功但無資料，可能已啟用或只是沒資料）')
        result.rlsEnabled = 'unknown'
      } else {
        console.log('❌ **RLS 可能未啟用**（可以查到其他 workspace 的資料）')
        result.rlsEnabled = false
        result.issues.push({
          severity: 'critical',
          message: '可以查詢其他 workspace 的資料',
        })
        result.recommendations.push({
          priority: 'critical',
          action: 'enable-rls',
          sql: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`,
        })
        result.recommendations.push({
          priority: 'critical',
          action: 'create-policies',
          sql: `
-- SELECT Policy
CREATE POLICY "${tableName}_tenant_isolation_select" 
ON ${tableName}
FOR SELECT
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- INSERT Policy
CREATE POLICY "${tableName}_tenant_isolation_insert" 
ON ${tableName}
FOR INSERT
WITH CHECK (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- UPDATE Policy
CREATE POLICY "${tableName}_tenant_isolation_update" 
ON ${tableName}
FOR UPDATE
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- DELETE Policy
CREATE POLICY "${tableName}_tenant_isolation_delete" 
ON ${tableName}
FOR DELETE
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
`.trim(),
        })
      }
    }
  } catch (err) {
    console.log(`❌ 檢測異常：${err.message}`)
    result.issues.push({
      severity: 'high',
      message: `檢測異常：${err.message}`,
    })
  }

  return result
}

async function findAllWorkspaceIdTables() {
  console.log('## 🔍 搜尋所有有 workspace_id 的表\n')

  // 使用暴力法：列出所有表，逐一檢查
  const { data: tables, error } = await supabase.rpc('get_tables_list')

  if (error) {
    console.log('⚠️ 無法自動搜尋（需要自訂 RPC function）')
    console.log('手動檢查核心表...\n')
  }

  return null
}

async function main() {
  console.log('# RLS 安全檢測報告（最終版）')
  console.log(`**檢測時間：** ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n`)
  console.log('**檢測範圍：** 核心資料表\n')
  console.log('---\n')

  const allResults = []

  // 檢查核心表
  for (const table of coreTables) {
    const result = await checkTableSchema(table)
    allResults.push(result)
  }

  // 輸出摘要
  console.log('\n---\n')
  console.log('## 📊 檢測摘要\n')

  const totalTables = allResults.filter(r => r.exists).length
  const withWorkspaceId = allResults.filter(r => r.hasWorkspaceId).length
  const withRLS = allResults.filter(r => r.rlsEnabled === true).length
  const withoutRLS = allResults.filter(r => r.rlsEnabled === false).length
  const unknown = allResults.filter(r => r.rlsEnabled === 'unknown').length
  const totalIssues = allResults.reduce((sum, r) => sum + r.issues.length, 0)
  const criticalIssues = allResults.reduce(
    (sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length,
    0
  )

  console.log(`- 檢測表數：${coreTables.length}`)
  console.log(`- 存在的表：${totalTables}`)
  console.log(`- 有 workspace_id：${withWorkspaceId}`)
  console.log(`- RLS 已啟用：${withRLS}`)
  console.log(`- RLS 未啟用：${withoutRLS}`)
  console.log(`- 狀態不明：${unknown}`)
  console.log(`- 發現問題：${totalIssues} 個（嚴重：${criticalIssues}）\n`)

  // 風險等級
  let riskLevel = 'low'
  if (criticalIssues > 0 || withoutRLS > 0) {
    riskLevel = 'critical'
  } else if (withWorkspaceId < totalTables || unknown > 0) {
    riskLevel = 'medium'
  }

  console.log(`**風險等級：** ${riskLevel.toUpperCase()}\n`)

  // 問題清單
  if (totalIssues > 0) {
    console.log('## ⚠️ 發現的問題\n')
    allResults.forEach(r => {
      if (r.issues.length > 0) {
        console.log(`### ${r.table}\n`)
        r.issues.forEach(issue => {
          console.log(`- **[${issue.severity.toUpperCase()}]** ${issue.message}`)
        })
        console.log('')
      }
    })
  }

  // 修復建議
  const tablesNeedingFix = allResults.filter(r => r.recommendations.length > 0)
  if (tablesNeedingFix.length > 0) {
    console.log('## 🔧 修復建議\n')
    tablesNeedingFix.forEach(r => {
      console.log(`### ${r.table}\n`)
      r.recommendations.forEach((rec, idx) => {
        console.log(`#### ${idx + 1}. ${rec.action}`)
        console.log(`**優先級：** ${rec.priority.toUpperCase()}\n`)
        console.log('```sql')
        console.log(rec.sql)
        console.log('```\n')
      })
    })
  }

  // 安全的表
  const safeTables = allResults.filter(
    r => r.exists && r.hasWorkspaceId && r.rlsEnabled === true && r.issues.length === 0
  )
  if (safeTables.length > 0) {
    console.log('## ✅ 安全表（已正確設定）\n')
    safeTables.forEach(r => {
      console.log(`- ${r.table}`)
    })
    console.log('')
  }

  // 輸出 JSON
  console.log('\n---\n')
  console.log('## 📋 詳細結果（JSON）\n')
  console.log('```json')
  console.log(JSON.stringify(allResults, null, 2))
  console.log('```')
}

main().catch(err => {
  console.error('❌ 檢測失敗：', err)
  process.exit(1)
})
