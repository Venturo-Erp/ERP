/**
 * 扩充到完整会计科目表（100+ 科目）
 * 符合台湾企业会计准则
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('❌ 需要设置 SUPABASE_SERVICE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 新增的完整科目（补充到现有 58 个）
const ADDITIONAL_ACCOUNTS = [
  // ============================================
  // 资产扩充
  // ============================================
  // 投资
  { code: '1150', name: '短期投資', account_type: 'asset', description: '定存、短期債券、股票' },
  // 应收票据
  { code: '1160', name: '應收票據', account_type: 'asset', description: null },
  { code: '1170', name: '應收帳款－關係人', account_type: 'asset', description: '關係企業欠款' },
  {
    code: '1180',
    name: '備抵呆帳',
    account_type: 'asset',
    description: '負數資產（提列呆帳準備）',
  },
  { code: '1190', name: '其他應收款', account_type: 'asset', description: '員工借款、暫付款等' },
  // 存货细分
  { code: '1410', name: '商品存貨', account_type: 'asset', description: null },
  { code: '1420', name: '在途存貨', account_type: 'asset', description: null },
  { code: '1430', name: '寄銷品', account_type: 'asset', description: null },
  // 预付细分
  { code: '1520', name: '預付租金', account_type: 'asset', description: null },
  { code: '1530', name: '預付保險費', account_type: 'asset', description: null },
  // 固定资产细分
  { code: '1640', name: '傢俱設備', account_type: 'asset', description: null },
  { code: '1650', name: '租賃改良', account_type: 'asset', description: null },
  { code: '1660', name: '土地', account_type: 'asset', description: null },
  { code: '1670', name: '房屋建築', account_type: 'asset', description: null },
  { code: '1710', name: '累計折舊－辦公設備', account_type: 'asset', description: '負數資產' },
  { code: '1720', name: '累計折舊－電腦設備', account_type: 'asset', description: '負數資產' },
  { code: '1730', name: '累計折舊－運輸設備', account_type: 'asset', description: '負數資產' },
  { code: '1740', name: '累計折舊－傢俱設備', account_type: 'asset', description: '負數資產' },
  // 无形资产
  { code: '1820', name: '電腦軟體', account_type: 'asset', description: null },
  { code: '1830', name: '專利權', account_type: 'asset', description: null },
  { code: '1840', name: '商標權', account_type: 'asset', description: null },
  { code: '1850', name: '商譽', account_type: 'asset', description: null },
  { code: '1860', name: '遞延費用', account_type: 'asset', description: '開辦費等' },
  { code: '1870', name: '長期投資', account_type: 'asset', description: '長期股權、債券' },
  { code: '1880', name: '累計攤銷－無形資產', account_type: 'asset', description: '負數資產' },

  // ============================================
  // 负债扩充
  // ============================================
  // 应付票据
  { code: '2150', name: '應付票據', account_type: 'liability', description: null },
  {
    code: '2160',
    name: '應付帳款－關係人',
    account_type: 'liability',
    description: '關係企業欠款',
  },
  // 预收细分
  { code: '2110', name: '預收款項', account_type: 'liability', description: '一般預收款' },
  // 应付员工相关
  { code: '2630', name: '應付退休金', account_type: 'liability', description: null },
  { code: '2640', name: '應付員工紅利', account_type: 'liability', description: null },
  { code: '2650', name: '應付股利', account_type: 'liability', description: null },
  { code: '2660', name: '代扣所得稅', account_type: 'liability', description: null },
  { code: '2670', name: '應付特休假', account_type: 'liability', description: null },
  // 其他应付
  { code: '2710', name: '暫收款', account_type: 'liability', description: null },
  { code: '2720', name: '應付費用', account_type: 'liability', description: null },
  { code: '2730', name: '預收租金', account_type: 'liability', description: null },
  { code: '2740', name: '遞延收入', account_type: 'liability', description: null },
  // 长期负债
  { code: '2910', name: '應付公司債', account_type: 'liability', description: null },
  { code: '2920', name: '長期應付票據', account_type: 'liability', description: null },
  { code: '2930', name: '長期應付款', account_type: 'liability', description: null },

  // ============================================
  // 权益扩充
  // ============================================
  // 股本细分
  { code: '3110', name: '普通股股本', account_type: 'equity', description: null },
  { code: '3120', name: '特別股股本', account_type: 'equity', description: null },
  // 资本公积
  { code: '3210', name: '資本公積－股票溢價', account_type: 'equity', description: null },
  { code: '3220', name: '資本公積－受贈資產', account_type: 'equity', description: null },
  { code: '3230', name: '資本公積－其他', account_type: 'equity', description: null },
  // 保留盈余细分
  { code: '3310', name: '法定盈餘公積', account_type: 'equity', description: null },
  { code: '3320', name: '特別盈餘公積', account_type: 'equity', description: null },
  { code: '3330', name: '未分配盈餘', account_type: 'equity', description: null },
  // 其他权益
  { code: '3400', name: '庫藏股票', account_type: 'equity', description: '負數權益' },

  // ============================================
  // 收入扩充
  // ============================================
  { code: '4110', name: '銷貨收入', account_type: 'revenue', description: '實體商品銷售' },
  { code: '4120', name: '服務收入', account_type: 'revenue', description: null },
  { code: '4130', name: '手續費收入', account_type: 'revenue', description: null },
  { code: '4140', name: '佣金收入', account_type: 'revenue', description: null },
  { code: '4210', name: '銷貨退回', account_type: 'revenue', description: '負數收入' },
  { code: '4220', name: '銷貨折讓', account_type: 'revenue', description: '負數收入' },
  { code: '4800', name: '租金收入', account_type: 'revenue', description: null },
  { code: '4810', name: '權利金收入', account_type: 'revenue', description: null },
  { code: '4910', name: '匯兌利益', account_type: 'revenue', description: null },
  { code: '4920', name: '處分資產利益', account_type: 'revenue', description: null },
  { code: '4930', name: '股利收入', account_type: 'revenue', description: null },

  // ============================================
  // 成本扩充
  // ============================================
  { code: '5200', name: '銷貨成本', account_type: 'cost', description: '實體商品成本' },
  { code: '5210', name: '進貨', account_type: 'cost', description: null },
  { code: '5220', name: '進貨退出', account_type: 'cost', description: '負數成本' },
  { code: '5230', name: '進貨折讓', account_type: 'cost', description: '負數成本' },
  { code: '5240', name: '運費', account_type: 'cost', description: null },
  { code: '5300', name: '直接人工', account_type: 'cost', description: null },
  { code: '5400', name: '製造費用', account_type: 'cost', description: null },

  // ============================================
  // 费用扩充
  // ============================================
  // 销售费用
  { code: '6110', name: '銷售佣金', account_type: 'expense', description: null },
  { code: '6120', name: '運費支出', account_type: 'expense', description: null },
  { code: '6130', name: '包裝費', account_type: 'expense', description: null },
  { code: '6140', name: '展覽費', account_type: 'expense', description: null },
  // 管理费用
  { code: '6210', name: '勞保費', account_type: 'expense', description: null },
  { code: '6220', name: '健保費', account_type: 'expense', description: null },
  { code: '6230', name: '退休金', account_type: 'expense', description: null },
  { code: '6610', name: '薪資－管理', account_type: 'expense', description: null },
  { code: '6620', name: '薪資－業務', account_type: 'expense', description: null },
  { code: '6630', name: '加班費', account_type: 'expense', description: null },
  // 其他费用
  { code: '6890', name: '印花稅', account_type: 'expense', description: null },
  { code: '6930', name: '呆帳費用', account_type: 'expense', description: null },
  { code: '6940', name: '訴訟費用', account_type: 'expense', description: null },
  { code: '6950', name: '捐贈', account_type: 'expense', description: null },
  { code: '6960', name: '交際費', account_type: 'expense', description: null },
  { code: '6970', name: '員工福利費', account_type: 'expense', description: null },
  { code: '6980', name: '研發費用', account_type: 'expense', description: null },
  { code: '6990', name: '匯兌損失', account_type: 'expense', description: null },
  { code: '6991', name: '處分資產損失', account_type: 'expense', description: null },
  { code: '6992', name: '盤損', account_type: 'expense', description: null },
]

async function main() {
  console.log('开始扩充科目表到完整版...\n')

  // 获取 workspace_id
  const { data: workspaces } = await supabase.from('workspaces').select('id, name').limit(1)

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
  const toInsert = ADDITIONAL_ACCOUNTS.filter(acc => !existingCodes.has(acc.code))

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

  const { data, error } = await supabase.from('chart_of_accounts').insert(accountsToInsert).select()

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

  const typeCounts = byType?.reduce(
    (acc, a) => {
      acc[a.account_type] = (acc[a.account_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  console.log('\n各类型科目数量:')
  Object.entries(typeCounts || {}).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} 个`)
  })

  console.log('\n新增的科目列表:')
  data
    ?.sort((a, b) => a.code.localeCompare(b.code))
    .forEach(acc => {
      console.log(`  ${acc.code} ${acc.name} (${acc.account_type})`)
    })
}

main().catch(console.error)
