-- ============================================================
-- Wave 6 Batch 1: Critical CASCADE → RESTRICT
-- Executed via Management API: 2026-04-21
--
-- William decision (Phase A decision #2): all CASCADE → RESTRICT.
-- This batch covers the highest-risk chain-delete FKs.
--
-- Changed to RESTRICT (5):
--   1. payment_request_items.request_id — financial audit loss prevention
--   2. receipts.order_id                 — prevent silent receipt loss on order delete
--   3. traveler_messages.conversation_id — keep chat history if conversation purged
--   4. traveler_expenses.trip_id         — keep expense records if trip purged
--   5. traveler_expenses.split_group_id  — keep expenses if split group deleted
--
-- KEPT as CASCADE (3, with rationale):
--   - expense_categories.parent_id  → CASCADE is intentional for tree delete pattern
--   - messages.channel_id           → messages don't make sense without channel
--   - receipts.workspace_id         → workspace delete is catastrophic regardless
--
-- Zero row impact. Schema metadata only.
-- ============================================================

-- 1. Financial audit protection
ALTER TABLE public.payment_request_items
  DROP CONSTRAINT payment_request_items_request_id_fkey,
  ADD CONSTRAINT payment_request_items_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES public.payment_requests(id) ON DELETE RESTRICT;

-- 2. Receipts survive order deletion
ALTER TABLE public.receipts
  DROP CONSTRAINT receipts_order_id_fkey,
  ADD CONSTRAINT receipts_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;

-- 3. Traveler chat history preservation
ALTER TABLE public.traveler_messages
  DROP CONSTRAINT traveler_messages_conversation_id_fkey,
  ADD CONSTRAINT traveler_messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.traveler_conversations(id) ON DELETE RESTRICT;

-- 4. Traveler expense audit trail
ALTER TABLE public.traveler_expenses
  DROP CONSTRAINT traveler_expenses_trip_id_fkey,
  ADD CONSTRAINT traveler_expenses_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.traveler_trips(id) ON DELETE RESTRICT;

-- 5. Traveler split group expense audit
ALTER TABLE public.traveler_expenses
  DROP CONSTRAINT fk_traveler_expenses_split_group,
  ADD CONSTRAINT fk_traveler_expenses_split_group
    FOREIGN KEY (split_group_id) REFERENCES public.traveler_split_groups(id) ON DELETE RESTRICT;
