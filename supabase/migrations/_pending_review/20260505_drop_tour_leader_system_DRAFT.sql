-- ============================================================================
-- 2026-05-05 William 拍板：領隊資料系統整套砍除
-- ============================================================================
-- 範圍：
--   1. ALTER TABLE tours DROP COLUMN tour_leader_id（FK to tour_leaders）
--   2. DROP TABLE leader_availability（領隊檔期）
--   3. DROP TABLE tour_leaders（領隊資料）
--
-- 風險：紅線 #0 — DROP TABLE + DROP COLUMN with data、不可逆
-- 為何：不做 DMC / 領隊調度、領隊資訊改成 tour 內 LeaderInfo（純 brochure 顯示用、不 FK）
--
-- 須由 William 審核資料殘留後再決定 apply
-- ============================================================================

BEGIN;

-- 1. 拿掉 tours 的 FK 到 tour_leaders
ALTER TABLE public.tours
  DROP COLUMN IF EXISTS tour_leader_id;

-- 2. DROP 領隊檔期（已沒人引用）
DROP TABLE IF EXISTS public.leader_availability CASCADE;

-- 3. DROP 領隊資料表
DROP TABLE IF EXISTS public.tour_leaders CASCADE;

COMMIT;
