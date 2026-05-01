import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * API 用量追蹤工具
 * 統一管理各種 API 的使用量追蹤
 */

interface ApiUsageCheckResult {
  canUse: boolean
  used: number
  limit: number
  remaining: number
  warning: string | null
}

// API 月度限制設定
export const API_LIMITS = {
  google_vision: 980, // Google Vision 免費額度 1000，保守設 980
  gemini: 1500, // Gemini 免費 60/分鐘
  ocr_space: 25000, // OCR.space 免費額度 25000/月
  gemini_image_edit: 500, // Gemini 圖片編輯月度限制
  gemini_suggest: 500, // Gemini 景點建議月度限制
} as const

type ApiName = keyof typeof API_LIMITS

/**
 * 檢查 API 使用量並回傳剩餘次數
 */
export async function checkApiUsage(
  apiName: ApiName,
  requestCount: number = 1
): Promise<ApiUsageCheckResult> {
  try {
    const supabase = getSupabaseAdminClient()
    const limit = API_LIMITS[apiName]
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    const { data } = await supabase
      .from('api_usage')
      .select('usage_count')
      .eq('api_name', apiName)
      .eq('month', currentMonth)
      .single()

    const used = data?.usage_count || 0
    const remaining = Math.max(0, limit - used)
    const newUsage = used + requestCount

    // 判斷是否可以使用
    if (newUsage > limit) {
      return {
        canUse: false,
        used,
        limit,
        remaining: 0,
        warning: `本月已達上限 (${used}/${limit})`,
      }
    }

    // 使用量警告
    const usagePercent = (newUsage / limit) * 100
    let warning: string | null = null

    if (usagePercent >= 95) {
      warning = `剩餘 ${remaining - requestCount} 次，即將達到上限！`
    } else if (usagePercent >= 80) {
      warning = `剩餘 ${remaining - requestCount} 次`
    }

    return {
      canUse: true,
      used,
      limit,
      remaining: remaining - requestCount,
      warning,
    }
  } catch (error) {
    logger.error(`檢查 ${apiName} API 使用量失敗:`, error)
    // 發生錯誤時仍允許使用
    return {
      canUse: true,
      used: 0,
      limit: API_LIMITS[apiName],
      remaining: API_LIMITS[apiName],
      warning: null,
    }
  }
}

/**
 * 更新 API 使用量並回傳剩餘次數
 */
export async function updateApiUsage(
  apiName: ApiName,
  count: number = 1
): Promise<{ success: boolean; used: number; remaining: number }> {
  try {
    const supabase = getSupabaseAdminClient()
    const currentMonth = new Date().toISOString().slice(0, 7)
    const limit = API_LIMITS[apiName]

    // 先查詢當前使用量
    const { data: existing } = await supabase
      .from('api_usage')
      .select('usage_count')
      .eq('api_name', apiName)
      .eq('month', currentMonth)
      .single()

    const newCount = (existing?.usage_count || 0) + count
    const remaining = Math.max(0, limit - newCount)

    // 使用 upsert 更新或新增記錄
    const { error } = await supabase.from('api_usage').upsert(
      {
        api_name: apiName,
        month: currentMonth,
        usage_count: newCount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'api_name,month',
      }
    )

    if (error) {
      logger.error(`更新 ${apiName} 使用量失敗:`, error)
      return { success: false, used: 0, remaining: limit }
    }

    logger.log(`📊 ${apiName} 使用量: ${newCount}/${limit}，剩餘 ${remaining} 次`)
    return { success: true, used: newCount, remaining }
  } catch (error) {
    logger.error(`更新 ${apiName} 使用量失敗:`, error)
    return { success: false, used: 0, remaining: API_LIMITS[apiName] }
  }
}

/**
 * 取得 API 當月使用量資訊
 */
async function getApiUsage(apiName: ApiName): Promise<{
  used: number
  limit: number
  remaining: number
  percentage: number
}> {
  try {
    const supabase = getSupabaseAdminClient()
    const currentMonth = new Date().toISOString().slice(0, 7)
    const limit = API_LIMITS[apiName]

    const { data } = await supabase
      .from('api_usage')
      .select('usage_count')
      .eq('api_name', apiName)
      .eq('month', currentMonth)
      .single()

    const used = data?.usage_count || 0
    const remaining = Math.max(0, limit - used)
    const percentage = (used / limit) * 100

    return { used, limit, remaining, percentage }
  } catch {
    const limit = API_LIMITS[apiName]
    return {
      used: 0,
      limit,
      remaining: limit,
      percentage: 0,
    }
  }
}
