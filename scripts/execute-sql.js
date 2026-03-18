#!/usr/bin/env node
/**
 * 執行 SQL 腳本到 Supabase
 * 使用方式: node scripts/execute-sql.js scripts/clear-test-data.sql
 */

const fs = require('fs')
const https = require('https')

const PROJECT_REF = 'pfqvdacxowpgfamuvnsn'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!ACCESS_TOKEN) {
  console.error('❌ 錯誤：請設定 SUPABASE_ACCESS_TOKEN 環境變數')
  console.error('   export SUPABASE_ACCESS_TOKEN="your-token-here"')
  process.exit(1)
}

// 讀取 SQL 檔案
const sqlFile = process.argv[2] || 'scripts/clear-test-data.sql'
const sqlContent = fs.readFileSync(sqlFile, 'utf8')

console.log(`📄 讀取 SQL 檔案: ${sqlFile}`)
console.log(`🔗 連接 Supabase 專案: ${PROJECT_REF}\n`)

// Supabase Management API - Execute SQL
const data = JSON.stringify({
  query: sqlContent,
})

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
}

const req = https.request(options, res => {
  let responseData = ''

  res.on('data', chunk => {
    responseData += chunk
  })

  res.on('end', () => {
    console.log(`📡 HTTP Status: ${res.statusCode}\n`)

    if (res.statusCode === 200 || res.statusCode === 201) {
      try {
        const result = JSON.parse(responseData)
        console.log('✅ SQL 執行成功！\n')

        if (result.result && result.result.length > 0) {
          console.log('📊 執行結果:\n')
          console.table(result.result)
        } else if (Array.isArray(result) && result.length > 0) {
          console.log('📊 執行結果:\n')
          console.table(result)
        } else {
          console.log('執行完成（無回傳資料）')
        }
      } catch (e) {
        console.log('執行完成')
        console.log('回應:', responseData)
      }
    } else {
      console.error('❌ 執行失敗\n')
      console.error('錯誤訊息:', responseData)
    }
  })
})

req.on('error', error => {
  console.error('❌ 連線錯誤:', error.message)
})

req.write(data)
req.end()
