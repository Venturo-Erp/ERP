-- 租戶配置表（內部管理用，不開放給租戶自助設定）
CREATE TABLE IF NOT EXISTS messaging_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('messenger', 'instagram')),
  page_id TEXT NOT NULL,
  page_access_token TEXT NOT NULL,
  webhook_secret TEXT,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, platform, page_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_messaging_tenants_workspace ON messaging_tenants(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messaging_tenants_platform ON messaging_tenants(platform);
CREATE INDEX IF NOT EXISTS idx_messaging_tenants_active ON messaging_tenants(is_active);

-- RLS（只允許 service role 存取）
ALTER TABLE messaging_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON messaging_tenants
  FOR ALL
  USING (auth.role() = 'service_role');

-- 更新 customer_service_conversations 表（新增 platform 欄位）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_service_conversations'
    AND column_name = 'platform'
  ) THEN
    ALTER TABLE customer_service_conversations
    ADD COLUMN platform TEXT DEFAULT 'line' CHECK (platform IN ('line', 'messenger', 'instagram'));
  END IF;
END $$;

-- 註解
COMMENT ON TABLE messaging_tenants IS 'Messenger/Instagram 租戶配置（內部管理，非自助）';
COMMENT ON COLUMN messaging_tenants.page_access_token IS 'Meta Page Access Token';
COMMENT ON COLUMN messaging_tenants.webhook_secret IS 'Meta App Secret（用於驗證 webhook）';
COMMENT ON COLUMN messaging_tenants.system_prompt IS '客製化系統提示詞（選填）';
