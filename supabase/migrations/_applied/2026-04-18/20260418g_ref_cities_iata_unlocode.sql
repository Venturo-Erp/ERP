-- ================================================================
-- Migration G (Step 1 of 3): ref_cities 加國際標準代號
-- ================================================================
-- Goal: 建立 SSOT、城市可用 IATA city code (3-letter) 或 UN/LOCODE (5-char)
--
-- IATA city code：只有有機場的城市（TYO/OSA/SEL/TPE/BKK...）
-- UN/LOCODE：幾乎所有城市（包括陸路、京都 JPKYT）
--
-- Risk: 🟢 LOW（只加欄位 + 主要城市 seed、不動現有 row）
-- ================================================================


-- ============ Step 1a: 加欄位 ============

ALTER TABLE public.ref_cities
  ADD COLUMN IF NOT EXISTS iata_city_code CHAR(3),
  ADD COLUMN IF NOT EXISTS unlocode       CHAR(5);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ref_cities_iata
  ON public.ref_cities (iata_city_code) WHERE iata_city_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ref_cities_unlocode
  ON public.ref_cities (unlocode) WHERE unlocode IS NOT NULL;

COMMENT ON COLUMN public.ref_cities.iata_city_code IS 'IATA city code (3-letter)、只有有機場的主要城市才有';
COMMENT ON COLUMN public.ref_cities.unlocode IS 'UN/LOCODE (5-char)、覆蓋幾乎所有城市含陸路';


-- ============ Step 1b: Seed 主要城市的 IATA city code ============
-- 資料來源：IATA 官方 city code 清單（人工整理、常用 Corner 需要）

UPDATE public.ref_cities SET iata_city_code = CASE code
  -- 日本
  WHEN 'tokyo' THEN 'TYO'
  WHEN 'osaka' THEN 'OSA'
  WHEN 'nagoya' THEN 'NGO'
  WHEN 'sapporo' THEN 'SPK'
  WHEN 'fukuoka' THEN 'FUK'
  WHEN 'okinawa' THEN 'OKA'
  WHEN 'sendai' THEN 'SDJ'
  -- 韓國
  WHEN 'seoul' THEN 'SEL'
  WHEN 'busan' THEN 'PUS'
  WHEN 'jeju' THEN 'CJU'
  -- 台灣
  WHEN 'taipei' THEN 'TPE'
  WHEN 'kaohsiung' THEN 'KHH'
  WHEN 'taichung' THEN 'RMQ'
  WHEN 'tainan' THEN 'TNN'
  WHEN 'hualien' THEN 'HUN'
  -- 泰國
  WHEN 'bangkok' THEN 'BKK'
  WHEN 'chiang-mai' THEN 'CNX'
  WHEN 'phuket' THEN 'HKT'
  -- 中國
  WHEN 'beijing' THEN 'BJS'
  WHEN 'shanghai' THEN 'SHA'
  WHEN 'guangzhou' THEN 'CAN'
  WHEN 'shenzhen' THEN 'SZX'
  WHEN 'chengdu' THEN 'CTU'
  WHEN 'xian' THEN 'XIY'
  -- 東南亞
  WHEN 'hongkong' THEN 'HKG'
  WHEN 'singapore' THEN 'SIN'
  WHEN 'kuala-lumpur' THEN 'KUL'
  WHEN 'hanoi' THEN 'HAN'
  WHEN 'ho-chi-minh' THEN 'SGN'
  WHEN 'jakarta' THEN 'JKT'
  WHEN 'manila' THEN 'MNL'
  -- 歐洲
  WHEN 'paris' THEN 'PAR'
  WHEN 'london' THEN 'LON'
  WHEN 'rome' THEN 'ROM'
  WHEN 'milan' THEN 'MIL'
  WHEN 'barcelona' THEN 'BCN'
  WHEN 'madrid' THEN 'MAD'
  WHEN 'frankfurt' THEN 'FRA'
  WHEN 'berlin' THEN 'BER'
  WHEN 'amsterdam' THEN 'AMS'
  WHEN 'zurich' THEN 'ZRH'
  -- 美洲
  WHEN 'new-york' THEN 'NYC'
  WHEN 'los-angeles' THEN 'LAX'
  WHEN 'san-francisco' THEN 'SFO'
  WHEN 'chicago' THEN 'CHI'
  WHEN 'vancouver' THEN 'YVR'
  WHEN 'toronto' THEN 'YTO'
  -- 大洋洲
  WHEN 'sydney' THEN 'SYD'
  WHEN 'melbourne' THEN 'MEL'
  WHEN 'auckland' THEN 'AKL'
