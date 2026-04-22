import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

interface PermissionOverride {
  module_code: string
  tab_code: string | null
  override_type: 'grant' | 'revoke' | null
}

// P022（2026-04-22）：管理員工個人權限覆寫 = 提權操作、必須守門。
// 檢：1) 已登入 2) 有 hr.employees.can_write 3) 目標員工與 caller 同 workspace（阻跨租戶 IDOR）。
async function requireHrEmployeesAdmin(
  targetEmployeeId: string
): Promise<
  | { ok: true; admin: ReturnType<typeof getSupabaseAdminClient>; workspaceId: string }
  | { ok: false; response: NextResponse }
> {
  const auth = await getServerAuth()
  if (!auth.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: '請先登入' }, { status: 401 }),
    }
  }

  const admin = getSupabaseAdminClient()

  const { data: caller } = await admin
    .from('employees')
    .select('role_id, workspace_id, job_info')
    .eq('id', auth.data.employeeId)
    .single()

  const effectiveRoleId =
    caller?.role_id ||
    ((caller?.job_info as Record<string, unknown> | null)?.role_id as string | undefined)

  if (!effectiveRoleId || !caller?.workspace_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: '無權限操作' }, { status: 403 }),
    }
  }

  const { data: perm } = await admin
    .from('role_tab_permissions')
    .select('can_write')
    .eq('role_id', effectiveRoleId)
    .eq('module_code', 'hr')
    .eq('tab_code', 'employees')
    .single()

  if (!perm?.can_write) {
    return {
      ok: false,
      response: NextResponse.json({ error: '無權限操作' }, { status: 403 }),
    }
  }

  const { data: target } = await admin
    .from('employees')
    .select('workspace_id')
    .eq('id', targetEmployeeId)
    .single()

  if (!target || target.workspace_id !== caller.workspace_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: '找不到員工' }, { status: 404 }),
    }
  }

  return { ok: true, admin, workspaceId: caller.workspace_id }
}

/**
 * GET /api/employees/[employeeId]/permission-overrides
 * 取得員工的個人權限覆寫
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params
  const gate = await requireHrEmployeesAdmin(employeeId)
  if (!gate.ok) return gate.response

  const { data, error } = await gate.admin
    .from('employee_permission_overrides')
    .select('module_code, tab_code, override_type')
    .eq('employee_id', employeeId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/employees/[employeeId]/permission-overrides
 * 更新員工的個人權限覆寫（覆蓋式）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params
  const gate = await requireHrEmployeesAdmin(employeeId)
  if (!gate.ok) return gate.response

  const body = await request.json()
  const { overrides } = body as { overrides: PermissionOverride[] }

  if (!Array.isArray(overrides)) {
    return NextResponse.json({ error: '缺少 overrides 陣列' }, { status: 400 })
  }

  await gate.admin
    .from('employee_permission_overrides')
    .delete()
    .eq('employee_id', employeeId)

  const overridesToInsert = overrides
    .filter((o): o is PermissionOverride & { override_type: 'grant' | 'revoke' } => !!o.override_type)
    .map((o) => ({
      employee_id: employeeId,
      workspace_id: gate.workspaceId,
      module_code: o.module_code,
      tab_code: o.tab_code,
      override_type: o.override_type,
    }))

  if (overridesToInsert.length > 0) {
    const { error } = await gate.admin
      .from('employee_permission_overrides')
      .insert(overridesToInsert)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
