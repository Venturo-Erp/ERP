import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

/**
 * 為團自動建立保險需求單
 * - 檢查是否已存在，不重複建立
 * - 自動帶入團員人數和出發日期
 */
export async function createInsuranceRequirement(
  tourId: string,
  workspaceId: string,
  userId: string,
  memberCount: number,
  startDate: string | null
) {
  // 檢查是否已存在保險需求（supplier_name = '保險公司'）
  const { data: existing } = await supabase
    .from('tour_requests')
    .select('id, items')
    .eq('tour_id', tourId)
    .eq('request_type', 'other')
    .eq('supplier_name', '保險公司')

  if (existing && existing.length > 0) {
    logger.log('[保險] 需求單已存在，跳過')
    return existing[0]
  }

  // 產生需求單代碼
  const code = `RQ${Date.now().toString().slice(-8)}`

  // 建立需求單
  const { data, error } = await supabase
    .from('tour_requests')
    .insert({
      workspace_id: workspaceId,
      tour_id: tourId,
      code,
      request_type: 'other',
      supplier_name: '保險公司',
      items: [
        {
          title: '旅遊平安保險',
          category: 'other',
          quantity: memberCount,
          service_date: startDate,
          notes: '自動產生',
        },
      ],
      status: 'draft',
      hidden: false,
      created_by: userId,
    } as never)
    .select('*')
    .single()

  if (error) {
    logger.error('[保險] 建立失敗:', error)
    return null
  }

  logger.log('[保險] 需求單已建立:', data.code)
  return data
}
