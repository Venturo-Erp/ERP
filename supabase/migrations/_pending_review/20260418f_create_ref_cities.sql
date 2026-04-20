-- ================================================================
-- Migration F: Create ref_cities + seed from cities + ref_airports_backup
-- ================================================================
-- Phase 1 of 完整架構改造（William 2026-04-18 決議）
-- 目標: 建全球城市 SoT、讓「選國家 → 選城市（必）→ 選機場（選填）」成為可能
--       （陸路案不需機場也能建團）
--
-- Pre-flight 驗證:
--   ✅ ref_airports_backup 12144 筆、高品質機場資料（KIX/HND/NRT/KHH/CAI 等都對）
--   ✅ cities 304 筆、結構乾淨（id slug + name + country_code）
--   ✅ Corner 使用過的城市都在 cities（可當 seed）
--
-- Risk: 🟢 LOW（純建新表 + INSERT 新 row、不動現有 row）
-- ================================================================


-- ============ Step 1: CREATE ref_cities ============

CREATE TABLE IF NOT EXISTS public.ref_cities (
  code TEXT PRIMARY KEY,              -- slug ('tokyo', 'kyoto', 'pattaya')
  name_zh TEXT NOT NULL,
  name_en TEXT,
  country_code TEXT NOT NULL REFERENCES public.ref_countries(code),
  primary_airport_iata TEXT,          -- 選填、主要機場 (e.g. TYO → NRT/HND)
  is_major BOOLEAN DEFAULT false,     -- 重點城市
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_cities_country ON public.ref_cities(country_code);
CREATE INDEX IF NOT EXISTS idx_ref_cities_active ON public.ref_cities(is_active) WHERE is_active = true;

COMMENT ON TABLE public.ref_cities IS '全球城市 SoT、由 Venturo 維護、workspace 透過 workspace_cities.is_enabled 啟用';


-- ============ Step 2: Seed from cities（per-workspace 歷史資料）============
-- 跨 workspace 把使用過的城市合併到 ref_cities
-- distinct by id（cities.id 是 PK、唯一）

INSERT INTO public.ref_cities (code, name_zh, name_en, country_code, is_active)
SELECT
  c.id AS code,
  c.name AS name_zh,
  c.name_en,
  c.country_code,
  COALESCE(c.is_active, true)
FROM public.cities c
WHERE c.country_code IS NOT NULL
  AND c.name IS NOT NULL
  AND c.country_code IN (SELECT code FROM public.ref_countries)
ON CONFLICT (code) DO NOTHING;


-- ============ Step 3: Seed from ref_airports_backup（補更多城市）============
-- 從真實機場資料抽 distinct city、code 用 LOWER(city_name_en)

INSERT INTO public.ref_cities (code, name_zh, name_en, country_code, primary_airport_iata)
SELECT DISTINCT ON (LOWER(REPLACE(city_name_en, ' ', '-')))
  LOWER(REPLACE(city_name_en, ' ', '-')) AS code,
  COALESCE(city_name_zh, city_name_en) AS name_zh,
  city_name_en,
  country_code,
  iata_code AS primary_airport_iata
FROM public.ref_airports_backup
WHERE city_name_en IS NOT NULL
  AND country_code IS NOT NULL
  AND country_code IN (SELECT code FROM public.ref_countries)
  AND LENGTH(city_name_en) > 1
  AND LENGTH(city_name_en) < 50
ON CONFLICT (code) DO NOTHING;


-- ============ Step 4: Mark major cities（手動標重要城市、之後可加）============

UPDATE public.ref_cities SET is_major = true
WHERE code IN (
  'tokyo', 'osaka', 'kyoto', 'sapporo', 'fukuoka', 'nagoya',  -- 日本
  'bangkok', 'pattaya', 'phuket', 'chiang-mai',               -- 泰國
  'seoul', 'busan', 'jeju',                                    -- 韓國
  'beijing', 'shanghai', 'hongkong',                           -- 中國/港
  'singapore', 'kuala-lumpur', 'hanoi', 'ho-chi-minh',        -- 東南亞
  'paris', 'london', 'rome', 'barcelona',                      -- 歐洲主要
  'new-york', 'los-angeles', 'san-francisco',                  -- 美洲
  'taipei', 'kaohsiung', 'taichung'                            -- 台灣
);


-- ============ Step 5: Reload schema ============

NOTIFY pgrst, 'reload schema';


-- ============ 驗證（apply 後跑）============

-- SELECT COUNT(*) AS total FROM ref_cities;
-- 預期: > 300

-- SELECT country_code, COUNT(*) FROM ref_cities GROUP BY country_code ORDER BY COUNT(*) DESC LIMIT 10;
-- 看各國城市分布

-- SELECT * FROM ref_cities WHERE name_zh LIKE '%京都%' OR name_zh LIKE '%秘魯%';
