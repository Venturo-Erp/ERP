-- ================================================================
-- 擴充 tour_requests 表以支援 Local 整包報價與協作確認單
-- 日期: 2026-03-18
-- 功能: 支援 Local 整包報價、比價、成交、協作確認
-- ================================================================

BEGIN;

-- ============================================================
-- 1. 擴充 tour_requests 表
-- ============================================================

-- 供應商報價內容（JSONB）
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS supplier_response JSONB;

-- 報價類型（整包 or 逐項）
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS request_scope TEXT DEFAULT 'individual_item';
-- 'full_package': 整包（Local 包團）
-- 'individual_item': 逐項（單獨供應商）

-- 成交狀態擴充
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS accepted_by UUID;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS rejected_by UUID;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 選定的人數梯次（成交時選擇）
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS selected_tier INTEGER;

-- LINE 群組資訊
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS line_group_id TEXT;
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS line_group_name TEXT;

-- 整包涵蓋的項目 IDs（從 tour_itinerary_items）
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS covered_item_ids JSONB DEFAULT '[]'::jsonb;

-- 整包狀態（用於追蹤 Local 的整體進度）
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS package_status TEXT;
-- 'quoted': 已報價
-- 'accepted': 已成交
-- 'in_progress': 進行中
-- 'completed': 已完成
-- 'rejected': 不成交

COMMENT ON COLUMN tour_requests.supplier_response IS 'Local 報價內容（JSONB）：contact, phone, tierPrices, singleRoomSupplement, tipNote, supplierNote';
COMMENT ON COLUMN tour_requests.request_scope IS '報價範圍：full_package(整包) 或 individual_item(逐項)';
COMMENT ON COLUMN tour_requests.selected_tier IS '成交時選擇的人數梯次（例如：20, 30, 40）';
COMMENT ON COLUMN tour_requests.covered_item_ids IS '整包涵蓋的 tour_itinerary_items ID 陣列';
COMMENT ON COLUMN tour_requests.package_status IS '整包狀態：quoted/accepted/in_progress/completed/rejected';

-- ============================================================
-- 2. 建立 tour_request_items 表（協作確認單）
-- ============================================================

CREATE TABLE IF NOT EXISTS tour_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  request_id UUID NOT NULL REFERENCES tour_requests(id) ON DELETE CASCADE,
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  
  -- 項目資訊
  item_name TEXT NOT NULL,
  item_category TEXT, -- 'transport', 'accommodation', 'meals', 'activities', etc.
  service_date DATE,
  day_number INT,
  sort_order INT DEFAULT 0,
  
  -- 來源（自動產生 or 手動新增）
  source TEXT DEFAULT 'auto_generated', -- 'auto_generated' | 'manual_corner' | 'manual_local'
  source_item_id UUID, -- 關聯到 tour_itinerary_items（如果是從核心表複製的）
  
  -- 處理方式（誰負責）
  handled_by TEXT, -- 'local' | 'corner' | 'customer'
  handled_note TEXT,
  
  -- Local 的進度與成本（只有 Local 可見）
  local_status TEXT DEFAULT 'pending', -- 'pending' | 'in_progress' | 'confirmed' | 'skipped'
  local_cost NUMERIC(12, 2),
  local_currency TEXT DEFAULT 'TWD',
  local_notes TEXT,
  local_confirmed_at TIMESTAMPTZ,
  
  -- 我們的標記
  corner_confirmed BOOLEAN DEFAULT false,
  corner_notes TEXT,
  
  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  
  CONSTRAINT tour_request_items_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS tour_request_items_request_id_idx ON tour_request_items(request_id);
CREATE INDEX IF NOT EXISTS tour_request_items_tour_id_idx ON tour_request_items(tour_id);
CREATE INDEX IF NOT EXISTS tour_request_items_workspace_id_idx ON tour_request_items(workspace_id);
CREATE INDEX IF NOT EXISTS tour_request_items_day_number_idx ON tour_request_items(day_number);
CREATE INDEX IF NOT EXISTS tour_request_items_local_status_idx ON tour_request_items(local_status);

COMMENT ON TABLE tour_request_items IS '協作確認單細項：Local 整包報價成交後的雙向協作追蹤';
COMMENT ON COLUMN tour_request_items.source IS '來源：auto_generated(從核心表) | manual_corner(我們追加) | manual_local(Local追加)';
COMMENT ON COLUMN tour_request_items.handled_by IS '處理方：local(Local處理) | corner(我們處理) | customer(客人自理)';
COMMENT ON COLUMN tour_request_items.local_status IS 'Local進度：pending(待處理) | in_progress(進行中) | confirmed(已完成) | skipped(不處理)';

-- ============================================================
-- 3. RLS 策略
-- ============================================================

-- tour_request_items: workspace 成員可讀寫
ALTER TABLE tour_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_request_items_workspace_read" ON tour_request_items;
CREATE POLICY "tour_request_items_workspace_read" ON tour_request_items
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tour_request_items_workspace_write" ON tour_request_items;
CREATE POLICY "tour_request_items_workspace_write" ON tour_request_items
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

COMMIT;
