import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, createServiceClient } from '@/lib/supabase/api-client'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// P003-A（2026-04-22）：零認證漏洞守門。
// 只有有「租戶管理」權限（role_tab_permissions.settings.tenants.can_write）的人才能動任何 workspace 的 features。
// 同 pattern 於 src/app/api/tenants/create/route.ts。
async function requireTenantAdmin(): Promise<
  { ok: true; workspaceId: string } | { ok: false; response: NextResponse }
> {
  const auth = await getServerAuth()
  if (!auth.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: '請先登入' }, { status: 401 }),
    }
  }

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
    return {
      ok: false,
      response: NextResponse.json({ error: '無權限操作' }, { status: 403 }),
    }
  }

  const { data: rolePermission } = await adminClient
    .from('role_tab_permissions')
    .select('can_write')
    .eq('role_id', effectiveRoleId)
    .eq('module_code', 'settings')
    .eq('tab_code', 'tenants')
    .single()

  if (!rolePermission?.can_write) {
    return {
      ok: false,
      response: NextResponse.json({ error: '無權限操作' }, { status: 403 }),
    }
  }

  return { ok: true, workspaceId: auth.data.workspaceId }
}

/**
 * GET /api/permissions/features
 * 取得當前租戶的功能權限
 *
 * 特殊：可傳 workspace_id 查詢其他租戶（需「租戶管理」權限）
 */
export async function GET(request: NextRequest) {
  const queryWorkspaceId = request.nextUrl.searchParams.get('workspace_id')

  // 如果指定了 workspace_id：需要租戶管理權限才能跨租戶查
  if (queryWorkspaceId) {
    const gate = await requireTenantAdmin()
    if (!gate.ok) return gate.response

    const serviceSupabase = createServiceClient()
    const { data, error } = await serviceSupabase
      .from('workspace_features')
      .select('feature_code, enabled')
      .eq('workspace_id', queryWorkspaceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  // 否則取得當前租戶的功能（RLS 自動過濾）
  const supabase = await createApiClient()
  const { data, error } = await supabase.from('workspace_features').select('feature_code, enabled')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/permissions/features
 * 更新租戶的功能權限（覆蓋式）
 *
 * 僅限「租戶管理」權限持有者（Corner admin / 類似角色）。
 */
export async function PUT(request: NextRequest) {
  const gate = await requireTenantAdmin()
  if (!gate.ok) return gate.response

  const body = await request.json()
  const { workspace_id, features, premium_enabled } = body

  const targetWorkspaceId: string | undefined = workspace_id ?? gate.workspaceId

  if (!targetWorkspaceId || !Array.isArray(features)) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const serviceSupabase = createServiceClient()

  // 1. 更新付費大開關
  if (typeof premium_enabled === 'boolean') {
    const { error: wsError } = await serviceSupabase
      .from('workspaces')
      .update({ premium_enabled })
      .eq('id', targetWorkspaceId)

    if (wsError) {
      return NextResponse.json({ error: wsError.message }, { status: 500 })
    }
  }

  // 2. Upsert 所有功能小開關
  const upsertData = features.map((f: { feature_code: string; enabled: boolean }) => ({
    workspace_id: targetWorkspaceId,
    feature_code: f.feature_code,
    enabled: f.enabled,
    enabled_at: f.enabled ? new Date().toISOString() : null,
  }))

  const { error } = await serviceSupabase
    .from('workspace_features')
    .upsert(upsertData, { onConflict: 'workspace_id,feature_code' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
