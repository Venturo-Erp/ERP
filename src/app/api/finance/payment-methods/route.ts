import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * GET /api/finance/payment-methods
 * 取得收款/付款方式列表
 *
 * Query params:
 * - type: 'receipt' | 'payment' （選填）
 */
export async function GET(request: NextRequest) {
  const supabase = await createApiClient()
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') // 'receipt' | 'payment'
  const includeInactive = searchParams.get('include_inactive') === 'true'

  // 明確用 workspace_id 過濾（擁有平台管理資格時 RLS 會放行全部、所以不能只靠 RLS）
  const workspaceId = await getCurrentWorkspaceId()
  let query = supabase
    .from('payment_methods')
    .select(
      'id, name, code, type, description, placeholder, is_active, is_system, sort_order, workspace_id, created_at, updated_at'
    )
    .order('sort_order')

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/finance/payment-methods
 * 新增收款/付款方式
 */
export async function POST(request: NextRequest) {
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('payment_methods')
    .insert({ ...body, workspace_id: workspaceId })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/finance/payment-methods
 * 更新收款/付款方式
 */
export async function PUT(request: NextRequest) {
  const supabase = await createApiClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // RLS 會確保只能更新自己租戶的資料
  const { data, error } = await supabase
    .from('payment_methods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/finance/payment-methods
 * 刪除收款/付款方式（軟刪除，設為 is_active = false）
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createApiClient()
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // 檢查是否為系統預設方式
  const { data: method } = await supabase
    .from('payment_methods')
    .select('is_system')
    .eq('id', id)
    .single()

  if (method?.is_system) {
    return NextResponse.json({ error: '系統預設方式不可刪除，只能停用' }, { status: 403 })
  }

  // RLS 會確保只能刪除自己租戶的資料
  const { error } = await supabase.from('payment_methods').update({ is_active: false }).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
