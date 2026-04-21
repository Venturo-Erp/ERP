-- Phase 3 Batch B2 of REFACTOR_PLAN_AUDIT_TRAIL_FK.md
-- 2026-04-20：4 張表、7 FK 從 auth.users 改指 employees
-- files(1 row)、tour_documents(3)、michelin_restaurants(26)、premium_experiences(80)
-- 所有 FK 欄位皆為 NULL，無需 UPDATE
--
-- 已於 2026-04-20 透過 Management API 手動執行於 prod

BEGIN;

ALTER TABLE public.files DROP CONSTRAINT files_created_by_fkey;
ALTER TABLE public.files ADD CONSTRAINT files_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.files DROP CONSTRAINT files_updated_by_fkey;
ALTER TABLE public.files ADD CONSTRAINT files_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.tour_documents DROP CONSTRAINT tour_documents_uploaded_by_fkey;
ALTER TABLE public.tour_documents ADD CONSTRAINT tour_documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.michelin_restaurants DROP CONSTRAINT michelin_restaurants_created_by_fkey;
ALTER TABLE public.michelin_restaurants ADD CONSTRAINT michelin_restaurants_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.michelin_restaurants DROP CONSTRAINT michelin_restaurants_updated_by_fkey;
ALTER TABLE public.michelin_restaurants ADD CONSTRAINT michelin_restaurants_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.premium_experiences DROP CONSTRAINT premium_experiences_created_by_fkey;
ALTER TABLE public.premium_experiences ADD CONSTRAINT premium_experiences_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.premium_experiences DROP CONSTRAINT premium_experiences_updated_by_fkey;
ALTER TABLE public.premium_experiences ADD CONSTRAINT premium_experiences_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

COMMIT;
