import { captureException } from '@/lib/error-tracking'
/**
 * 查詢可開發票訂單 API
 * GET /api/travel-invoice/orders?tour_id=xxx&has_invoiceable=true
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { successResponse, ApiError } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  // 認證檢查
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }

  try {
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tour_id')
    const hasInvoiceable = searchParams.get('has_invoiceable') === 'true'

    const supabase = getSupabaseAdminClient()

    // 查詢訂單及其發票資訊
    let query = supabase
      .from('orders_invoice_summary')
      .select('order_id, order_number, tour_id, invoiceable_amount, total_amount, invoiced_amount, workspace_id')
      .order('order_number', { ascending: false })
      .limit(500)

    if (tourId) {
      query = query.eq('tour_id', tourId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('查詢訂單失敗:', error)
      captureException(error, { module: 'travel-invoice.orders' })
      return ApiError.internal('查詢失敗')
    }

    // 過濾有可開金額的訂單
    let result = data || []
    if (hasInvoiceable) {
      result = result.filter(order => Number(order.invoiceable_amount) > 0)
    }

    return successResponse(result)
  } catch (error) {
    logger.error('查詢可開發票訂單錯誤:', error)
    captureException(error, { module: 'travel-invoice.orders' })
    return ApiError.internal(error instanceof Error ? error.message : '查詢失敗')
  }
}
