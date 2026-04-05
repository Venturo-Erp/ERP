-- ============================================
-- 職務角色系統：租戶自訂團務/訂單角色
-- ============================================

-- 1. 職務定義（租戶設定）
CREATE TABLE IF NOT EXISTS workspace_job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('tour', 'order')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

-- 2. 員工職務（多對多）
CREATE TABLE IF NOT EXISTS employee_job_roles (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES workspace_job_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, role_id)
);

-- 3. 團/訂單角色指派（tours.id 和 orders.id 為 text 型別）
CREATE TABLE IF NOT EXISTS tour_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES workspace_job_roles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tour_id, order_id, role_id)
);

-- 索引
CREATE INDEX idx_workspace_job_roles_workspace ON workspace_job_roles(workspace_id);
CREATE INDEX idx_employee_job_roles_employee ON employee_job_roles(employee_id);
CREATE INDEX idx_employee_job_roles_role ON employee_job_roles(role_id);
CREATE INDEX idx_tour_role_assignments_tour ON tour_role_assignments(tour_id);
CREATE INDEX idx_tour_role_assignments_order ON tour_role_assignments(order_id);

-- RLS
ALTER TABLE workspace_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_job_roles_all" ON workspace_job_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "employee_job_roles_all" ON employee_job_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tour_role_assignments_all" ON tour_role_assignments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 為角落旅行社寫入預設職務
-- ============================================
DO $$
DECLARE
  ws_id UUID;
BEGIN
  -- 取得角落旅行社的 workspace_id
  SELECT id INTO ws_id FROM workspaces WHERE name = '角落旅行社' LIMIT 1;

  IF ws_id IS NOT NULL THEN
    INSERT INTO workspace_job_roles (workspace_id, name, scope, is_required, sort_order) VALUES
      (ws_id, '管理員', 'tour', true, 1),
      (ws_id, '助理', 'tour', false, 2),
      (ws_id, '業務', 'order', true, 3)
    ON CONFLICT (workspace_id, name) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 遷移現有資料到新表
-- ============================================
DO $$
DECLARE
  ws_id UUID;
  controller_role_id UUID;
  sales_role_id UUID;
  assistant_role_id UUID;
  r RECORD;
  emp_id UUID;
BEGIN
  SELECT id INTO ws_id FROM workspaces WHERE name = '角落旅行社' LIMIT 1;
  IF ws_id IS NULL THEN RETURN; END IF;

  SELECT id INTO controller_role_id FROM workspace_job_roles WHERE workspace_id = ws_id AND name = '管理員';
  SELECT id INTO sales_role_id FROM workspace_job_roles WHERE workspace_id = ws_id AND name = '業務';
  SELECT id INTO assistant_role_id FROM workspace_job_roles WHERE workspace_id = ws_id AND name = '助理';

  -- 遷移團的 controller_id → tour_role_assignments
  IF controller_role_id IS NOT NULL THEN
    FOR r IN SELECT id, controller_id FROM tours WHERE controller_id IS NOT NULL AND workspace_id = ws_id
    LOOP
      INSERT INTO tour_role_assignments (tour_id, role_id, employee_id)
      VALUES (r.id, controller_role_id, r.controller_id)
      ON CONFLICT (tour_id, order_id, role_id) DO NOTHING;
    END LOOP;
  END IF;

  -- 遷移訂單的 sales_person（名字）→ 對照 employees 找 ID
  IF sales_role_id IS NOT NULL THEN
    FOR r IN SELECT id, tour_id, sales_person FROM orders WHERE sales_person IS NOT NULL AND sales_person != ''
    LOOP
      SELECT e.id INTO emp_id FROM employees e
        WHERE (e.chinese_name = r.sales_person OR e.display_name = r.sales_person OR e.english_name = r.sales_person)
        LIMIT 1;
      IF emp_id IS NOT NULL AND r.tour_id IS NOT NULL THEN
        INSERT INTO tour_role_assignments (tour_id, order_id, role_id, employee_id)
        VALUES (r.tour_id, r.id, sales_role_id, emp_id)
        ON CONFLICT (tour_id, order_id, role_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 遷移訂單的 assistant（名字）→ 對照 employees 找 ID
  IF assistant_role_id IS NOT NULL THEN
    FOR r IN SELECT id, tour_id, assistant FROM orders WHERE assistant IS NOT NULL AND assistant != ''
    LOOP
      SELECT e.id INTO emp_id FROM employees e
        WHERE (e.chinese_name = r.assistant OR e.display_name = r.assistant OR e.english_name = r.assistant)
        LIMIT 1;
      IF emp_id IS NOT NULL AND r.tour_id IS NOT NULL THEN
        INSERT INTO tour_role_assignments (tour_id, order_id, role_id, employee_id)
        VALUES (r.tour_id, r.id, assistant_role_id, emp_id)
        ON CONFLICT (tour_id, order_id, role_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;
