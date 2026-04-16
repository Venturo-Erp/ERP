import { captureException } from '@/lib/error-tracking'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { ApiError, successResponse } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { validateLoginSchema } from '@/lib/validations/api-schemas'
import { SignJWT } from 'jose'
import { randomUUID } from 'crypto'
// audit: SaaS 操作稽核記錄
import { writeAuditLog } from '@/lib/audit'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production')
}
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET || 'venturo_dev_jwt_secret_local_only')

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
      .select('id, code')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle()

    if (wsError) {
      logger.error('Workspace query error:', wsError)
      return ApiError.internal('系統錯誤')
    }

    if (!workspace) {
      return ApiError.validation('找不到此代號')
    }

    // 2. 查詢員工（大小寫不敏感）
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(
        'id, employee_number, display_name, english_name, email, avatar, status, password_hash, supabase_user_id, workspace_id, job_info, permissions, is_active, created_at, updated_at, login_failed_count, login_locked_until'
      )
      .ilike('employee_number', username)
      .eq('workspace_id', workspace.id)
      .maybeSingle()

    if (empError) {
      logger.error('Employee query error:', empError)
      return ApiError.internal('系統錯誤')
    }

    if (!employee) {
      return ApiError.unauthorized('帳號或密碼錯誤')
    }

    // 3. 檢查帳號狀態
    if (employee.status === 'terminated') {
      return ApiError.unauthorized('此帳號已停用')
    }

    // 3.5 檢查帳號鎖定狀態（5 次失敗鎖定 15 分鐘）
    const lockedUntil = (employee as Record<string, unknown>).login_locked_until as string | null
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(lockedUntil).getTime() - Date.now()) / 60_000
      )
      return ApiError.unauthorized(`帳號已鎖定，請 ${remainingMinutes} 分鐘後再試`)
    }

    // 4. 查詢 auth email（優先從 auth.users 取，fallback 用 employees.email）
    let authEmail: string | undefined

    if (employee.supabase_user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(employee.supabase_user_id)
      authEmail = authUser?.user?.email ?? undefined
    }

    if (!authEmail && employee.email) {
      authEmail = employee.email
    }

    // fallback：向後兼容舊帳號
    if (!authEmail) {
      authEmail = `${code.toLowerCase()}_${username.toLowerCase()}@venturo.com`
    }

    // 5. 用 Supabase Auth 驗證密碼
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInError) {
      // 登入失敗：累加失敗計數
      const currentFailCount = ((employee as Record<string, unknown>).login_failed_count as number) || 0
      const newFailCount = currentFailCount + 1
      const MAX_FAILED_ATTEMPTS = 5
      const LOCKOUT_MINUTES = 15

      const updateData: Record<string, unknown> = { login_failed_count: newFailCount }
      if (newFailCount >= MAX_FAILED_ATTEMPTS) {
        updateData.login_locked_until = new Date(
          Date.now() + LOCKOUT_MINUTES * 60_000
        ).toISOString()
        logger.warn(`🔒 帳號 ${username}@${code} 已鎖定 ${LOCKOUT_MINUTES} 分鐘（連續 ${newFailCount} 次失敗）`)
      }

      await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employee.id)

      return ApiError.unauthorized('帳號或密碼錯誤')
    }

    // 登入成功：重置失敗計數
    if (((employee as Record<string, unknown>).login_failed_count as number) > 0) {
      await supabase
        .from('employees')
        .update({ login_failed_count: 0, login_locked_until: null })
        .eq('id', employee.id)
    }

    // 6. 回傳員工資料（不含密碼）+ auth email
    const { password_hash: _, ...employeeData } = employee

    // 7. 從職務系統取得權限（統一用 role_tab_permissions）
    let rolePermissions: string[] = []
    let isAdmin = false
    const jobInfo = employee.job_info as { role_id?: string } | null

    if (jobInfo?.role_id) {
      // 查職務是否為管理員
      const { data: role } = await supabase
        .from('workspace_roles')
        .select('is_admin')
        .eq('id', jobInfo.role_id)
        .single()

      isAdmin = role?.is_admin || false

      // 不管是不是管理員，都從 role_tab_permissions 讀取權限
      const { data: tabPerms } = await supabase
        .from('role_tab_permissions')
        .select('module_code, tab_code, can_read, can_write')
        .eq('role_id', jobInfo.role_id)

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

      // 取得個人覆寫（表尚未建立時跳過）
      try {
        const { data: overrides } = await supabase
          .from('employee_permission_overrides' as 'employees') // 型別 workaround
          .select('module_code, tab_code, override_type')
          .eq('employee_id', employee.id)

        ;(
          overrides as
            | { module_code: string; tab_code: string | null; override_type: string }[]
            | null
        )?.forEach(o => {
          const permKey = o.tab_code ? `${o.module_code}:${o.tab_code}` : o.module_code
          if (o.override_type === 'grant') {
            permSet.add(permKey)
          } else if (o.override_type === 'revoke') {
            permSet.delete(permKey)
          }
        })
      } catch {
        // 表不存在時跳過
      }

      rolePermissions = Array.from(permSet)
    }

    // 管理員權限由 role_tab_permissions 控制，不再加 '*'

    // 8. 產生 JWT（server-side 簽名）
    const jti = randomUUID()

    const jwt = await new SignJWT({
      sub: employeeData.id,
      jti,
      employee_number: employeeData.employee_number,
      permissions: rolePermissions,
      is_admin: isAdmin,
      workspace_id: workspace.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('venturo-app')
      .setExpirationTime('14d')
      .sign(JWT_SECRET_KEY)

    // 儲存 jti 到 DB（同時清除舊裝置的 session）
    await supabase
      .from('employees')
      .update({ active_jti: jti })
      .eq('id', employee.id)

    // 9. 寫入 audit log（登入成功）
    await writeAuditLog({
      workspace_id: workspace.id,
      employee_id: employee.id,
      employee_name: employeeData.display_name || employeeData.english_name || null,
      action: 'login',
      resource_type: 'auth',
      resource_id: employee.id,
      resource_name: employee.employee_number,
    })

    // 10. 設定 httpOnly cookie + 回傳資料（JWT 不再放 response body）
    const response = NextResponse.json({
      success: true,
      data: {
        employee: employeeData,
        workspaceId: workspace.id,
        workspaceCode: workspace.code,
        authEmail,
        permissions: rolePermissions,
        isAdmin,
      },
    })

    response.cookies.set('auth-token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 14 * 24 * 60 * 60, // 14 天，與 JWT 一致
    })

    return response
  } catch (error) {
    logger.error('Validate login error:', error)
    captureException(error, { module: 'auth.validate-login' })
    return ApiError.internal('系統錯誤')
  }
}
