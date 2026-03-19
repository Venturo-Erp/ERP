-- 票據管理（支票管理）
-- 建立日期：2026-03-19

BEGIN;

-- ============================================
-- 票據/支票管理表
-- ============================================
CREATE TABLE IF NOT EXISTS public.checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) NOT NULL,
  check_number text NOT NULL,
  check_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  bank_account_id uuid REFERENCES public.erp_bank_accounts(id),
  payee_type text CHECK (payee_type IN ('supplier', 'employee', 'other')),
  payee_id uuid,
  payee_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'voided', 'bounced')),
  payment_request_id uuid REFERENCES public.payment_requests(id),
  voucher_id uuid,
  memo text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, check_number)
);

COMMENT ON TABLE public.checks IS '票據/支票管理';
COMMENT ON COLUMN public.checks.status IS 'pending:未兌現, cleared:已兌現, voided:作廢, bounced:退票';
COMMENT ON COLUMN public.checks.payee_type IS 'supplier:供應商, employee:員工, other:其他';

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_checks_workspace ON public.checks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checks_status ON public.checks(status);
CREATE INDEX IF NOT EXISTS idx_checks_due_date ON public.checks(due_date);
CREATE INDEX IF NOT EXISTS idx_checks_payee ON public.checks(payee_type, payee_id);
CREATE INDEX IF NOT EXISTS idx_checks_payment_request ON public.checks(payment_request_id);

-- ============================================
-- RLS 政策
-- ============================================
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checks_select" ON public.checks;
CREATE POLICY "checks_select" ON public.checks FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "checks_insert" ON public.checks;
CREATE POLICY "checks_insert" ON public.checks FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "checks_update" ON public.checks;
CREATE POLICY "checks_update" ON public.checks FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "checks_delete" ON public.checks;
CREATE POLICY "checks_delete" ON public.checks FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

COMMIT;
