#!/usr/bin/env node
/**
 * 檢查所有表格的 created_by 和 updated_by 欄位
 */

import https from 'https'

const SUPABASE_ACCESS_TOKEN = 'sbp_94746ae5e9ecc9d270d27006ba5ed1d0da0bbaf0'
const PROJECT_REF = 'pfqvdacxowpgfamuvnsn'

// 前端代碼中使用 updated_by 的表格
const TABLES_TO_CHECK = [
  'todos',
  'calendar_events',
  'confirmations',
  'contracts',
  'customers',
  'esims',
  'itineraries',
  'orders',
  'payment_requests',
  'pnrs',
  'quotes',
  'receipts',
  'suppliers',
  'tours',
]

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(JSON.stringify({ query: sql }))
    req.end()
  })
}

async function checkTable(tableName) {
  const sql = `
    SELECT
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
      AND column_name IN ('created_by', 'updated_by')
    ORDER BY column_name;
  `

  try {
    const result = await executeSQL(sql)
    return {
      table: tableName,
      columns: result,
      hasCreatedBy: result.some(col => col.column_name === 'created_by'),
      hasUpdatedBy: result.some(col => col.column_name === 'updated_by'),
    }
  } catch (error) {
    return {
      table: tableName,
      error: error.message,
      columns: [],
      hasCreatedBy: false,
      hasUpdatedBy: false,
    }
  }
}

async function main() {
  console.log('🔍 檢查所有表格的 created_by 和 updated_by 欄位\n')
  console.log('='.repeat(70))

  const results = []

  for (const table of TABLES_TO_CHECK) {
    const result = await checkTable(table)
    results.push(result)
  }

  // 分類顯示
  const complete = results.filter(r => r.hasCreatedBy && r.hasUpdatedBy)
  const partial = results.filter(
    r => (r.hasCreatedBy || r.hasUpdatedBy) && !(r.hasCreatedBy && r.hasUpdatedBy)
  )
  const missing = results.filter(r => !r.hasCreatedBy && !r.hasUpdatedBy && !r.error)
  const errors = results.filter(r => r.error)

  console.log(`\n✅ 完整（有 created_by 和 updated_by）: ${complete.length} 個`)
  complete.forEach(r => {
    console.log(`  ✓ ${r.table}`)
  })

  if (partial.length > 0) {
    console.log(`\n⚠️  部分缺失: ${partial.length} 個`)
    partial.forEach(r => {
      const missing = []
      if (!r.hasCreatedBy) missing.push('created_by')
      if (!r.hasUpdatedBy) missing.push('updated_by')
      console.log(`  • ${r.table} - 缺少: ${missing.join(', ')}`)
    })
  }

  if (missing.length > 0) {
    console.log(`\n❌ 完全缺失: ${missing.length} 個`)
    missing.forEach(r => {
      console.log(`  ✗ ${r.table} - 缺少 created_by 和 updated_by`)
    })
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  錯誤: ${errors.length} 個`)
    errors.forEach(r => {
      console.log(`  ! ${r.table} - ${r.error}`)
    })
  }

  console.log('\n' + '='.repeat(70))
  console.log(`\n總計檢查: ${results.length} 個表格`)
  console.log(`✅ 完整: ${complete.length}`)
  console.log(`⚠️  部分: ${partial.length}`)
  console.log(`❌ 缺失: ${missing.length}`)
  console.log(`⚠️  錯誤: ${errors.length}`)

  // 返回需要修復的表格列表
  const needFix = [...partial, ...missing]
  if (needFix.length > 0) {
    console.log(`\n🔧 需要修復的表格 (${needFix.length} 個):`)
    needFix.forEach(r => {
      const missingFields = []
      if (!r.hasCreatedBy) missingFields.push('created_by')
      if (!r.hasUpdatedBy) missingFields.push('updated_by')
      console.log(`  • ${r.table}: ${missingFields.join(', ')}`)
    })
  } else {
    console.log('\n🎉 所有表格都已完整！')
  }

  process.exit(needFix.length > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('❌ 執行錯誤:', error.message)
  process.exit(1)
})
