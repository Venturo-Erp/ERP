-- ============================================================
-- Wave 6 Batch 6: CASCADE → RESTRICT (14 FKs)
-- Executed via Management API: 2026-04-21
--
-- William decision: all CASCADE → RESTRICT unless clear composition.
--
-- Changed to RESTRICT (14):
--   A. employees(id)               — 12 FKs (whole group)
--       Principle: employees use soft-delete (is_active=false);
--       real DELETE implies operator error — block it.
--       Includes payroll / attendance / leave / permission / assignment data.
--
--   B. channels(id) business data  — 2 FKs (advance_lists / shared_order_lists)
--       These are business-level lists carried on a channel, not inherent
--       channel-lifetime content.
--
-- KEPT as CASCADE (composition pattern, out of scope):
--   - messages / channel_members / channel_threads — natural channel-lifetime content.
--
-- Zero row impact. Schema metadata only.
-- ============================================================

-- ===== A. employees(id) → RESTRICT (12) =====
ALTER TABLE public.attendance_records
  DROP CONSTRAINT attendance_records_employee_id_fkey,
  ADD CONSTRAINT attendance_records_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.employee_payroll_config
  DROP CONSTRAINT employee_payroll_config_employee_id_fkey,
  ADD CONSTRAINT employee_payroll_config_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.employee_permission_overrides
  DROP CONSTRAINT employee_permission_overrides_employee_id_fkey,
  ADD CONSTRAINT employee_permission_overrides_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.employee_route_overrides
  DROP CONSTRAINT employee_route_overrides_employee_id_fkey,
  ADD CONSTRAINT employee_route_overrides_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.leave_balances
  DROP CONSTRAINT leave_balances_employee_id_fkey,
  ADD CONSTRAINT leave_balances_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.leave_requests
  DROP CONSTRAINT leave_requests_employee_id_fkey,
  ADD CONSTRAINT leave_requests_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.missed_clock_requests
  DROP CONSTRAINT missed_clock_requests_employee_id_fkey,
  ADD CONSTRAINT missed_clock_requests_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_recipient_id_fkey,
  ADD CONSTRAINT notifications_recipient_id_fkey
    FOREIGN KEY (recipient_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.overtime_requests
  DROP CONSTRAINT overtime_requests_employee_id_fkey,
  ADD CONSTRAINT overtime_requests_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.payroll_records
  DROP CONSTRAINT payroll_records_employee_id_fkey,
  ADD CONSTRAINT payroll_records_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.tour_role_assignments
  DROP CONSTRAINT tour_role_assignments_employee_id_fkey,
  ADD CONSTRAINT tour_role_assignments_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_conversation_members
  DROP CONSTRAINT traveler_conversation_members_employee_id_fkey,
  ADD CONSTRAINT traveler_conversation_members_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;

-- ===== B. channels(id) business lists → RESTRICT (2) =====
ALTER TABLE public.advance_lists
  DROP CONSTRAINT advance_lists_channel_id_fkey,
  ADD CONSTRAINT advance_lists_channel_id_fkey
    FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE RESTRICT;

ALTER TABLE public.shared_order_lists
  DROP CONSTRAINT shared_order_lists_channel_id_fkey,
  ADD CONSTRAINT shared_order_lists_channel_id_fkey
    FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE RESTRICT;
