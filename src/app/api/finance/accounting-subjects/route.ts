import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 列出會計科目（使用 chart_of_accounts）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const type = searchParams.get('type') // revenue, expense, asset, liability

  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspace_id' }, { status: 400 })
  }

  let query = supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type, parent_id, is_system_locked, is_active, description')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('code')

  if (type) {
    query = query.eq('account_type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 轉換欄位名稱以相容前端
  const formattedData = data?.map(item => ({
    ...item,
    type: item.account_type,
    is_system: item.is_system_locked,
    level: item.parent_id ? 2 : 1,
  }))

  return NextResponse.json(formattedData)
}

// POST: 新增會計科目（使用 chart_of_accounts）
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { workspace_id, code, name, type, description, parent_id } = body

  if (!workspace_id || !code || !name || !type) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert({
      workspace_id,
      code,
      name,
      account_type: type,
      description,
      parent_id,
      is_system_locked: false,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PUT: 更新會計科目（使用 chart_of_accounts）
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const body = await request.json()
  const { name, description, is_active } = body

  // 不允許修改 code（代碼）
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .update({
      name,
      description,
      is_active,
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

// DELETE: 刪除會計科目（系統科目不能刪）
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // 檢查是否為系統科目
  const { data: subject } = await supabase
    .from('chart_of_accounts')
    .select('is_system_locked')
    .eq('id', id)
    .single()

  if (subject?.is_system_locked) {
    return NextResponse.json({ error: '系統科目不能刪除' }, { status: 400 })
  }

  const { error } = await supabase
    .from('chart_of_accounts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
