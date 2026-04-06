import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceId } from '@/lib/supabase/api-client'

/**
 * GET /api/permissions/roles
 * 取得當前租戶的所有角色（RLS 自動過濾）
 */
export async function GET() {
  const supabase = await createApiClient()

  const { data, error } = await supabase
    .from('workspace_roles')
    .select('id, name, description, is_admin, sort_order')
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
  const supabase = await createApiClient()
  const workspaceId = await getCurrentWorkspaceId()

  if (!workspaceId) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description } = body

  if (!name) {
    return NextResponse.json({ error: '缺少角色名稱' }, { status: 400 })
  }

  // 取得目前角色數量作為 sort_order
  const { count } = await supabase
    .from('workspace_roles')
    .select('*', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
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
  const supabase = await createApiClient()
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

  const { error } = await supabase.from('workspace_roles').delete().eq('id', roleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
