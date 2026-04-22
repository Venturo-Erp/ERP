import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/api-client'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/workspaces/[workspaceId]
 * 取得租戶詳情（含員工人數、管理員資訊）
 *
 * 存取規則（P003-H 2026-04-22）：
 * - 自己 workspace：任何登入用戶都可讀（UI 需要拿自己公司的 premium_enabled 等）
 * - 別的 workspace：必須有「租戶管理」權限（role_tab_permissions.settings.tenants.can_write）
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params

  // 🔒 P003-H 守門
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  if (workspaceId !== auth.data.workspaceId) {
    // 跨租戶讀：要租戶管理權限
    const adminClient = getSupabaseAdminClient()
    const { data: employee } = await adminClient
      .from('employees')
      .select('role_id, job_info')
      .eq('id', auth.data.employeeId)
      .single()
    const effectiveRoleId =
      employee?.role_id ||
      ((employee?.job_info as Record<string, unknown> | null)?.role_id as string | undefined)
    let canManageTenants = false
    if (effectiveRoleId) {
      const { data: rolePerm } = await adminClient
        .from('role_tab_permissions')
        .select('can_write')
        .eq('role_id', effectiveRoleId)
        .eq('module_code', 'settings')
        .eq('tab_code', 'tenants')
        .single()
      canManageTenants = rolePerm?.can_write ?? false
    }
    if (!canManageTenants) {
      return NextResponse.json({ error: '不能讀取其他公司的租戶詳情' }, { status: 403 })
    }
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, code, type, is_active, premium_enabled')
    .eq('id', workspaceId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
  }

  // 查真人員工（排除機器人）
  const { data: employees } = await supabase
    .from('employees')
    .select(
      'id, employee_number, chinese_name, display_name, english_name, roles, is_bot, created_at'
    )
    .eq('workspace_id', workspaceId)
    .or('is_bot.is.null,is_bot.eq.false')
    .order('created_at', { ascending: true })

  const realEmployees = (employees || []) as Array<{
    id: string
    employee_number: string | null
    chinese_name: string | null
    display_name: string | null
    english_name: string | null
    roles: string[] | null
    is_bot: boolean | null
    created_at: string
  }>

  // 找第一個 admin
  const adminEmployee =
    realEmployees.find(e => Array.isArray(e.roles) && e.roles.includes('admin')) || realEmployees[0] // fallback：沒 admin 就取第一個員工

  const adminName = adminEmployee
    ? adminEmployee.display_name ||
      adminEmployee.chinese_name ||
      adminEmployee.english_name ||
      '未知'
    : null

  return NextResponse.json({
    ...data,
    employee_count: realEmployees.length,
    admin_name: adminName,
    admin_id: adminEmployee?.id || null,
    admin_employee_number: adminEmployee?.employee_number || null,
  })
}
