#!/usr/bin/env node
const https = require('https')

const PROJECT_REF = 'pfqvdacxowpgfamuvnsn'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.ACCESS_TOKEN
if (!ACCESS_TOKEN && !SUPABASE_ACCESS_TOKEN) {
  console.error('❌ 請設定 SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

const sql = `
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
`

const data = JSON.stringify({ query: sql })

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
    if (res.statusCode === 200) {
      const result = JSON.parse(responseData)
      console.log('📊 資料庫現有的表：\n')
      result.result.forEach(row => console.log(`  - ${row.table_name}`))
    } else {
      console.error('錯誤:', responseData)
    }
  })
})

req.on('error', e => console.error('連線錯誤:', e.message))
req.write(data)
req.end()
