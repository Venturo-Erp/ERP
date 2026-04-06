import { NextRequest, NextResponse } from 'next/server'
import {
  createApiClient,
  getCurrentWorkspaceId,
  createServiceClient,
} from '@/lib/supabase/api-client'

/**
 * GET /api/permissions/features
 * 取得當前租戶的功能權限
 *
 * 特殊：可傳 workspace_id 查詢其他租戶（需 super admin）
 */
export async function GET(request: NextRequest) {
  const queryWorkspaceId = request.nextUrl.searchParams.get('workspace_id')

  // 如果指定了 workspace_id，用 service client（super admin 操作）
  if (queryWorkspaceId) {
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
 * 這是 super admin 操作，需要用 service client
 */
export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { workspace_id, features, premium_enabled } = body

  // 如果沒傳 workspace_id，用當前登入者的
  let targetWorkspaceId = workspace_id
  if (!targetWorkspaceId) {
    targetWorkspaceId = await getCurrentWorkspaceId()
  }

  if (!targetWorkspaceId || !Array.isArray(features)) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 用 service client（super admin 操作）
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
