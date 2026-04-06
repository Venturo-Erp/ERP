import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * GET /api/bank-accounts
 * 取得銀行帳戶列表（RLS 自動過濾當前租戶）
 */
export async function GET() {
  const supabase = await createApiClient()

  const { data, error } = await supabase
    .from('bank_accounts')
    .select(
      'id, code, name, bank_name, account_number, is_default, is_active, workspace_id, created_at, updated_at'
    )
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/bank-accounts
 * 新增銀行帳戶
 */
export async function POST(request: NextRequest) {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const body = await request.json()
  const { code, name, bank_name, account_number, is_default } = body

  if (!code || !name) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 如果設為預設，先把其他的取消預設
  if (is_default) {
    await supabase.from('bank_accounts').update({ is_default: false })
  }

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      code,
      name,
      bank_name,
      account_number,
      is_default: is_default || false,
      workspace_id: workspaceId,
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
 * PUT /api/bank-accounts
 * 更新銀行帳戶
 */
export async function PUT(request: NextRequest) {
  const supabase = await createApiClient()
  const body = await request.json()
  const { id, code, name, bank_name, account_number, is_default } = body

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // 如果設為預設，先把其他的取消預設
  if (is_default) {
    await supabase.from('bank_accounts').update({ is_default: false }).neq('id', id)
  }

  const { data, error } = await supabase
    .from('bank_accounts')
    .update({
      code,
      name,
      bank_name,
      account_number,
      is_default,
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
 * DELETE /api/bank-accounts?id=xxx
 * 刪除銀行帳戶
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createApiClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const { error } = await supabase.from('bank_accounts').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
