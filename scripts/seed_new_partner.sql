-- ================================================================
-- 新 Partner 一鍵 seed：通用景點 + 通用供應商
-- ================================================================
-- 用法：
--   1. 替換 YOUR_WORKSPACE_ID 為實際 workspace id
--   2. 替換 YOUR_PREFIX 為 3-5 字母代號（例: LIKAI → LK）
--   3. 在 Supabase SQL editor 執行
--
-- 安全：純 INSERT、不動別的 workspace 資料
-- ================================================================

DO $$
DECLARE
  v_ws UUID := 'YOUR_WORKSPACE_ID';    -- ← 改成實際 workspace id
  v_prefix TEXT := 'YOUR_PREFIX';      -- ← 改成 3-5 字母代號（用於 suppliers.code 避免全域衝突）
BEGIN

-- ============ 1. 通用景點 20 個（國家 FK 用 countries.id slug）============
-- 注意：attractions.country_id 是 text slug（如 'japan'）、不是 ref_countries.code
INSERT INTO attractions (id, workspace_id, name, country_id, description, is_active)
VALUES
  (gen_random_uuid(), v_ws, '東京晴空塔', 'japan', '世界第二高塔、夜景經典', true),
  (gen_random_uuid(), v_ws, '淺草寺', 'japan', '東京最古老寺廟', true),
  (gen_random_uuid(), v_ws, '箱根溫泉', 'japan', '富士山腳下的溫泉鄉', true),
  (gen_random_uuid(), v_ws, '清水寺', 'japan', '京都世界遺產、賞楓勝地', true),
  (gen_random_uuid(), v_ws, '大阪城', 'japan', '豐臣秀吉居城', true),
  (gen_random_uuid(), v_ws, '首爾明洞', 'south-korea', '首爾購物美食街區', true),
  (gen_random_uuid(), v_ws, '景福宮', 'south-korea', '朝鮮王朝正宮', true),
  (gen_random_uuid(), v_ws, '濟州島漢拏山', 'south-korea', '韓國最高峰、火山地形', true),
  (gen_random_uuid(), v_ws, '曼谷大皇宮', 'thailand', '泰國王室象徵', true),
  (gen_random_uuid(), v_ws, '清邁夜市', 'thailand', '泰北手工藝品集散', true),
  (gen_random_uuid(), v_ws, '清邁大象營', 'thailand', '倫理友善的大象保育', true),
  (gen_random_uuid(), v_ws, '普吉島芭東海灘', 'thailand', '泰南最熱鬧海灘', true),
  (gen_random_uuid(), v_ws, '峇里烏布猴林', 'indonesia', '神聖猴群聚集地', true),
  (gen_random_uuid(), v_ws, '峇里海神廟', 'indonesia', '海上寺廟、日落勝景', true),
  (gen_random_uuid(), v_ws, '新加坡濱海灣花園', 'singapore', '超級樹林光雕秀', true),
  (gen_random_uuid(), v_ws, '聖淘沙環球影城', 'singapore', '東南亞最大主題樂園', true),
  (gen_random_uuid(), v_ws, '吉隆坡雙塔', 'malaysia', '馬來西亞象徵', true),
  (gen_random_uuid(), v_ws, '檳城喬治市老街', 'malaysia', '世界遺產壁畫街', true),
  (gen_random_uuid(), v_ws, '下龍灣遊船', 'vietnam', '越南世界遺產景觀', true),
  (gen_random_uuid(), v_ws, '河內還劍湖', 'vietnam', '越南首都核心景點', true);

-- ============ 2. 通用供應商 10 個（code 加 prefix 避免全域 UNIQUE 衝突）============
INSERT INTO suppliers (id, workspace_id, code, name, status)
VALUES
  (gen_random_uuid(), v_ws, v_prefix || '-S001', '華航', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S002', '長榮航空', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S003', '希爾頓日本', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S004', '萬豪泰國', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S005', '清邁專車', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S006', '曼谷地接社', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S007', '東京中華料理', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S008', '大阪懷石料理', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S009', '清邁導遊阿洋', 'active'),
  (gen_random_uuid(), v_ws, v_prefix || '-S010', '峇里導遊阿貴', 'active');

RAISE NOTICE '✅ 已 seed 20 景點 + 10 供應商給 workspace % (prefix %)', v_ws, v_prefix;

END $$;
