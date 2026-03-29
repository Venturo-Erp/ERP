import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * GET /api/permissions/role-permissions?role_id=xxx
 * 取得角色的路由權限（RLS 自動過濾）
 */
export async function GET(request: NextRequest) {
  const supabase = await createApiClient()
  const roleId = request.nextUrl.searchParams.get('role_id')
  
  if (!roleId) {
    return NextResponse.json({ error: '缺少 role_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('role_route_permissions')
    .select('route, can_read, can_write')
    .eq('role_id', roleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/permissions/role-permissions
 * 更新角色的路由權限（覆蓋式）
 */
export async function PUT(request: NextRequest) {
  const supabase = await createApiClient()
  const body = await request.json()
  const { role_id, permissions } = body

  if (!role_id || !Array.isArray(permissions)) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 先刪除舊權限
  await supabase
    .from('role_route_permissions')
    .delete()
    .eq('role_id', role_id)

  // 插入新權限（只插入有權限的）
  const toInsert = permissions
    .filter((p: { can_read?: boolean; can_write?: boolean }) => p.can_read || p.can_write)
    .map((p: { route: string; can_read?: boolean; can_write?: boolean }) => ({
      role_id,
      route: p.route,
      can_read: p.can_read || false,
      can_write: p.can_write || false,
    }))

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('role_route_permissions')
      .insert(toInsert)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
