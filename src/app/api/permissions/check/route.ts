import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * 權限檢查 API
 * POST /api/permissions/check
 * 
 * 檢查使用者是否有權限存取特定模組/分頁
 * 新版：使用 role_tab_permissions + employee_permission_overrides
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    const { roleId, employeeId, moduleCode, tabCode } = await request.json()

    if (!moduleCode) {
      return NextResponse.json(
        { error: '缺少 moduleCode 參數' },
        { status: 400 }
      )
    }

    // 1. 檢查租戶功能權限（RLS 自動過濾）
    const { data: features } = await supabase
      .from('workspace_features')
      .select('feature_code, enabled')

    // 2. 檢查職務權限
    let canRead = false
    let canWrite = false

    if (roleId) {
      const { data: permissions } = await supabase
        .from('role_tab_permissions')
        .select('module_code, tab_code, can_read, can_write')
        .eq('role_id', roleId)

      // 找匹配的權限
      const permission = permissions?.find(p => 
        p.module_code === moduleCode && p.tab_code === (tabCode || null)
      )
      if (permission) {
        canRead = permission.can_read
        canWrite = permission.can_write
      }
    }

    // 3. 檢查員工覆寫
    if (employeeId) {
      const { data: overrides } = await supabase
        .from('employee_permission_overrides' as 'employees')
        .select('module_code, tab_code, override_type')
        .eq('employee_id', employeeId)

      const override = (overrides as { module_code: string; tab_code: string | null; override_type: string }[] | null)?.find(o =>
        o.module_code === moduleCode && o.tab_code === (tabCode || null)
      )
      
      if (override) {
        if (override.override_type === 'grant') {
          canRead = true
          canWrite = true
        } else if (override.override_type === 'revoke') {
          canRead = false
          canWrite = false
        }
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
