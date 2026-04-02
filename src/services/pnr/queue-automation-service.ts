/**
 * PNR Queue 自動化服務
 *
 * 功能：
 * 1. 自動評估 PNR 並建立 Queue 項目
 * 2. Queue 項目管理（CRUD）
 * 3. 計算 Queue 統計資訊
 * 4. 到期提醒處理
 */

import { supabase } from '@/lib/supabase/client'
import { getRequiredWorkspaceId } from '@/lib/workspace-context'
import { logger } from '@/lib/utils/logger'
import { formatDateChinese } from '@/lib/utils/format-date'
import type { Database } from '@/lib/supabase/types'
import type {
  PNR,
  PNRSegment,
  QueueType,
  QueueStatus,
  QueueStats,
  QUEUE_TYPE_LABELS,
} from '@/types/pnr.types'

type PnrQueueItem = Database['public']['Tables']['pnr_queue_items']['Row']
type PnrQueueItemInsert = Database['public']['Tables']['pnr_queue_items']['Insert']

// =====================================================
// Auto-detection Rules
// =====================================================

export interface QueueRule {
  type: QueueType
  title: string
  priority: number
  check: (pnr: PNR) => boolean
  getDueDate?: (pnr: PNR) => Date | null
  getDescription?: (pnr: PNR) => string
}

/**
 * 自動偵測規則定義
 */
export const QUEUE_RULES: QueueRule[] = [
  {
    type: 'pending_ticket',
    title: '待開票',
    priority: 10,
    check: pnr => pnr.status === 'active' && pnr.ticketing_deadline !== null && !isTicketed(pnr),
    getDueDate: pnr => (pnr.ticketing_deadline ? new Date(pnr.ticketing_deadline) : null),
    getDescription: pnr =>
      `出票期限: ${pnr.ticketing_deadline ? formatDate(pnr.ticketing_deadline) : '未知'}`,
  },
  {
    type: 'pending_confirm',
    title: '待確認',
    priority: 8,
    check: pnr =>
      pnr.segments?.some((s: PNRSegment) => s.status === 'UC' || s.status === 'UN') ?? false,
    getDescription: pnr => {
      const ucSegments = pnr.segments?.filter(
        (s: PNRSegment) => s.status === 'UC' || s.status === 'UN'
      )
      return `待確認航段: ${ucSegments?.map((s: PNRSegment) => `${s.airline}${s.flightNumber}`).join(', ')}`
    },
  },
  {
    type: 'ssr_pending',
    title: 'SSR 未確認',
    priority: 6,
    check: pnr => {
      // 檢查是否有未確認的 SSR
      if (!pnr.special_requests) return false
      return pnr.special_requests.some(ssr => ssr.raw?.includes('UN') || ssr.raw?.includes('NN'))
    },
    getDescription: () => 'SSR 請求尚未被航空公司確認',
  },
  {
    type: 'schedule_change',
    title: '航變處理',
    priority: 9,
    check: pnr => {
      // 透過 PNR 的 has_schedule_change 欄位判斷
      return (pnr as PNR & { has_schedule_change?: boolean }).has_schedule_change === true
    },
    getDescription: () => '航班有變更，需要處理',
  },
  {
    type: 'seat_request',
    title: '座位請求',
    priority: 4,
    check: pnr => {
      if (!pnr.special_requests) return false
      return pnr.special_requests.some(
        ssr => ssr.category === 'SEAT' && (ssr.raw?.includes('RQ') || ssr.raw?.includes('NN'))
      )
    },
    getDescription: () => '座位請求待處理',
  },
]

// =====================================================
// Queue Item Operations
// =====================================================

/**
 * 評估 PNR 並建立自動 Queue 項目
 */
export async function evaluatePnrForQueues(
  pnr: PNR,
  options?: {
    createdBy?: string
    skipExisting?: boolean
  }
): Promise<PnrQueueItem[]> {
  const createdItems: PnrQueueItem[] = []

  for (const rule of QUEUE_RULES) {
    if (!rule.check(pnr)) continue

    // 檢查是否已存在相同類型的未完成項目
    if (options?.skipExisting !== false) {
      const existing = await getExistingQueueItem(pnr.id, rule.type)
      if (existing) {
        logger.log(`[Queue] Skipping ${rule.type} for PNR ${pnr.record_locator}: already exists`)
        continue
      }
    }

    // 建立 Queue 項目
    const item = await createQueueItem(pnr.id, rule.type, {
      title: rule.title,
      description: rule.getDescription?.(pnr),
      priority: rule.priority,
      dueDate: rule.getDueDate?.(pnr) || null,
      createdBy: options?.createdBy,
    })

    if (item) {
      createdItems.push(item)
    }
  }

  // 更新 PNR 的 queue_count
  await updatePnrQueueCount(pnr.id)

  return createdItems
}

