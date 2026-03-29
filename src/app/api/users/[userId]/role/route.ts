import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/users/[userId]/role
 * 取得用戶的角色資訊
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

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
