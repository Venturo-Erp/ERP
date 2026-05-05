/**
 * 建立租戶 API
 *
 * 功能：
 * 1. 建立 workspace
 * 2. 建立第一個系統主管 (employee + auth + profile)
 * 3. Seed 基礎資料 (countries, cities)
 *
 * 權限：需要「租戶管理」功能權限（workspace_features + role_tab_permissions）
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { MODULES } from '@/lib/permissions/module-tabs'

// Corner workspace 當全站職務模板的來源。
// 理由：Corner 是 Venturo 首家實客戶、職務權限由 William 手工調校過；
// 跟 migration 20260422160000_sync_default_roles_from_corner.sql 同源。
const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
const DEFAULT_ROLE_NAMES = ['系統主管', '業務', '會計', '助理'] as const

interface CreateTenantRequest {
  // Workspace 資訊
  workspaceName: string
  workspaceCode: string
  workspaceType: string | null
  maxEmployees: number | null

  // 第一個系統主管資訊
  adminEmployeeNumber: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 權限檢查：需要「租戶管理」功能權限
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const supabaseAdmin = getSupabaseAdminClient()

    // 查詢員工資訊
    const { data: currentEmployee, error: currentEmpError } = await supabaseAdmin
      .from('employees')
      .select('workspace_id, chinese_name, english_name, display_name, email, role_id, job_info')
      .eq('id', auth.data.employeeId)
      .single()

    logger.log(
      `Employee query: id=${auth.data.employeeId}, data=${JSON.stringify(currentEmployee)}, error=${currentEmpError?.message}`
    )

    if (!currentEmployee || !currentEmployee.workspace_id) {
      logger.error('Employee not found or no workspace')
      return errorResponse('找不到員工資料', 403, ErrorCode.FORBIDDEN)
    }

    const employeeName =
      currentEmployee.display_name ||
      currentEmployee.chinese_name ||
      currentEmployee.english_name ||
      ''

    logger.log(`Employee name resolved: ${employeeName}`)

    // 🔒 權限檢查（兩層）：
    //   1) 員工所在 workspace 必須開啟「租戶管理」功能（workspace_features.tenants = true）
    //   2) 員工必須擁有管理員資格（workspace_roles.is_admin = true）
    //
    // 租戶管理是 Venturo 平台商業敏感功能、不走 role_tab_permissions（那個 tab 根本沒定義）
    // 原查詢 role_tab_permissions.settings.tenants 是 bug、settings.tenants tab 不存在於 module-tabs.ts
    const effectiveRoleId =
      currentEmployee.role_id ||
      ((currentEmployee.job_info as Record<string, unknown>)?.role_id as string | undefined)

    let isWorkspaceAdmin = false
    if (effectiveRoleId) {
      // 限定當前使用者所屬 workspace、防 role_id 偽造跨租戶
      const { data: role } = await supabaseAdmin
        .from('workspace_roles')
        .select('is_admin')
        .eq('workspace_id', currentEmployee.workspace_id)
        .eq('id', effectiveRoleId)
        .single()
      isWorkspaceAdmin = role?.is_admin === true
    }

    const { data: tenantsFeature } = await supabaseAdmin
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', currentEmployee.workspace_id)
      .eq('feature_code', 'tenants')
      .single()
    const hasTenantsFeature = tenantsFeature?.enabled === true

    logger.log(
      `Permission check: admin=${isWorkspaceAdmin}, tenantsFeature=${hasTenantsFeature}, name=${employeeName}`
    )

    if (!isWorkspaceAdmin || !hasTenantsFeature) {
      logger.error(
        `Permission denied for tenants/create: admin=${isWorkspaceAdmin}, feature=${hasTenantsFeature}, name=${employeeName}`
      )
      return errorResponse(
        '您沒有此權限（需在已開啟「租戶管理」功能的 workspace 擁有管理員資格）',
        403,
        ErrorCode.FORBIDDEN
      )
    }

    // 解析請求
    const body = (await request.json()) as CreateTenantRequest
    const {
      workspaceName,
      workspaceCode: newWorkspaceCode,
      workspaceType,
      maxEmployees,
      adminEmployeeNumber,
      adminName,
      adminEmail,
      adminPassword,
    } = body

    // 驗證必填欄位（email 為選填）
    if (!workspaceName || !newWorkspaceCode || !adminName || !adminPassword) {
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

    // ========== 開始建立租戶（原子性：任何 critical 步驟失敗、一律 rollback） ==========

    // 追蹤已建立資源、失敗時反向清理
    let createdWorkspaceId: string | null = null
    let createdEmployeeId: string | null = null
    let createdAuthUserId: string | null = null

    async function rollback(reason: string) {
      logger.warn(`Rolling back tenant creation: ${reason}`)
      // 反向清理；不依賴 FK cascade（不確定每張表都有設）
      if (createdAuthUserId) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
        if (error) logger.error('Rollback deleteUser failed:', error)
      }
      if (createdWorkspaceId) {
        const { data: wsRoles } = await supabaseAdmin
          .from('workspace_roles')
          .select('id')
          .eq('workspace_id', createdWorkspaceId)
        const wsRoleIds = (wsRoles ?? []).map(r => r.id)
        if (wsRoleIds.length > 0) {
          // role_capabilities 沒有自己的 workspace_id 欄位（透過 role_id 關聯到 workspace_roles）
          // 上一步 wsRoleIds 已限定 createdWorkspaceId、跨租戶安全
          await supabaseAdmin.from('role_capabilities').delete().in('role_id', wsRoleIds)
        }
        await supabaseAdmin.from('workspace_roles').delete().eq('workspace_id', createdWorkspaceId)
        await supabaseAdmin
          .from('workspace_features')
          .delete()
          .eq('workspace_id', createdWorkspaceId)
      }
      if (createdEmployeeId) {
        const { error } = await supabaseAdmin.from('employees').delete().eq('id', createdEmployeeId)
        if (error) logger.error('Rollback delete employee failed:', error)
      }
      if (createdWorkspaceId) {
        const { error } = await supabaseAdmin
          .from('workspaces')
          .delete()
          .eq('id', createdWorkspaceId)
        if (error) logger.error('Rollback delete workspace failed:', error)
      }
    }

    // 1. 建立 workspace
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: workspaceName,
        code: newWorkspaceCode,
        type: workspaceType,
        max_employees: maxEmployees ?? null,
        is_active: true,
        premium_enabled: false,
      })
      .select('id')
      .single()

    if (wsError || !workspace) {
      logger.error('Failed to create workspace:', JSON.stringify(wsError))
      return errorResponse(
        `建立 workspace 失敗: ${wsError?.message || 'unknown'}`,
        500,
        ErrorCode.OPERATION_FAILED
      )
    }

    createdWorkspaceId = workspace.id
    logger.log(`Workspace created: ${workspace.id}`)

    // 2. 建立第一個系統主管 (employee)
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .insert({
        workspace_id: workspace.id,
        employee_number: adminEmployeeNumber,
        chinese_name: adminName,
        display_name: adminName,
        email: adminEmail.toLowerCase(),
        roles: ['admin'],
      })
      .select('id')
      .single()

    if (empError || !employee) {
      logger.error('Failed to create employee:', empError)
      await rollback('employee creation failed')
      return errorResponse('建立系統主管失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    createdEmployeeId = employee.id
    logger.log(`Employee created: ${employee.id}`)

    // 3. 建立 Supabase Auth 帳號（登入必備、失敗必 rollback）
    const authEmail =
      adminEmail?.toLowerCase() ||
      `${newWorkspaceCode.toLowerCase()}_${adminEmployeeNumber.toLowerCase()}@venturo.com`
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        workspace_id: workspace.id,
        employee_id: employee.id,
        workspace_code: newWorkspaceCode,
      },
    })

    if (authError || !authUser?.user) {
      logger.error('Failed to create auth user:', authError)
      await rollback('auth user creation failed')
      const msg = authError?.message || ''
      const userMsg = msg.includes('already been registered')
        ? `此 email（${authEmail}）已被其他帳號使用、請換一個`
        : `建立系統主管登入帳號失敗：${msg || 'unknown'}`
      return errorResponse(userMsg, 400, ErrorCode.OPERATION_FAILED)
    }

    createdAuthUserId = authUser.user.id

    // 4. 更新 employee 的 user_id（登入綁定、失敗必 rollback）
    const { error: linkError } = await supabaseAdmin
      .from('employees')
      .update({ user_id: authUser.user.id })
      .eq('id', employee.id)

    if (linkError) {
      logger.error('Failed to link auth user to employee:', linkError)
      await rollback('user_id link failed')
      return errorResponse('綁定登入帳號失敗、請稍後重試', 500, ErrorCode.OPERATION_FAILED)
    }

    logger.log(`Auth user created: ${authUser.user.id}, linked to employee ${employee.id}`)

    // 5. 建立預設職務並設定系統主管（權限必備、失敗必 rollback）
    // P001 收尾（2026-04-22）：職務權限模板從 Corner 複製、跟 migration 20260422160000 同源
    const { data: createdRoles, error: rolesError } = await supabaseAdmin
      .from('workspace_roles')
      .insert(
        DEFAULT_ROLE_NAMES.map(name => ({
          workspace_id: workspace.id,
          name,
          is_admin: name === '系統主管',
        }))
      )
      .select('id, name')

    if (rolesError || !createdRoles) {
      logger.error('Failed to create default roles:', rolesError)
      await rollback('default roles creation failed')
      return errorResponse('建立預設職務失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    logger.log(`Default roles created: ${createdRoles.length}`)

    const adminRole = createdRoles.find(r => r.name === '系統主管')
    if (!adminRole) {
      await rollback('admin role missing after roles insert')
      return errorResponse('建立系統主管職務失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    const { error: setRoleError } = await supabaseAdmin
      .from('employees')
      .update({ role_id: adminRole.id })
      .eq('id', employee.id)

    if (setRoleError) {
      logger.error('Failed to set admin role_id:', setRoleError)
      await rollback('set admin role_id failed')
      return errorResponse('綁定系統主管職務失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    // 6. 從 Corner 模板複製 role_tab_permissions（權限表、失敗必 rollback）
    const { data: cornerRoles, error: cornerRolesError } = await supabaseAdmin
      .from('workspace_roles')
      .select('id, name')
      .eq('workspace_id', CORNER_WORKSPACE_ID)
      .in('name', DEFAULT_ROLE_NAMES as unknown as string[])

    if (cornerRolesError || !cornerRoles || cornerRoles.length === 0) {
      logger.error('Corner template roles not found:', cornerRolesError)
      await rollback('corner template roles missing')
      return errorResponse('找不到權限模板、請聯絡工程團隊', 500, ErrorCode.OPERATION_FAILED)
    }

    // role_capabilities 沒有 workspace_id 欄位（透過 role_id 關聯）
    // role_id 已限定為 cornerRoles（屬於 CORNER_WORKSPACE_ID）、不會跨租戶
    const { data: cornerCaps, error: cornerCapsError } = await supabaseAdmin
      .from('role_capabilities')
      .select('role_id, capability_code, enabled')
      .in(
        'role_id',
        cornerRoles.map(r => r.id)
      )
      .eq('enabled', true)

    if (cornerCapsError) {
      logger.error('Failed to read corner capabilities:', cornerCapsError)
      await rollback('read corner capabilities failed')
      return errorResponse('讀取權限模板失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    const cornerRoleNameById = new Map(cornerRoles.map(r => [r.id, r.name]))
    const newRoleIdByName = new Map(createdRoles.map(r => [r.name, r.id]))

    const templateCaps = (cornerCaps ?? [])
      .map(cp => {
        const roleName = cornerRoleNameById.get(cp.role_id)
        const newRoleId = roleName ? newRoleIdByName.get(roleName) : undefined
        if (!newRoleId) return null
        return {
          role_id: newRoleId,
          capability_code: cp.capability_code,
          enabled: true,
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    if (templateCaps.length > 0) {
      const { error: capError } = await supabaseAdmin
        .from('role_capabilities')
        .insert(templateCaps)
      if (capError) {
        logger.error('Failed to seed template capabilities:', capError)
        await rollback('seed capabilities failed')
        return errorResponse('複製權限模板失敗', 500, ErrorCode.OPERATION_FAILED)
      }
      logger.log(`Template capabilities seeded from Corner: ${templateCaps.length} rows`)
    }

    // 7. 建立預設 workspace_features（功能開關、失敗必 rollback）
    // 免費功能（預設全開）
    const freeFeatures = [
      'dashboard',
      'calendar',
      'workspace',
      'todos',
      'tours',
      'orders',
      'quotes',
      'finance',
      'database',
      'hr',
      'settings',
      'customers',
      'itinerary',
    ]
    // 付費功能（預設關閉）
    // bot_line / bot_telegram 已於 2026-05-05 砍除（William 拍板：機器人不該是員工、通知概念重做）
    const premiumFeatures = [
      'accounting',
      'office',
      'fleet',
      'local',
      'supplier_portal',
      'esims',
    ]
    const defaultFeatures = [
      ...freeFeatures.map(code => ({ feature_code: code, enabled: true })),
      ...premiumFeatures.map(code => ({ feature_code: code, enabled: false })),
    ]

    // 2026-04-20：從 MODULES 自動 seed tab-level feature rows
    // 配合 isTabEnabled 改為嚴格（default-deny）、避免新租戶所有 tab 空白
    const enabledModules = new Set(freeFeatures)
    const tabFeatures: { feature_code: string; enabled: boolean }[] = []
    for (const m of MODULES) {
      for (const t of m.tabs) {
        if (t.isEligibility) continue // eligibility 不是 feature toggle
        const key = `${m.code}.${t.code}`
        // basic tab 跟隨 module 預設、premium tab 一律預設關（要明確 opt-in）
        const enabled = enabledModules.has(m.code) && t.category !== 'premium'
        tabFeatures.push({ feature_code: key, enabled })
      }
    }

    const featuresToInsert = [
      ...defaultFeatures.map(f => ({
        workspace_id: workspace.id,
        feature_code: f.feature_code,
        enabled: f.enabled,
      })),
      ...tabFeatures.map(f => ({
        workspace_id: workspace.id,
        feature_code: f.feature_code,
        enabled: f.enabled,
      })),
    ]

    const { error: featuresError } = await supabaseAdmin
      .from('workspace_features')
      .insert(featuresToInsert)

    if (featuresError) {
      logger.error('Failed to create workspace features:', featuresError)
      await rollback('workspace_features insert failed')
      return errorResponse('建立功能開關失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    logger.log(`Workspace features created: ${defaultFeatures.length}`)

    // ========== 以下為 soft 步驟：失敗不 rollback（影響小、可事後補） ==========

    // 8. channel_chat_system 已於 cleanup 砍除、新租戶不再建公告頻道

    // 9. 從 CORNER 複製基礎資料（國家、城市/機場）給新租戶
    try {
      const CORNER_WS = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
      // 複製國家
      const { data: cornerCountries } = await supabaseAdmin
        .from('countries')
        .select(
          'id, code, name, name_en, region, workspace_id, usage_count, emoji, has_regions, is_active, display_order'
        )
        .eq('workspace_id', CORNER_WS)
      if (cornerCountries && cornerCountries.length > 0) {
        const newCountries = cornerCountries.map(c => ({
          ...c,
          id: crypto.randomUUID(),
          workspace_id: workspace.id,
          usage_count: 0,
        }))
        await supabaseAdmin.from('countries').insert(newCountries)
        logger.log(`Seeded ${newCountries.length} countries`)
      }
      // Stage 1 起 ref_airports 為全域單一表，新 tenant 無需複製機場資料。
    } catch (seedError) {
      logger.warn('Failed to seed base data:', seedError)
    }

    // 10. workspace bot 創建已於 2026-05-05 砍除（William 拍板：機器人不該是員工、通知概念重做）

    logger.log(`Tenant created successfully: ${newWorkspaceCode}`)

    // 返回登入資訊（ERP 用員工編號+密碼登入，不需要 email）
    return successResponse({
      workspace: {
        id: workspace.id,
        code: newWorkspaceCode,
        name: workspaceName,
      },
      admin: {
        employee_id: employee.id,
        employee_number: adminEmployeeNumber,
      },
      login: {
        workspaceCode: newWorkspaceCode,
        employeeNumber: adminEmployeeNumber,
        password: adminPassword, // 僅用於顯示給系統主管，不要儲存
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to create tenant:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return errorResponse(`建立租戶失敗: ${errorMessage}`, 500, ErrorCode.INTERNAL_ERROR)
  }
}
