import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { getApiContext } from '@/lib/auth/get-api-context'

/**
 * GET /api/users/[userId]/role
 * 取得用戶的角色資訊（從 employees.role_id 讀取）
 *
 * F2 (2026-05-01)：當 userId === 自己 (auth.uid 對應的 employee) 時、
 *   直接從 layout context 拿、避免再次查 DB；他人請求才走 employees / workspace_roles
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  // 先確認登入
  const ctx = await getApiContext()
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  // 自己 → 直接用 context 結果（capabilities 已含、role_id 已知）
  if (ctx.employee_id === userId && ctx.role_id) {
    const supabase = await createApiClient()
    const { data: role } = await supabase
      .from('workspace_roles')
      .select('id, name, is_admin')
      .eq('id', ctx.role_id)
      .maybeSingle()
    if (!role) return NextResponse.json({ role_id: null, is_admin: false })
    return NextResponse.json({
      role_id: role.id,
      role_name: role.name,
      is_admin: role.is_admin,
    })
  }

  // 他人 → 一次查 employees + workspace_roles
  const supabase = await createApiClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('role_id')
    .eq('id', userId)
    .maybeSingle()

  if (!employee) return NextResponse.json({ role_id: null, is_admin: false })

  const roleId = (employee as Record<string, unknown>).role_id as string | undefined
  if (!roleId) return NextResponse.json({ role_id: null, is_admin: false })

  const { data: role } = await supabase
    .from('workspace_roles')
    .select('id, name, is_admin')
    .eq('id', roleId)
    .maybeSingle()

  if (!role) return NextResponse.json({ role_id: null, is_admin: false })

  return NextResponse.json({
    role_id: role.id,
    role_name: role.name,
    is_admin: role.is_admin,
  })
}
