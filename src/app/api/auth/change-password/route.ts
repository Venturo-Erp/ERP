import { captureException } from '@/lib/error-tracking'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { changePasswordSchema } from '@/lib/validations/api-schemas'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * 用戶自行更改密碼
 * 使用 Supabase Auth 驗證當前密碼，並更新 Supabase Auth 密碼
 * 不再更新 employees.password_hash（已棄用）
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 5 requests per minute
    const rateLimited = checkRateLimit(request, 'change-password', 5, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 Session 檢查：必須已登入
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const validation = await validateBody(request, changePasswordSchema)
    if (!validation.success) return validation.error
    const { employee_number, workspace_code, current_password, new_password } = validation.data

    const supabaseAdmin = getSupabaseAdminClient()

    // 1. 用當前登入用戶的資訊查詢（已經有 session 了）
    // 直接用 auth.data.employeeId 查，不需要 employee_number
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, employee_number, supabase_user_id, workspace_id')
      .eq('id', auth.data.employeeId)
      .single()

    if (empError || !employee) {
      logger.error('Employee not found:', empError)
      return errorResponse('找不到此員工', 404, ErrorCode.NOT_FOUND)
    }

    // 2. 用 Supabase Auth 驗證當前密碼
    // 優先從 auth.users 取得真實 email，fallback 用舊邏輯拼假 email
    let authEmail: string | undefined

    if (employee.supabase_user_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
        employee.supabase_user_id
      )
      authEmail = authUser?.user?.email ?? undefined
    }

    if (!authEmail) {
      // fallback：向後兼容舊帳號
      const empNum = employee.employee_number
      authEmail = `corner_${empNum.toLowerCase()}@venturo.com`
    }

    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: authEmail,
      password: current_password,
    })

    if (signInError) {
      return errorResponse('目前密碼錯誤', 401, ErrorCode.UNAUTHORIZED)
    }

    // 3. 更新 Supabase Auth 密碼
    if (!employee.supabase_user_id) {
      return errorResponse('此帳號尚未綁定登入系統', 400, ErrorCode.VALIDATION_ERROR)
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      employee.supabase_user_id,
      { password: new_password }
    )

    if (updateError) {
      logger.error('Failed to update password:', updateError)
      return errorResponse('更新密碼失敗', 500, ErrorCode.OPERATION_FAILED)
    }

    // 4. 更新 must_change_password 標記
    await supabaseAdmin
      .from('employees')
      .update({ must_change_password: false })
      .eq('id', employee.id)

    logger.log('✅ Password changed for employee:', employee_number)
    return successResponse({ message: '密碼更新成功' })
  } catch (error) {
    logger.error('Change password error:', error)
    captureException(error, { module: 'auth.change-password' })
    return errorResponse('伺服器錯誤', 500, ErrorCode.INTERNAL_ERROR)
  }
}
