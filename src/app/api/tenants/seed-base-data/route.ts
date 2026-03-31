import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'

const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

/**
 * POST /api/tenants/seed-base-data
 * 為新租戶複製基礎資料（國家、城市）
 * 需要「租戶管理」權限
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ success: false, error: '請先登入' }, { status: 401 })
    }

    // 查員工權限（需要租戶管理權限）
    const supabaseAdmin = getSupabaseAdminClient()
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('role_id')
      .eq('id', auth.data.employeeId)
      .single()

    let canManageTenants = false
    if (employee?.role_id) {
      const { data: rolePermission } = await supabaseAdmin
        .from('role_tab_permissions')
        .select('can_write')
        .eq('role_id', employee.role_id)
        .eq('module_code', 'settings')
        .eq('tab_code', 'tenants')
        .single()
      canManageTenants = rolePermission?.can_write ?? false
    }

    if (!canManageTenants) {
      return NextResponse.json({ success: false, error: '權限不足' }, { status: 403 })
    }

    const body = (await request.json()) as { targetWorkspaceId?: string }
    const { targetWorkspaceId } = body

    if (!targetWorkspaceId) {
      return NextResponse.json({ success: false, error: '缺少 targetWorkspaceId' }, { status: 400 })
    }

    // 呼叫 DB function 複製基礎資料
    const supabase = supabaseAdmin
    const { error } = (await supabase.rpc('seed_tenant_base_data', {
      source_workspace_id: CORNER_WORKSPACE_ID,
      target_workspace_id: targetWorkspaceId,
    })) as { error: { message: string } | null }

    if (error) {
      logger.error('Seed base data failed:', error)
      return NextResponse.json({ success: false, error: '基礎資料建立失敗' }, { status: 500 })
    }

    logger.log(`Seeded base data for workspace: ${targetWorkspaceId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Seed base data error:', error)
    return NextResponse.json({ success: false, error: '伺服器錯誤' }, { status: 500 })
  }
}
