-- ================================================================
-- Migration H (Step 2): 整理 ref_airports（從 backup 補進完整機場資料）
-- ================================================================
-- Applied: 2026-04-18
--
-- Goal:
--   從 ref_airports_backup dedupe 補進 ref_airports（現有 83 + 新 5992 = 6075）
--
-- Scope 調整（William 決議）:
--   ❌ 跳過 city_code backfill（現在前端不用城市層）
--   ❌ 跳過 ref_airports.city_code → ref_cities FK（沒用到不必加）
--   ❌ 跳過 tours.airport_code FK（之後 preload cache 架構做完再決定）
--   ✅ 只做 Step 2a、最小有效改動
--
-- Pre-requisite（手動執行、見 _DAILY_REPORT）:
--   DROP TRIGGER trigger_auto_set_workspace_id ON public.ref_airports;
--   （trigger 被錯掛在全域 ref 表上、沒 workspace_id 欄位會爆）
--
-- Risk: 🟢 LOW（只 INSERT 新 row、PK 去重、不動現有 83 筆）
-- ================================================================


-- ============ Step 2a: 從 backup 補進缺的機場（PK iata_code、不覆蓋現有）============

INSERT INTO public.ref_airports (
  iata_code, icao_code, english_name, name_zh,
  city_name_en, city_name_zh, country_code,
  timezone, latitude, longitude,
  is_favorite, usage_count
)
SELECT DISTINCT ON (iata_code)
  iata_code, icao_code, english_name, name_zh,
  city_name_en, city_name_zh, country_code,
  timezone, latitude, longitude,
  COALESCE(is_favorite, false),
  COALESCE(usage_count, 0)
FROM public.ref_airports_backup
WHERE iata_code IS NOT NULL
ORDER BY iata_code, (CASE WHEN icao_code IS NOT NULL THEN 0 ELSE 1 END), COALESCE(usage_count, 0) DESC
ON CONFLICT (iata_code) DO NOTHING;


-- ============ Reload schema ============

NOTIFY pgrst, 'reload schema';


-- ============ 驗證（apply 後跑）============

-- SELECT COUNT(*) AS total FROM ref_airports;
-- 預期: 6075

-- SELECT country_code, COUNT(*) FROM ref_airports GROUP BY country_code ORDER BY COUNT(*) DESC LIMIT 10;
-- 各國機場分布


-- ============ 未動（等之後決策）============
--
-- - ref_airports_backup        （備份、待 William 驗證完才清）
-- - ref_airports.city_code     （保持 null、等 preload cache 架構再決定）
-- - tours.airport_code FK      （等 preload cache 架構再加）
-- - cities / countries 老表    （per-workspace 老表、等 hotels/attractions 遷完）
