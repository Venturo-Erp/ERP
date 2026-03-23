import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/accounting/accounts?workspace_id=xxx
 * 取得會計科目列表
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')

  // 會計科目是全域的（不分 workspace），但可以過濾
  const query = supabase
    .from('chart_of_accounts')
    .select('*')
    .order('code')

  const { data, error } = await query

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
  try {
    const body = await request.json()
    const { code, name, account_type, description, workspace_id } = body

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
        workspace_id,
        is_system_locked: false,
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
 * PUT /api/accounting/accounts
 * 更新會計科目
 */
export async function PUT(request: NextRequest) {
  try {
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
  } catch (error) {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}

/**
 * DELETE /api/accounting/accounts?id=xxx
 * 刪除會計科目
 */
export async function DELETE(request: NextRequest) {
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

  const { error } = await supabase
    .from('chart_of_accounts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
