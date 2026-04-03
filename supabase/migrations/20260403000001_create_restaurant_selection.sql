-- 清邁餐廳選擇系統 - 資料表（並行開發）

BEGIN;

-- ============================================
-- 1. restaurants 表（餐廳資料庫）
-- ============================================
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL DEFAULT '清邁',
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT,  -- 泰式/中式/西式/日式/咖啡廳/甜點/酒吧
  cuisine_type TEXT,  -- 料理類型（更細分）
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  tags TEXT[],
  image_url TEXT,
  price_range TEXT,  -- 💰/💰💰/💰💰💰
  michelin_star INTEGER DEFAULT 0,  -- 米其林星等
  must_try_dish TEXT,  -- 必點菜色
  opening_hours JSONB,  -- 營業時間
  phone TEXT,
  address TEXT,
  google_maps_url TEXT,
  priority INTEGER DEFAULT 50,  -- 1-20（必吃）, 21-50（推薦）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON public.restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_priority ON public.restaurants(priority);
CREATE INDEX IF NOT EXISTS idx_restaurants_price_range ON public.restaurants(price_range);

-- ============================================
-- 2. customer_restaurant_picks 表（客戶選擇記錄）
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_restaurant_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_id TEXT,  -- 同一次選擇
  meal_type TEXT,  -- 早餐/午餐/晚餐/下午茶
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_restaurant_picks_line_user ON public.customer_restaurant_picks(line_user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_picks_session ON public.customer_restaurant_picks(session_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_picks_restaurant ON public.customer_restaurant_picks(restaurant_id);

-- ============================================
-- 3. RLS 政策
-- ============================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_restaurant_picks ENABLE ROW LEVEL SECURITY;

-- restaurants 全部可讀
DROP POLICY IF EXISTS restaurants_public_read ON public.restaurants;
CREATE POLICY restaurants_public_read ON public.restaurants
  FOR SELECT USING (true);

-- picks 全部可讀寫
DROP POLICY IF EXISTS restaurant_picks_user_read ON public.customer_restaurant_picks;
CREATE POLICY restaurant_picks_user_read ON public.customer_restaurant_picks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS restaurant_picks_insert ON public.customer_restaurant_picks;
CREATE POLICY restaurant_picks_insert ON public.customer_restaurant_picks
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. 觸發器
-- ============================================
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- ============================================
-- 註解
-- ============================================
COMMENT ON TABLE public.restaurants IS '清邁餐廳資料庫（內部工具）';
COMMENT ON TABLE public.customer_restaurant_picks IS '客戶選擇餐廳記錄（從 LINE Bot）';
COMMENT ON COLUMN public.restaurants.priority IS '1-20 必吃餐廳，21-50 推薦餐廳';
COMMENT ON COLUMN public.restaurants.price_range IS '💰 平價 / 💰💰 中價 / 💰💰💰 高級';
COMMENT ON COLUMN public.customer_restaurant_picks.meal_type IS '早餐/午餐/晚餐/下午茶';
