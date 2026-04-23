import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * 權限檢查 API
 * POST /api/permissions/check
 *
 * 檢查使用者是否有權限存取特定模組/分頁。
 * 來源：role_tab_permissions（職務權限）+ workspace_features（租戶功能開關）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    const { roleId, moduleCode, tabCode } = await request.json()

    if (!moduleCode) {
      return NextResponse.json({ error: '缺少 moduleCode 參數' }, { status: 400 })
    }

    const { data: features } = await supabase
      .from('workspace_features')
      .select('feature_code, enabled')

    let canRead = false
    let canWrite = false

    if (roleId) {
      const { data: permissions } = await supabase
        .from('role_tab_permissions')
        .select('module_code, tab_code, can_read, can_write')
        .eq('role_id', roleId)

      const permission = permissions?.find(
        p => p.module_code === moduleCode && p.tab_code === (tabCode || null)
      )
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
    return NextResponse.json({ error: '權限檢查失敗' }, { status: 500 })
  }
}
