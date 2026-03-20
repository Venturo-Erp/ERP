/**
 * 补充台湾官方标准会计科目表
 * 7XXX 营业外收入及利益
 * 8XXX 营业外费用及损失
 * 9XXX 所得税费用
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('❌ 需要设置 SUPABASE_SERVICE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 官方标准科目（7XXX, 8XXX, 9XXX）
const OFFICIAL_ACCOUNTS = [
  // ============================================
  // 7XXX 营业外收入及利益
  // ============================================
  { code: '7100', name: '利息收入', account_type: 'revenue', description: '存款利息、債券利息' },
  { code: '7110', name: '股利收入', account_type: 'revenue', description: '股票股利' },
  { code: '7200', name: '租金收入', account_type: 'revenue', description: '出租資產租金' },
  { code: '7300', name: '權利金收入', account_type: 'revenue', description: '授權金' },
  { code: '7400', name: '投資利益', account_type: 'revenue', description: '權益法認列' },
  { code: '7500', name: '處分投資利益', account_type: 'revenue', description: '出售投資獲利' },
  { code: '7600', name: '處分資產利益', account_type: 'revenue', description: '出售固定資產獲利' },
  { code: '7700', name: '兌換利益', account_type: 'revenue', description: '外幣兌換獲利' },
  { code: '7800', name: '減損迴轉利益', account_type: 'revenue', description: '資產減損迴轉' },
  { code: '7900', name: '雜項收入', account_type: 'revenue', description: '其他營業外收入' },
  { code: '7910', name: '租稅退款收入', account_type: 'revenue', description: '退稅' },
  { code: '7920', name: '盤盈', account_type: 'revenue', description: '盤點盈餘' },
  { code: '7930', name: '罰款收入', account_type: 'revenue', description: '違約金收入' },
  { code: '7940', name: '逾期帳款收回', account_type: 'revenue', description: '已沖銷帳款收回' },

  // ============================================
  // 8XXX 营业外费用及损失
  // ============================================
  { code: '8100', name: '利息費用', account_type: 'expense', description: '借款利息' },
  { code: '8200', name: '投資損失', account_type: 'expense', description: '權益法認列損失' },
  { code: '8300', name: '處分投資損失', account_type: 'expense', description: '出售投資損失' },
  { code: '8400', name: '處分資產損失', account_type: 'expense', description: '出售固定資產損失' },
  { code: '8500', name: '兌換損失', account_type: 'expense', description: '外幣兌換損失' },
  { code: '8600', name: '減損損失', account_type: 'expense', description: '資產減損' },
  { code: '8700', name: '呆帳損失', account_type: 'expense', description: '無法收回款項' },
  { code: '8800', name: '災害損失', account_type: 'expense', description: '天災、火災等' },
  { code: '8900', name: '雜項費損', account_type: 'expense', description: '其他營業外費損' },
  { code: '8910', name: '盤損', account_type: 'expense', description: '盤點短絀' },
  { code: '8920', name: '罰款支出', account_type: 'expense', description: '違約金、罰金' },
  { code: '8930', name: '捐贈', account_type: 'expense', description: '對外捐贈' },
  { code: '8940', name: '非常損失', account_type: 'expense', description: '非經常性損失' },

  // ============================================
  // 9XXX 所得税费用
  // ============================================
  { code: '9100', name: '所得稅費用', account_type: 'expense', description: '營利事業所得稅' },
  { code: '9110', name: '當期所得稅', account_type: 'expense', description: '本期應納稅額' },
  { code: '9120', name: '遞延所得稅', account_type: 'expense', description: '時間性差異' },
  { code: '9130', name: '未分配盈餘稅', account_type: 'expense', description: '5% 未分配盈餘加徵' },
  { code: '9200', name: '所得稅利益', account_type: 'revenue', description: '所得稅迴轉利益' },
  { code: '9210', name: '遞延所得稅利益', account_type: 'revenue', description: '時間性差異迴轉' },

  // ============================================
  // 额外补充（其他常用科目）
  // ============================================
  // 1XXX 资产补充
  { code: '1900', name: '其他流動資產', account_type: 'asset', description: null },
  { code: '1910', name: '留抵稅額', account_type: 'asset', description: '進項稅額留抵' },
  { code: '1920', name: '遞延費用－流動', account_type: 'asset', description: '一年內攤銷' },
  { code: '1990', name: '其他非流動資產', account_type: 'asset', description: null },

  // 2XXX 负债补充
  { code: '2800', name: '一年或一營業週期內到期長期負債', account_type: 'liability', description: null },
  { code: '2810', name: '應付公司債－流動', account_type: 'liability', description: '一年內到期' },
  { code: '2820', name: '應付長期借款－流動', account_type: 'liability', description: '一年內到期' },
  { code: '2900', name: '遞延所得稅負債', account_type: 'liability', description: '時間性差異' },
  { code: '2950', name: '應計退休金負債', account_type: 'liability', description: null },
  { code: '2960', name: '其他非流動負債', account_type: 'liability', description: null },

  // 3XXX 权益补充
  { code: '3500', name: '其他權益', account_type: 'equity', description: null },
  { code: '3510', name: '國外營運機構財務報表換算之兌換差額', account_type: 'equity', description: null },
  { code: '3520', name: '透過其他綜合損益按公允價值衡量之金融資產未實現評價損益', account_type: 'equity', description: null },
  { code: '3530', name: '備供出售金融資產未實現損益', account_type: 'equity', description: null },
  { code: '3540', name: '確定福利計畫之再衡量數', account_type: 'equity', description: null },

  // 4XXX 收入补充（细分）
  { code: '4500', name: '銷貨收入淨額', account_type: 'revenue', description: '扣除退回折讓後' },
  { code: '4600', name: '勞務收入', account_type: 'revenue', description: '提供服務收入' },
  { code: '4700', name: '工程收入', account_type: 'revenue', description: '建造合約收入' },

  // 5XXX 成本补充（细分）
  { code: '5500', name: '銷貨成本淨額', account_type: 'cost', description: '扣除退回折讓後' },
  { code: '5600', name: '勞務成本', account_type: 'cost', description: '提供服務成本' },
  { code: '5700', name: '工程成本', account_type: 'cost', description: '建造合約成本' },

  // 6XXX 费用补充（营业费用细分）
  { code: '6000', name: '推銷費用', account_type: 'expense', description: '銷售部門費用' },
  { code: '6001', name: '薪資－推銷', account_type: 'expense', description: null },
  { code: '6002', name: '佣金', account_type: 'expense', description: null },
  { code: '6003', name: '運費', account_type: 'expense', description: null },
  { code: '6004', name: '廣告費', account_type: 'expense', description: null },
  { code: '6005', name: '樣品費', account_type: 'expense', description: null },
  { code: '6100', name: '管理費用', account_type: 'expense', description: '管理部門費用' },
  { code: '6101', name: '薪資－管理', account_type: 'expense', description: null },
  { code: '6102', name: '租金', account_type: 'expense', description: null },
  { code: '6103', name: '折舊', account_type: 'expense', description: null },
  { code: '6104', name: '保險費', account_type: 'expense', description: null },
  { code: '6105', name: '修繕費', account_type: 'expense', description: null },
  { code: '6200', name: '研究發展費用', account_type: 'expense', description: '研發部門費用' },
  { code: '6201', name: '薪資－研發', account_type: 'expense', description: null },
  { code: '6202', name: '材料費', account_type: 'expense', description: null },
]

async function main() {
  console.log('开始补充官方标准会计科目...\n')

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

  // 检查现有科目数量
  const { data: existing, count } = await supabase
    .from('chart_of_accounts')
    .select('code', { count: 'exact' })
    .eq('workspace_id', workspaceId)

  console.log(`\n现有科目数量: ${count}`)

  // 过滤已存在的科目
  const existingCodes = new Set(existing?.map(a => a.code) || [])
  const toInsert = OFFICIAL_ACCOUNTS.filter(acc => !existingCodes.has(acc.code))

  if (toInsert.length === 0) {
    console.log('⚠️  所有科目已存在，无需新增')
    return
  }

  console.log(`准备新增 ${toInsert.length} 个科目...`)

  // 插入新科目
  const accountsToInsert = toInsert.map(account => ({
    workspace_id: workspaceId,
    code: account.code,
    name: account.name,
    account_type: account.account_type,
    description: account.description,
    parent_id: null,
    is_system_locked: false,
    is_active: true,
    is_favorite: false,
    usage_count: 0,
    last_used_at: null,
  }))

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert(accountsToInsert)
    .select()

  if (error) {
    console.error('❌ 插入失败:', error)
    return
  }

  console.log(`✅ 成功新增 ${data?.length || 0} 个科目`)

  // 统计最终科目数量
  const { count: finalCount } = await supabase
    .from('chart_of_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  console.log(`\n最终科目总数: ${finalCount}`)

  // 按类型统计
  const { data: byType } = await supabase
    .from('chart_of_accounts')
    .select('account_type')
    .eq('workspace_id', workspaceId)

  const typeCounts = byType?.reduce((acc, a) => {
    acc[a.account_type] = (acc[a.account_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n各类型科目数量:')
  Object.entries(typeCounts || {}).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} 个`)
  })

  console.log('\n新增的科目列表（前 30 个）:')
  data?.sort((a, b) => a.code.localeCompare(b.code)).slice(0, 30).forEach(acc => {
    console.log(`  ${acc.code} ${acc.name} (${acc.account_type})`)
  })

  if (data && data.length > 30) {
    console.log(`  ... 还有 ${data.length - 30} 个科目`)
  }
}

main().catch(console.error)
