/**
 * Tour Channel Service
 * 自動建立旅遊團頻道並加入相關成員
 */

import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/types/tour.types'

interface CreateTourChannelResult {
  success: boolean
  channelId?: string
  error?: string
}

/**
 * 為旅遊團建立專屬頻道（透過 API Route 繞過 RLS）
 * @param tour - 旅遊團資料
 * @param creatorId - 建立者 ID
 * @returns 建立結果
 */
export async function createTourChannel(
  tour: Tour,
  creatorId: string
): Promise<CreateTourChannelResult> {
  try {
    const response = await fetch('/api/channels/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tour, creatorId }),
    })

    const result = await response.json()

    if (result.success) {
      logger.log(`[TourChannel] 頻道建立成功: ${tour.code}`)
    } else {
      logger.error(`[TourChannel] 建立頻道失敗: ${result.error}`)
    }

    return result
  } catch (error) {
    logger.error('[TourChannel] 建立頻道時發生錯誤:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 將成員加入旅遊團頻道
 * @param tourId - 旅遊團 ID
 * @param employeeIds - 員工 ID 陣列
 * @param role - 角色 ('member' | 'admin')
 */
export async function addMembersToTourChannel(
  tourId: string,
  employeeIds: string[],
  role: 'member' | 'admin' = 'member'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/channels/add-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourId, employeeIds, role }),
    })

    const result = await response.json()

    if (result.success) {
      logger.log(`[TourChannel] 成功加入 ${employeeIds.length} 位成員至頻道`)
    } else {
      logger.error(`[TourChannel] 加入成員失敗: ${result.error}`)
    }

    return result
  } catch (error) {
    logger.error('[TourChannel] 加入成員時發生錯誤:', error)
    return { success: false, error: String(error) }
  }
}
