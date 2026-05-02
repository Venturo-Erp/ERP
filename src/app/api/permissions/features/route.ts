import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getApiContext } from '@/lib/auth/get-api-context'

// P003-A（2026-04-22 立 / 2026-05-01 改用新 capability 系統 / F2 改走 getApiContext）
// 只有有 platform.tenants.write 的人才能動任何 workspace 的 features。
// 同 pattern 於 src/app/api/tenants/create/route.ts。
async function requireTenantAdmin(): Promise<
  { ok: true; workspaceId: string } | { ok: false; response: NextResponse }
> {
  const ctx = await getApiContext({ capabilityCode: 'platform.tenants.write' })
  if (!ctx.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: ctx.status === 401 ? '請先登入' : '無權限操作' },
        { status: ctx.status },
      ),
    }
  }
  return { ok: true, workspaceId: ctx.workspace_id }
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

    const serviceSupabase = getSupabaseAdminClient()
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

  const serviceSupabase = getSupabaseAdminClient()

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
