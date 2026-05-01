/**
 * Task Handlers
 * 預定義的任務處理器
 *
 * 注意：這些處理器目前為占位實作，回傳模擬結果。
 * 當 background_tasks 資料表建立後，將整合實際服務。
 */

import { registerTaskHandler, TaskTypes } from './task-queue'
import { logger } from '@/lib/utils/logger'

// ==================== 報表生成 ====================
interface GenerateReportPayload {
  reportType: string
  tourId?: string
  dateRange?: { start: string; end: string }
  format: 'pdf' | 'excel' | 'csv'
}

registerTaskHandler<GenerateReportPayload>(TaskTypes.GENERATE_REPORT, async (payload, task) => {
  logger.info('Generating report', { reportType: payload.reportType, taskId: task.id })

  // [Planned] 整合報表生成服務 (e.g., Puppeteer for PDF, ExcelJS for Excel)
  // 目前回傳模擬結果

  return {
    reportUrl: `/reports/${task.id}.${payload.format}`,
    generatedAt: new Date().toISOString(),
  }
})

// ==================== 發送郵件 ====================
interface SendEmailPayload {
  to: string | string[]
  subject: string
  body: string
  template?: string
  data?: Record<string, unknown>
}

registerTaskHandler<SendEmailPayload>(TaskTypes.SEND_EMAIL, async (payload, task) => {
  logger.info('Sending email', { to: payload.to, subject: payload.subject, taskId: task.id })

  // [Planned] 整合郵件服務 (e.g., Resend, SendGrid)
  // 目前回傳模擬結果

  return {
    sent: true,
    sentAt: new Date().toISOString(),
  }
})

// ==================== 發送通知 ====================
interface SendNotificationPayload {
  userId: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  link?: string
}

registerTaskHandler<SendNotificationPayload>(TaskTypes.SEND_NOTIFICATION, async (payload, task) => {
  logger.info('Sending notification', { userId: payload.userId, taskId: task.id })

  // [Planned] 整合即時通知 (e.g., Supabase Realtime, WebSocket)
  // 目前回傳模擬結果

  return {
    notified: true,
    notifiedAt: new Date().toISOString(),
  }
})

// ==================== 生成 PDF ====================
interface GeneratePDFPayload {
  templateId: string
  data: Record<string, unknown>
  filename?: string
}

registerTaskHandler<GeneratePDFPayload>(TaskTypes.GENERATE_PDF, async (payload, task) => {
  logger.info('Generating PDF', { templateId: payload.templateId, taskId: task.id })

  // [Planned] 整合 PDF 生成服務 (e.g., Puppeteer, pdf-lib)
  // 目前回傳模擬結果

  return {
    pdfUrl: `/pdfs/${task.id}.pdf`,
    generatedAt: new Date().toISOString(),
  }
})

// ==================== 資料同步 ====================
interface SyncDataPayload {
  source: string
  target: string
  entityType: string
  entityIds?: string[]
}

registerTaskHandler<SyncDataPayload>(TaskTypes.SYNC_DATA, async (payload, task) => {
  logger.info('Syncing data', { source: payload.source, target: payload.target, taskId: task.id })

  // [Planned] 整合外部系統資料同步 (e.g., Google Calendar, CRM)
  // 目前回傳模擬結果

  return {
    synced: true,
    syncedAt: new Date().toISOString(),
    recordsProcessed: payload.entityIds?.length || 0,
  }
})

// ==================== 清理舊資料 ====================
interface CleanupOldDataPayload {
  tableName: string
  olderThanDays: number
  dryRun?: boolean
}

registerTaskHandler<CleanupOldDataPayload>(TaskTypes.CLEANUP_OLD_DATA, async (payload, task) => {
  logger.info('Cleaning up old data', { tableName: payload.tableName, taskId: task.id })

  // [Planned] 實作資料清理排程
  // 注意：危險操作，需啟用 dry-run 模式測試
  // 目前回傳模擬結果

  return {
    cleaned: true,
    cleanedAt: new Date().toISOString(),
    recordsDeleted: 0,
    dryRun: payload.dryRun || false,
  }
})

// 導出所有已註冊的處理器（用於檢查）
const taskHandlers = {
  [TaskTypes.GENERATE_REPORT]: true,
  [TaskTypes.SEND_EMAIL]: true,
  [TaskTypes.SEND_NOTIFICATION]: true,
  [TaskTypes.GENERATE_PDF]: true,
  [TaskTypes.SYNC_DATA]: true,
  [TaskTypes.CLEANUP_OLD_DATA]: true,
}
