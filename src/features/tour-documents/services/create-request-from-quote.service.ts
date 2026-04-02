/**
 * Create Request from Quote Service
 * 從報價單建立需求單
 */

import { supabase } from '@/lib/supabase/client'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import type { RequestItem } from '@/types/tour-documents.types'
import { logger } from '@/lib/utils/logger'

const tourRequestsDb = () => dynamicFrom('tour_requests')

/**
 * 從報價單的 categories 建立需求單
 */
export async function createRequestFromQuote(input: {
  quoteId: string
  tourId: string
  workspaceId: string
  userId: string
}): Promise<{ requestIds: string[]; count: number }> {
  // 1. 取得報價單資料
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('categories, tour_id, code')
    .eq('id', input.quoteId)
    .single()

  if (quoteError) throw quoteError
  if (!quote) throw new Error('報價單不存在')

  const categories = quote.categories as any[]

  // 2. 按供應商分組
  const groupedBySupplier: Record<
    string,
    {
      supplier_name: string
      request_type: string
      items: RequestItem[]
    }
  > = {}

  for (const category of categories) {
    const supplierName = category.supplier_name || category.name || '未指定供應商'
    const requestType = getCategoryRequestType(category.name)

    if (!groupedBySupplier[supplierName]) {
      groupedBySupplier[supplierName] = {
        supplier_name: supplierName,
        request_type: requestType,
        items: [],
      }
    }

    // 轉換 category items 為 request items
    for (const item of category.items || []) {
      groupedBySupplier[supplierName].items.push({
        service_date: item.service_date || null,
        title: item.title || item.item_name || '',
        quantity: item.quantity || item.unit || 1,
        note: item.note || item.remarks || '',
        unit_price: item.cost || item.unit_price || 0,
        total_price: item.total || item.total_cost || 0,
      })
    }
  }

  // 3. 為每個供應商建立需求單
  const requestIds: string[] = []

  for (const [supplierKey, group] of Object.entries(groupedBySupplier)) {
    const { data: request, error: insertError } = await tourRequestsDb()
      .insert({
        workspace_id: input.workspaceId,
        tour_id: input.tourId,
        source_type: 'quote',
        source_id: input.quoteId,
        code: `REQ-${quote.code || Date.now()}-${requestIds.length + 1}`,
        request_type: group.request_type,
        supplier_name: group.supplier_name,
        items: group.items as any,
        status: '草稿',
        created_by: input.userId,
        updated_by: input.userId,
      } as any)
      .select()
      .single()

    if (insertError) {
      logger.error('建立需求單失敗:', insertError)
      continue
    }

    if (request) {
      requestIds.push(request.id)
    }
  }

  return {
    requestIds,
    count: requestIds.length,
  }
}

/**
 * 根據 category 名稱判斷需求單類型
 */
function getCategoryRequestType(categoryName: string): string {
  if (categoryName.includes('住宿') || categoryName.includes('飯店')) {
    return '訂房'
  }
  if (categoryName.includes('餐食') || categoryName.includes('用餐')) {
    return '訂餐'
  }
  if (categoryName.includes('交通') || categoryName.includes('車輛')) {
    return '訂車'
  }
  if (categoryName.includes('門票') || categoryName.includes('票券')) {
    return '訂門票'
  }
  if (categoryName.includes('機票') || categoryName.includes('航班')) {
    return '訂機票'
  }
  return categoryName // 預設使用 category 名稱
}
