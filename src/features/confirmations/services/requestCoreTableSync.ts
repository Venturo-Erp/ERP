/**
 * requestCoreTableSync — 核心表需求欄位操作
 *
 * 核心表 tour_itinerary_items 的需求相關欄位：
 * - supplier_id, supplier_name
 * - request_status (none / sent / replied / confirmed / cancelled)
 * - request_sent_at, request_reply_at
 * - reply_content (jsonb), reply_cost
 * - estimated_cost, quoted_cost
 *
 * 「一 row 走到底」— 不另外建 tour_requests，直接在核心表上操作
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'
import type { Database } from '@/lib/supabase/types'

type CoreItemUpdate = Database['public']['Tables']['tour_itinerary_items']['Update']

// === Labels ===
const LABELS = {
  UPDATE_START: 'Updating core table request fields',
  UPDATE_COMPLETE: 'Core table request fields updated',
  UPDATE_ERROR: 'Core table request update failed',
  FETCH_ERROR: 'Failed to fetch core table request items',
  BATCH_UPDATE_START: 'Batch updating request status',
  BATCH_UPDATE_COMPLETE: 'Batch update complete',
} as const

/**
 * 更新單一核心表項目的需求欄位
 */
export async function updateRequestFields(
  item_id: string,
  fields: Pick<
    CoreItemUpdate,
    | 'supplier_id'
    | 'supplier_name'
    | 'request_status'
    | 'request_sent_at'
    | 'request_reply_at'
    | 'reply_content'
    | 'reply_cost'
    | 'estimated_cost'
    | 'quoted_cost'
  >
): Promise<{ success: boolean; message?: string }> {
  logger.log(LABELS.UPDATE_START, { item_id, fields: Object.keys(fields) })

  try {
    const { error } = await supabase.from('tour_itinerary_items').update(fields).eq('id', item_id)

    if (error) {
      logger.error(LABELS.UPDATE_ERROR, { item_id, error })
      return { success: false, message: error.message }
    }

    logger.log(LABELS.UPDATE_COMPLETE, { item_id })
    return { success: true }
  } catch (error) {
    logger.error(LABELS.UPDATE_ERROR, error)
    return { success: false, message: String(error) }
  }
}

/**
 * 發送需求：更新 request_status = 'sent'，記錄時間
 */
export async function markRequestSent(
  item_ids: string[]
): Promise<{ success: boolean; count: number }> {
  logger.log(LABELS.BATCH_UPDATE_START, { action: 'sent', count: item_ids.length })

  let count = 0
  const now = new Date().toISOString()

  for (const id of item_ids) {
    const { error } = await supabase
      .from('tour_itinerary_items')
      .update({
        request_status: 'sent',
        request_sent_at: now,
      })
      .eq('id', id)

    if (!error) count++
    else logger.error(LABELS.UPDATE_ERROR, { id, error })
  }

  logger.log(LABELS.BATCH_UPDATE_COMPLETE, { count, total: item_ids.length })
  return { success: count > 0, count }
}

/**
 * 記錄供應商回覆
 */
export async function markRequestReplied(
  item_id: string,
  reply: Pick<CoreItemUpdate, 'reply_content' | 'reply_cost'>
): Promise<{ success: boolean; message?: string }> {
  return updateRequestFields(item_id, {
    request_status: 'replied',
    request_reply_at: new Date().toISOString(),
    ...reply,
  })
}

/**
 * 確認需求
 */
export async function markRequestConfirmed(
  item_id: string
): Promise<{ success: boolean; message?: string }> {
  return updateRequestFields(item_id, {
    request_status: 'confirmed',
  })
}

/**
 * 取消需求
 */
export async function markRequestCancelled(
  item_id: string
): Promise<{ success: boolean; message?: string }> {
  return updateRequestFields(item_id, {
    request_status: 'cancelled',
  })
}

/**
 * 取得某團的核心表項目（需求 view 用）
 * 只取有報價或有供應商的項目（已進入需求階段的）
 */
export async function fetchRequestableItems(
  tour_id: string
): Promise<{ success: boolean; items: TourItineraryItem[]; message?: string }> {
  try {
    const { data, error } = await supabase
      .from('tour_itinerary_items')
      .select(
        'id, tour_id, day_number, sort_order, category, sub_category, title, description, resource_type, resource_name, resource_id, supplier_id, supplier_name, service_date, service_date_end, estimated_cost, confirmed_cost, actual_expense, booking_status, booking_reference, booking_confirmed_at, confirmation_status, confirmation_item_id, handled_by, request_status, request_id, quote_status, quoted_cost, show_on_brochure, show_on_quote, show_on_web, workspace_id, created_at, updated_at'
      )
      .eq('tour_id', tour_id)
      .order('day_number', { ascending: true })
      .order('sort_order', { ascending: true })
      .limit(500)

    if (error) {
      logger.error(LABELS.FETCH_ERROR, error)
      return { success: false, items: [], message: error.message }
    }

    return { success: true, items: (data as TourItineraryItem[]) || [] }
  } catch (error) {
    logger.error(LABELS.FETCH_ERROR, error)
    return { success: false, items: [], message: String(error) }
  }
}
