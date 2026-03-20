/**
 * 初始化会计科目表（61 个科目）
 */

import { createClient } from '@supabase/supabase-js'
import { DEFAULT_ACCOUNTS } from '../src/types/accounting.types'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('❌ 需要设置 SUPABASE_SERVICE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('开始初始化科目表...\n')

  // 获取 workspace_id
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .limit(1)

  if (!workspaces || workspaces.length === 0) {
    console.error('❌ 找不到 workspace')
    return
  }

  const workspaceId = workspaces[0].id
  console.log(`Workspace: ${workspaces[0].name} (${workspaceId})`)

  // 检查是否已有科目
  const { data: existing } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('⚠️  科目表已存在，跳过初始化')
    return
  }

  // 插入科目
  const accountsToInsert = DEFAULT_ACCOUNTS.map(account => {
    const { type, ...accountData } = account as any
    return {
      ...accountData,
      workspace_id: workspaceId,
      is_favorite: false,
      usage_count: 0,
      last_used_at: null,
    }
  })

  console.log(`准备插入 ${accountsToInsert.length} 个科目...`)

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert(accountsToInsert)
    .select()

  if (error) {
    console.error('❌ 插入失败:', error)
    return
  }

  console.log(`✅ 成功插入 ${data?.length || 0} 个科目`)
  console.log('\n科目列表：')
  data?.forEach(acc => {
    console.log(`  ${acc.code} ${acc.name} (${acc.account_type})`)
  })
}

main().catch(console.error)
