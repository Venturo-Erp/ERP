/**
 * 为现有的 3 笔已批准请款单补传票
 *
 * 请款单详情：
 * 1. 2026-03-12：机票款 13,175（id: 0d8eeaad-c731-47e4-ae13-cc005a652d7f）
 * 2. 2026-03-19：餐费+住宿+订金 211,746（id: 29336336-5fac-4307-af0a-8acf42cb94db）
 * 3. 2026-03-19：包车 35,962（id: 51656a86-71db-4fed-8a2b-cff4c36787c8）
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('❌ 需要设置 SUPABASE_SERVICE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface PaymentRequest {
  id: string
  request_date: string
  total_amount: number
  items: {
    description: string
    category: string
    subtotal: number
  }[]
}

// 三笔请款单
const paymentRequests: PaymentRequest[] = [
  {
    id: '0d8eeaad-c731-47e4-ae13-cc005a652d7f',
    request_date: '2026-03-12',
    total_amount: 13175,
    items: [
      { description: '机票款（台北越南单程）一张 2/28', category: '交通', subtotal: 4321 },
      { description: '机票款（台北越南单程）两张 3/2', category: '交通', subtotal: 8854 },
    ],
  },
  {
    id: '29336336-5fac-4307-af0a-8acf42cb94db',
    request_date: '2026-03-19',
    total_amount: 211746,
    items: [
      { description: '餐费', category: '餐食', subtotal: 70000 },
      { description: '餐费（第二天餐盒）', category: '餐食', subtotal: 5146 },
      { description: '订金', category: '交通', subtotal: 7000 },
      { description: '洲际饭店全额', category: '住宿', subtotal: 129600 },
    ],
  },
  {
    id: '51656a86-71db-4fed-8a2b-cff4c36787c8',
    request_date: '2026-03-19',
    total_amount: 35962,
    items: [
      { description: '西安五日包车（支付宝付款）含手续费', category: '交通', subtotal: 35962 },
    ],
  },
]

async function generateVoucherNo(workspaceId: string, date: string): Promise<string> {
  const yearMonth = date.substring(0, 7).replace('-', '')
  const prefix = `JV${yearMonth}`

  const { data } = await supabase
    .from('journal_vouchers')
    .select('voucher_no')
    .eq('workspace_id', workspaceId)
    .like('voucher_no', `${prefix}%`)
    .order('voucher_no', { ascending: false })
    .limit(1)

  let seq = 1
  if (data && data.length > 0) {
    const lastNo = data[0].voucher_no
    const lastSeq = parseInt(lastNo.slice(-4))
    seq = lastSeq + 1
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`
}

async function createVoucherForRequest(
  workspaceId: string,
  userId: string,
  request: PaymentRequest
) {
  console.log(`\n处理请款单: ${request.request_date}, 金额: ${request.total_amount}`)

  // 查询 1200 预付团务成本 和 1100 银行存款 科目 ID
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name')
    .eq('workspace_id', workspaceId)
    .in('code', ['1200', '1100'])

  if (!accounts || accounts.length !== 2) {
    console.error('❌ 找不到科目 1200 或 1100')
    return
  }

  const prepaidCostAccount = accounts.find(a => a.code === '1200')
  const bankAccount = accounts.find(a => a.code === '1100')

  if (!prepaidCostAccount || !bankAccount) {
    console.error('❌ 科目不完整')
    return
  }

  // 生成传票编号
  const voucherNo = await generateVoucherNo(workspaceId, request.request_date)

  // 汇总所有明细的描述
  const itemDescriptions = request.items.map(item => item.description).join('、')

  // 创建传票
  const { data: voucher, error: voucherError } = await supabase
    .from('journal_vouchers')
    .insert({
      workspace_id: workspaceId,
      voucher_no: voucherNo,
      voucher_date: request.request_date,
      memo: `补录请款单：${itemDescriptions}`,
      company_unit: 'Corner',
      status: 'posted',
      total_debit: request.total_amount,
      total_credit: request.total_amount,
      created_by: userId,
    })
    .select()
    .single()

  if (voucherError) {
    console.error('❌ 创建传票失败:', voucherError)
    return
  }

  console.log(`✅ 创建传票: ${voucherNo}`)

  // 创建分录
  const lines = [
    // 借：预付团务成本
    {
      voucher_id: voucher.id,
      line_no: 1,
      account_id: prepaidCostAccount.id,
      description: itemDescriptions,
      debit_amount: request.total_amount,
      credit_amount: 0,
    },
    // 贷：银行存款
    {
      voucher_id: voucher.id,
      line_no: 2,
      account_id: bankAccount.id,
      description: itemDescriptions,
      debit_amount: 0,
      credit_amount: request.total_amount,
    },
  ]

  const { error: linesError } = await supabase.from('journal_lines').insert(lines)

  if (linesError) {
    console.error('❌ 创建分录失败:', linesError)
    // 删除传票
    await supabase.from('journal_vouchers').delete().eq('id', voucher.id)
    return
  }

  console.log(`✅ 创建分录: 2 行`)
}

async function main() {
  console.log('开始补录传票...\n')

  // 获取 workspace_id
  const { data: workspaces } = await supabase.from('workspaces').select('id, name').limit(1)

  if (!workspaces || workspaces.length === 0) {
    console.error('❌ 找不到 workspace')
    return
  }

  const workspaceId = workspaces[0].id
  console.log(`Workspace: ${workspaces[0].name} (${workspaceId})`)

  // 获取第一个用户 ID（作为 created_by）
  const { data: users } = await supabase.from('users').select('id').limit(1)

  const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000'

  // 为每个请款单创建传票
  for (const request of paymentRequests) {
    await createVoucherForRequest(workspaceId, userId, request)
  }

  console.log('\n✅ 完成！')
}

main().catch(console.error)
