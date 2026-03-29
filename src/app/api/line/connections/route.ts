import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * GET /api/line/connections
 * 取得所有 LINE 連線（群組 + 用戶）
 */
export async function GET() {
  const supabase = await createApiClient()

  // 取得群組
  const { data: groups, error: groupsError } = await supabase
    .from('line_groups')
    .select(`
      id,
      group_id,
      group_name,
      member_count,
      supplier_id,
      category,
      note,
      joined_at,
      updated_at,
      suppliers:supplier_id(id, name)
    `)
    .order('updated_at', { ascending: false })

  // 取得用戶
  const { data: users, error: usersError } = await supabase
    .from('line_users')
    .select(`
      id,
      user_id,
      display_name,
      picture_url,
      status_message,
      supplier_id,
      employee_id,
      note,
      followed_at,
      unfollowed_at,
      updated_at,
      suppliers:supplier_id(id, name),
      employees:employee_id(id, display_name, code)
    `)
    .order('followed_at', { ascending: false })

  if (groupsError || usersError) {
    return NextResponse.json({ 
      error: groupsError?.message || usersError?.message 
    }, { status: 500 })
  }

  return NextResponse.json({
    groups: groups || [],
    users: users || [],
  })
}

/**
 * PUT /api/line/connections
 * 更新 LINE 連線（綁定供應商/員工）
 */
export async function PUT(request: NextRequest) {
  const supabase = await createApiClient()
  const body = await request.json()
  const { type, id, supplier_id, employee_id, category, note } = body

  if (!type || !id) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const table = type === 'group' ? 'line_groups' : 'line_users'
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (supplier_id !== undefined) updates.supplier_id = supplier_id || null
  if (employee_id !== undefined && type === 'user') updates.employee_id = employee_id || null
  if (category !== undefined && type === 'group') updates.category = category || null
  if (note !== undefined) updates.note = note || null

  const { error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
