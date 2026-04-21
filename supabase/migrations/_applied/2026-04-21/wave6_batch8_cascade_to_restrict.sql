-- ============================================================
-- Wave 6 Batch 8: CASCADE → RESTRICT (6 FKs, auth.users selective)
-- Executed via Management API: 2026-04-21
--
-- auth.users has 20 CASCADE children. Most are personal/UI data
-- where CASCADE matches the Supabase GDPR-style "user deletes account →
-- personal data goes" expectation. Flip only the audit/financial/cross-entity:
--
--   - accounting_accounts.user_id         — financial ledger
--   - accounting_transactions.user_id     — financial ledger
--   - tour_expenses.leader_id (Tour_Expenses_leader_id_fkey) — tour finance
--   - employees.user_id                   — employees are ERP-side entities
--                                           and must not disappear when an
--                                           auth user is deleted. Use soft-delete.
--   - private_messages.sender_id          — DM retains audit value
--   - private_messages.receiver_id        — DM retains audit value
--
-- KEPT as CASCADE (14, documented in BACKLOG, William may revisit):
--   - profiles.id / traveler_profiles.id  (Supabase 1:1 extension pattern)
--   - body_measurements / designer_drafts / friends(user_id, friend_id)
--   - itinerary_permissions / personal_records / progress_photos
--   - timebox_boxes / timebox_scheduled_boxes / timebox_weeks / timebox_workout_templates
--   - traveler_conversation_members.user_id
--
-- Zero row impact. Schema metadata only.
-- ============================================================

ALTER TABLE public.accounting_accounts
  DROP CONSTRAINT accounting_accounts_user_id_fkey,
  ADD CONSTRAINT accounting_accounts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.accounting_transactions
  DROP CONSTRAINT accounting_transactions_user_id_fkey,
  ADD CONSTRAINT accounting_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.tour_expenses
  DROP CONSTRAINT "Tour_Expenses_leader_id_fkey",
  ADD CONSTRAINT "Tour_Expenses_leader_id_fkey"
    FOREIGN KEY (leader_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.employees
  DROP CONSTRAINT employees_user_id_fkey,
  ADD CONSTRAINT employees_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.private_messages
  DROP CONSTRAINT private_messages_receiver_id_fkey,
  ADD CONSTRAINT private_messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.private_messages
  DROP CONSTRAINT private_messages_sender_id_fkey,
  ADD CONSTRAINT private_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
