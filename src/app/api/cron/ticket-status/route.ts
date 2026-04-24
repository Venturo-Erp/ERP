/**
 * 開票狀態檢查 Cron Job
 * 每天早上 10:00 (UTC+8) 執行
 * Vercel Cron: 0 2 * * * (UTC)
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { ApiError } from '@/lib/api/response'
import { withCronHeartbeat } from '@/lib/cron/heartbeat'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // 驗證 cron secret
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return ApiError.unauthorized('Unauthorized')
  }

  // withCronHeartbeat 包: 進場寫 running、成功寫 success、失敗自動 retry 3 次
  return withCronHeartbeat('ticket-status', async () => {
    logger.info('開始執行開票狀態檢查 Cron Job')

    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/bot/ticket-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.BOT_API_SECRET && { 'x-bot-secret': process.env.BOT_API_SECRET }),
      },
      body: JSON.stringify({ notify_sales: true }),
    })

    const result = await response.json()
    if (!result.success) throw new Error(`ticket-status 失敗: ${JSON.stringify(result)}`)

    // 既有的 cron_execution_logs 繼續寫 (跟 heartbeat 雙軌、history 用)
    const supabase = getSupabaseAdminClient()
    await supabase.from('cron_execution_logs').insert({
      job_name: 'ticket_status_check',
      result: result.data,
      success: true,
    })
    logger.info('開票狀態檢查完成', result.data)
    return result.data
  })
}
