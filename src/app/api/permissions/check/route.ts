import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * 權限檢查 API
 * POST /api/permissions/check
 * 
 * 檢查使用者是否有權限存取特定路由
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    const { roleId, route } = await request.json()

    if (!route) {
      return NextResponse.json(
        { error: '缺少 route 參數' },
        { status: 400 }
      )
    }

    // 1. 檢查租戶功能權限（RLS 自動過濾）
    const { data: features } = await supabase
      .from('workspace_features')
      .select('feature_code, enabled')

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
  } catch {
    return NextResponse.json(
      { error: '權限檢查失敗' },
      { status: 500 }
    )
  }
}
