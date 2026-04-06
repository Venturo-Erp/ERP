import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * GET /api/accounting/accounts
 * 取得會計科目列表（RLS 自動過濾）
 */
export async function GET() {
  const supabase = await createApiClient()

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select(
      'id, code, name, account_type, description, is_system_locked, is_active, workspace_id, created_at, updated_at'
    )
    .order('code')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/accounting/accounts
 * 新增會計科目
 */
export async function POST(request: NextRequest) {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const body = await request.json()
  const { code, name, account_type, description } = body

  if (!code || !name) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert({
      code,
      name,
      account_type: account_type || 'expense',
      description,
      workspace_id: workspaceId,
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

/**
 * PUT /api/accounting/accounts
 * 更新會計科目
 */
export async function PUT(request: NextRequest) {
  const supabase = await createApiClient()
  const body = await request.json()
  const { id, code, name, account_type, description } = body

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('chart_of_accounts')
    .update({
      code,
      name,
      account_type,
      description,
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

/**
 * DELETE /api/accounting/accounts?id=xxx
 * 刪除會計科目
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createApiClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // 檢查是否為系統鎖定科目
  const { data: account } = await supabase
    .from('chart_of_accounts')
    .select('is_system_locked')
    .eq('id', id)
    .single()

  if (account?.is_system_locked) {
    return NextResponse.json({ error: '系統科目無法刪除' }, { status: 400 })
  }

  const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
