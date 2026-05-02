/**
 * 客戶確認報價單 API（公開端點）
 * POST /api/quotes/confirmation/customer
 *
 * 此端點供客戶透過確認連結使用，不需要登入驗證
 */

import { logger } from '@/lib/utils/logger'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ConfirmationResult } from '@/types/quote.types'
import { successResponse, errorResponse, ApiError, ErrorCode } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validation'
import { customerConfirmQuoteSchema } from '@/lib/validations/api-schemas'

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, customerConfirmQuoteSchema)
    if (!validation.success) return validation.error
    const { token, name, email, phone, notes } = validation.data

    // 取得客戶端資訊（稽核用）
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const supabase = getSupabaseAdminClient()

    // 呼叫資料庫函數
    const { data, error } = await supabase.rpc('confirm_quote_by_customer', {
      p_token: token,
      p_name: name,
      p_email: email || undefined,
      p_phone: phone || undefined,
      p_notes: notes || undefined,
      p_ip_address: ip,
      p_user_agent: userAgent,
    })

    if (error) {
      logger.error('客戶確認失敗:', error)
      return errorResponse(error.message, 400, ErrorCode.OPERATION_FAILED)
    }

    const result = data as unknown as ConfirmationResult

    if (!result.success) {
      // 特殊處理已確認的情況
      if (result.already_confirmed) {
        return successResponse({ ...result, message: '此報價單已確認，無需重複確認' })
      }
      return errorResponse(result.error || '確認失敗', 400, ErrorCode.OPERATION_FAILED)
    }

    logger.log('客戶已確認報價單:', result.quote_code)
    return successResponse(result)
  } catch (error) {
    logger.error('客戶確認錯誤:', error)
    return ApiError.internal('系統錯誤，請稍後再試')
  }
}

/**
 * 取得報價單資訊（供確認頁面顯示）
 * GET /api/quotes/confirmation/customer?token=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return ApiError.missingField('token')
    }

    const supabase = getSupabaseAdminClient()

    // 查詢報價單資訊（只回傳必要資訊，不洩露敏感資料）
    const { data, error } = await supabase
      .from('quotes')
      .select(
        `
        id,
        code,
        name,
        customer_name,
        destination,
        start_date,
        end_date,
        days,
        number_of_people,
        total_amount,
        confirmation_status,
        confirmation_token_expires_at
      `
      )
      .eq('confirmation_token', token)
      .single()

    if (error || !data) {
      // 找不到 token 對應的報價單：
      // 可能 token 已被清除（已確認）、或 token 不存在、或過期
      // 不再做跨租戶 fallback 查詢（曾用 .in() 沒篩 workspace、會跨租戶）
      // 統一回 notFound、避免資訊洩露
      return ApiError.notFound('報價單')
    }

    // 檢查 token 是否過期
    if (data.confirmation_token_expires_at) {
      const expiresAt = new Date(data.confirmation_token_expires_at)
      if (expiresAt < new Date()) {
        return ApiError.validation('確認連結已過期，請聯繫業務重新發送')
      }
    }

    // 檢查狀態
    if (data.confirmation_status !== 'pending') {
      return successResponse({
        error: '此報價單狀態不允許確認',
        already_confirmed:
          data.confirmation_status === 'customer_confirmed' ||
          data.confirmation_status === 'staff_confirmed',
      })
    }

    return successResponse({
      quote: {
        code: data.code,
        name: data.name,
        customer_name: data.customer_name,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        days: data.days,
        number_of_people: data.number_of_people,
        total_amount: data.total_amount,
      },
    })
  } catch (error) {
    logger.error('取得報價單資訊錯誤:', error)
    return ApiError.internal('系統錯誤')
  }
}
