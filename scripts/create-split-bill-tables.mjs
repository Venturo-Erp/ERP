import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false },
})

async function createTables() {
  console.log('Creating split bill tables via RPC...')

  const sql = `
    -- 分帳專案表
    CREATE TABLE IF NOT EXISTS split_bill_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      owner_id UUID NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled')),
      total_amount DECIMAL(12, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 分帳專案成員表
    CREATE TABLE IF NOT EXISTS split_bill_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES split_bill_projects(id) ON DELETE CASCADE,
      user_id UUID,
      name TEXT NOT NULL,
      nickname TEXT,
      is_owner BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 分帳支出紀錄表
    CREATE TABLE IF NOT EXISTS split_bill_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES split_bill_projects(id) ON DELETE CASCADE,
      paid_by UUID NOT NULL REFERENCES split_bill_members(id) ON DELETE CASCADE,
      amount DECIMAL(12, 2) NOT NULL,
      category TEXT NOT NULL DEFAULT '其他',
      note TEXT,
      expense_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 建立索引
    CREATE INDEX IF NOT EXISTS idx_split_bill_projects_owner ON split_bill_projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_split_bill_members_project ON split_bill_members(project_id);
    CREATE INDEX IF NOT EXISTS idx_split_bill_expenses_project ON split_bill_expenses(project_id);
  `

  // 用 REST API 執行 SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })

  if (!response.ok) {
    // RPC 不存在，需要手動執行
    console.log('請在 Supabase Dashboard SQL Editor 執行以下 SQL：')
    console.log('')
    console.log('https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/sql/new')
    console.log('')
    console.log('---')
    console.log(sql)
    console.log('---')
  } else {
    console.log('Tables created successfully!')
  }
}

createTables()
