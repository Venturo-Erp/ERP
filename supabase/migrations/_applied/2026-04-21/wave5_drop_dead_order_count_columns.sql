-- ============================================================
-- Wave 5: DROP 3 dead passenger-count columns on orders
-- Executed via Management API: 2026-04-21
--
-- Reason: A5 agent discovery + BEFORE verification
--   - child_count:    0 nonzero rows   → dead
--   - infant_count:   0 nonzero rows   → dead
--   - total_people:   0 nonzero rows   → dead (apparent duplicate)
--   - adult_count:    3 nonzero rows (all TESTUX)  → KEPT for now
--   - member_count:   20 nonzero rows, live SSOT   → KEPT
--
-- Red line check: No CORNER / JINGYAO / YUFEN row has values
-- in these columns. Data is zero across real tenants.
-- ============================================================

ALTER TABLE public.orders DROP COLUMN IF EXISTS child_count;
ALTER TABLE public.orders DROP COLUMN IF EXISTS infant_count;
ALTER TABLE public.orders DROP COLUMN IF EXISTS total_people;
