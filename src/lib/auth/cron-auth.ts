/**
 * Cron Job 身份驗證
 * 防止未經授權的請求觸發內部任務
 * 
 * 使用方式：
 * ```typescript
 * const authResult = validateCronAuth(request)
 * if (!authResult.success) {
 *   return NextResponse.json({ error: authResult.error }, { status: 401 })
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET || ''

interface AuthResult {
  success: boolean
  error?: string
}

/**
 * 驗證 Cron Job 請求
 * 支援兩種方式：
 * 1. Authorization: Bearer <CRON_SECRET>
 * 2. ?secret=<CRON_SECRET>
 */
export function validateCronAuth(request: NextRequest): AuthResult {
  if (!CRON_SECRET) {
    console.warn('⚠️ CRON_SECRET 未設定，Cron API 處於不安全狀態')
    // 開發環境允許
    if (process.env.NODE_ENV === 'development') {
      return { success: true }
    }
    return { success: false, error: 'CRON_SECRET not configured' }
  }

  // 方式 1: Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${CRON_SECRET}`) {
    return { success: true }
  }

  // 方式 2: Query parameter
  const { searchParams } = new URL(request.url)
  const secretParam = searchParams.get('secret')
  if (secretParam === CRON_SECRET) {
    return { success: true }
  }

  return { success: false, error: 'Unauthorized' }
}

/**
 * 快速回傳 401 錯誤
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}
