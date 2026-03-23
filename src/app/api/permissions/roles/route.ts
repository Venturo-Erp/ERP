import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/permissions/roles?workspace_id=xxx
 * 取得租戶的所有角色
 */
export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspace_id')
  
  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspace_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('workspace_roles')
    .select('id, name, description, is_admin, sort_order')
    .eq('workspace_id', workspaceId)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/permissions/roles
 * 建立角色
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { workspace_id, name, description } = body

  if (!workspace_id || !name) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 取得目前角色數量作為 sort_order
  const { count } = await supabase
    .from('workspace_roles')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace_id)

  const { data, error } = await supabase
    .from('workspace_roles')
    .insert({
      workspace_id,
      name,
      description: description || null,
      is_admin: false,
      sort_order: count || 0,
    })
    .select('id, name, description, is_admin, sort_order')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/permissions/roles?id=xxx
 * 刪除角色
 */
export async function DELETE(request: NextRequest) {
  const roleId = request.nextUrl.searchParams.get('id')
  
  if (!roleId) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // 先檢查是否為管理員角色
  const { data: role } = await supabase
    .from('workspace_roles')
    .select('is_admin')
    .eq('id', roleId)
    .single()

  if (role?.is_admin) {
    return NextResponse.json({ error: '無法刪除管理員角色' }, { status: 400 })
  }

  const { error } = await supabase
    .from('workspace_roles')
    .delete()
    .eq('id', roleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
