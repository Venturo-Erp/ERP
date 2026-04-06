const projectRef = 'pfqvdacxowpgfamuvnsn'
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'

const sql = `
-- 擴充 tour_requests 表
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS supplier_response JSONB;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS request_scope TEXT DEFAULT 'individual_item';
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS accepted_by UUID;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS rejected_by UUID;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS selected_tier INTEGER;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS line_group_id TEXT;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS line_group_name TEXT;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS covered_item_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS package_status TEXT;
`

console.log('🔄 Step 1: 擴充 tour_requests 表...\n')

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    console.error('❌ 失敗:', result)
    process.exit(1)
  }

  console.log('✅ tour_requests 表擴充完成！')
} catch (error) {
  console.error('❌ 執行失敗:', error.message)
  process.exit(1)
}
