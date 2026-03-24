import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/finance/payment-methods?workspace_id=xxx&type=receipt|payment
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const type = searchParams.get('type') // 'receipt' or 'payment'

  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspace_id' }, { status: 400 })
  }

  let query = supabase
    .from('payment_methods')
    .select(`
      *,
      debit_account:chart_of_accounts!debit_account_id(id, code, name),
      credit_account:chart_of_accounts!credit_account_id(id, code, name)
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  // 如果有指定類型，只取該類型
  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query
    .order('sort_order')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/finance/payment-methods
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, type, description, workspace_id, debit_account_id, credit_account_id } = body

    if (!code || !name || !type || !workspace_id) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        code,
        name,
        type,
        description,
        workspace_id,
        debit_account_id: debit_account_id || null,
        credit_account_id: credit_account_id || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: '新增失敗' }, { status: 500 })
  }
}

/**
 * PUT /api/finance/payment-methods
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, name, description, is_active, debit_account_id, credit_account_id } = body

    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .update({
        code,
        name,
        description,
        debit_account_id: debit_account_id || null,
        credit_account_id: credit_account_id || null,
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
  } catch (error) {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}

/**
 * DELETE /api/finance/payment-methods?id=xxx
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
