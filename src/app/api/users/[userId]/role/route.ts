import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * GET /api/users/[userId]/role
 * 取得用戶的角色資訊（RLS 自動過濾）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createApiClient()

  // 取得用戶的角色
  const { data: userRole, error: userRoleError } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
    .single()

  if (userRoleError || !userRole) {
    // 沒有指定角色，回傳空
    return NextResponse.json({ role_id: null, is_admin: false })
  }

  // 取得角色資訊
  const { data: role, error: roleError } = await supabase
    .from('workspace_roles')
    .select('id, name, is_admin')
    .eq('id', userRole.role_id)
    .single()

  if (roleError || !role) {
    return NextResponse.json({ role_id: null, is_admin: false })
  }

  return NextResponse.json({
    role_id: role.id,
    role_name: role.name,
    is_admin: role.is_admin,
  })
}