/**
 * 建立 Queue 項目
 */
export async function createQueueItem(
  pnrId: string,
  queueType: QueueType,
  options?: {
    title?: string
    description?: string
    priority?: number
    dueDate?: Date | null
    reminderAt?: Date | null
    assignedTo?: string
    metadata?: Record<string, unknown>
    createdBy?: string
  }
): Promise<PnrQueueItem | null> {
  try {
    const queueItem: PnrQueueItemInsert = {
      pnr_id: pnrId,
      workspace_id: getRequiredWorkspaceId(),
      queue_type: queueType,
      title: options?.title || getDefaultTitle(queueType),
      description: options?.description || null,
      priority: options?.priority || 0,
      due_date: options?.dueDate?.toISOString() || null,
      reminder_at: options?.reminderAt?.toISOString() || null,
      assigned_to: options?.assignedTo || null,
      status: 'pending',
      metadata: options?.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
      created_by: options?.createdBy || null,
    }

    const { data, error } = await supabase
      .from('pnr_queue_items')
      .insert(queueItem)
      .select()
      .single()

    if (error) {
      logger.error('[Queue] Failed to create queue item:', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('[Queue] Error creating queue item:', err)
    return null
  }
}

/**
 * 更新 Queue 項目狀態
 */
export async function updateQueueItemStatus(
  itemId: string,
  status: QueueStatus,
  options?: {
    completedBy?: string
    resolutionNotes?: string
  }
): Promise<boolean> {
  try {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
      updates.completed_by = options?.completedBy || null
      updates.resolution_notes = options?.resolutionNotes || null
    }

    const { error } = await supabase.from('pnr_queue_items').update(updates).eq('id', itemId)

    if (error) {
      logger.error('[Queue] Failed to update queue item:', error)
      return false
    }

    // 取得 pnr_id 並更新計數
    const { data: item } = await supabase
      .from('pnr_queue_items')
      .select('pnr_id')
      .eq('id', itemId)
      .single()

    if (item) {
      await updatePnrQueueCount(item.pnr_id)
    }

    return true
  } catch (err) {
    logger.error('[Queue] Error updating queue item:', err)
    return false
  }
}

/**
 * 完成 Queue 項目
 */
export async function completeQueueItem(
  itemId: string,
  options?: {
    completedBy?: string
    resolutionNotes?: string
  }
): Promise<boolean> {
  return updateQueueItemStatus(itemId, 'completed', options)
}

/**
 * 取消 Queue 項目
 */
export async function cancelQueueItem(itemId: string, notes?: string): Promise<boolean> {
  return updateQueueItemStatus(itemId, 'cancelled', { resolutionNotes: notes })
}

/**
 * 指派 Queue 項目
 */
export async function assignQueueItem(itemId: string, assignedTo: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pnr_queue_items')
      .update({
        assigned_to: assignedTo,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (error) {
      logger.error('[Queue] Failed to assign queue item:', error)
      return false
    }

    return true
  } catch (err) {
    logger.error('[Queue] Error assigning queue item:', err)
    return false
  }
}

// =====================================================
// Query Operations
// =====================================================

/**
 * 取得 PNR 的 Queue 項目
 */
export async function getPnrQueueItems(
  pnrId: string,
  options?: {
    status?: QueueStatus | QueueStatus[]
    queueType?: QueueType
  }
): Promise<PnrQueueItem[]> {
  try {
    let query = supabase
      .from('pnr_queue_items')
      .select('id, pnr_id, queue_type, status, priority, title, description, due_date, assigned_to, completed_at, completed_by, resolution_notes, reminder_at, metadata, workspace_id, created_at, created_by, updated_at')
      .eq('pnr_id', pnrId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)

    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status)
      } else {
        query = query.eq('status', options.status)
      }
    }

    if (options?.queueType) {
      query = query.eq('queue_type', options.queueType)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[Queue] Failed to get queue items:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[Queue] Error getting queue items:', err)
    return []
  }
}

/**
 * 取得 Workspace 的待處理項目
 */
