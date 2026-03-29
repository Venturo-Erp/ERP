import { captureException } from '@/lib/error-tracking'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { ApiError, successResponse } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { validateLoginSchema } from '@/lib/validations/api-schemas'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'venturo_dev_jwt_secret_local_only'
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET)

export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 10 requests per minute (login attempts)
    const rateLimited = checkRateLimit(request, 'validate-login', 10, 60_000)
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
      .select('*')
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
      return ApiError.unauthorized('帳號或密碼錯誤')
    }

    // 6. 回傳員工資料（不含密碼）+ auth email
    const { password_hash: _, ...employeeData } = employee

    // 7. 從職務系統取得權限
    let rolePermissions: string[] = []
    const jobInfo = employee.job_info as { role_id?: string } | null
    
    if (jobInfo?.role_id) {
      // 查職務是否為管理員
      const { data: role } = await supabase
        .from('workspace_roles')
        .select('is_admin')
        .eq('id', jobInfo.role_id)
        .single()
      
      if (role?.is_admin) {
        rolePermissions = ['*']
      } else {
        // 取得職務路由權限
        const { data: perms } = await supabase
          .from('role_route_permissions')
          .select('route, can_read')
          .eq('role_id', jobInfo.role_id)
        
        const permSet = new Set<string>()
        perms?.filter(p => p.can_read).forEach(p => permSet.add(p.route.replace(/^\//, '')))
        
        // 取得個人覆寫（表尚未建立時跳過）
        try {
          const { data: overrides } = await supabase
            .from('employee_route_overrides' as 'employees')  // 型別 workaround
            .select('route, override_type')
            .eq('employee_id', employee.id)
          
          ;(overrides as { route: string; override_type: string }[] | null)?.forEach(o => {
            const permKey = o.route.replace(/^\//, '')
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
    }
    
    // 如果沒有職務權限，fallback 到舊的 permissions
    const mergedPermissions = rolePermissions.length > 0 
      ? rolePermissions 
      : [...(employeeData.permissions || []), ...(employeeData.roles || [])]
    
    // 8. 產生 JWT（server-side 簽名）
    const jwt = await new SignJWT({
      sub: employeeData.id,
      employee_number: employeeData.employee_number,
      permissions: mergedPermissions,
      role:
        mergedPermissions.includes('admin') || mergedPermissions.includes('*')
          ? 'admin'
          : 'employee',
      workspace_id: workspace.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('venturo-app')
      .setExpirationTime('30d')
      .sign(JWT_SECRET_KEY)

    return successResponse({
      employee: employeeData,
      workspaceId: workspace.id,
      workspaceCode: workspace.code,
      authEmail,
      jwt,
    })
  } catch (error) {
    logger.error('Validate login error:', error)
    captureException(error, { module: 'auth.validate-login' })
    return ApiError.internal('系統錯誤')
  }
}
