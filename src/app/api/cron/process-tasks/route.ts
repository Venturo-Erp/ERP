/**
 * Cron Job: Process Background Tasks
 * 處理背景任務佇列
 *
 * 建議使用 Vercel Cron 或 GitHub Actions 每分鐘呼叫一次
 * 或使用 Supabase Edge Functions
 */

import { NextRequest } from 'next/server'
import { processQueue } from '@/lib/tasks'
import { logger } from '@/lib/utils/logger'
import { successResponse, ApiError } from '@/lib/api/response'

// 驗證 cron secret（防止未授權呼叫）
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // 驗證 cron secret
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return ApiError.unauthorized('Unauthorized')
  }

  try {
    const startTime = Date.now()
    const processed = await processQueue(10)
    const duration = Date.now() - startTime

    logger.info('Cron: Task queue processed', {
      processed,
      duration: `${duration}ms`,
    })

    return successResponse({
      processed,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Cron: Failed to process task queue', { error: errorMessage })

    return ApiError.internal(errorMessage)
  }
}

// 也支援 POST（某些 cron 服務使用 POST）
export async function POST(request: NextRequest) {
  return GET(request)
}
