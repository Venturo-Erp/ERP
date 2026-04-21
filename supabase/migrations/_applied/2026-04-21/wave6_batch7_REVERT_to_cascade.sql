-- ============================================================
-- Wave 6 Batch 7 REVERT: traveler_profiles RESTRICT → CASCADE (12 FKs)
-- Executed via Management API: 2026-04-21
--
-- 為什麼回滾：
-- William 在 session 後半指出：同一個客戶（UUID 在 auth.users 和
-- traveler_profiles 1:1 綁定）卻被我設了兩套不一致的刪除規則——
-- auth.users 層保留 CASCADE、traveler_profiles 層改 RESTRICT。
-- 這不是「雙層防禦」、是 SSOT 破碎。
--
-- 真正正確的做法（資料治理、非本 session 處理）：
--   - 靠 soft-delete flag + retention policy（N 年後自動清除）
--   - 不靠 FK RESTRICT 擋真刪
--
-- 回滾後一致性：跟 B8 保留 auth.users 14 條 CASCADE 對齊、
-- 遵循 Supabase GDPR 1:1 extension pattern。
-- Corner 現實：不真刪客戶（都 soft-delete）、兩種 schema 行為
-- 都不會被觸發、但恢復 CASCADE 讓 schema 自己內部一致。
--
-- Zero row impact. Schema metadata only.
-- ============================================================

ALTER TABLE public.social_group_members
  DROP CONSTRAINT social_group_members_user_id_fkey,
  ADD CONSTRAINT social_group_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.social_groups
  DROP CONSTRAINT social_groups_created_by_fkey,
  ADD CONSTRAINT social_groups_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_badges
  DROP CONSTRAINT traveler_badges_user_id_fkey,
  ADD CONSTRAINT traveler_badges_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_expense_splits
  DROP CONSTRAINT traveler_expense_splits_user_id_fkey,
  ADD CONSTRAINT traveler_expense_splits_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_friends
  DROP CONSTRAINT traveler_friends_friend_id_fkey,
  ADD CONSTRAINT traveler_friends_friend_id_fkey
    FOREIGN KEY (friend_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_friends
  DROP CONSTRAINT traveler_friends_user_id_fkey,
  ADD CONSTRAINT traveler_friends_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_split_groups
  DROP CONSTRAINT traveler_split_groups_created_by_fkey,
  ADD CONSTRAINT traveler_split_groups_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_tour_cache
  DROP CONSTRAINT traveler_tour_cache_traveler_id_fkey,
  ADD CONSTRAINT traveler_tour_cache_traveler_id_fkey
    FOREIGN KEY (traveler_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_trip_invitations
  DROP CONSTRAINT traveler_trip_invitations_invitee_id_fkey,
  ADD CONSTRAINT traveler_trip_invitations_invitee_id_fkey
    FOREIGN KEY (invitee_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_trip_invitations
  DROP CONSTRAINT traveler_trip_invitations_inviter_id_fkey,
  ADD CONSTRAINT traveler_trip_invitations_inviter_id_fkey
    FOREIGN KEY (inviter_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_trip_members
  DROP CONSTRAINT traveler_trip_members_user_id_fkey,
  ADD CONSTRAINT traveler_trip_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.traveler_trips
  DROP CONSTRAINT traveler_trips_created_by_fkey,
  ADD CONSTRAINT traveler_trips_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.traveler_profiles(id) ON DELETE CASCADE;
