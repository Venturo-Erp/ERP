#!/usr/bin/env node
const https = require('https')
const fs = require('fs')
const path = require('path')

const TOKEN = 'sbp_653aa28afea3e6a714e2acc536eed313bc7b85a0'
const PROJECT_REF = 'pfqvdacxowpgfamuvnsn'
const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20260325_create_payment_methods.sql')

const sql = fs.readFileSync(MIGRATION_FILE, 'utf8')

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
}

const postData = JSON.stringify({ query: sql })

const req = https.request(options, res => {
  let data = ''
  res.on('data', chunk => { data += chunk })
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ payment_methods migration 執行成功')
      console.log('回應:', JSON.parse(data))
    } else {
      console.error(`❌ 執行失敗 (${res.statusCode})`)
      console.error('回應:', data)
    }
  })
})

req.on('error', error => {
  console.error('❌ 網路錯誤:', error.message)
})

req.write(postData)
req.end()
