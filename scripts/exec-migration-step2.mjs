const projectRef = 'pfqvdacxowpgfamuvnsn'
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'

const sql = `
CREATE TABLE IF NOT EXISTS tour_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  request_id UUID NOT NULL REFERENCES tour_requests(id) ON DELETE CASCADE,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  
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
  updated_by UUID,
  
  CONSTRAINT tour_request_items_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS tour_request_items_request_id_idx ON tour_request_items(request_id);
CREATE INDEX IF NOT EXISTS tour_request_items_tour_id_idx ON tour_request_items(tour_id);
CREATE INDEX IF NOT EXISTS tour_request_items_workspace_id_idx ON tour_request_items(workspace_id);
CREATE INDEX IF NOT EXISTS tour_request_items_day_number_idx ON tour_request_items(day_number);
CREATE INDEX IF NOT EXISTS tour_request_items_local_status_idx ON tour_request_items(local_status);
`

console.log('🔄 Step 2: 建立 tour_request_items 表...\n')

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

  console.log('✅ tour_request_items 表建立完成！')
} catch (error) {
  console.error('❌ 執行失敗:', error.message)
  process.exit(1)
}
