-- Phase 3 Batch B4: payment_requests + suppliers + confirmations
-- 57 筆資料 map 成功（7 + 26 + 24）
-- 已於 2026-04-20 透過 Management API 執行於 prod

BEGIN;

UPDATE public.payment_requests p SET updated_by = e.id FROM public.employees e
WHERE (e.user_id = p.updated_by OR e.supabase_user_id = p.updated_by) AND p.updated_by IS NOT NULL;
ALTER TABLE public.payment_requests DROP CONSTRAINT payment_requests_updated_by_fkey;
ALTER TABLE public.payment_requests ADD CONSTRAINT payment_requests_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

UPDATE public.suppliers s SET created_by = e.id FROM public.employees e
WHERE (e.user_id = s.created_by OR e.supabase_user_id = s.created_by) AND s.created_by IS NOT NULL;
UPDATE public.suppliers s SET updated_by = e.id FROM public.employees e
WHERE (e.user_id = s.updated_by OR e.supabase_user_id = s.updated_by) AND s.updated_by IS NOT NULL;
ALTER TABLE public.suppliers DROP CONSTRAINT suppliers_created_by_fkey;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.suppliers DROP CONSTRAINT suppliers_updated_by_fkey;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

UPDATE public.confirmations c SET created_by = e.id FROM public.employees e
WHERE (e.user_id = c.created_by OR e.supabase_user_id = c.created_by) AND c.created_by IS NOT NULL;
UPDATE public.confirmations c SET updated_by = e.id FROM public.employees e
WHERE (e.user_id = c.updated_by OR e.supabase_user_id = c.updated_by) AND c.updated_by IS NOT NULL;
ALTER TABLE public.confirmations DROP CONSTRAINT confirmations_created_by_fkey;
ALTER TABLE public.confirmations ADD CONSTRAINT confirmations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.confirmations DROP CONSTRAINT confirmations_updated_by_fkey;
ALTER TABLE public.confirmations ADD CONSTRAINT confirmations_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

COMMIT;
