-- ============================================================
-- Wave 2.5: NO FORCE ROW LEVEL SECURITY on 28 tables
-- Executed via Management API: 2026-04-21 00:52
--
-- Reason: workspaces-style login bug pattern. FORCE RLS + policy
-- roles={public} means service_role is also blocked by the policy.
-- All 28 tables had policies using get_current_user_workspace()
-- which returns NULL for service_role → silent empty results.
--
-- Action: NO FORCE (same strategy as workspaces fix 2026-04-20).
-- Policy stays — normal users still constrained. service_role
-- resumes its default bypass (Supabase recommended).
--
-- Zero data impact. Schema metadata only.
-- Verified: pg_class.relforcerowsecurity=true count 28 → 0.
-- ============================================================

ALTER TABLE public.accounting_accounts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_subjects NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attraction_licenses NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attractions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.companies NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.company_assets NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.esims NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.files NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.folders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.michelin_restaurants NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_request_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.premium_experiences NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.selector_field_roles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_categories NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tour_confirmation_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tour_confirmation_sheets NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tour_itinerary_days NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tour_itinerary_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tour_leaders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tour_role_assignments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tour_room_assignments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tour_rooms NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.visas NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_modules NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_selector_fields NO FORCE ROW LEVEL SECURITY;
