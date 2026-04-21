-- ============================================================
-- Wave 6 Batch 9: CASCADE → RESTRICT (6 FKs) — cleanup of small-group financial/audit parents
-- Executed via Management API: 2026-04-21
--
-- Scanned remaining 38 CASCADE FKs across misc parents. Most are:
--   - header/detail pattern (journal_vouchers→journal_lines, emails→attachments)
--   - composition (folders parent_id self-ref, brochure_versions, itinerary_versions)
--   - assignment-follows-resource (tour_room/table/vehicle assignments)
-- Those keep CASCADE. This batch flips only the six where history/audit value
-- must outlive the parent:
--
--   1. linkpay_logs.receipt_number  → receipts
--       Payment gateway logs must not vanish when a receipt row is purged.
--   2. invoice_orders.invoice_id    → travel_invoices
--       Invoice-order pairing is a financial record.
--   3. opening_balances.account_id  → chart_of_accounts
--       Opening balances are year-end close artifacts.
--   4. accounting_transactions.account_id → accounting_accounts
--       Deleting an account must not erase its transaction history.
--   5. payroll_records.payroll_period_id → payroll_periods
--       Historical payroll records survive a payroll period deletion.
--   6. file_audit_logs.file_id      → files
--       Audit logs outliving the file they describe is the whole point.
--
-- Zero row impact. Schema metadata only.
-- ============================================================

ALTER TABLE public.linkpay_logs
  DROP CONSTRAINT linkpay_logs_receipt_number_fkey,
  ADD CONSTRAINT linkpay_logs_receipt_number_fkey
    FOREIGN KEY (receipt_number) REFERENCES public.receipts(receipt_number) ON DELETE RESTRICT;

ALTER TABLE public.invoice_orders
  DROP CONSTRAINT invoice_orders_invoice_id_fkey,
  ADD CONSTRAINT invoice_orders_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.travel_invoices(id) ON DELETE RESTRICT;

ALTER TABLE public.opening_balances
  DROP CONSTRAINT opening_balances_account_id_fkey,
  ADD CONSTRAINT opening_balances_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT;

ALTER TABLE public.accounting_transactions
  DROP CONSTRAINT accounting_transactions_account_id_fkey,
  ADD CONSTRAINT accounting_transactions_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.accounting_accounts(id) ON DELETE RESTRICT;

ALTER TABLE public.payroll_records
  DROP CONSTRAINT payroll_records_payroll_period_id_fkey,
  ADD CONSTRAINT payroll_records_payroll_period_id_fkey
    FOREIGN KEY (payroll_period_id) REFERENCES public.payroll_periods(id) ON DELETE RESTRICT;

ALTER TABLE public.file_audit_logs
  DROP CONSTRAINT file_audit_logs_file_id_fkey,
  ADD CONSTRAINT file_audit_logs_file_id_fkey
    FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE RESTRICT;
