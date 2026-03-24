/**
 * 建立租戶 API
 *
 * 功能：
 * 1. 建立 workspace
 * 2. 建立第一個管理員 (employee + auth + profile)
 * 3. 建立公告頻道
 * 4. Seed 基礎資料 (countries, cities)
 * 5. 建立 workspace bot
 *
 * 權限：只有 Corner 的 super_admin 可以呼叫
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'

interface CreateTenantRequest {
  // Workspace 資訊
  workspaceName: string
  workspaceCode: string
  workspaceType: string | null

  // 第一個管理員資訊
  adminEmployeeNumber: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 權限檢查：只有 Corner 的 super_admin 可以建立租戶
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const supabaseAdmin = getSupabaseAdminClient()

    // 檢查當前用戶是否為 Corner 的 super_admin
    const { data: currentEmployee } = await supabaseAdmin
      .from('employees')
      .select('roles, workspace_id')
      .eq('id', auth.data.employeeId)
      .single()

    if (!currentEmployee || !currentEmployee.workspace_id) {
      logger.error('Employee not found or no workspace')
      return errorResponse('找不到員工資料', 403, ErrorCode.FORBIDDEN)
    }

    const roles = currentEmployee.roles as string[] | null
    const isSuperAdmin = roles?.includes('super_admin') ?? false

    // 查詢 workspace 取得 code
    const { data: currentWorkspace } = await supabaseAdmin
      .from('workspaces')
      .select('code')
      .eq('id', currentEmployee.workspace_id as string)
      .single()

    const workspaceCode = currentWorkspace?.code

    logger.log(
      `Permission check: isSuperAdmin=${isSuperAdmin}, workspace=${workspaceCode || 'unknown'}`
    )

    if (!isSuperAdmin || workspaceCode !== 'CORNER') {
      logger.error(`Permission denied: isSuperAdmin=${isSuperAdmin}, workspace=${workspaceCode}`)
      return errorResponse('只有 CORNER 的 super_admin 可以建立租戶', 403, ErrorCode.FORBIDDEN)
    }

    // 解析請求
    const body = (await request.json()) as CreateTenantRequest
    const {
      workspaceName,
      workspaceCode: newWorkspaceCode,
      workspaceType,
      adminEmployeeNumber,
      adminName,
      adminEmail,
      adminPassword,
    } = body

    // 驗證必填欄位
    if (!workspaceName || !newWorkspaceCode || !adminName || !adminEmail || !adminPassword) {
      return errorResponse('缺少必填欄位', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 驗證 workspace code 格式（大寫英文字母）
    if (!/^[A-Z]+$/.test(newWorkspaceCode)) {
      return errorResponse('公司代號必須為大寫英文字母', 400, ErrorCode.VALIDATION_ERROR)
    }

    // 檢查 workspace code 是否已存在
    const { data: existingWorkspace } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('code', newWorkspaceCode)
      .single()

    if (existingWorkspace) {
      return errorResponse('公司代號已存在', 400, ErrorCode.VALIDATION_ERROR)
    }

    logger.log(`Creating tenant: ${newWorkspaceCode} (${workspaceName})`)

    // ========== 開始建立租戶 ==========

    // 1. 建立 workspace
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: workspaceName,
        code: newWorkspaceCode,
        type: workspaceType,
        is_active: true,
      })
      .select('id')
      .single()

    if (wsError || !workspace) {
      logger.error('Failed to create workspace:', wsError)
      return errorResponse('建立 workspace 失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    logger.log(`Workspace created: ${workspace.id}`)

    // 2. 建立第一個管理員 (employee)
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .insert({
        workspace_id: workspace.id,
        employee_number: adminEmployeeNumber,
        chinese_name: adminName,
        display_name: adminName,
        email: adminEmail.toLowerCase(),
        roles: ['admin'],
        permissions: [
          '*',
          'todos',
          'payments',
          'requests',
          'visas',
          'calendar',
          'workspace',
          'quotes',
          'tours',
          'orders',
          'customers',
          'hr',
        ], // 完整權限
        is_active: true,
      })
      .select('id')
      .single()

    if (empError || !employee) {
      logger.error('Failed to create employee:', empError)
      // Rollback workspace
      await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
      return errorResponse('建立管理員失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    logger.log(`Employee created: ${employee.id}`)

    // 3. 建立 auth 用戶
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      email_confirm: true,
    })

    if (authError || !authUser.user) {
      logger.error('Failed to create auth user:', authError)
      // Rollback
      await supabaseAdmin.from('employees').delete().eq('id', employee.id)
      await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
      return errorResponse('建立 auth 用戶失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    logger.log(`Auth user created: ${authUser.user.id}`)

    // 4. 更新 employee 的 supabase_user_id
    await supabaseAdmin
      .from('employees')
      .update({ supabase_user_id: authUser.user.id })
      .eq('id', employee.id)

    // 5. 建立 profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authUser.user.id,
      workspace_id: workspace.id,
      employee_id: employee.id,
      display_name: adminName,
      is_employee: true,
    })

    if (profileError) {
      logger.warn('Failed to create profile:', profileError)
      // Profile 不是關鍵資料，不 rollback
    }

    // 6. 建立公告頻道
    try {
      await supabaseAdmin.from('channels').insert({
        workspace_id: workspace.id,
        name: '公告',
        description: '公司公告頻道',
        type: 'PUBLIC',
        is_announcement: true,
        created_by: auth.data.user.id,
      })
      logger.log('Announcement channel created')
    } catch (channelError) {
      logger.warn('Failed to create announcement channel:', channelError)
    }

    // 7. Seed 基礎資料 (countries, cities)
    try {
      const seedResponse = await fetch(`${request.nextUrl.origin}/api/tenants/seed-base-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWorkspaceId: workspace.id }),
      })
      if (seedResponse.ok) {
        logger.log('Base data seeded')
      }
    } catch (seedError) {
      logger.warn('Failed to seed base data:', seedError)
    }

    // 8. 建立 workspace bot
    try {
      const botResponse = await fetch(`${request.nextUrl.origin}/api/debug/setup-workspace-bots`, {
        method: 'POST',
      })
      if (botResponse.ok) {
        logger.log('Workspace bot created')
      }
    } catch (botError) {
      logger.warn('Failed to create bot:', botError)
    }

    logger.log(`Tenant created successfully: ${newWorkspaceCode}`)

    // 返回登入資訊
    return successResponse({
      workspace: {
        id: workspace.id,
        code: newWorkspaceCode,
        name: workspaceName,
      },
      admin: {
        employee_id: employee.id,
        employee_number: adminEmployeeNumber,
        email: adminEmail,
      },
      login: {
        workspaceCode: newWorkspaceCode,
        employeeNumber: adminEmployeeNumber,
        email: adminEmail,
        password: adminPassword, // 僅用於顯示給管理員，不要儲存
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to create tenant:', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined })
    return errorResponse(`建立租戶失敗: ${errorMessage}`, 500, ErrorCode.INTERNAL_ERROR)
  }
}
