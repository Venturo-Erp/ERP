import { captureException } from '@/lib/error-tracking'
/**
 * LinkPay Webhook - 接收台新銀行付款成功通知
 *
 * 當客戶完成 LinkPay 付款後，台新銀行會呼叫此 Webhook
 * 更新收款單和 LinkPay 記錄的狀態
 *
 * 安全機制：
 * 1. MAC 簽名驗證 - 確保請求來自台新銀行
 * 2. 訂單號驗證 - 確保訂單存在於系統中
 * 3. 金額驗證 - 防止金額被竄改
 */

import { logger } from '@/lib/utils/logger'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature, type TaishinWebhookParams } from '@/lib/linkpay/signature'
import { checkRateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, ApiError, ErrorCode } from '@/lib/api/response'
import { withWebhookIdempotency } from '@/lib/webhook/idempotency'

// ============================================
// 型別定義
// ============================================

interface TaishinWebhookRequest {
  params: TaishinWebhookParams
}

// ============================================
// POST: 接收付款通知
// ============================================

export async function POST(req: NextRequest) {
  try {
    // 🔒 Rate limiting: 1000 requests per minute (webhook - relaxed limit)
    const rateLimited = await checkRateLimit(req, 'linkpay-webhook', 1000, 60_000)
    if (rateLimited) return rateLimited

    const body: TaishinWebhookRequest = await req.json()
    logger.log('[LinkPay Webhook] 收到通知:', body)

    const params = body.params

    // ============================================
    // 步驟 1: 驗證簽名
    // ============================================
    const signatureResult = verifyWebhookSignature(params)

    if (!signatureResult.valid) {
      logger.error('[LinkPay Webhook] 簽名驗證失敗', {
        reason: signatureResult.reason,
        order_no: params.order_no,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      })

      // 返回 401 Unauthorized
      return errorResponse(`簽名驗證失敗: ${signatureResult.reason}`, 401, ErrorCode.UNAUTHORIZED)
    }

    // ============================================
    // 步驟 2: 驗證必填欄位
    // ============================================
    const { order_no, ret_code, tx_amt } = params

    if (!order_no) {
      logger.error('[LinkPay Webhook] 缺少 order_no')
      return ApiError.missingField('order_no')
    }

    // ============================================
    // 步驟 3-6 包在冪等保護裡
    // 同一個 order_no 重發 (台新銀行 retry) 第二次起回 200 略過
    // ============================================
    return await withWebhookIdempotency('linkpay', order_no, async () => {
      // 解析收款單號（order_no 格式：{receiptNumber}R{timestamp}，已移除 - 和 _）
      const receiptNumber = order_no.split('R')[0]
      const isSuccess = ret_code === '00'
      const linkpayStatus = isSuccess ? 1 : 2 // linkpay_logs.status 是 number: 1=已付款 2=失敗

      const supabase = getSupabaseAdminClient()
      const currentTime = new Date().toISOString()

      // ============================================
      // 步驟 3: 驗證訂單存在性
      // ============================================
      const { data: linkpayLog, error: findError } = await supabase
        .from('linkpay_logs')
        .select('id, linkpay_order_number, price, status')
        .eq('linkpay_order_number', order_no)
        .single()

      if (findError || !linkpayLog) {
        logger.error('[LinkPay Webhook] 找不到對應的 LinkPay 記錄', {
          order_no,
          error: findError,
        })
        return { status: 404, body: { ok: false, error: 'LinkPay 記錄不存在' } }
      }

      // ============================================
      // 步驟 4: 驗證金額一致性（防止金額竄改）
      // ============================================
      if (tx_amt) {
        // tx_amt 格式：含小數 2 位，如 "10000" 代表 100.00 元
        const webhookAmount = parseInt(tx_amt, 10) / 100
        const expectedAmount = linkpayLog.price

        // 使用百分比檢查：允許 0.5% 的誤差（處理四捨五入問題）
        // 同時設定最低 1 元門檻，避免小額付款被誤判
        const tolerancePercent = 0.005 // 0.5%
        const tolerance = Math.max(expectedAmount * tolerancePercent, 1)

        if (Math.abs(webhookAmount - expectedAmount) > tolerance) {
          logger.error('[LinkPay Webhook] 金額不一致，可能遭到竄改', {
            order_no,
            webhookAmount,
            expectedAmount,
            difference: Math.abs(webhookAmount - expectedAmount),
            tolerance,
          })
          return { status: 400, body: { ok: false, error: '金額驗證失敗' } }
        }
      }

      // ============================================
      // 步驟 5: 更新 LinkPay 記錄
      // ============================================
      const { error: logError } = await supabase
        .from('linkpay_logs')
        .update({
          status: linkpayStatus,
          updated_at: currentTime,
        })
        .eq('linkpay_order_number', order_no)

      if (logError) {
        logger.error('[LinkPay Webhook] 更新 LinkPay 記錄失敗:', logError)
      }

      // ============================================
      // 步驟 6: 更新收款單狀態
      // ============================================
      if (isSuccess) {
        // 計算實際金額
        // tx_amt 格式：含小數 2 位，如 "10000" 代表 100.00 元
        // 扣除信用卡手續費 2%
        let actualAmount = 0
        if (tx_amt) {
          const originalAmount = parseInt(tx_amt, 10) / 100 // 轉換為元
          // 扣除 2% 手續費
          actualAmount = Math.round(originalAmount * 0.98)
        }

        // 自動回填實收金額和收款日期，但 status 保持 0（待確認）
        // 讓會計最後手動確認，避免自動核銷造成的問題
        const { error: receiptError } = await supabase
          .from('receipts')
          .update({
            // status: 'pending', // 保持待確認，不自動改成已確認
            actual_amount: actualAmount,
            receipt_date: currentTime,
            updated_at: currentTime,
          })
          .eq('receipt_number', receiptNumber)

        if (receiptError) {
          logger.error('[LinkPay Webhook] 更新收款單失敗:', receiptError)
        } else {
          logger.log('[LinkPay Webhook] 付款成功', {
            receiptNumber,
            actualAmount,
            status: '待會計確認',
          })
        }
      } else {
        // 付款失敗，只更新收款單日期
        await supabase
          .from('receipts')
          .update({
            receipt_date: currentTime,
            updated_at: currentTime,
          })
          .eq('receipt_number', receiptNumber)

        logger.log('[LinkPay Webhook] 付款失敗', {
          receiptNumber,
          ret_code,
          ret_msg: params.ret_msg,
        })
      }

      // 回應台新銀行（必須回應成功，否則會重複通知）
      return { status: 200, body: { success: true } }
    })
  } catch (error) {
    logger.error('[LinkPay Webhook] 處理過程發生錯誤', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    })
    // 即使有錯誤也回應成功，避免重複通知
    return successResponse(null)
  }
}

// ============================================
// GET: 健康檢查（可選）
// ============================================

export async function GET() {
  return successResponse({ status: 'ok', message: 'LinkPay Webhook endpoint is ready' })
}
