-- ============================================================
-- Wave 6 Batch 7: CASCADE → RESTRICT (12 FKs)
-- Executed via Management API: 2026-04-21
--
-- William decision: all CASCADE → RESTRICT unless clear composition.
--
-- Changed to RESTRICT (12) — traveler_profiles(id) whole group:
--   - social_group_members.user_id
--   - social_groups.created_by
--   - traveler_badges.user_id
--   - traveler_expense_splits.user_id
--   - traveler_friends.friend_id
--   - traveler_friends.user_id
--   - traveler_split_groups.created_by
--   - traveler_tour_cache.traveler_id
--   - traveler_trip_invitations.invitee_id
--   - traveler_trip_invitations.inviter_id
--   - traveler_trip_members.user_id
--   - traveler_trips.created_by
--
-- Why: C 端 traveler profiles should use soft-delete. Real DELETE of a
-- profile previously meant CASCADE-wipe of every group / trip / settlement
-- they ever created — catastrophic. Block it at schema level.
-- Analogous to employees batch (B6) and traveler_trips batch (B5).
--
-- Zero row impact. Schema metadata only.
-- ============================================================

ALTER TABLE public.social_group_members
  DROP CONSTRAINT social_group_members_user_id_fkey,
  ADD CONSTRAINT social_group_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.social_groups
  DROP CONSTRAINT social_groups_created_by_fkey,
  ADD CONSTRAINT social_groups_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_badges
  DROP CONSTRAINT traveler_badges_user_id_fkey,
  ADD CONSTRAINT traveler_badges_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_expense_splits
  DROP CONSTRAINT traveler_expense_splits_user_id_fkey,
  ADD CONSTRAINT traveler_expense_splits_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_friends
  DROP CONSTRAINT traveler_friends_friend_id_fkey,
  ADD CONSTRAINT traveler_friends_friend_id_fkey
    FOREIGN KEY (friend_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_friends
  DROP CONSTRAINT traveler_friends_user_id_fkey,
  ADD CONSTRAINT traveler_friends_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_split_groups
  DROP CONSTRAINT traveler_split_groups_created_by_fkey,
  ADD CONSTRAINT traveler_split_groups_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_tour_cache
  DROP CONSTRAINT traveler_tour_cache_traveler_id_fkey,
  ADD CONSTRAINT traveler_tour_cache_traveler_id_fkey
    FOREIGN KEY (traveler_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_invitations
  DROP CONSTRAINT traveler_trip_invitations_invitee_id_fkey,
  ADD CONSTRAINT traveler_trip_invitations_invitee_id_fkey
    FOREIGN KEY (invitee_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_invitations
  DROP CONSTRAINT traveler_trip_invitations_inviter_id_fkey,
  ADD CONSTRAINT traveler_trip_invitations_inviter_id_fkey
    FOREIGN KEY (inviter_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trip_members
  DROP CONSTRAINT traveler_trip_members_user_id_fkey,
  ADD CONSTRAINT traveler_trip_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.traveler_trips
  DROP CONSTRAINT traveler_trips_created_by_fkey,
  ADD CONSTRAINT traveler_trips_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.traveler_profiles(id) ON DELETE RESTRICT;
