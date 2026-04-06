import { readFileSync } from 'fs'

const projectRef = 'pfqvdacxowpgfamuvnsn'
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'

const migrationSQL = readFileSync(
  'supabase/migrations/20260318_extend_tour_requests_for_local_quotes.sql',
  'utf-8'
)

console.log('🔄 執行 migration via Supabase Management API...\n')

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: migrationSQL,
      }),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    console.error('❌ Migration 失敗:', result)
    process.exit(1)
  }

  console.log('✅ Migration 執行成功！\n')

  // 驗證
  console.log('🔍 驗證新增的欄位...\n')

  const verifyResponse = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tour_requests' 
          AND column_name IN ('supplier_response', 'request_scope', 'accepted_at', 'rejected_at', 'selected_tier', 'package_status')
        ORDER BY column_name;
      `,
      }),
    }
  )

  const verifyResult = await verifyResponse.json()

  if (verifyResult.result) {
    console.log('新增的欄位：')
    verifyResult.result.forEach(row => console.log('  -', row.column_name))
  }

  // 驗證新表
  const tableResponse = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `SELECT table_name FROM information_schema.tables WHERE table_name = 'tour_request_items';`,
      }),
    }
  )

  const tableResult = await tableResponse.json()

  if (tableResult.result && tableResult.result.length > 0) {
    console.log('\n✅ tour_request_items 表已建立')
  }

  console.log('\n🎉 所有 migration 執行完成！')
} catch (error) {
  console.error('❌ 執行失敗:', error.message)
  process.exit(1)
}
