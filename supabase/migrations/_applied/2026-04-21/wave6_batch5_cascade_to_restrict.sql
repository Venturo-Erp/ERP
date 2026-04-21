-- ============================================================
-- Wave 6 Batch 5: CASCADE → RESTRICT (20 FKs)
-- Executed via Management API: 2026-04-21
--
-- William decision: all CASCADE → RESTRICT unless clear composition.
--
-- Changed to RESTRICT (20):
--   A. traveler_trips(id)          — 7 FKs (settlements / accommodations / briefings / flights / invitations / itinerary_items / members)
--   B. workspace_roles(id)         — 3 FKs (role_tab_permissions / selector_field_roles / tour_role_assignments)
--   C. traveler_split_groups(id)   — 2 FKs (traveler_settlements / traveler_split_group_members)
--   D. tour_leaders(id)            — 2 FKs (leader_availability / leader_schedules)
--   E. fleet_vehicles(id)          — 2 FKs (fleet_schedules / fleet_vehicle_logs)
--   F. projects(id)                — 2 FKs (decisions_log / tasks)
--   G. customer_assigned_itineraries(id) — 2 FKs (customization_requests / trip_members)
--
-- KEPT as CASCADE (composition pattern, out of scope):
--   - meeting_rooms(id)            — messages/participants are the room's lifecycle content
--   - website_itinerary_days(id)   — activities/highlights are tree content of the day
--
-- Zero row impact. Schema metadata only.
-- ============================================================

-- ===== A. traveler_trips(id) → RESTRICT =====
ALTER TABLE public.traveler_settlements
  DROP CONSTRAINT traveler_settlements_trip_id_fkey,
  ADD CONSTRAINT traveler_settlements_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.traveler_trips(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_accommodations
  DROP CONSTRAINT traveler_trip_accommodations_trip_id_fkey,
  ADD CONSTRAINT traveler_trip_accommodations_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.traveler_trips(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_briefings
  DROP CONSTRAINT traveler_trip_briefings_trip_id_fkey,
  ADD CONSTRAINT traveler_trip_briefings_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.traveler_trips(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_flights
  DROP CONSTRAINT traveler_trip_flights_trip_id_fkey,
  ADD CONSTRAINT traveler_trip_flights_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.traveler_trips(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_invitations
  DROP CONSTRAINT traveler_trip_invitations_trip_id_fkey,
  ADD CONSTRAINT traveler_trip_invitations_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.traveler_trips(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_itinerary_items
  DROP CONSTRAINT traveler_trip_itinerary_items_trip_id_fkey,
  ADD CONSTRAINT traveler_trip_itinerary_items_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.traveler_trips(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_members
  DROP CONSTRAINT traveler_trip_members_trip_id_fkey,
  ADD CONSTRAINT traveler_trip_members_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.traveler_trips(id) ON DELETE RESTRICT;

-- ===== B. workspace_roles(id) → RESTRICT =====
ALTER TABLE public.role_tab_permissions
  DROP CONSTRAINT role_tab_permissions_role_id_fkey,
  ADD CONSTRAINT role_tab_permissions_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.workspace_roles(id) ON DELETE RESTRICT;

ALTER TABLE public.selector_field_roles
  DROP CONSTRAINT selector_field_roles_role_id_fkey,
  ADD CONSTRAINT selector_field_roles_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.workspace_roles(id) ON DELETE RESTRICT;

ALTER TABLE public.tour_role_assignments
  DROP CONSTRAINT tour_role_assignments_role_id_fkey,
  ADD CONSTRAINT tour_role_assignments_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.workspace_roles(id) ON DELETE RESTRICT;

-- ===== C. traveler_split_groups(id) → RESTRICT =====
ALTER TABLE public.traveler_settlements
  DROP CONSTRAINT fk_traveler_settlements_split_group,
  ADD CONSTRAINT fk_traveler_settlements_split_group
    FOREIGN KEY (split_group_id) REFERENCES public.traveler_split_groups(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_split_group_members
  DROP CONSTRAINT traveler_split_group_members_group_id_fkey,
  ADD CONSTRAINT traveler_split_group_members_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.traveler_split_groups(id) ON DELETE RESTRICT;

-- ===== D. tour_leaders(id) → RESTRICT =====
ALTER TABLE public.leader_availability
  DROP CONSTRAINT leader_availability_leader_id_fkey,
  ADD CONSTRAINT leader_availability_leader_id_fkey
    FOREIGN KEY (leader_id) REFERENCES public.tour_leaders(id) ON DELETE RESTRICT;

ALTER TABLE public.leader_schedules
  DROP CONSTRAINT leader_schedules_leader_id_fkey,
  ADD CONSTRAINT leader_schedules_leader_id_fkey
    FOREIGN KEY (leader_id) REFERENCES public.tour_leaders(id) ON DELETE RESTRICT;

-- ===== E. fleet_vehicles(id) → RESTRICT =====
ALTER TABLE public.fleet_schedules
  DROP CONSTRAINT fleet_schedules_vehicle_id_fkey,
  ADD CONSTRAINT fleet_schedules_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES public.fleet_vehicles(id) ON DELETE RESTRICT;

ALTER TABLE public.fleet_vehicle_logs
  DROP CONSTRAINT fleet_vehicle_logs_vehicle_id_fkey,
  ADD CONSTRAINT fleet_vehicle_logs_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES public.fleet_vehicles(id) ON DELETE RESTRICT;

-- ===== F. projects(id) → RESTRICT =====
ALTER TABLE public.decisions_log
  DROP CONSTRAINT decisions_log_project_id_fkey,
  ADD CONSTRAINT decisions_log_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;

ALTER TABLE public.tasks
  DROP CONSTRAINT tasks_project_id_fkey,
  ADD CONSTRAINT tasks_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;

-- ===== G. customer_assigned_itineraries(id) → RESTRICT =====
ALTER TABLE public.customization_requests
  DROP CONSTRAINT customization_requests_assigned_itinerary_id_fkey,
  ADD CONSTRAINT customization_requests_assigned_itinerary_id_fkey
    FOREIGN KEY (assigned_itinerary_id) REFERENCES public.customer_assigned_itineraries(id) ON DELETE RESTRICT;

ALTER TABLE public.trip_members
  DROP CONSTRAINT trip_members_assigned_itinerary_id_fkey,
  ADD CONSTRAINT trip_members_assigned_itinerary_id_fkey
    FOREIGN KEY (assigned_itinerary_id) REFERENCES public.customer_assigned_itineraries(id) ON DELETE RESTRICT;
