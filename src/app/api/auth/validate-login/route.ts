import { captureException } from '@/lib/error-tracking'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { ApiError } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { validateLoginSchema } from '@/lib/validations/api-schemas'

export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 10 requests per minute (login attempts)
    const rateLimited = await checkRateLimit(request, 'validate-login', 10, 60_000)
    if (rateLimited) return rateLimited

    const validation = await validateBody(request, validateLoginSchema)
    if (!validation.success) return validation.error
    const { username, password, code } = validation.data

    const supabase = getSupabaseAdminClient()
    // 1. 查詢 workspace（統一大寫）
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, code, name, type')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle()

    if (wsError) {
      logger.error('Workspace query error:', wsError)
      return ApiError.internal('系統錯誤')
    }

    // 安全考量：找不到 workspace 時、回與帳密錯誤相同訊息、避免被列舉公司代號
    // TODO(future): 重新評估登入錯誤訊息策略、可能分「可公開代號」vs「不可列舉代號」兩種 workspace
    if (!workspace) {
      return ApiError.unauthorized('公司代號、帳號或密碼錯誤，請確認後再試')
    }

    // 2. 查詢員工（員工編號、大小寫不敏感）
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(
        'id, employee_number, display_name, english_name, avatar_url, status, supabase_user_id, workspace_id, role_id, job_info, created_at, updated_at, login_failed_count, login_locked_until'
      )
      .eq('workspace_id', workspace.id)
      .ilike('employee_number', username)
      .maybeSingle()

    if (empError) {
      logger.error('Employee query error:', empError)
      return ApiError.internal('系統錯誤')
    }

    if (!employee) {
      return ApiError.unauthorized('公司代號、帳號或密碼錯誤，請確認後再試')
    }

    // 3. 檢查帳號狀態
    if (employee.status === 'terminated') {
      return ApiError.unauthorized('此帳號已停用')
    }

    // 3.5 檢查帳號鎖定狀態（5 次失敗鎖定 15 分鐘）
    const lockedUntil = (employee as Record<string, unknown>).login_locked_until as string | null
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60_000)
      return ApiError.unauthorized(`帳號已鎖定，請 ${remainingMinutes} 分鐘後再試`)
    }

    // 4. 從 auth.users 取得這位員工的登入 email（單一來源、不再 fallback）
    if (!employee.supabase_user_id) {
      logger.warn(
        `Employee ${employee.employee_number}@${code} 缺少 supabase_user_id、無法登入`
      )
      return ApiError.unauthorized('帳號設定不完整、請聯絡系統主管')
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(employee.supabase_user_id)
    const authEmail = authUser?.user?.email

    if (!authEmail) {
      logger.error(
        `Auth user ${employee.supabase_user_id} (employee ${employee.employee_number}) 無 email、登入卡住`
      )
      return ApiError.unauthorized('帳號認證資料異常、請聯絡系統主管')
    }

    // 5. 用 Supabase Auth 驗證密碼
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInError) {
      // 登入失敗：累加失敗計數
      const currentFailCount =
        ((employee as Record<string, unknown>).login_failed_count as number) || 0
      const newFailCount = currentFailCount + 1
      const MAX_FAILED_ATTEMPTS = 5
      const LOCKOUT_MINUTES = 15

      const updateData: Record<string, unknown> = { login_failed_count: newFailCount }
      if (newFailCount >= MAX_FAILED_ATTEMPTS) {
        updateData.login_locked_until = new Date(
          Date.now() + LOCKOUT_MINUTES * 60_000
        ).toISOString()
        logger.warn(
          `🔒 帳號 ${username}@${code} 已鎖定 ${LOCKOUT_MINUTES} 分鐘（連續 ${newFailCount} 次失敗）`
        )
      }

      await supabase.from('employees').update(updateData).eq('id', employee.id)

      return ApiError.unauthorized('公司代號、帳號或密碼錯誤，請確認後再試')
    }

    // 登入成功：重置失敗計數
    if (((employee as Record<string, unknown>).login_failed_count as number) > 0) {
      await supabase
        .from('employees')
        .update({ login_failed_count: 0, login_locked_until: null })
        .eq('id', employee.id)
    }

    // 6. 回傳員工資料 + auth email（SELECT 已不含 password_hash）
    const employeeData = employee

    // 7. 從職務系統取得權限（統一用 role_tab_permissions）
    let rolePermissions: string[] = []
    let isAdmin = false
    const roleId = (employee as Record<string, unknown>).role_id as string | undefined

    if (roleId) {
      // 查職務是否擁有管理員資格
      const { data: role } = await supabase
        .from('workspace_roles')
        .select('is_admin')
        .eq('id', roleId)
        .single()

      isAdmin = role?.is_admin || false

      // 權限決策統一從 role_tab_permissions 拿資格清單
      const { data: tabPerms } = await supabase
        .from('role_tab_permissions')
        .select('module_code, tab_code, can_read, can_write')
        .eq('role_id', roleId)

      const permSet = new Set<string>()

      tabPerms
        ?.filter(p => p.can_read)
        .forEach(p => {
          if (p.tab_code) {
            permSet.add(`${p.module_code}:${p.tab_code}`)
          } else {
            permSet.add(p.module_code)
          }
        })

      rolePermissions = Array.from(permSet)
    }

    // 8. 回傳資料（Session 由 client-side supabase.auth.signInWithPassword 建立）
    return NextResponse.json({
      success: true,
      data: {
        employee: employeeData,
        workspace: {
          id: workspace.id,
          code: workspace.code,
          name: workspace.name,
          type: workspace.type,
        },
        authEmail,
        permissions: rolePermissions,
        isAdmin,
      },
    })
  } catch (error) {
    logger.error('Validate login error:', error)
    captureException(error, { module: 'auth.validate-login' })
    return ApiError.internal('系統錯誤')
  }
}
