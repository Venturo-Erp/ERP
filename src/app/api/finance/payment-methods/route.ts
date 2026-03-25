import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/finance/payment-methods
 * 取得收款/付款方式列表
 * 
 * Query params:
 * - workspace_id: 必填
 * - type: 'receipt' | 'payment' （選填）
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const workspace_id = searchParams.get('workspace_id')
  const type = searchParams.get('type') // 'receipt' | 'payment'

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  // 先查詢 payment_methods（不 join accounting_subjects）
  let query = supabase
    .from('payment_methods')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('is_active', true)
    .order('sort_order')

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('[payment-methods] Query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/finance/payment-methods
 * 新增收款/付款方式
 */
export async function POST(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('payment_methods')
    .insert(body)
    .select()
    .single()

  if (error) {
    console.error('[payment-methods] Insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/finance/payment-methods
 * 更新收款/付款方式
 */
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('payment_methods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[payment-methods] Update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/finance/payment-methods
 * 刪除收款/付款方式（軟刪除，設為 is_active = false）
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // 軟刪除：設為 inactive
  const { error } = await supabase
    .from('payment_methods')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('[payment-methods] Delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
