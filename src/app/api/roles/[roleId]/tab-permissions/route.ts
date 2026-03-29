import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TabPermission {
  module_code: string
  tab_code: string | null
  can_read: boolean
  can_write: boolean
}

/**
 * GET /api/roles/[roleId]/tab-permissions
 * 取得角色的分頁權限
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await params

  const { data, error } = await supabase
    .from('role_tab_permissions')
    .select('module_code, tab_code, can_read, can_write')
    .eq('role_id', roleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/roles/[roleId]/tab-permissions
 * 更新角色的分頁權限（覆蓋式）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await params
  const body = await request.json()
  const { permissions } = body as { permissions: TabPermission[] }

  if (!Array.isArray(permissions)) {
    return NextResponse.json({ error: '缺少 permissions 陣列' }, { status: 400 })
  }

  // 刪除舊的權限
  await supabase
    .from('role_tab_permissions')
    .delete()
    .eq('role_id', roleId)

  // 只插入有開啟的權限
  const permissionsToInsert = permissions
    .filter(p => p.can_read || p.can_write)
    .map(p => ({
      role_id: roleId,
      module_code: p.module_code,
      tab_code: p.tab_code,
      can_read: p.can_read,
      can_write: p.can_write,
    }))

  if (permissionsToInsert.length > 0) {
    const { error } = await supabase
      .from('role_tab_permissions')
      .insert(permissionsToInsert)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
