-- 補齊 customer_service_conversations 缺少的欄位
ALTER TABLE customer_service_conversations
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id),
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT CHECK (follow_up_status IN ('pending', 'done')),
  ADD COLUMN IF NOT EXISTS follow_up_note TEXT;

-- workspace_id 索引
CREATE INDEX IF NOT EXISTS idx_conversations_workspace
  ON customer_service_conversations(workspace_id);

-- RLS
ALTER TABLE customer_service_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_workspace_read"
  ON customer_service_conversations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "conversations_workspace_update"
  ON customer_service_conversations FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));
