import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

let supabase: SupabaseClient

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// GET: 取得科目對應
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const mappingType = searchParams.get('mapping_type') // 可選，不傳就返回全部

  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspace_id' }, { status: 400 })
  }

  let query = getSupabase()
    .from('account_mappings')
    .select(
      `
      id,
      category,
      mapping_type,
      debit_account_id,
      credit_account_id,
      debit:chart_of_accounts!debit_account_id(id, code, name),
      credit:chart_of_accounts!credit_account_id(id, code, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('mapping_type')
    .order('category')

  if (mappingType) {
    query = query.eq('mapping_type', mappingType)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PUT: 更新科目對應
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const body = await request.json()
  const { debit_account_id, credit_account_id } = body

  const { data, error } = await getSupabase()
    .from('account_mappings')
    .update({
      debit_account_id,
      credit_account_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST: 新增科目對應（複製預設給新租戶用）
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { workspace_id, source_workspace_id } = body

  if (!workspace_id) {
    return NextResponse.json({ error: '缺少 workspace_id' }, { status: 400 })
  }

  // 如果有來源租戶，從那邊複製
  const sourceId = source_workspace_id || '8ef05a74-1f87-48ab-afd3-9bfeb423935d' // 預設角落旅行社

  // 取得來源的對應
  const { data: sourceMappings, error: fetchError } = await getSupabase()
    .from('account_mappings')
    .select('category, mapping_type')
    .eq('workspace_id', sourceId)

  if (fetchError || !sourceMappings) {
    return NextResponse.json({ error: '無法取得來源對應' }, { status: 500 })
  }

  // 取得目標租戶的會計科目（按代碼對應）
  const { data: sourceAccounts } = await getSupabase()
    .from('account_mappings')
    .select(
      `
      category,
      mapping_type,
      debit:chart_of_accounts!debit_account_id(code),
      credit:chart_of_accounts!credit_account_id(code)
    `
    )
    .eq('workspace_id', sourceId)

  const { data: targetAccounts } = await getSupabase()
    .from('chart_of_accounts')
    .select('id, code')
    .eq('workspace_id', workspace_id)

  if (!targetAccounts) {
    return NextResponse.json({ error: '目標租戶尚未設定會計科目' }, { status: 400 })
  }

  const targetAccountMap = new Map(targetAccounts.map(a => [a.code, a.id]))

  // 建立新對應
  const newMappings = sourceAccounts
    ?.map(m => {
      const debitRaw = m.debit as unknown
      const creditRaw = m.credit as unknown
      const debit = Array.isArray(debitRaw) ? debitRaw[0] : debitRaw
      const credit = Array.isArray(creditRaw) ? creditRaw[0] : creditRaw
      return {
        workspace_id,
        category: m.category,
        mapping_type: m.mapping_type,
        debit_account_id:
          debit && typeof debit === 'object'
            ? targetAccountMap.get((debit as { code: string }).code)
            : undefined,
        credit_account_id:
          credit && typeof credit === 'object'
            ? targetAccountMap.get((credit as { code: string }).code)
            : undefined,
      }
    })
    .filter(m => m.debit_account_id && m.credit_account_id)

  if (!newMappings || newMappings.length === 0) {
    return NextResponse.json({ error: '無法建立對應（會計科目代碼不符）' }, { status: 400 })
  }

  const { error: insertError } = await getSupabase().from('account_mappings').insert(newMappings)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: newMappings.length })
}
