'use client'

/**
 * Channel Utilities - 頻道建立/封存工具
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface CreateChannelForTourParams {
  tourId: string
  tourCode: string
  tourName: string
  departureDate?: string | null
  workspaceId: string
  createdBy: string
}

/**
 * 為團自動建立頻道（靜默建立，不顯示 toast）
 */
export async function createChannelForTour({
  tourId,
  tourCode,
  tourName,
  departureDate,
  workspaceId,
  createdBy,
}: CreateChannelForTourParams): Promise<{ id: string; name: string } | null> {
  try {
    logger.log('🔵 [自動建立頻道] 開始:', tourCode, tourName)

    // 檢查是否已有頻道
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('tour_id', tourId)
      .maybeSingle()

    if (existingChannel) {
      logger.log('ℹ️ [自動建立頻道] 頻道已存在:', existingChannel.name)
      return existingChannel
    }

    // 建立頻道
    const channelName = `${tourCode} ${tourName}`
    const { error: insertError, data: newChannel } = await supabase
      .from('channels')
      .insert({
        workspace_id: workspaceId,
        name: channelName,
        description: `${tourName}${departureDate ? ` - ${departureDate} 出發` : ''}`,
        type: 'public',
        tour_id: tourId,
        created_by: createdBy,
      })
      .select('id, name')
      .single()

    if (insertError) {
      logger.error('❌ [自動建立頻道] 建立失敗:', insertError)
      return null
    }

    logger.log('✅ [自動建立頻道] 建立成功:', newChannel.name)

    // 自動將創建者加入為頻道擁有者
    try {
      const { createChannelMember } = await import('@/data/entities/channel-members')
      await createChannelMember({
        workspace_id: workspaceId,
        channel_id: newChannel.id,
        employee_id: createdBy,
        role: 'owner',
        status: 'active',
      })
      logger.log('✅ [自動建立頻道] 創建者已加入為擁有者')
    } catch (memberErr) {
      logger.warn('⚠️ [自動建立頻道] 加入成員異常:', memberErr)
    }

    return newChannel
  } catch (error) {
    logger.error('❌ [自動建立頻道] 發生錯誤:', error)
    return null
  }
}

/**
 * 封存團的頻道（結團時呼叫）
 */
async function archiveChannelForTour(tourId: string): Promise<boolean> {
  try {
    logger.log('🔵 [封存頻道] 開始:', tourId)

    // 找到團的頻道
    const { data: channel, error: findError } = await supabase
      .from('channels')
      .select('id, name')
      .eq('tour_id', tourId)
      .maybeSingle()

    if (findError) {
      logger.error('❌ [封存頻道] 查詢失敗:', findError)
      return false
    }

    if (!channel) {
      logger.log('ℹ️ [封存頻道] 無頻道需要封存')
      return true
    }

    // 更新頻道狀態為封存
    const { error: updateError } = await supabase
      .from('channels')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', channel.id)

    if (updateError) {
      logger.error('❌ [封存頻道] 更新失敗:', updateError)
      return false
    }

    logger.log('✅ [封存頻道] 成功:', channel.name)
    return true
  } catch (error) {
    logger.error('❌ [封存頻道] 發生錯誤:', error)
    return false
  }
}
