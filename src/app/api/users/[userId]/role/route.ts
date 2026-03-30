import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * GET /api/users/[userId]/role
 * 取得用戶的角色資訊（從 employees.job_info 讀取）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createApiClient()

  // 從 employees.job_info 取得 role_id
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('job_info')
    .eq('id', userId)
    .single()

  if (employeeError || !employee) {
    return NextResponse.json({ role_id: null, is_admin: false })
  }

  const jobInfo = employee.job_info as { role_id?: string } | null
  const roleId = jobInfo?.role_id

  if (!roleId) {
    // 沒有指定角色，回傳空
    return NextResponse.json({ role_id: null, is_admin: false })
  }

  // 取得角色資訊
  const { data: role, error: roleError } = await supabase
    .from('workspace_roles')
    .select('id, name, is_admin')
    .eq('id', roleId)
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
