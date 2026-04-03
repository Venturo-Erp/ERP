-- 清邁景點選擇系統 - 資料表

BEGIN;

-- ============================================
-- 1. destinations 表（景點資料庫）
-- ============================================
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL DEFAULT '清邁',
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT,  -- 文化/自然/親子/浪漫/美食
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  tags TEXT[],
  image_url TEXT,
  priority INTEGER DEFAULT 50,  -- 1-20（必去）, 21-50（推薦）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_destinations_city ON public.destinations(city);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON public.destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_priority ON public.destinations(priority);

-- ============================================
-- 2. customer_destination_picks 表（客戶選擇記錄）
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_destination_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL,  -- LINE User ID
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  session_id TEXT,  -- 會話 ID（同一次選擇）
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_picks_line_user ON public.customer_destination_picks(line_user_id);
CREATE INDEX IF NOT EXISTS idx_picks_session ON public.customer_destination_picks(session_id);
CREATE INDEX IF NOT EXISTS idx_picks_destination ON public.customer_destination_picks(destination_id);

-- ============================================
-- 3. RLS 政策（暫時開放，內部工具）
-- ============================================
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_destination_picks ENABLE ROW LEVEL SECURITY;

-- destinations 全部可讀（客戶選擇時需要）
CREATE POLICY "destinations_public_read" ON public.destinations
  FOR SELECT USING (true);

-- picks 只能看自己的
CREATE POLICY "picks_user_read" ON public.customer_destination_picks
  FOR SELECT USING (true);  -- 暫時全開，後續可加限制

CREATE POLICY "picks_insert" ON public.customer_destination_picks
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. 觸發器：自動更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- ============================================
-- 註解
-- ============================================
COMMENT ON TABLE public.destinations IS '清邁景點資料庫（內部工具）';
COMMENT ON TABLE public.customer_destination_picks IS '客戶選擇景點記錄（從 LINE Bot）';
COMMENT ON COLUMN public.destinations.priority IS '1-20 必去景點，21-50 推薦景點';
COMMENT ON COLUMN public.customer_destination_picks.session_id IS '同一次選擇的會話 ID，用於分組';
