import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 權限檢查 API
 * POST /api/permissions/check
 * 
 * 檢查使用者是否有權限存取特定路由
 */
export async function POST(request: NextRequest) {
  try {
    const { workspaceId, roleId, route } = await request.json()

    if (!workspaceId || !route) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      )
    }

    // 1. 檢查租戶功能權限
    const { data: features } = await supabase
      .from('workspace_features')
      .select('feature_code, enabled')
      .eq('workspace_id', workspaceId)

    // 2. 檢查角色路由權限（如果有 roleId）
    let canRead = true
    let canWrite = true

    if (roleId) {
      const { data: permissions } = await supabase
        .from('role_route_permissions')
        .select('route, can_read, can_write')
        .eq('role_id', roleId)

      const permission = permissions?.find(p => route.startsWith(p.route))
      if (permission) {
        canRead = permission.can_read
        canWrite = permission.can_write
      }
    }

    return NextResponse.json({
      canAccess: canRead,
      canRead,
      canWrite,
      features: features?.filter(f => f.enabled).map(f => f.feature_code) || [],
    })
  } catch (err) {
    console.error('[Permissions Check] Error:', err)
    return NextResponse.json(
      { error: '權限檢查失敗' },
      { status: 500 }
    )
  }
}