END
WHERE code IN (
  'tokyo', 'osaka', 'nagoya', 'sapporo', 'fukuoka', 'okinawa', 'sendai',
  'seoul', 'busan', 'jeju',
  'taipei', 'kaohsiung', 'taichung', 'tainan', 'hualien',
  'bangkok', 'chiang-mai', 'phuket',
  'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'xian',
  'hongkong', 'singapore', 'kuala-lumpur', 'hanoi', 'ho-chi-minh', 'jakarta', 'manila',
  'paris', 'london', 'rome', 'milan', 'barcelona', 'madrid', 'frankfurt', 'berlin', 'amsterdam', 'zurich',
  'new-york', 'los-angeles', 'san-francisco', 'chicago', 'vancouver', 'toronto',
  'sydney', 'melbourne', 'auckland'
);


-- ============ Step 1c: Seed UN/LOCODE（含陸路城市）============

UPDATE public.ref_cities SET unlocode = CASE code
  -- 日本（含陸路）
  WHEN 'tokyo' THEN 'JPTYO'
  WHEN 'osaka' THEN 'JPOSA'
  WHEN 'kyoto' THEN 'JPUKY'       -- 京都（陸路、無 IATA city code）
  WHEN 'nara' THEN 'JPNAR'        -- 奈良
  WHEN 'nagoya' THEN 'JPNGO'
  WHEN 'sapporo' THEN 'JPSPK'
  WHEN 'fukuoka' THEN 'JPFUK'
  -- 台灣
  WHEN 'taipei' THEN 'TWTPE'
  WHEN 'taichung' THEN 'TWTXG'
  WHEN 'kaohsiung' THEN 'TWKHH'
  WHEN 'tainan' THEN 'TWTNN'
  WHEN 'hualien' THEN 'TWHUN'
  WHEN 'new-taipei' THEN 'TWNWT'  -- 新北
  WHEN 'taitung' THEN 'TWTTT'     -- 台東
  WHEN 'nantou' THEN 'TWPUL'      -- 南投（埔里）
  -- 泰國
  WHEN 'bangkok' THEN 'THBKK'
  WHEN 'pattaya' THEN 'THPYX'     -- 芭達雅
  WHEN 'chiang-mai' THEN 'THCNX'
  WHEN 'phuket' THEN 'THHKT'
  WHEN 'hua-hin' THEN 'THHHQ'
  -- 韓國
  WHEN 'seoul' THEN 'KRSEL'
  WHEN 'busan' THEN 'KRPUS'
  -- 中國
  WHEN 'beijing' THEN 'CNBJS'
  WHEN 'shanghai' THEN 'CNSHA'
  WHEN 'xian' THEN 'CNSIA'
END
WHERE code IN (
  'tokyo', 'osaka', 'kyoto', 'nara', 'nagoya', 'sapporo', 'fukuoka',
  'taipei', 'taichung', 'kaohsiung', 'tainan', 'hualien', 'new-taipei', 'taitung', 'nantou',
  'bangkok', 'pattaya', 'chiang-mai', 'phuket', 'hua-hin',
  'seoul', 'busan',
  'beijing', 'shanghai', 'xian'
);


-- ============ Step 1d: Reload schema ============

NOTIFY pgrst, 'reload schema';


-- ============ 驗證 ============

-- SELECT code, name_zh, iata_city_code, unlocode FROM ref_cities
-- WHERE iata_city_code IS NOT NULL OR unlocode IS NOT NULL
-- ORDER BY country_code, name_zh;
