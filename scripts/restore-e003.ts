import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

async function restoreE003() {
  console.log('🔧 補回 E003 員工...\n')

  // 先查詢 Corner workspace ID
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, code')
    .eq('code', 'CORNER')
    .single()

  if (!workspace) {
    console.error('❌ 找不到 CORNER workspace')
    return
  }

  console.log('✅ Workspace:', workspace.code, '(', workspace.id, ')')

  // 插入 E003（最小欄位）
  const { data, error } = await supabase
    .from('employees')
    .insert({
      employee_number: 'E003',
      chinese_name: '黃亞萍',
      display_name: '黃亞萍',
      status: 'active',
      employee_type: 'human',
      workspace_id: workspace.id,
    })
    .select()
    .single()

  if (error) {
    console.error('❌ 插入失敗:', error)
    return
  }

  console.log('\n✅ E003 已建立:')
  console.log('員工編號:', data.employee_number)
  console.log('姓名:', data.chinese_name)
  console.log('部門:', data.department)
  console.log('職位:', data.position)
  console.log('Email:', data.email)
  console.log('\n🎉 完成！請在 ERP 編輯補完其他資料')
}

restoreE003().then(() => process.exit(0))
