/**
 * confirmationCoreTableSync — 確認單 ↔ 核心表同步
 *
 * 確認單項目建立/更新時，同步寫回 tour_itinerary_items 的確認相關欄位
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { ITEM_CONFIRMATION_STATUS } from '@/features/tours/types/tour-itinerary-item.types'

// === Labels ===
const SYNC_LABELS = {
  SYNC_START: 'Syncing confirmation to core table',
  SYNC_COMPLETE: 'Confirmation → core table sync complete',
  SYNC_ERROR: 'Confirmation → core table sync failed',
  LEADER_SYNC_START: 'Syncing leader expense to core table',
  LEADER_SYNC_COMPLETE: 'Leader expense → core table sync complete',
  LEADER_SYNC_ERROR: 'Leader expense → core table sync failed',
} as const

/**
 * 確認單項目建立後，更新核心表的 confirmation_item_id 和 confirmation_status
 */
export async function syncConfirmationCreateToCore(params: {
  confirmation_item_id: string
  itinerary_item_id: string
  booking_status?: string | null
}): Promise<{ success: boolean; message?: string }> {
  const { confirmation_item_id, itinerary_item_id, booking_status } = params

  logger.log(SYNC_LABELS.SYNC_START, { confirmation_item_id, itinerary_item_id })

  try {
    const confirmation_status =
      booking_status === 'confirmed'
        ? ITEM_CONFIRMATION_STATUS.CONFIRMED
        : ITEM_CONFIRMATION_STATUS.PENDING

    const update_data: Record<string, unknown> = {
      confirmation_item_id,
      confirmation_status,
    }

    const { error } = await supabase
      .from('tour_itinerary_items')
      .update(update_data)
      .eq('id', itinerary_item_id)

    if (error) {
      logger.error(SYNC_LABELS.SYNC_ERROR, { itinerary_item_id, error })
      return { success: false, message: String(error.message) }
    }

    logger.log(SYNC_LABELS.SYNC_COMPLETE, { confirmation_item_id, itinerary_item_id })
    return { success: true }
  } catch (error) {
    logger.error(SYNC_LABELS.SYNC_ERROR, error)
    return { success: false, message: String(error) }
  }
}

/**
 * 確認單項目更新時（含確認/取消），同步核心表
 */
export async function syncConfirmationUpdateToCore(params: {
  itinerary_item_id: string
  booking_status?: string | null
  confirmed_cost?: number | null
  booking_reference?: string | null
  confirmation_note?: string | null
}): Promise<{ success: boolean; message?: string }> {
  const {
    itinerary_item_id,
    booking_status,
    confirmed_cost,
    booking_reference,
    confirmation_note,
  } = params

  logger.log(SYNC_LABELS.SYNC_START, { itinerary_item_id, booking_status })

  try {
    const update_data: Record<string, unknown> = {}

    if (booking_status !== undefined) {
      update_data.booking_status = booking_status

      if (booking_status === 'confirmed') {
        update_data.confirmation_status = ITEM_CONFIRMATION_STATUS.CONFIRMED
        update_data.confirmation_date = new Date().toISOString()
      } else if (booking_status === 'cancelled') {
        update_data.confirmation_status = ITEM_CONFIRMATION_STATUS.NONE
      } else {
        update_data.confirmation_status = ITEM_CONFIRMATION_STATUS.PENDING
      }
    }

    // 統一邏輯：確認價格直接覆蓋 unit_price（覆蓋式管理）
    if (confirmed_cost !== undefined) update_data.unit_price = confirmed_cost
    if (booking_reference !== undefined) update_data.booking_reference = booking_reference
    if (confirmation_note !== undefined) update_data.confirmation_note = confirmation_note

    if (Object.keys(update_data).length === 0) {
      return { success: true }
    }

    const { error } = await supabase
      .from('tour_itinerary_items')
      .update(update_data)
      .eq('id', itinerary_item_id)

    if (error) {
      logger.error(SYNC_LABELS.SYNC_ERROR, { itinerary_item_id, error })
      return { success: false, message: String(error.message) }
    }

    logger.log(SYNC_LABELS.SYNC_COMPLETE, { itinerary_item_id, booking_status })
    return { success: true }
  } catch (error) {
    logger.error(SYNC_LABELS.SYNC_ERROR, error)
    return { success: false, message: String(error) }
  }
}

/**
 * 領隊回填同步到核心表
 */
export async function syncLeaderExpenseToCore(params: {
  itinerary_item_id: string
  actual_expense: number | null
  expense_note?: string | null
  expense_at?: string | null
  receipt_images?: string[] | null
}): Promise<{ success: boolean; message?: string }> {
  const { itinerary_item_id, actual_expense, expense_note, expense_at, receipt_images } = params

  logger.log(SYNC_LABELS.LEADER_SYNC_START, { itinerary_item_id, actual_expense })

  try {
    const update_data: Record<string, unknown> = {
      actual_expense,
      leader_status: 'filled',
    }

    if (expense_note !== undefined) update_data.expense_note = expense_note
    if (expense_at !== undefined) update_data.expense_at = expense_at
    if (receipt_images !== undefined) update_data.receipt_images = receipt_images

    const { error } = await supabase
      .from('tour_itinerary_items')
      .update(update_data)
      .eq('id', itinerary_item_id)

    if (error) {
      logger.error(SYNC_LABELS.LEADER_SYNC_ERROR, { itinerary_item_id, error })
      return { success: false, message: String(error.message) }
    }

    logger.log(SYNC_LABELS.LEADER_SYNC_COMPLETE, { itinerary_item_id })
    return { success: true }
  } catch (error) {
    logger.error(SYNC_LABELS.LEADER_SYNC_ERROR, error)
    return { success: false, message: String(error) }
  }
}

/**
 * 批量同步：將確認單所有項目同步到核心表
 * 用於初始建立確認單時（如果項目有 itinerary_item_id）
 */
export async function batchSyncConfirmationToCore(params: {
  items: Array<{
    id: string
    itinerary_item_id: string | null
    booking_status?: string | null
    actual_cost?: number | null
    booking_reference?: string | null
    notes?: string | null
    leader_expense?: number | null
    leader_expense_note?: string | null
    leader_expense_at?: string | null
    receipt_images?: string[] | null
  }>
}): Promise<{ success: boolean; synced_count: number; message?: string }> {
  const { items } = params
  let synced_count = 0

  for (const item of items) {
    if (!item.itinerary_item_id) continue

    // Sync confirmation fields
    const result = await syncConfirmationCreateToCore({
      confirmation_item_id: item.id,
      itinerary_item_id: item.itinerary_item_id,
      booking_status: item.booking_status,
    })

    if (result.success) {
      // Also sync cost/reference if available
      if (item.actual_cost !== undefined || item.booking_reference !== undefined) {
        await syncConfirmationUpdateToCore({
          itinerary_item_id: item.itinerary_item_id,
          confirmed_cost: item.actual_cost,
          booking_reference: item.booking_reference,
          confirmation_note: item.notes,
        })
      }

      // Sync leader expense if available
      if (item.leader_expense !== undefined && item.leader_expense !== null) {
        await syncLeaderExpenseToCore({
          itinerary_item_id: item.itinerary_item_id,
          actual_expense: item.leader_expense,
          expense_note: item.leader_expense_note,
          expense_at: item.leader_expense_at,
          receipt_images: item.receipt_images,
        })
      }

      synced_count++
    }
  }

  return { success: true, synced_count }
}
