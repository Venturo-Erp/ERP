#!/usr/bin/env node
/**
 * RLS 安全檢測腳本（簡化版）
 * 檢測日期：2026-04-04
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 載入環境變數
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

// 核心表清單
const coreTables = ['workspace_job_roles', 'employees', 'role_tab_permissions', 'workspace_tasks']

async function checkRLS() {
  console.log('# RLS 安全檢測報告')
  console.log(`檢測時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`)
  console.log('')

  const results = {
    tables: [],
    issues: [],
    summary: {
      total: 0,
      withRLS: 0,
      withoutRLS: 0,
      missingPolicies: 0,
    },
  }

  // 檢查每個核心表
  for (const tableName of coreTables) {
    console.log(`## 檢測：${tableName}`)

    try {
      // 測試查詢（檢查表是否存在且可訪問）
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  表不存在`)
          results.tables.push({
            name: tableName,
            exists: false,
            rls: null,
            policies: [],
          })
        } else {
          console.log(`❌ 查詢錯誤：${error.message}`)
          results.issues.push({
            table: tableName,
            severity: 'high',
            issue: `查詢失敗：${error.message}`,
          })
        }
      } else {
        console.log(`✅ 表存在，記錄數：${count || 0}`)

        // 嘗試查詢其他租戶資料（RLS 測試）
        const testWorkspaceId = '00000000-0000-0000-0000-000000000000'
        const { data: testData, error: testError } = await supabase
          .from(tableName)
          .select('workspace_id')
          .eq('workspace_id', testWorkspaceId)
          .limit(1)

        results.tables.push({
          name: tableName,
          exists: true,
          rls: testError ? 'likely-enabled' : 'unknown',
          recordCount: count || 0,
        })
      }
    } catch (err) {
      console.log(`❌ 異常：${err.message}`)
      results.issues.push({
        table: tableName,
        severity: 'high',
        issue: `異常：${err.message}`,
      })
    }

    console.log('')
  }

  // 輸出摘要
  console.log('## 📊 檢測摘要')
  console.log(`- 檢測表數：${coreTables.length}`)
  console.log(`- 存在的表：${results.tables.filter(t => t.exists).length}`)
  console.log(`- 發現問題：${results.issues.length} 個`)
  console.log('')

  if (results.issues.length > 0) {
    console.log('## ⚠️ 發現的問題')
    results.issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.table}`)
      console.log(`   ${issue.issue}`)
    })
    console.log('')
  }

  // 輸出 JSON 結果供後續分析
  console.log('## 完整結果（JSON）')
  console.log(JSON.stringify(results, null, 2))
}

checkRLS().catch(err => {
  console.error('❌ 檢測失敗：', err)
  process.exit(1)
})
