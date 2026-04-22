import { captureException } from '@/lib/error-tracking'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { adminResetPasswordSchema } from '@/lib/validations/api-schemas'

/**
 * 檢查員工是否為管理員（透過職務系統）
 * role_id 優先讀頂層、fallback nested（2026-04-18 統一過渡期）
 */
async function checkIsAdmin(employeeId: string): Promise<boolean> {
  const adminClient = getSupabaseAdminClient()

  const { data: employee, error } = await adminClient
    .from('employees')
    .select('role_id, job_info')
    .eq('id', employeeId)
    .single()

  if (error || !employee) return false

  const jobInfo = employee.job_info as { role_id?: string } | null
  const roleId =
    (employee as unknown as { role_id?: string }).role_id || jobInfo?.role_id
  if (!roleId) return false

  const { data: role } = await adminClient
    .from('workspace_roles')
    .select('is_admin')
    .eq('id', roleId)
    .single()

  return role?.is_admin ?? false
}

/**
 * 管理員重置會員密碼
 * 🔒 安全修復 2026-01-12：需要已登入用戶
 * 🔒 安全修復 2026-02-18：恢復管理員權限檢查
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 5 requests per minute
    const rateLimited = await checkRateLimit(request, 'admin-reset-password', 5, 60_000)
    if (rateLimited) return rateLimited

    // 🔒 安全檢查：需要已登入用戶
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    // 🔒 管理員權限檢查
    const isAdmin = await checkIsAdmin(auth.data.employeeId)
    if (!isAdmin) {
      return errorResponse('需要管理員權限', 403, ErrorCode.FORBIDDEN)
    }

    const validation = await validateBody(request, adminResetPasswordSchema)
    if (!validation.success) return validation.error
    const { email, new_password } = validation.data

    const supabaseAdmin = getSupabaseAdminClient()

    // 先透過 email 找到使用者
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      logger.error('List users error:', listError)
      return errorResponse('查詢使用者失敗', 500, ErrorCode.DATABASE_ERROR)
    }

    const user = users.users.find(u => u.email === email)

    if (!user) {
      return errorResponse('找不到此電子郵件的使用者', 404, ErrorCode.NOT_FOUND)
    }

    // 🔒 P003-D（2026-04-22）：跨租戶守門。
    //   原本只查 isAdmin、用 email 全域查 auth.users、重設任何人密碼、沒驗 target 屬哪家。
    //   修法：從 employees 反查 target 的 workspace_id、跟登入者 workspace 比對、不符 → 403。
    const { data: targetEmp } = await supabaseAdmin
      .from('employees')
      .select('workspace_id')
      .eq('supabase_user_id', user.id)
      .maybeSingle()

    if (!targetEmp || targetEmp.workspace_id !== auth.data.workspaceId) {
      logger.error('跨租戶重設密碼嘗試', {
        caller_workspace: auth.data.workspaceId,
        target_user_id: user.id,
        target_workspace: targetEmp?.workspace_id ?? null,
      })
      return errorResponse('不能重設其他公司用戶的密碼', 403, ErrorCode.FORBIDDEN)
    }

    // 使用 admin API 更新密碼
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: new_password,
    })

    if (updateError) {
      logger.error('Update password error:', updateError)
      return errorResponse('重置密碼失敗：' + updateError.message, 500, ErrorCode.OPERATION_FAILED)
    }

    return successResponse({ message: '密碼已重置成功' })
  } catch (error) {
    logger.error('Admin reset password error:', error)
    captureException(error, { module: 'auth.admin-reset-password' })
    return errorResponse('伺服器錯誤', 500, ErrorCode.INTERNAL_ERROR)
  }
}
