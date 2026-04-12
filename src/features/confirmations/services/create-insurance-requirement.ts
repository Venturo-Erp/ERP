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
  startDate: string | null,
  returnDate: string | null = null
) {
  // 檢查是否已存在保險需求（supplier_name = '保險公司'）
  const { data: existing } = (await supabase
    .from('tour_requests')
    .select('id, items, status')
    .eq('tour_id', tourId)
    .eq('request_type', 'other')
    .eq('supplier_name', '保險公司')) as {
    data: { id: string; items: Record<string, unknown>[]; status: string }[] | null
  }

  if (existing && existing.length > 0) {
    // 已存在 → 更新團員人數（可能有變）
    const firstItem = existing[0].items?.[0] || {}
    if ((firstItem as Record<string, unknown>).quantity !== memberCount) {
      await supabase
        .from('tour_requests')
        .update({
          items: [{ ...firstItem, quantity: memberCount }],
        } as never)
        .eq('id', existing[0].id)
      logger.log('[保險] 已更新團員人數:', memberCount)
    }
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
      handler_type: 'supplier',
      category: 'other',
      title: '旅遊責任險',
      service_date: startDate,
      quantity: memberCount,
      request_type: 'other',
      supplier_name: '保險公司',
      items: [
        {
          title: '旅遊責任險',
          category: 'other',
          quantity: memberCount,
          service_date: startDate,
          return_date: returnDate,
          notes: '自動產生',
        },
      ],
      status: 'draft',
      hidden: false,
      created_by: userId,
    } as never)
    .select(
      'id, code, tour_id, workspace_id, request_type, status, supplier_name, items, note, created_at'
    )
    .single()

  if (error) {
    logger.error('[保險] 建立失敗:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  logger.log('[保險] 需求單已建立:', data.code)
  return data
}
