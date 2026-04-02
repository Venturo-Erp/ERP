/**
 * 機器人通知 API
 * 用於發送系統通知到指定用戶
 */

import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { ApiError, successResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validation'
import { botNotificationRequestSchema } from '@/lib/validations/api-schemas'

// 系統機器人 ID
import { SYSTEM_BOT_ID } from '@/lib/constants/workspace'

export async function POST(request: NextRequest) {
  // Bot API 驗證
  const BOT_API_SECRET = process.env.BOT_API_SECRET
  if (!BOT_API_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return ApiError.internal('Server misconfigured')
    }
  } else {
    const authHeader = request.headers.get('x-bot-secret')
    if (authHeader !== BOT_API_SECRET) {
      return ApiError.unauthorized('Unauthorized')
    }
  }

  try {
    const validation = await validateBody(request, botNotificationRequestSchema)
    if (!validation.success) return validation.error
    const { recipient_id, message, type, metadata } = validation.data

    const supabase = getSupabaseAdminClient()

    // 1. 查找或建立機器人與接收者的 DM 頻道
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('id, name, type, workspace_id')
      .eq('type', 'direct')
      .or(
        `name.ilike.dm:${SYSTEM_BOT_ID}:${recipient_id},name.ilike.dm:${recipient_id}:${SYSTEM_BOT_ID}`
      )
      .single()

    let channelId: string

    if (existingChannel) {
      channelId = existingChannel.id
    } else {
      // 取得接收者的 workspace_id
      const { data: recipientData } = await supabase
        .from('employees')
        .select('workspace_id')
        .eq('id', recipient_id)
        .single()

      if (!recipientData?.workspace_id) {
        return ApiError.notFound('接收者')
      }

      // 建立新的 DM 頻道
      const { data: newChannel, error: createError } = await supabase
        .from('channels')
        .insert({
          name: `dm:${SYSTEM_BOT_ID}:${recipient_id}`,
          type: 'direct',
          channel_type: 'DIRECT', // 必須大寫，與 RPC 一致
          is_announcement: false,
          workspace_id: recipientData.workspace_id,
          created_by: SYSTEM_BOT_ID,
        })
        .select()
        .single()

      if (createError || !newChannel) {
        logger.error('建立機器人 DM 頻道失敗:', createError)
        return ApiError.database('建立通知頻道失敗')
      }

      // 加入頻道成員
      await supabase.from('channel_members').insert([
        {
          channel_id: newChannel.id,
          employee_id: SYSTEM_BOT_ID,
          role: 'owner',
          workspace_id: recipientData.workspace_id,
        },
        {
          channel_id: newChannel.id,
          employee_id: recipient_id,
          role: 'member',
          workspace_id: recipientData.workspace_id,
        },
      ])

      channelId = newChannel.id
    }

    // 2. 發送訊息
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        content: message,
        author_id: SYSTEM_BOT_ID,
        metadata: {
          type: 'bot_notification',
          notification_type: type,
          ...metadata,
        },
      })
      .select()
      .single()

    if (messageError) {
      logger.error('發送機器人訊息失敗:', messageError)
      return ApiError.database('發送訊息失敗')
    }

    logger.info('機器人通知已發送', {
      recipient_id,
      channel_id: channelId,
      message_id: messageData.id,
      type,
    })

    return successResponse({
      message: '通知已發送',
      channel_id: channelId,
      message_id: messageData.id,
    })
  } catch (error) {
    logger.error('機器人通知 API 錯誤:', error)
    return ApiError.internal('伺服器錯誤')
  }
}
