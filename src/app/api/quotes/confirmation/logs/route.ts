/**
 * 報價確認歷史記錄 API
 * GET /api/quotes/confirmation/logs?quote_id=xxx
 */

import { logger } from '@/lib/utils/logger'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { successResponse, errorResponse, ErrorCode } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    // 🔒 安全檢查：驗證用戶身份
    const auth = await getServerAuth()
    if (!auth.success) {
      return errorResponse('請先登入', 401, ErrorCode.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('quote_id')

    if (!quoteId) {
      return errorResponse('缺少報價單 ID', 400, ErrorCode.MISSING_FIELD)
    }

    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('quote_confirmation_logs')
      .select('id, quote_id, action, note, created_by, created_at, metadata')
      .eq('workspace_id', auth.data.workspaceId)
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      logger.error('取得確認記錄失敗:', error)
      return errorResponse(error.message, 400, ErrorCode.DATABASE_ERROR)
    }

    return successResponse({ logs: data || [] })
  } catch (error) {
    logger.error('取得確認記錄錯誤:', error)
    return errorResponse('系統錯誤', 500, ErrorCode.INTERNAL_ERROR)
  }
}
