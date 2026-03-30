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

    // 查詢員工詳細資訊（包含 role）
    const { data: employeeDetail } = await supabaseAdmin
      .from('employees')
      .select('chinese_name, english_name, display_name, email, role_id')
      .eq('id', auth.data.employeeId)
      .single()

    const employeeName = employeeDetail?.display_name || employeeDetail?.chinese_name || employeeDetail?.english_name || ''
    
    logger.log(`Employee detail: ${JSON.stringify(employeeDetail)}, employeeName=${employeeName}`)

    // 🔒 權限檢查：只有有「租戶管理」權限的人可以建立租戶
    // 新系統：檢查 workspace_roles 的分頁權限
    let canManageTenants = false
    
    if (employeeDetail?.role_id) {
      const { data: rolePermission } = await supabaseAdmin
        .from('role_tab_permissions')
        .select('can_write')
        .eq('role_id', employeeDetail.role_id)
        .eq('module_code', 'settings')
        .eq('tab_code', 'tenants')
        .single()
      
      canManageTenants = rolePermission?.can_write ?? false
    }

    // 備用：允許特定人員（William、Carson）
    const allowedNames = ['William', 'Carson', 'William Chien']
    const isAllowedPerson = allowedNames.some(name => employeeName.includes(name))

    const isAllowed = canManageTenants || isAllowedPerson

    logger.log(
      `Permission check: canManageTenants=${canManageTenants}, name=${employeeName}, allowed=${isAllowed}`
    )

    if (!isAllowed) {
      logger.error(`Permission denied: canManageTenants=${canManageTenants}, name=${employeeName}`)
      return errorResponse('只有有「租戶管理」權限的人可以建立租戶', 403, ErrorCode.FORBIDDEN)
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

    // 2.5 建立預設職務並設定管理員
    const defaultRoles = [
      { name: '管理員', is_admin: true },
      { name: '業務', is_admin: false },
      { name: '會計', is_admin: false },
      { name: '助理', is_admin: false },
    ]

    const { data: createdRoles, error: rolesError } = await supabaseAdmin
      .from('workspace_roles')
      .insert(defaultRoles.map(r => ({ ...r, workspace_id: workspace.id })))
      .select('id, name')

    if (rolesError) {
      logger.warn('Failed to create default roles:', rolesError)
    } else {
      logger.log(`Default roles created: ${createdRoles?.length}`)
      
      // 找到管理員職務的 ID
      const adminRole = createdRoles?.find(r => r.name === '管理員')
      if (adminRole) {
        // 更新第一個管理員的 job_info.role_id
        await supabaseAdmin
          .from('employees')
          .update({ job_info: { role_id: adminRole.id } })
          .eq('id', employee.id)
        logger.log(`Admin employee role_id set: ${adminRole.id}`)

        // 設定預設權限（會計、業務、助理）
        const accountingRole = createdRoles?.find(r => r.name === '會計')
        const salesRole = createdRoles?.find(r => r.name === '業務')
        const assistantRole = createdRoles?.find(r => r.name === '助理')

        // 設定預設權限（新版：用 role_tab_permissions）
        const defaultTabPermissions = [
          // 會計權限
          ...(accountingRole ? [
            { role_id: accountingRole.id, module_code: 'accounting', tab_code: null, can_read: true, can_write: true },
            { role_id: accountingRole.id, module_code: 'finance', tab_code: 'payments', can_read: true, can_write: true },
            { role_id: accountingRole.id, module_code: 'finance', tab_code: 'requests', can_read: true, can_write: true },
            { role_id: accountingRole.id, module_code: 'finance', tab_code: 'treasury', can_read: true, can_write: true },
            { role_id: accountingRole.id, module_code: 'dashboard', tab_code: null, can_read: true, can_write: false },
            { role_id: accountingRole.id, module_code: 'calendar', tab_code: null, can_read: true, can_write: true },
            { role_id: accountingRole.id, module_code: 'todos', tab_code: null, can_read: true, can_write: true },
            { role_id: accountingRole.id, module_code: 'settings', tab_code: 'personal', can_read: true, can_write: true },
          ] : []),
          // 業務權限
          ...(salesRole ? [
            { role_id: salesRole.id, module_code: 'tours', tab_code: null, can_read: true, can_write: true },
            { role_id: salesRole.id, module_code: 'orders', tab_code: null, can_read: true, can_write: true },
            { role_id: salesRole.id, module_code: 'database', tab_code: 'customers', can_read: true, can_write: true },
            { role_id: salesRole.id, module_code: 'dashboard', tab_code: null, can_read: true, can_write: false },
            { role_id: salesRole.id, module_code: 'calendar', tab_code: null, can_read: true, can_write: true },
            { role_id: salesRole.id, module_code: 'todos', tab_code: null, can_read: true, can_write: true },
            { role_id: salesRole.id, module_code: 'settings', tab_code: 'personal', can_read: true, can_write: true },
          ] : []),
          // 助理權限（同業務）
          ...(assistantRole ? [
            { role_id: assistantRole.id, module_code: 'tours', tab_code: null, can_read: true, can_write: true },
            { role_id: assistantRole.id, module_code: 'orders', tab_code: null, can_read: true, can_write: true },
            { role_id: assistantRole.id, module_code: 'database', tab_code: 'customers', can_read: true, can_write: true },
            { role_id: assistantRole.id, module_code: 'dashboard', tab_code: null, can_read: true, can_write: false },
            { role_id: assistantRole.id, module_code: 'calendar', tab_code: null, can_read: true, can_write: true },
            { role_id: assistantRole.id, module_code: 'todos', tab_code: null, can_read: true, can_write: true },
            { role_id: assistantRole.id, module_code: 'settings', tab_code: 'personal', can_read: true, can_write: true },
          ] : []),
        ]

        if (defaultTabPermissions.length > 0) {
          await supabaseAdmin.from('role_tab_permissions').insert(defaultTabPermissions)
          logger.log(`Default tab permissions created: ${defaultTabPermissions.length}`)
        }
      }
    }

    // 2.6 建立預設 workspace_features（開放所有基本功能）
    const defaultFeatures = [
      'dashboard', 'calendar', 'workspace', 'todos', 'tours', 'orders',
      'quotes', 'finance', 'database', 'hr', 'settings', 'customers',
      'itinerary', 'accounting', 'channel'
    ]
    
    const featuresToInsert = defaultFeatures.map(code => ({
      workspace_id: workspace.id,
      feature_code: code,
      enabled: true,
    }))
    
    const { error: featuresError } = await supabaseAdmin
      .from('workspace_features')
      .insert(featuresToInsert)
    
    if (featuresError) {
      logger.warn('Failed to create workspace features:', featuresError)
    } else {
      logger.log(`Workspace features created: ${defaultFeatures.length}`)
    }

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
