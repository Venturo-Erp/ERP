-- Phase 3 Batch B3: tours + todos
-- todos: 3 non-null rows mapped; tours: 0 non-null (just FK swap)
-- 已於 2026-04-20 透過 Management API 執行於 prod

BEGIN;

UPDATE public.todos t SET created_by = e.id FROM public.employees e
WHERE (e.user_id = t.created_by OR e.supabase_user_id = t.created_by) AND t.created_by IS NOT NULL;
UPDATE public.todos t SET updated_by = e.id FROM public.employees e
WHERE (e.user_id = t.updated_by OR e.supabase_user_id = t.updated_by) AND t.updated_by IS NOT NULL;

ALTER TABLE public.todos DROP CONSTRAINT todos_created_by_fkey;
ALTER TABLE public.todos ADD CONSTRAINT todos_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.todos DROP CONSTRAINT todos_updated_by_fkey;
ALTER TABLE public.todos ADD CONSTRAINT todos_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.tours DROP CONSTRAINT tours_locked_by_fkey;
ALTER TABLE public.tours ADD CONSTRAINT tours_locked_by_fkey
  FOREIGN KEY (locked_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.tours DROP CONSTRAINT tours_last_unlocked_by_fkey;
ALTER TABLE public.tours ADD CONSTRAINT tours_last_unlocked_by_fkey
  FOREIGN KEY (last_unlocked_by) REFERENCES public.employees(id) ON DELETE SET NULL;

COMMIT;
