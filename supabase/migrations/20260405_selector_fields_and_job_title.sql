-- ============================================
-- 選人欄位系統 + 員工職稱
-- 1. workspace_job_roles 移除 scope（職務變純標籤）
-- 2. 新增 workspace_selector_fields（選人欄位定義）
-- 3. 新增 selector_field_roles（欄位→職務映射）
-- 4. employees 新增 job_title（名片用職稱）
-- ============================================

BEGIN;

-- ============================================
-- 1. workspace_job_roles 移除 scope + is_required
--    職務現在是純標籤，scope 和 is_required 移到 selector_fields
-- ============================================

ALTER TABLE public.workspace_job_roles DROP COLUMN IF EXISTS scope;
ALTER TABLE public.workspace_job_roles DROP COLUMN IF EXISTS is_required;

-- ============================================
-- 2. 選人欄位定義（租戶自訂）
--    例如：團控(tour)、助理(tour)、業務(order)
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_selector_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('tour', 'order')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

-- 索引
CREATE INDEX idx_workspace_selector_fields_workspace
  ON public.workspace_selector_fields(workspace_id);

-- RLS
ALTER TABLE public.workspace_selector_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_selector_fields FORCE ROW LEVEL SECURITY;

CREATE POLICY "workspace_selector_fields_select"
  ON public.workspace_selector_fields FOR SELECT
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

CREATE POLICY "workspace_selector_fields_insert"
  ON public.workspace_selector_fields FOR INSERT
  WITH CHECK (workspace_id = get_current_user_workspace());

CREATE POLICY "workspace_selector_fields_update"
  ON public.workspace_selector_fields FOR UPDATE
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

CREATE POLICY "workspace_selector_fields_delete"
  ON public.workspace_selector_fields FOR DELETE
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 3. 欄位→職務映射（多對多）
--    例如：「團控」欄位 → 管理員
--         「助理」欄位 → 助理、管理員
-- ============================================

CREATE TABLE IF NOT EXISTS public.selector_field_roles (
  field_id UUID NOT NULL REFERENCES public.workspace_selector_fields(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.workspace_job_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (field_id, role_id)
);

-- 索引
CREATE INDEX idx_selector_field_roles_field
  ON public.selector_field_roles(field_id);
CREATE INDEX idx_selector_field_roles_role
  ON public.selector_field_roles(role_id);

-- RLS（透過 field_id FK 查 workspace）
ALTER TABLE public.selector_field_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selector_field_roles FORCE ROW LEVEL SECURITY;

CREATE POLICY "selector_field_roles_select"
  ON public.selector_field_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_selector_fields
      WHERE workspace_selector_fields.id = selector_field_roles.field_id
        AND (workspace_selector_fields.workspace_id = get_current_user_workspace()
             OR is_super_admin())
    )
  );

CREATE POLICY "selector_field_roles_insert"
  ON public.selector_field_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_selector_fields
      WHERE workspace_selector_fields.id = selector_field_roles.field_id
        AND workspace_selector_fields.workspace_id = get_current_user_workspace()
    )
  );

CREATE POLICY "selector_field_roles_update"
  ON public.selector_field_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_selector_fields
      WHERE workspace_selector_fields.id = selector_field_roles.field_id
        AND (workspace_selector_fields.workspace_id = get_current_user_workspace()
             OR is_super_admin())
    )
  );

CREATE POLICY "selector_field_roles_delete"
  ON public.selector_field_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_selector_fields
      WHERE workspace_selector_fields.id = selector_field_roles.field_id
        AND (workspace_selector_fields.workspace_id = get_current_user_workspace()
             OR is_super_admin())
    )
  );

-- ============================================
-- 4. employees 新增 job_title（名片用職稱）
-- ============================================

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_title TEXT;

-- ============================================
-- 5. 為角落旅行社寫入預設選人欄位 + 映射
-- ============================================

DO $$
DECLARE
  ws_id UUID;
  controller_role_id UUID;
  assistant_role_id UUID;
  sales_role_id UUID;
  field_controller_id UUID;
  field_assistant_id UUID;
  field_sales_id UUID;
BEGIN
  SELECT id INTO ws_id FROM workspaces WHERE name = '角落旅行社' LIMIT 1;
  IF ws_id IS NULL THEN RETURN; END IF;

  -- 取得職務 ID
  SELECT id INTO controller_role_id FROM workspace_job_roles WHERE workspace_id = ws_id AND name = '管理員';
  SELECT id INTO assistant_role_id FROM workspace_job_roles WHERE workspace_id = ws_id AND name = '助理';
  SELECT id INTO sales_role_id FROM workspace_job_roles WHERE workspace_id = ws_id AND name = '業務';

  -- 建立選人欄位
  INSERT INTO workspace_selector_fields (workspace_id, name, level, is_required, sort_order)
  VALUES
    (ws_id, '團控', 'tour', false, 1),
    (ws_id, '助理', 'tour', false, 2),
    (ws_id, '業務', 'order', true, 3)
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- 取得欄位 ID
  SELECT id INTO field_controller_id FROM workspace_selector_fields WHERE workspace_id = ws_id AND name = '團控';
  SELECT id INTO field_assistant_id FROM workspace_selector_fields WHERE workspace_id = ws_id AND name = '助理';
  SELECT id INTO field_sales_id FROM workspace_selector_fields WHERE workspace_id = ws_id AND name = '業務';

  -- 建立映射
  IF field_controller_id IS NOT NULL AND controller_role_id IS NOT NULL THEN
    INSERT INTO selector_field_roles (field_id, role_id) VALUES (field_controller_id, controller_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF field_assistant_id IS NOT NULL AND assistant_role_id IS NOT NULL THEN
    INSERT INTO selector_field_roles (field_id, role_id) VALUES (field_assistant_id, assistant_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 助理欄位也可選管理員
  IF field_assistant_id IS NOT NULL AND controller_role_id IS NOT NULL THEN
    INSERT INTO selector_field_roles (field_id, role_id) VALUES (field_assistant_id, controller_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF field_sales_id IS NOT NULL AND sales_role_id IS NOT NULL THEN
    INSERT INTO selector_field_roles (field_id, role_id) VALUES (field_sales_id, sales_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
