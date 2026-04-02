import { captureException } from '@/lib/error-tracking'
/**
 * 作廢代轉發票 API
 * POST /api/travel-invoice/void
 * 🔒 安全修復 2026-02-19：需要 admin 或 accountant 角色
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { voidInvoice } from '@/lib/newebpay'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ApiError, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { validateBody } from '@/lib/api/validation'
import { voidInvoiceSchema } from '@/lib/validations/api-schemas'

/**
 * 檢查員工是否有作廢發票的權限
 * 檢查 job_info.role_id 對應的職務是否為管理員
 */
async function checkVoidPermission(employeeId: string): Promise<boolean> {
  const adminClient = getSupabaseAdminClient()
  
  // 取得員工的職務 ID
  const { data: employee, error } = await adminClient
    .from('employees')
    .select('job_info, permissions')
    .eq('id', employeeId)
    .single()

  if (error || !employee) return false

  // 檢查 permissions 是否有 accounting
  const permissions = employee.permissions as string[] | null
  if (permissions?.includes('accounting')) {
    return true
  }

  // 檢查職務是否為管理員
  const jobInfo = employee.job_info as { role_id?: string } | null
  if (!jobInfo?.role_id) return false

  const { data: role } = await adminClient
    .from('workspace_roles')
    .select('is_admin')
    .eq('id', jobInfo.role_id)
    .single()

  return role?.is_admin === true
}

export async function POST(request: NextRequest) {
  // 認證檢查
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }

  // 🔒 角色權限檢查
  const hasPermission = await checkVoidPermission(auth.data.employeeId)
  if (!hasPermission) {
    return errorResponse('需要管理員或會計權限', 403, ErrorCode.FORBIDDEN)
  }

  try {
    const validation = await validateBody(request, voidInvoiceSchema)
    if (!validation.success) return validation.error
    const { invoiceId, voidReason, operatedBy } = validation.data

    const supabase = getSupabaseAdminClient()

    // 取得發票資訊
    const { data: invoice, error: fetchError } = await supabase
      .from('travel_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return ApiError.notFound('發票')
    }

    if (invoice.status !== 'issued') {
      return ApiError.validation('只能作廢已開立的發票')
    }

    // 確保必要欄位存在
    if (!invoice.invoice_number || !invoice.invoice_date) {
      return ApiError.validation('發票資料不完整')
    }

    // 呼叫藍新 API（依 workspace_id 取得該租戶的藍新金鑰）
    if (!invoice.workspace_id) {
      return ApiError.validation('發票缺少 workspace_id，無法作廢')
    }
    const result = await voidInvoice({
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      voidReason,
      workspaceId: invoice.workspace_id,
    })

    if (!result.success) {
      return errorResponse(result.message || '作廢失敗', 400, ErrorCode.EXTERNAL_API_ERROR)
    }

    // 更新資料庫
    const { data, error: updateError } = await supabase
      .from('travel_invoices')
      .update({
        status: 'voided',
        void_date: new Date().toISOString(),
        void_reason: voidReason,
        voided_by: operatedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (updateError) {
      logger.error('更新發票狀態失敗:', updateError)
      return successResponse({
        warning: '發票已作廢，但更新狀態時發生錯誤，請手動更新發票狀態',
      })
    }

    return successResponse(data)
  } catch (error) {
    logger.error('作廢發票錯誤:', error)
    captureException(error, { module: 'travel-invoice.void' })
    return ApiError.internal(error instanceof Error ? error.message : '作廢失敗')
  }
}
