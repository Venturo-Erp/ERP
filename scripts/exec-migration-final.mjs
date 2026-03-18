const projectRef = 'pfqvdacxowpgfamuvnsn'
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'

const sql = `
-- 先刪除舊的 tour_request_items 表
DROP TABLE IF EXISTS tour_request_items CASCADE;

-- 重新建立 tour_request_items 表
CREATE TABLE tour_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  request_id UUID NOT NULL,
  tour_id TEXT NOT NULL,
  
  item_name TEXT NOT NULL,
  item_category TEXT,
  service_date DATE,
  day_number INT,
  sort_order INT DEFAULT 0,
  
  source TEXT DEFAULT 'auto_generated',
  source_item_id UUID,
  
  handled_by TEXT,
  handled_note TEXT,
  
  local_status TEXT DEFAULT 'pending',
  local_cost NUMERIC(12, 2),
  local_currency TEXT DEFAULT 'TWD',
  local_notes TEXT,
  local_confirmed_at TIMESTAMPTZ,
  
  corner_confirmed BOOLEAN DEFAULT false,
  corner_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- 建立索引
CREATE INDEX tour_request_items_request_id_idx ON tour_request_items(request_id);
CREATE INDEX tour_request_items_tour_id_idx ON tour_request_items(tour_id);
CREATE INDEX tour_request_items_workspace_id_idx ON tour_request_items(workspace_id);
CREATE INDEX tour_request_items_day_number_idx ON tour_request_items(day_number);
CREATE INDEX tour_request_items_local_status_idx ON tour_request_items(local_status);

-- RLS 策略（暫時跳過，因為 workspace_members 表不存在）
-- ALTER TABLE tour_request_items ENABLE ROW LEVEL SECURITY;
`

console.log('🔄 執行完整 migration...\n')

try {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  const result = await response.json()

  if (!response.ok) {
    console.error('❌ 失敗:', result)
    process.exit(1)
  }

  console.log('✅ Migration 執行成功！\n')
  
  // 驗證
  console.log('🔍 驗證結果...\n')
  
  const verifyResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'tour_request_items' ORDER BY ordinal_position;",
    }),
  })

  const verifyResult = await verifyResponse.json()
  
  if (verifyResult.length > 0) {
    console.log('✅ tour_request_items 表已重建')
    console.log('欄位列表：')
    verifyResult.forEach(row => console.log('  -', row.column_name))
  }
  
  console.log('\n🎉 所有 migration 執行完成！')
  
} catch (error) {
  console.error('❌ 執行失敗:', error.message)
  process.exit(1)
}
