#!/usr/bin/env node
/**
 * 填充 workspace 資料工具
 * 修復已經執行過但未記錄的 migration
 */

import https from 'https'

const SUPABASE_ACCESS_TOKEN = 'sbp_94746ae5e9ecc9d270d27006ba5ed1d0da0bbaf0'
const PROJECT_REF = 'pfqvdacxowpgfamuvnsn'

async function executeSQL(sql, description = 'SQL') {
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

    const postData = JSON.stringify({ query: sql })

    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ ${description}`)
          resolve({ success: true, data })
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

async function main() {
  console.log('🔄 填充 _migrations 記錄...\n')

  const migrations = ['20251119085637_add_updated_by_to_todos.sql']

  for (const migration of migrations) {
    try {
      await executeSQL(
        `INSERT INTO public._migrations (name) VALUES ('${migration}') ON CONFLICT (name) DO NOTHING;`,
        `記錄: ${migration}`
      )
    } catch (error) {
      console.error(`❌ ${migration}:`, error.message)
    }
  }

  console.log('\n✅ 完成！')
}

main().catch(console.error)
