-- 客製化景點資料表
CREATE TABLE custom_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引：workspace + city 查詢
CREATE INDEX idx_custom_destinations_workspace_city 
  ON custom_destinations(workspace_id, city);

-- 索引：類別查詢
CREATE INDEX idx_custom_destinations_category 
  ON custom_destinations(category) WHERE category IS NOT NULL;

-- RLS 啟用
ALTER TABLE custom_destinations ENABLE ROW LEVEL SECURITY;

-- RLS 政策：只能存取自己 workspace 的資料
CREATE POLICY custom_destinations_workspace_isolation ON custom_destinations
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);

COMMENT ON TABLE custom_destinations IS '客製化景點資料（支援各城市）';
COMMENT ON COLUMN custom_destinations.city IS '城市名稱（例如：清邁）';
COMMENT ON COLUMN custom_destinations.category IS '景點類型：文化/美食/自然/購物';
COMMENT ON COLUMN custom_destinations.tags IS '標籤陣列：親子/浪漫/冒險';
