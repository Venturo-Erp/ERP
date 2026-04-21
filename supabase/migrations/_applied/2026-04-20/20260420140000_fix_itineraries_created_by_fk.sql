-- Phase 2 of REFACTOR_PLAN_AUDIT_TRAIL_FK.md
-- 2026-04-20：將 itineraries.created_by FK 從 auth.users 切到 employees
-- 同時 DROP 兩個零值歷史欄位（created_by_legacy_user_id, creator_user_id）
--
-- 已於 2026-04-20 透過 Management API 手動執行於 prod（wzvwmawpkapcmkfmkvav）
-- 此檔保留為紀錄；local migration history 與 prod 已分叉，請勿用 supabase db push

BEGIN;

-- 1. 映射 created_by 從 auth.users.id → employees.id
UPDATE public.itineraries i
SET created_by = e.id
FROM public.employees e
WHERE (e.user_id = i.created_by OR e.supabase_user_id = i.created_by)
  AND i.created_by IS NOT NULL;

-- 2. 換 FK：auth.users → employees
ALTER TABLE public.itineraries DROP CONSTRAINT itineraries_created_by_fkey;
ALTER TABLE public.itineraries
  ADD CONSTRAINT itineraries_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- 3. 刪除兩個歷史殘留的零值欄位
ALTER TABLE public.itineraries DROP CONSTRAINT IF EXISTS itineraries_creator_user_id_fkey;
ALTER TABLE public.itineraries DROP CONSTRAINT IF EXISTS itineraries_creator_user_id_fkey1;
ALTER TABLE public.itineraries DROP COLUMN IF EXISTS created_by_legacy_user_id;
ALTER TABLE public.itineraries DROP COLUMN IF EXISTS creator_user_id;

COMMIT;
