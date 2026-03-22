import { captureException } from '@/lib/error-tracking'
/**
 * 建立員工 Supabase Auth 帳號的 API Route
 * 使用 Service Role Key 建立 Supabase Auth 用戶
 *
 * 🔒 安全修復 2026-01-12：需要已登入用戶才能建立新帳號
 * 🔒 安全修復 2026-02-19：需要管理員權限
 */

import { logger } from '@/lib/utils/logger'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { validateBody } from '@/lib/api/validation'
import { createEmployeeAuthSchema } from '@/lib/validations/api-schemas'

/**
 * 檢查員工是否為管理員或超級管理員
 */
async function checkIsAdmin(employeeId: string): Promise<boolean> {
  const adminClient = getSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('employees')
    .select('roles')
    .eq('id', employeeId)
    .single()

  if (error || !data) return false

  const roles = data.roles as string[] | null
  return roles?.some(r => r === 'admin' || r === 'super_admin') ?? false
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, createEmployeeAuthSchema)
    if (!validation.success) return validation.error
    const { employee_number, password, workspace_code, email: providedEmail } = validation.data

    const supabaseAdmin = getSupabaseAdminClient()

    // 🔒 安全檢查：需要已登入
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入才能建立員工帳號', 401, ErrorCode.UNAUTHORIZED)
    }

    // 檢查該 workspace 是否已有「有 auth 的員工」（判斷是否為新租戶）
    let isNewTenant = false
    if (workspace_code) {
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('code', workspace_code)
        .single()

      if (workspace) {
        const { count } = await supabaseAdmin
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id)
          .not('supabase_user_id', 'is', null)

        // 如果該 workspace 沒有任何「有 auth 的員工」，視為新租戶
        isNewTenant = (count ?? 0) === 0
        logger.log(
          `Workspace ${workspace_code}: 已有 ${count} 個有 auth 的員工, isNewTenant=${isNewTenant}`
        )
      }
    }

    // 權限檢查
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('roles, workspace_id')
      .eq('id', auth.data.employeeId)
      .single()

    if (!employee || !employee.workspace_id) {
      logger.error('Employee not found or no workspace')
      return errorResponse('找不到員工資料', 403, ErrorCode.FORBIDDEN)
    }

    const roles = employee.roles as string[] | null
    const isSuperAdmin = roles?.includes('super_admin') ?? false
    const isAdmin = roles?.includes('admin') ?? false

    // 查詢 workspace 取得 code
    const { data: currentWorkspace } = await supabaseAdmin
      .from('workspaces')
      .select('code')
      .eq('id', employee.workspace_id as string)
      .single()

    const currentUserWorkspaceCode = currentWorkspace?.code

    logger.log(
      `Current user: workspace=${currentUserWorkspaceCode || 'unknown'}, isSuperAdmin=${isSuperAdmin}, isAdmin=${isAdmin}`
    )

    // 建立新租戶的第一個管理員：只有 CORNER 的 super_admin 可以
    if (isNewTenant) {
      logger.log(`Creating first admin for new tenant: ${workspace_code}`)
      if (!isSuperAdmin || currentUserWorkspaceCode !== 'CORNER') {
        logger.error(
          `Permission denied: isSuperAdmin=${isSuperAdmin}, workspace=${currentUserWorkspaceCode}`
        )
        return errorResponse('建立新租戶需要 CORNER 的 super_admin 權限', 403, ErrorCode.FORBIDDEN)
      }
    } else {
      // 一般建立員工：需要該 workspace 的管理員權限
      logger.log(`Creating employee for existing tenant: ${workspace_code}`)
      if (!isSuperAdmin && !isAdmin) {
        logger.error(`Permission denied: not admin`)
        return errorResponse('需要管理員權限', 403, ErrorCode.FORBIDDEN)
      }
    }

    // 優先使用前端傳入的真實 email；若無則使用自動生成的格式（向後兼容）
    const email = providedEmail
      ? providedEmail.toLowerCase()
      : workspace_code
        ? `${workspace_code.toLowerCase()}_${employee_number.toLowerCase()}@venturo.com`
        : `${employee_number.toLowerCase()}@venturo.com`

    // 使用 Admin API 建立用戶
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 email
    })

    if (error) {
      // 如果用戶已存在，嘗試更新密碼
      if (error.message.includes('already been registered')) {
        logger.log('Auth 用戶已存在，嘗試更新密碼:', email)

        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users?.users.find(u => u.email === email)

        if (existingUser) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { password }
          )

          if (updateError) {
            logger.error('更新密碼失敗:', updateError)
            return errorResponse(updateError.message, 400, ErrorCode.OPERATION_FAILED)
          }

          logger.log('Auth 密碼已更新:', email)
          return successResponse({ user: existingUser, updated: true })
        }
      }

      logger.error('建立 Auth 用戶失敗:', error)
      return errorResponse(error.message, 400, ErrorCode.OPERATION_FAILED)
    }

    logger.log('Auth 用戶已建立:', email)
    return successResponse({ user: data.user })
  } catch (error) {
    logger.error('建立 Auth 用戶錯誤:', error)
    return errorResponse('Internal server error', 500, ErrorCode.INTERNAL_ERROR)
  }
}
