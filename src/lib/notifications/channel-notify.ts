/**
 * 頻道自動通知服務
 * 
 * 統一管理業務事件的頻道通知
 * 符合商業基石：資訊對齊、秩序建立
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 通知類型
export type NotifyEvent = 
  | 'request_sent'      // 發出需求單
  | 'request_replied'   // 供應商回覆
  | 'request_confirmed' // 確認需求
  | 'task_assigned'     // 指派任務
  | 'task_completed'    // 完成任務
  | 'contract_signed'   // 合約簽署
  | 'payment_received'  // 收到款項
  | 'payment_requested' // 請款

// 通知內容
interface NotifyPayload {
  event: NotifyEvent
  tourId: string
  workspaceId: string
  title: string
  message: string
  mentionEmployeeIds?: string[]  // @某人
  metadata?: Record<string, unknown>
}

/**
 * 發送頻道通知
 */
export async function sendChannelNotify(payload: NotifyPayload): Promise<boolean> {
  try {
    // 1. 找到團的頻道
    const { data: tour } = await supabase
      .from('tours')
      .select('id, code, name, channel_id')
      .eq('id', payload.tourId)
      .single()

    if (!tour?.channel_id) {
      console.warn(`[ChannelNotify] Tour ${payload.tourId} has no channel`)
      return false
    }

    // 2. 格式化訊息
    const emoji = getEventEmoji(payload.event)
    const formattedMessage = formatMessage(emoji, payload.title, payload.message, payload.mentionEmployeeIds)

    // 3. 寫入頻道訊息（使用 messages 表）
    const { error } = await supabase
      .from('messages')
      .insert({
        channel_id: tour.channel_id,
        workspace_id: payload.workspaceId,
        content: formattedMessage,
        event: 'system_notify',
        author: { name: '系統通知', avatar: null, is_system: true },
        metadata: {
          event: payload.event,
          ...payload.metadata
        }
      })

    if (error) {
      console.error('[ChannelNotify] Insert failed:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[ChannelNotify] Error:', err)
    return false
  }
}

/**
 * 取得事件 Emoji
 */
function getEventEmoji(event: NotifyEvent): string {
  const emojiMap: Record<NotifyEvent, string> = {
    request_sent: '📤',
    request_replied: '📥',
    request_confirmed: '✅',
    task_assigned: '👤',
    task_completed: '🎉',
    contract_signed: '📝',
    payment_received: '💰',
    payment_requested: '💳'
  }
  return emojiMap[event] || '📢'
}

/**
 * 格式化訊息
 */
function formatMessage(
  emoji: string, 
  title: string, 
  message: string, 
  mentionIds?: string[]
): string {
  let formatted = `${emoji} **${title}**\n${message}`
  
  if (mentionIds && mentionIds.length > 0) {
    // TODO: 將 employee_id 轉成 @姓名
    formatted += `\n\n📌 相關人員待確認`
  }
  
  return formatted
}

// ====== 便捷方法 ======

/**
 * 發需求單時通知
 */
export async function notifyRequestSent(
  tourId: string,
  workspaceId: string,
  requestType: string,
  supplierName: string
) {
  return sendChannelNotify({
    event: 'request_sent',
    tourId,
    workspaceId,
    title: `需求單已發送`,
    message: `已發送 ${requestType} 需求給 ${supplierName}`
  })
}

/**
 * 供應商回覆時通知
 */
export async function notifyRequestReplied(
  tourId: string,
  workspaceId: string,
  requestType: string,
  supplierName: string
) {
  return sendChannelNotify({
    event: 'request_replied',
    tourId,
    workspaceId,
    title: `收到報價回覆`,
    message: `${supplierName} 已回覆 ${requestType} 報價`
  })
}

/**
 * 確認需求時通知
 */
export async function notifyRequestConfirmed(
  tourId: string,
  workspaceId: string,
  requestType: string,
  supplierName: string
) {
  return sendChannelNotify({
    event: 'request_confirmed',
    tourId,
    workspaceId,
    title: `需求已確認`,
    message: `已確認 ${supplierName} 的 ${requestType}`
  })
}

/**
 * 指派任務時通知
 */
export async function notifyTaskAssigned(
  tourId: string,
  workspaceId: string,
  taskName: string,
  assigneeName: string,
  assigneeId: string
) {
  return sendChannelNotify({
    event: 'task_assigned',
    tourId,
    workspaceId,
    title: `任務已指派`,
    message: `${taskName} 已指派給 ${assigneeName}`,
    mentionEmployeeIds: [assigneeId]
  })
}

/**
 * 完成任務時通知
 */
export async function notifyTaskCompleted(
  tourId: string,
  workspaceId: string,
  taskName: string,
  completedByName: string
) {
  return sendChannelNotify({
    event: 'task_completed',
    tourId,
    workspaceId,
    title: `任務已完成`,
    message: `${completedByName} 完成了 ${taskName}`
  })
}

/**
 * 合約簽署時通知
 */
export async function notifyContractSigned(
  tourId: string,
  workspaceId: string,
  customerName: string
) {
  return sendChannelNotify({
    event: 'contract_signed',
    tourId,
    workspaceId,
    title: `合約已簽署`,
    message: `${customerName} 已完成電子簽約`
  })
}

/**
 * 收到款項時通知
 */
export async function notifyPaymentReceived(
  tourId: string,
  workspaceId: string,
  amount: number,
  payerName: string
) {
  return sendChannelNotify({
    event: 'payment_received',
    tourId,
    workspaceId,
    title: `收到款項`,
    message: `${payerName} 已付款 NT$ ${amount.toLocaleString()}`
  })
}
