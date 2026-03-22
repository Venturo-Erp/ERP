import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAccountMapping } from '@/features/finance/constants/account-mapping'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 自動產生傳票 API
 *
 * POST /api/accounting/vouchers/auto-create
 *
 * Body:
 * - source_type: 'payment_request' | 'receipt' | 'tour_closing'
 * - source_id: string (請款單/收款單/團 ID)
 * - workspace_id: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { source_type, source_id, workspace_id } = body

    if (!source_type || !source_id || !workspace_id) {
      return NextResponse.json(
        { error: '缺少必要參數：source_type, source_id, workspace_id' },
        { status: 400 }
      )
    }

    let voucher

    switch (source_type) {
      case 'payment_request':
        voucher = await createVoucherFromPaymentRequest(workspace_id, source_id)
        break
      case 'receipt':
        voucher = await createVoucherFromReceipt(workspace_id, source_id)
        break
      case 'tour_closing':
        voucher = await createVoucherFromTourClosing(workspace_id, source_id)
        break
      default:
        return NextResponse.json({ error: `不支援的來源類型：${source_type}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, voucher })
  } catch (error) {
    console.error('自動產生傳票失敗:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '自動產生傳票失敗' },
      { status: 500 }
    )
  }
}

/**
 * 根據科目代碼取得 subject_id
 */
async function getSubjectId(code: string): Promise<string | null> {
  const { data } = await supabase.from('accounting_subjects').select('id').eq('code', code).single()
  return data?.id || null
}

/**
 * 從請款單產生傳票
 */
async function createVoucherFromPaymentRequest(workspaceId: string, paymentRequestId: string) {
  // 1. 查詢請款單
  const { data: request, error: reqError } = await supabase
    .from('payment_requests')
    .select('*, items:payment_request_items(*)')
    .eq('id', paymentRequestId)
    .single()

  if (reqError || !request) {
    throw new Error(`找不到請款單：${paymentRequestId}`)
  }

  // 2. 產生傳票編號
  const voucherNo = await generateVoucherNo(workspaceId, 'PAY')

  // 3. 建立傳票主檔
  const { data: voucher, error: voucherError } = await supabase
    .from('vouchers')
    .insert({
      workspace_id: workspaceId,
      voucher_no: voucherNo,
      voucher_date: request.request_date,
      type: 'payment',
      source_type: 'payment_request',
      source_id: paymentRequestId,
      description: `請款單 ${request.code} - ${request.tour_name || ''}`,
      total_debit: request.amount,
      total_credit: request.amount,
      status: 'draft',
    })
    .select()
    .single()

  if (voucherError) {
    throw new Error(`建立傳票失敗：${voucherError.message}`)
  }

  // 4. 建立傳票分錄（依類別對應會計科目）
  const entries: Array<{
    voucher_id: string
    entry_no: number
    subject_id: string
    debit: number
    credit: number
    description: string
  }> = []

  // 按類別分組金額
  const categoryAmounts: Record<string, number> = {}
  for (const item of request.items || []) {
    const category = item.category || '其他'
    categoryAmounts[category] = (categoryAmounts[category] || 0) + (item.amount || 0)
  }

  let entryNo = 1

  // 借方分錄（成本科目）
  for (const [category, amount] of Object.entries(categoryAmounts)) {
    const mapping = getAccountMapping(category)
    const subjectId = await getSubjectId(mapping.debitCode)
    if (subjectId) {
      entries.push({
        voucher_id: voucher.id,
        entry_no: entryNo++,
        subject_id: subjectId,
        debit: amount,
        credit: 0,
        description: `${category}費用`,
      })
    }
  }

  // 貸方分錄（應付帳款）
  const apSubjectId = await getSubjectId('2101')
  if (apSubjectId) {
    entries.push({
      voucher_id: voucher.id,
      entry_no: entryNo,
      subject_id: apSubjectId,
      debit: 0,
      credit: request.amount,
      description: `應付 ${request.supplier_name || '供應商'}`,
    })
  }

  // 插入分錄
  if (entries.length > 0) {
    const { error: entriesError } = await supabase.from('voucher_entries').insert(entries)

    if (entriesError) {
      // Rollback: 刪除傳票
      await supabase.from('vouchers').delete().eq('id', voucher.id)
      throw new Error(`建立傳票分錄失敗：${entriesError.message}`)
    }
  }

  return voucher
}

/**
 * 從收款單產生傳票
 */
async function createVoucherFromReceipt(workspaceId: string, receiptId: string) {
  // 1. 查詢收款單
  const { data: receipt, error: recError } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (recError || !receipt) {
    throw new Error(`找不到收款單：${receiptId}`)
  }

  // 2. 產生傳票編號
  const voucherNo = await generateVoucherNo(workspaceId, 'REC')

  // 3. 建立傳票主檔
  const { data: voucher, error: voucherError } = await supabase
    .from('vouchers')
    .insert({
      workspace_id: workspaceId,
      voucher_no: voucherNo,
      voucher_date: receipt.receipt_date,
      type: 'receipt',
      source_type: 'receipt',
      source_id: receiptId,
      description: `收款單 ${receipt.code} - ${receipt.tour_name || ''}`,
      total_debit: receipt.amount,
      total_credit: receipt.amount,
      status: 'draft',
    })
    .select()
    .single()

  if (voucherError) {
    throw new Error(`建立傳票失敗：${voucherError.message}`)
  }

  // 4. 建立傳票分錄
  // 借方：銀行存款/現金
  // 貸方：預收款項
  const cashSubjectId = await getSubjectId(receipt.payment_method === 'cash' ? '1101' : '1102')
  const prepaidSubjectId = await getSubjectId('2103') // 預收款項

  const entries = []
  if (cashSubjectId) {
    entries.push({
      voucher_id: voucher.id,
      entry_no: 1,
      subject_id: cashSubjectId,
      debit: receipt.amount,
      credit: 0,
      description: `收款`,
    })
  }
  if (prepaidSubjectId) {
    entries.push({
      voucher_id: voucher.id,
      entry_no: 2,
      subject_id: prepaidSubjectId,
      debit: 0,
      credit: receipt.amount,
      description: `預收團款`,
    })
  }

  if (entries.length > 0) {
    const { error: entriesError } = await supabase.from('voucher_entries').insert(entries)

    if (entriesError) {
      await supabase.from('vouchers').delete().eq('id', voucher.id)
      throw new Error(`建立傳票分錄失敗：${entriesError.message}`)
    }
  }

  return voucher
}

/**
 * 從結團產生傳票
 */
async function createVoucherFromTourClosing(workspaceId: string, tourId: string) {
  // TODO: 實作結團傳票
  // 這個比較複雜，需要：
  // 1. 預收團款 → 團費收入
  // 2. 預付團務成本 → 團務成本
  // 3. 計算毛利
  throw new Error('結團傳票功能開發中')
}

/**
 * 產生傳票編號
 */
async function generateVoucherNo(workspaceId: string, prefix: string): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  // 查詢本月最大編號
  const { data: lastVoucher } = await supabase
    .from('vouchers')
    .select('voucher_no')
    .eq('workspace_id', workspaceId)
    .like('voucher_no', `${prefix}${year}${month}%`)
    .order('voucher_no', { ascending: false })
    .limit(1)
    .single()

  let seq = 1
  if (lastVoucher?.voucher_no) {
    const lastSeq = parseInt(lastVoucher.voucher_no.slice(-3), 10)
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1
    }
  }

  return `${prefix}${year}${month}${String(seq).padStart(3, '0')}`
}
