/**
 * AI 設定讀取工具
 * 從 ai_settings 表讀取可配置的設定
 * 系統主管可在後台修改，不需要改 code
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const supabase = getSupabaseAdminClient()

// 快取（避免每次 API 呼叫都查 DB）
const cache = new Map<string, { value: string; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 分鐘

/**
 * 取得 AI 設定值
 */
export async function getAISetting(
  workspaceId: string,
  category: string,
  key: string,
  defaultValue: string = ''
): Promise<string> {
  const cacheKey = `${workspaceId}:${category}:${key}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.value
  }

  const { data } = await supabase
    .from('ai_settings')
    .select('setting_value')
    .eq('workspace_id', workspaceId)
    .eq('setting_category', category)
    .eq('setting_key', key)
    .single()

  const value = data?.setting_value || defaultValue
  cache.set(cacheKey, { value, expiry: Date.now() + CACHE_TTL })
  return value
}

/**
 * 取得某分類的全部設定
 */
async function getAISettings(
  workspaceId: string,
  category: string
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('ai_settings')
    .select('setting_key, setting_value')
    .eq('workspace_id', workspaceId)
    .eq('setting_category', category)

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.setting_key] = row.setting_value || ''
  }
  return settings
}

/**
 * 更新設定值
 */
async function updateAISetting(
  workspaceId: string,
  category: string,
  key: string,
  value: string,
  updatedBy?: string
): Promise<boolean> {
  const { error } = await supabase.from('ai_settings').upsert(
    {
      workspace_id: workspaceId,
      setting_category: category,
      setting_key: key,
      setting_value: value,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || null,
    },
    { onConflict: 'workspace_id,setting_category,setting_key' }
  )

  if (!error) {
    // 清快取
    cache.delete(`${workspaceId}:${category}:${key}`)
  }
  return !error
}

/**
 * 替換通知模板中的變數
 * 例如："{customer_name} 的 {tour_name}" → "王小明 的 日本五日遊"
 */
function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}
