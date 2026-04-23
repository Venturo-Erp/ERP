import { captureException } from '@/lib/error-tracking'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { successResponse, ApiError } from '@/lib/api/response'
import { logger } from '@/lib/utils/logger'
import { validateBody } from '@/lib/api/validation'
import { getEmployeeDataSchema } from '@/lib/validations/api-schemas'
import { getServerAuth } from '@/lib/auth/server-auth'

/**
 * 取得員工資料 API
 * 用於登入成功後取得員工詳細資料
 * 不驗證密碼（密碼已由 Supabase Auth 驗證）
 * 🔒 安全修復 2026-03-15：需要先登入才能取得員工資料
 */
export async function POST(request: NextRequest) {
  // 🔒 檢查認證
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }
  try {
    const validation = await validateBody(request, getEmployeeDataSchema)
    if (!validation.success) return validation.error
    const { username, code } = validation.data

    const supabase = getSupabaseAdminClient()

    // 1. 查詢 workspace（統一大寫）
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, code')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle()

    if (wsError) {
      logger.error('Workspace query error:', wsError)
      return ApiError.database('系統錯誤')
    }

    if (!workspace) {
      return ApiError.validation('找不到此代號')
    }

    // 🔒 P003-I（2026-04-22）：跨租戶查員工資料守門
    //   原本只驗 auth 通過、body 的 code 隨便填、登入用戶可查任一家員工的
    //   supabase_user_id / permissions / job_info 當後續攻擊原料。
    //   修法：body 的 workspace code 必須解析為等於 auth.data.workspaceId。
    if (workspace.id !== auth.data.workspaceId) {
      logger.error('跨租戶查員工資料嘗試', {
        caller_workspace: auth.data.workspaceId,
        requested_workspace: workspace.id,
        requested_code: code,
      })
      return ApiError.forbidden('不能查詢其他公司的員工資料')
    }

    // 2. 查詢員工（大小寫不敏感）
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(
        'id, employee_number, display_name, english_name, email, avatar, status, password_hash, supabase_user_id, workspace_id, job_info, created_at, updated_at'
      )
      .ilike('employee_number', username)
      .eq('workspace_id', workspace.id)
      .maybeSingle()

    if (empError) {
      logger.error('Employee query error:', empError)
      return ApiError.database('系統錯誤')
    }

    if (!employee) {
      return ApiError.notFound('員工')
    }

    // 3. 檢查帳號狀態
    if (employee.status === 'terminated') {
      return ApiError.unauthorized('此帳號已停用')
    }

    // 4. 回傳員工資料（不含密碼）
    const { password_hash: _, ...employeeData } = employee

    return successResponse({
      employee: employeeData,
      workspaceId: workspace.id,
      workspaceCode: workspace.code,
    })
  } catch (error) {
    logger.error('Get employee data error:', error)
    captureException(error, { module: 'auth.get-employee-data' })
    return ApiError.internal('系統錯誤')
  }
}
