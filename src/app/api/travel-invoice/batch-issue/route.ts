import { captureException } from '@/lib/error-tracking'
/**
 * 批次開立發票 API
 * POST /api/travel-invoice/batch-issue
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { issueInvoice } from '@/lib/newebpay'
import { logger } from '@/lib/utils/logger'
import { successResponse, errorResponse, ApiError, ErrorCode } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import { validateBody } from '@/lib/api/validation'
import { batchIssueInvoiceSchema } from '@/lib/validations/api-schemas'

export async function POST(request: NextRequest) {
  // 認證檢查
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }

  try {
    const validation = await validateBody(request, batchIssueInvoiceSchema)
    if (!validation.success) return validation.error
    const { tour_id, order_ids, invoice_date, buyerInfo, created_by, workspace_id } =
      validation.data

    const supabase = getSupabaseAdminClient()

    // 查詢訂單並計算可開金額
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders_invoice_summary')
      .select('order_id, order_number, invoiceable_amount, workspace_id')
      .in('order_id', order_ids)
      .limit(500)

    if (ordersError) {
      logger.error('查詢訂單失敗:', ordersError)
      return ApiError.internal('查詢訂單資訊失敗')
    }

    if (!ordersData || ordersData.length === 0) {
      return ApiError.validation('找不到訂單')
    }

    // 檢查所有訂單都有可開金額
    const invalidOrders = ordersData.filter(o => Number(o.invoiceable_amount) <= 0)
    if (invalidOrders.length > 0) {
      return ApiError.validation(
        `以下訂單沒有可開金額：${invalidOrders.map(o => o.order_number).join(', ')}`
      )
    }

    // 計算總金額和準備訂單項目
    const totalAmount = ordersData.reduce((sum, o) => sum + Number(o.invoiceable_amount), 0)
    const orderItems = ordersData.map(o => ({
      order_id: o.order_id as string,
      amount: Number(o.invoiceable_amount),
    }))

    // 準備發票項目（合併所有訂單）
    const items = [
      {
        item_name: `旅遊服務費 (${ordersData.length}筆訂單)`,
        item_count: 1,
        item_unit: '式',
        item_price: totalAmount,
        itemAmt: totalAmount,
      },
    ]

    // 呼叫藍新 API（依 workspace_id 取得該租戶的藍新金鑰）
    const finalWorkspaceId = workspace_id || ordersData[0]?.workspace_id
    if (!finalWorkspaceId) {
      return ApiError.validation('無法確認 workspace_id，請重新操作')
    }
    const result = await issueInvoice({
      invoiceDate: invoice_date,
      totalAmount: totalAmount,
      taxType: 'dutiable',
      buyerInfo,
      items,
      workspaceId: finalWorkspaceId,
    })

    if (!result.success) {
      return errorResponse(result.message || '開立失敗', 400, ErrorCode.EXTERNAL_API_ERROR)
    }

    // 儲存到資料庫
    const invoiceData = {
      transaction_no: result.data!.transactionNo,
      invoice_number: result.data!.invoiceNumber,
      invoice_date,
      total_amount: totalAmount,
      tax_type: 'dutiable',
      buyer_name: buyerInfo.buyerName,
      buyer_ubn: buyerInfo.buyerUBN || null,
      buyer_email: buyerInfo.buyerEmail || null,
      buyer_mobile: buyerInfo.buyerMobile || null,
      buyer_info: buyerInfo,
      items,
      status: 'issued',
      random_num: result.data!.randomNum,
      barcode: result.data!.barcode || null,
      qrcode_l: result.data!.qrcodeL || null,
      qrcode_r: result.data!.qrcodeR || null,
      order_id: null, // 批次開立不設定單一 order_id
      tour_id,
      workspace_id: workspace_id || null,
      is_batch: true,
      created_by: created_by || auth.data.employeeId,
    }

    const { data: invoiceRecord, error } = await supabase
      .from('travel_invoices')
      .insert(invoiceData)
      .select()
      .single()

    if (error) {
      logger.error('儲存發票失敗:', error)
      captureException(error, { module: 'travel-invoice.batch-issue' })
      return successResponse({
        ...result.data,
        warning: '發票已開立，但儲存時發生錯誤，請手動記錄此發票資訊',
      })
    }

    // 取得 workspace_id（從訂單取得）
    const orderWorkspaceId = workspace_id || ordersData[0]?.workspace_id

    // 建立發票-訂單關聯
    const invoiceOrdersData = orderItems.map(o => ({
      invoice_id: invoiceRecord.id,
      order_id: o.order_id,
      amount: o.amount,
      workspace_id: orderWorkspaceId || '',
      created_by: created_by || auth.data.employeeId,
    }))

    const { error: ioError } = await supabase.from('invoice_orders').insert(invoiceOrdersData)

    if (ioError) {
      logger.error('建立發票-訂單關聯失敗:', ioError)
    }

    return successResponse({
      id: invoiceRecord.id,
      transactionNo: result.data!.transactionNo,
      invoiceNumber: result.data!.invoiceNumber,
      randomNum: result.data!.randomNum,
      orderCount: orderItems.length,
      totalAmount,
    })
  } catch (error) {
    logger.error('批次開立發票錯誤:', error)
    captureException(error, { module: 'travel-invoice.batch-issue' })
    return ApiError.internal(error instanceof Error ? error.message : '開立失敗')
  }
}