export async function getDueItems(options?: {
  assignedTo?: string
  queueType?: QueueType
  limit?: number
}): Promise<PnrQueueItem[]> {
  try {
    const now = new Date().toISOString()

    let query = supabase
      .from('pnr_queue_items')
      .select('id, pnr_id, queue_type, status, priority, title, description, due_date, assigned_to, completed_at, completed_by, resolution_notes, reminder_at, metadata, workspace_id, created_at, created_by, updated_at')
      .in('status', ['pending', 'in_progress'])
      .or(`due_date.is.null,due_date.lte.${now}`)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(500)

    if (options?.assignedTo) {
      query = query.eq('assigned_to', options.assignedTo)
    }

    if (options?.queueType) {
      query = query.eq('queue_type', options.queueType)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[Queue] Failed to get due items:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[Queue] Error getting due items:', err)
    return []
  }
}

/**
 * 取得逾期項目
 */
export async function getOverdueItems(limit: number = 50): Promise<PnrQueueItem[]> {
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('pnr_queue_items')
      .select('id, pnr_id, queue_type, status, priority, title, description, due_date, assigned_to, completed_at, completed_by, resolution_notes, reminder_at, metadata, workspace_id, created_at, created_by, updated_at')
      .in('status', ['pending', 'in_progress'])
      .not('due_date', 'is', null)
      .lt('due_date', now)
      .order('due_date', { ascending: true })
      .limit(limit)

    if (error) {
      logger.error('[Queue] Failed to get overdue items:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[Queue] Error getting overdue items:', err)
    return []
  }
}

/**
 * 計算 Queue 統計資訊
 */
export async function getQueueStats(): Promise<QueueStats> {
  const stats: QueueStats = {
    pendingTicket: 0,
    pendingConfirm: 0,
    scheduleChange: 0,
    ssrPending: 0,
    revalidation: 0,
    reissue: 0,
    overdue: 0,
    total: 0,
  }

  try {
    const now = new Date().toISOString()

    // 取得所有待處理項目
    const { data, error } = await supabase
      .from('pnr_queue_items')
      .select('queue_type, due_date')
      .in('status', ['pending', 'in_progress'])

    if (error) {
      logger.error('[Queue] Failed to get queue stats:', error)
      return stats
    }

    if (!data) return stats

    for (const item of data) {
      stats.total++

      // 檢查是否逾期
      if (item.due_date && item.due_date < now) {
        stats.overdue++
      }

      // 按類型計數
      switch (item.queue_type) {
        case 'pending_ticket':
          stats.pendingTicket++
          break
        case 'pending_confirm':
          stats.pendingConfirm++
          break
        case 'schedule_change':
          stats.scheduleChange++
          break
        case 'ssr_pending':
          stats.ssrPending++
          break
        case 'revalidation':
          stats.revalidation++
          break
        case 'reissue':
          stats.reissue++
          break
      }
    }

    return stats
  } catch (err) {
    logger.error('[Queue] Error getting queue stats:', err)
    return stats
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * 檢查是否已有相同類型的未完成 Queue 項目
 */
async function getExistingQueueItem(
  pnrId: string,
  queueType: QueueType
): Promise<PnrQueueItem | null> {
  try {
    const { data, error } = await supabase
      .from('pnr_queue_items')
      .select('id, pnr_id, queue_type, status, priority, title, description, due_date, assigned_to, completed_at, completed_by, resolution_notes, reminder_at, metadata, workspace_id, created_at, created_by, updated_at')
      .eq('pnr_id', pnrId)
      .eq('queue_type', queueType)
      .in('status', ['pending', 'in_progress'])
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      return null
    }

    return data
  } catch {
    return null
  }
}

/**
 * 更新 PNR 的 queue_count
 */
async function updatePnrQueueCount(pnrId: string): Promise<void> {
  try {
    // 計算未完成的 Queue 項目數量
    const { count, error } = await supabase
      .from('pnr_queue_items')
      .select('*', { count: 'exact', head: true })
      .eq('pnr_id', pnrId)
      .in('status', ['pending', 'in_progress'])

    if (error) {
      logger.error('[Queue] Failed to count queue items:', error)
      return
    }

    // 更新 PNR
    await supabase
      .from('pnr_records')
      .update({
        queue_count: count || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pnrId)
  } catch (err) {
    logger.error('[Queue] Error updating PNR queue count:', err)
  }
}

/**
 * 取得預設標題
 */
function getDefaultTitle(queueType: QueueType): string {
  const labels: Record<string, string> = {
    pending_ticket: '待開票',
    pending_confirm: '待確認',
    schedule_change: '航變處理',
    name_correction: '姓名更正',
    seat_request: '座位請求',
    ssr_pending: 'SSR 未確認',
    revalidation: '需 Revalidation',
    reissue: '需 Reissue',
    refund: '退票處理',
    custom: '自訂任務',
  }
  return labels[queueType] || queueType
}

/**
 * 檢查 PNR 是否已開票
 */
function isTicketed(pnr: PNR): boolean {
  return (
    pnr.status === 'ticketed' ||
    pnr.segments?.every((s: PNRSegment) => s.status === 'TK') ||
    (pnr as PNR & { ticket_issued_at?: string }).ticket_issued_at != null
  )
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return formatDateChinese(date)
  } catch {
    return dateStr
  }
}

export default {
  QUEUE_RULES,
  evaluatePnrForQueues,
  createQueueItem,
  updateQueueItemStatus,
  completeQueueItem,
  cancelQueueItem,
  assignQueueItem,
  getPnrQueueItems,
  getDueItems,
  getOverdueItems,
  getQueueStats,
}
