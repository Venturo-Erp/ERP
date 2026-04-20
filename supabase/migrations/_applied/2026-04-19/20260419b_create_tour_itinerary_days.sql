-- ================================================================
-- Migration: 新增 tour_itinerary_days 表（行程 SSOT 重構 Phase 1）
-- ================================================================
-- Applied: 2026-04-19
-- Author: William (@Venturo-Erp)
--
-- 目的：
--   把 itineraries.daily_itinerary (JSONB) 裡的 day-level metadata
--   (route/note/blocks/meal_flags/等) normalize 成正式資料表。
--
-- 現狀問題：
--   1. itineraries.daily_itinerary (JSONB) 存 day-level 資料
--   2. tour_itinerary_items (核心表) 存 item-level 資料（景點/餐/宿逐項一 row）
--   3. 兩者雙寫，syncToCore 失敗時脫鉤
--   4. Corner 19 個行程中 11 個已不同步
--
-- 根因：
--   day-level metadata（每天的 route 文字、備註、續住 flag、三餐 flag）
--   在核心表無處可放、reload 只讀核心表時會遺失 → 所以保留雙寫
--
-- 解法：
--   新增 tour_itinerary_days 表，每天一 row，存 day-level metadata
--   未來 editor 只讀寫 tour_itinerary_items + tour_itinerary_days、
--   daily_itinerary JSONB 在下一個 phase 逐步廢掉。
--
-- 影響範圍：
--   ✅ 新建空表、不動任何 row、零資料風險
--   ✅ 真租戶（Corner/JINGYAO/YUFEN）rows 不變
--
-- 驗證：
--   BEFORE snapshot:
--     CORNER   tours=29 itin=19 tii=337 orders=19 emp=5
--     JINGYAO  tours=1  itin=0  tii=0   orders=0  emp=1
--     YUFEN    tours=1  itin=0  tii=0   orders=1  emp=1
-- ================================================================

-- ========== 1. 建表 ==========
CREATE TABLE public.tour_itinerary_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯（tour/itinerary 是舊表、id 是 TEXT；workspace/employees 是 UUID）
  tour_id text NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  itinerary_id text REFERENCES public.itineraries(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 天數
  day_number integer NOT NULL CHECK (day_number > 0),

  -- Day-level metadata
  title text,                                            -- 「Day 1 - 抵達目的地」
  route text,                                            -- 「台北 ⇀ 九份 ⇀ 淡水」路線描述
  note text,                                             -- 當日備註
  blocks jsonb,                                          -- block editor 結構內容
  is_same_accommodation boolean NOT NULL DEFAULT false,  -- 續住 flag
  -- 餐食預設選項（null = 自訂文字 / 餐廳 id）
  breakfast_preset text,  -- 'hotel' = 飯店早餐
  lunch_preset text,      -- 'self' = 敬請自理 / 'airline' = 機上簡餐
  dinner_preset text,     -- 'self' = 敬請自理 / 'airline' = 機上簡餐

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,

  -- 每個 tour 每天只能有一筆
  UNIQUE (tour_id, day_number)
);

COMMENT ON TABLE public.tour_itinerary_days IS
  '行程每日 metadata（route/note/blocks/flags）。與 tour_itinerary_items 互補：本表存 day-level、tour_itinerary_items 存 item-level。';

-- ========== 2. Indexes ==========
CREATE INDEX tour_itinerary_days_tour_id_idx
  ON public.tour_itinerary_days(tour_id);

CREATE INDEX tour_itinerary_days_itinerary_id_idx
  ON public.tour_itinerary_days(itinerary_id)
  WHERE itinerary_id IS NOT NULL;

CREATE INDEX tour_itinerary_days_workspace_id_idx
  ON public.tour_itinerary_days(workspace_id)
  WHERE workspace_id IS NOT NULL;

-- ========== 3. RLS（比照 tour_itinerary_items 模式）==========
ALTER TABLE public.tour_itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_itinerary_days FORCE ROW LEVEL SECURITY;

CREATE POLICY "tour_itinerary_days_select" ON public.tour_itinerary_days
  FOR SELECT TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "tour_itinerary_days_insert" ON public.tour_itinerary_days
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

CREATE POLICY "tour_itinerary_days_update" ON public.tour_itinerary_days
  FOR UPDATE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

CREATE POLICY "tour_itinerary_days_delete" ON public.tour_itinerary_days
  FOR DELETE TO authenticated
  USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- ========== 4. updated_at trigger ==========
CREATE TRIGGER tour_itinerary_days_updated_at
  BEFORE UPDATE ON public.tour_itinerary_days
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========== 5. 驗證 ==========
DO $$
DECLARE
  rls_on boolean;
  policy_cnt integer;
  idx_cnt integer;
BEGIN
  -- 驗表存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'tour_itinerary_days'
  ) THEN
    RAISE EXCEPTION '❌ tour_itinerary_days 未建立';
  END IF;

  -- 驗 RLS
  SELECT c.relrowsecurity INTO rls_on
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'tour_itinerary_days';

  IF NOT rls_on THEN
    RAISE EXCEPTION '❌ RLS 未啟用';
  END IF;

  -- 驗 policy 數
  SELECT COUNT(*) INTO policy_cnt
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'tour_itinerary_days';

  IF policy_cnt <> 4 THEN
    RAISE EXCEPTION '❌ Policy 數 != 4（實際 %）', policy_cnt;
  END IF;

  -- 驗 index
  SELECT COUNT(*) INTO idx_cnt
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'tour_itinerary_days';

  -- PK + 3 個 explicit index + 1 個 UNIQUE = 5
  IF idx_cnt < 4 THEN
    RAISE EXCEPTION '❌ Index 數不足（實際 %）', idx_cnt;
  END IF;

  RAISE NOTICE '✅ tour_itinerary_days 建立成功';
  RAISE NOTICE '   RLS: enabled';
  RAISE NOTICE '   Policies: %', policy_cnt;
  RAISE NOTICE '   Indexes: %', idx_cnt;
END $$;
