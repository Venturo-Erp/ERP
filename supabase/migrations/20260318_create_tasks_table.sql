-- 冒險者公會任務系統
-- 建立時間：2026-03-18 04:58

-- 建立任務表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  assignees JSONB DEFAULT '[]'::jsonb,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  attachments JSONB DEFAULT '[]'::jsonb,
  tour_code TEXT,
  is_legacy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_tour_code ON tasks(tour_code);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 政策：查看
DROP POLICY IF EXISTS "Users can view workspace tasks" ON tasks;
CREATE POLICY "Users can view workspace tasks"
  ON tasks FOR SELECT
  USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 政策：建立
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (workspace_id = get_current_user_workspace());

-- 政策：更新
DROP POLICY IF EXISTS "Users can update workspace tasks" ON tasks;
CREATE POLICY "Users can update workspace tasks"
  ON tasks FOR UPDATE
  USING (workspace_id = get_current_user_workspace());

-- 政策：刪除
DROP POLICY IF EXISTS "Users can delete workspace tasks" ON tasks;
CREATE POLICY "Users can delete workspace tasks"
  ON tasks FOR DELETE
  USING (workspace_id = get_current_user_workspace());

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();
