-- Phase 3 Batch B1 of REFACTOR_PLAN_AUDIT_TRAIL_FK.md
-- 2026-04-20：7 張空表、11 個 FK 從 auth.users 改指 employees
-- 資料盤點確認這些欄位都是 0 非空值，無需 UPDATE
-- 統一 ON DELETE SET NULL（跟 itineraries 一致）
--
-- 已於 2026-04-20 透過 Management API 手動執行於 prod（wzvwmawpkapcmkfmkvav）
-- 此檔保留為紀錄；請勿用 supabase db push

BEGIN;

-- linkpay_logs
ALTER TABLE public.linkpay_logs DROP CONSTRAINT linkpay_logs_created_by_fkey;
ALTER TABLE public.linkpay_logs ADD CONSTRAINT linkpay_logs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.linkpay_logs DROP CONSTRAINT linkpay_logs_updated_by_fkey;
ALTER TABLE public.linkpay_logs ADD CONSTRAINT linkpay_logs_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- cost_templates
ALTER TABLE public.cost_templates DROP CONSTRAINT cost_templates_created_by_fkey;
ALTER TABLE public.cost_templates ADD CONSTRAINT cost_templates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.cost_templates DROP CONSTRAINT cost_templates_updated_by_fkey;
ALTER TABLE public.cost_templates ADD CONSTRAINT cost_templates_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- emails
ALTER TABLE public.emails DROP CONSTRAINT emails_created_by_fkey;
ALTER TABLE public.emails ADD CONSTRAINT emails_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.emails DROP CONSTRAINT emails_updated_by_fkey;
ALTER TABLE public.emails ADD CONSTRAINT emails_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- assigned_itineraries
ALTER TABLE public.assigned_itineraries DROP CONSTRAINT assigned_itineraries_created_by_fkey;
ALTER TABLE public.assigned_itineraries ADD CONSTRAINT assigned_itineraries_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- tour_control_forms
ALTER TABLE public.tour_control_forms DROP CONSTRAINT tour_control_forms_created_by_fkey;
ALTER TABLE public.tour_control_forms ADD CONSTRAINT tour_control_forms_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.tour_control_forms DROP CONSTRAINT tour_control_forms_updated_by_fkey;
ALTER TABLE public.tour_control_forms ADD CONSTRAINT tour_control_forms_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- file_audit_logs
ALTER TABLE public.file_audit_logs DROP CONSTRAINT file_audit_logs_performed_by_fkey;
ALTER TABLE public.file_audit_logs ADD CONSTRAINT file_audit_logs_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- image_library
ALTER TABLE public.image_library DROP CONSTRAINT image_library_created_by_fkey;
ALTER TABLE public.image_library ADD CONSTRAINT image_library_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

COMMIT;
