/**
 * 通知發送工具
 * 統一呼叫 POST /api/notifications 的入口
 */

import { logger } from './logger'

interface SendNotificationParams {
  /** 收件人 employee ID（單人） */
  recipient_id?: string
  /** 收件人 employee IDs（多人） */
  recipients?: string[]
  /** 通知標題 */
  title: string
  /** 通知內容 */
  message?: string
  /** 模組分類 */
  module: 'hr' | 'finance' | 'tour' | 'system' | 'announcement'
  /** 通知類型：info 一般 | action 需操作 | alert 警告 */
  type?: 'info' | 'action' | 'alert'
  /** 點擊跳轉 URL */
  action_url?: string
  /** 附加資料 */
  action_data?: Record<string, unknown>
}

/**
 * 發送通知（前端呼叫）
 * 會自動推播 Web + LINE（如果用戶有綁定）
 */
export async function sendNotification(params: SendNotificationParams): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const err = await res.json()
      logger.error('發送通知失敗:', err)
      return false
    }
    return true
  } catch (error) {
    logger.error('發送通知失敗:', error)
    return false
  }
}

/**
 * 發送通知給整個 workspace 的所有員工
 * 需要先取得員工列表再呼叫
 */
export async function sendNotificationToAll(
  employeeIds: string[],
  params: Omit<SendNotificationParams, 'recipient_id' | 'recipients'>
): Promise<boolean> {
  return sendNotification({ ...params, recipients: employeeIds })
}
