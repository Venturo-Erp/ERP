import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/api-client'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'

// P016 修法（2026-04-22）：Corner 是主 workspace、刪除它會滅整個 SaaS 平台
const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

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

/**
 * DELETE /api/workspaces/[id]
 * 刪除租戶（P016 修法、2026-04-22）
 *
 * 存取規則：
 * - 必須登入（middleware + getServerAuth）
 * - 必須有「租戶管理」權限（role_tab_permissions.settings.tenants.can_write）
 * - Corner 主租戶硬擋（不能刪）
 * - self-delete 禁（不能刪自己登入的那家）
 * - 員工數 > 0 → 409 防呆
 * - rate limit 10/分鐘（防暴力）
 * - audit log 敏感操作留痕
 *
 * DB policy 端只允許 service_role、client-side supabase.from('workspaces').delete() 會被擋。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params

  // Rate limit（10/分鐘）
  const rateLimited = await checkRateLimit(request, 'workspaces-delete', 10, 60_000)
  if (rateLimited) return rateLimited as unknown as NextResponse

  // 必須登入
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  // 必須有租戶管理權限
  const adminClient = getSupabaseAdminClient()
  const { data: employee } = await adminClient
    .from('employees')
    .select('role_id, job_info')
    .eq('id', auth.data.employeeId)
    .single()

  const effectiveRoleId =
    employee?.role_id ||
    ((employee?.job_info as Record<string, unknown> | null)?.role_id as string | undefined)

  if (!effectiveRoleId) {
    return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
  }

  const { data: rolePerm } = await adminClient
    .from('role_tab_permissions')
    .select('can_write')
    .eq('role_id', effectiveRoleId)
    .eq('module_code', 'settings')
    .eq('tab_code', 'tenants')
    .single()

  if (!rolePerm?.can_write) {
    return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
  }

  // Guard 1：Corner 硬擋
  if (workspaceId === CORNER_WORKSPACE_ID) {
    return NextResponse.json({ error: '不能刪除主租戶' }, { status: 403 })
  }

  // Guard 2：self-delete 禁
  if (workspaceId === auth.data.workspaceId) {
    return NextResponse.json({ error: '不能刪除自己登入的租戶' }, { status: 403 })
  }

  // 找目標租戶
  const { data: targetWs } = await adminClient
    .from('workspaces')
    .select('id, name, code')
    .eq('id', workspaceId)
    .single()

  if (!targetWs) {
    return NextResponse.json({ error: '找不到租戶' }, { status: 404 })
  }

  // Guard 3：員工數 > 0 防呆
  const { count: employeeCount } = await adminClient
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  if (employeeCount && employeeCount > 0) {
    return NextResponse.json(
      { error: `此租戶還有 ${employeeCount} 位員工、不能刪除` },
      { status: 409 }
    )
  }

  // Audit log（敏感操作留痕）
  logger.warn('[AUDIT] workspace deletion', {
    target_workspace_id: workspaceId,
    target_workspace_name: targetWs.name,
    target_workspace_code: targetWs.code,
    deleted_by_employee_id: auth.data.employeeId,
    deleted_by_workspace_id: auth.data.workspaceId,
    timestamp: new Date().toISOString(),
  })

  // 真刪（service_role 繞 RLS）
  const serviceSupabase = createServiceClient()
  const { error } = await serviceSupabase.from('workspaces').delete().eq('id', workspaceId)

  if (error) {
    logger.error('[AUDIT] workspace deletion failed', {
      target_workspace_id: workspaceId,
      error: error.message,
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    deleted: { id: workspaceId, name: targetWs.name },
  })
}
