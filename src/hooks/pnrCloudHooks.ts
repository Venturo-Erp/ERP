'use client'

/**
 * PNR Enhancement Cloud Hooks
 * 2025-12-29
 *
 * 提供 PNR 相關資料表的 SWR Hooks
 */

import useSWR, { mutate } from 'swr'
import { useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { getCurrentWorkspaceId } from '@/lib/workspace-helpers'
import type { Database } from '@/lib/supabase/types'
import type { QueueStats, QueueType, QueueStatus } from '@/types/pnr.types'
import { createPnrFareHistory, invalidatePnrFareHistory } from '@/data/entities/pnr-fare-history'
import {
  createPnrFareAlert,
  updatePnrFareAlert,
  deletePnrFareAlert,
  invalidatePnrFareAlerts,
} from '@/data/entities/pnr-fare-alerts'
import {
  createPnrFlightStatusHistory,
  invalidatePnrFlightStatusHistory,
} from '@/data/entities/pnr-flight-status'
import {
  createPnrQueueItem,
  updatePnrQueueItem,
  deletePnrQueueItem,
  invalidatePnrQueueItems,
} from '@/data/entities/pnr-queue-items'
import {
  createPnrScheduleChange,
  updatePnrScheduleChange,
  invalidatePnrScheduleChanges,
} from '@/data/entities/pnr-schedule-changes'
import { createPnrAiQuery, invalidatePnrAiQueries } from '@/data/entities/pnr-ai-queries'

// Supabase 表格類型
type PnrFareHistory = Database['public']['Tables']['pnr_fare_history']['Row']
type PnrFareHistoryInsert = Database['public']['Tables']['pnr_fare_history']['Insert']
type PnrFareAlert = Database['public']['Tables']['pnr_fare_alerts']['Row']
type PnrFareAlertInsert = Database['public']['Tables']['pnr_fare_alerts']['Insert']
type PnrFlightStatusHistory = Database['public']['Tables']['pnr_flight_status_history']['Row']
type PnrFlightStatusHistoryInsert =
  Database['public']['Tables']['pnr_flight_status_history']['Insert']
type PnrQueueItem = Database['public']['Tables']['pnr_queue_items']['Row']
type PnrQueueItemInsert = Database['public']['Tables']['pnr_queue_items']['Insert']
type PnrScheduleChange = Database['public']['Tables']['pnr_schedule_changes']['Row']
type PnrScheduleChangeInsert = Database['public']['Tables']['pnr_schedule_changes']['Insert']
type PnrAiQuery = Database['public']['Tables']['pnr_ai_queries']['Row']
type PnrAiQueryInsert = Database['public']['Tables']['pnr_ai_queries']['Insert']

// 重新匯出類型供外部使用
export type {
  PnrFareHistory,
  PnrFareAlert,
  PnrFlightStatusHistory,
  PnrQueueItem,
  PnrScheduleChange,
  PnrAiQuery,
}

// 使用 @/lib/workspace-helpers 的 getCurrentWorkspaceId

// =====================================================
// 票價歷史 Hook
// =====================================================
export function usePnrFareHistory(pnrId?: string) {
  const workspaceId = getCurrentWorkspaceId()

  const fetcher = async (): Promise<PnrFareHistory[]> => {
    let query = supabase
      .from('pnr_fare_history')
      .select(
        'id, pnr_id, base_fare, taxes, total_fare, currency, fare_basis, source, raw_fare_data, recorded_at, recorded_by, workspace_id, created_at'
      )
      .order('recorded_at', { ascending: false })
      .limit(500)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    if (pnrId) {
      query = query.eq('pnr_id', pnrId)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      logger.error('[pnr_fare_history] Supabase error:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  const swrKey = pnrId ? `pnr_fare_history:${pnrId}` : 'pnr_fare_history'
  const { data: items = [], error, isLoading } = useSWR<PnrFareHistory[]>(swrKey, fetcher)

  const create = useCallback(
    async (data: Omit<PnrFareHistoryInsert, 'id' | 'created_at'>) => {
      const result = await createPnrFareHistory(data as Parameters<typeof createPnrFareHistory>[0])
      mutate(swrKey)
      await invalidatePnrFareHistory()
      return result as unknown as PnrFareHistory
    },
    [swrKey]
  )

  return { items, isLoading, error, create, refetch: () => mutate(swrKey) }
}

// =====================================================
// 票價警報 Hook
// =====================================================
export function usePnrFareAlerts(pnrId?: string) {
  const workspaceId = getCurrentWorkspaceId()

  const fetcher = async (): Promise<PnrFareAlert[]> => {
    let query = supabase
      .from('pnr_fare_alerts')
      .select(
        'id, pnr_id, alert_type, threshold_amount, threshold_percent, last_fare, is_active, last_checked_at, notify_employee_ids, notify_channel_id, workspace_id, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(500)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    if (pnrId) {
      query = query.eq('pnr_id', pnrId)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      logger.error('[pnr_fare_alerts] Supabase error:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  const swrKey = pnrId ? `pnr_fare_alerts:${pnrId}` : 'pnr_fare_alerts'
  const { data: items = [], error, isLoading } = useSWR<PnrFareAlert[]>(swrKey, fetcher)

  const create = useCallback(
    async (data: Omit<PnrFareAlertInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await createPnrFareAlert(data as Parameters<typeof createPnrFareAlert>[0])
      mutate(swrKey)
      await invalidatePnrFareAlerts()
      return result as unknown as PnrFareAlert
    },
    [swrKey]
  )

  const update = useCallback(
    async (id: string, updates: Partial<PnrFareAlert>) => {
      await updatePnrFareAlert(id, updates as Parameters<typeof updatePnrFareAlert>[1])
      mutate(swrKey)
      await invalidatePnrFareAlerts()
    },
    [swrKey]
  )

  const remove = useCallback(
    async (id: string) => {
      await deletePnrFareAlert(id)
      mutate(swrKey)
      await invalidatePnrFareAlerts()
    },
    [swrKey]
  )

  return { items, isLoading, error, create, update, delete: remove, refetch: () => mutate(swrKey) }
}

// =====================================================
// 航班狀態歷史 Hook
// =====================================================
export function usePnrFlightStatusHistory(pnrId?: string) {
  const workspaceId = getCurrentWorkspaceId()

  const fetcher = async (): Promise<PnrFlightStatusHistory[]> => {
    let query = supabase
      .from('pnr_flight_status_history')
      .select(
        'id, pnr_id, segment_id, flight_number, airline_code, flight_date, operational_status, booking_status, delay_minutes, gate_info, new_departure_time, new_arrival_time, external_data, source, remarks, recorded_at, workspace_id'
      )
      .order('recorded_at', { ascending: false })
      .limit(500)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    if (pnrId) {
      query = query.eq('pnr_id', pnrId)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      logger.error('[pnr_flight_status_history] Supabase error:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  const swrKey = pnrId ? `pnr_flight_status_history:${pnrId}` : 'pnr_flight_status_history'
  const { data: items = [], error, isLoading } = useSWR<PnrFlightStatusHistory[]>(swrKey, fetcher)

  const create = useCallback(
    async (data: Omit<PnrFlightStatusHistoryInsert, 'id' | 'recorded_at'>) => {
      const result = await createPnrFlightStatusHistory(
        data as unknown as Parameters<typeof createPnrFlightStatusHistory>[0]
      )
      mutate(swrKey)
      await invalidatePnrFlightStatusHistory()
      return result as unknown as PnrFlightStatusHistory
    },
    [swrKey]
  )

  return { items, isLoading, error, create, refetch: () => mutate(swrKey) }
}

// =====================================================
// PNR Queue Hook（核心 Hook）
// =====================================================
export function usePnrQueue(options?: {
  pnrId?: string
  status?: QueueStatus
  queueType?: QueueType
}) {
  const workspaceId = getCurrentWorkspaceId()

  const fetcher = async (): Promise<PnrQueueItem[]> => {
    let query = supabase
      .from('pnr_queue_items')
      .select(
        'id, pnr_id, queue_type, status, priority, title, description, due_date, assigned_to, completed_at, completed_by, resolution_notes, reminder_at, metadata, workspace_id, created_at, created_by, updated_at'
      )
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .limit(500)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    if (options?.pnrId) {
      query = query.eq('pnr_id', options.pnrId)
    }

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.queueType) {
      query = query.eq('queue_type', options.queueType)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      logger.error('[pnr_queue_items] Supabase error:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  const swrKey = `pnr_queue_items:${JSON.stringify(options || {})}`
  const { data: items = [], error, isLoading } = useSWR<PnrQueueItem[]>(swrKey, fetcher)

  // 計算統計
  const stats = useMemo<QueueStats>(() => {
    const pending = items.filter(i => i.status === 'pending')
    const now = new Date()

    return {
      pendingTicket: pending.filter(i => i.queue_type === 'pending_ticket').length,
      pendingConfirm: pending.filter(i => i.queue_type === 'pending_confirm').length,
      scheduleChange: pending.filter(i => i.queue_type === 'schedule_change').length,
      ssrPending: pending.filter(i => i.queue_type === 'ssr_pending').length,
      revalidation: pending.filter(i => i.queue_type === 'revalidation').length,
      reissue: pending.filter(i => i.queue_type === 'reissue').length,
      overdue: pending.filter(i => i.due_date && new Date(i.due_date) < now).length,
      total: pending.length,
    }
  }, [items])

  const create = useCallback(
    async (data: Omit<PnrQueueItemInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await createPnrQueueItem(data as Parameters<typeof createPnrQueueItem>[0])
      mutate(swrKey)
      await invalidatePnrQueueItems()
      return result as unknown as PnrQueueItem
    },
    [swrKey]
  )

  const update = useCallback(
    async (id: string, updates: Partial<PnrQueueItem>) => {
      const { id: _id, created_at: _ca, ...clean_updates } = updates as Record<string, unknown>
      await updatePnrQueueItem(id, clean_updates as Parameters<typeof updatePnrQueueItem>[1])
      mutate(swrKey)
      await invalidatePnrQueueItems()
    },
    [swrKey]
  )

  const complete = useCallback(
    async (id: string, notes?: string, completedBy?: string) => {
      await updatePnrQueueItem(id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: completedBy,
        resolution_notes: notes,
      } as Parameters<typeof updatePnrQueueItem>[1])
      mutate(swrKey)
      await invalidatePnrQueueItems()
    },
    [swrKey]
  )

  const remove = useCallback(
    async (id: string) => {
      await deletePnrQueueItem(id)
      mutate(swrKey)
      await invalidatePnrQueueItems()
    },
    [swrKey]
  )

  return {
    items,
    stats,
    isLoading,
    error,
    create,
    update,
    complete,
    delete: remove,
    refetch: () => mutate(swrKey),
  }
}

// =====================================================
// 航變追蹤 Hook
// =====================================================
export function usePnrScheduleChanges(options?: { pnrId?: string; status?: string }) {
  const workspaceId = getCurrentWorkspaceId()

  const fetcher = async (): Promise<PnrScheduleChange[]> => {
    let query = supabase
      .from('pnr_schedule_changes')
      .select(
        'id, pnr_id, segment_id, change_type, original_flight_number, new_flight_number, original_departure_date, new_departure_date, original_departure_time, new_departure_time, original_arrival_time, new_arrival_time, detected_at, processed_at, processed_by, status, requires_reissue, requires_revalidation, requires_refund, notes, workspace_id, created_at, updated_at'
      )
      .order('detected_at', { ascending: false })
      .limit(500)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    if (options?.pnrId) {
      query = query.eq('pnr_id', options.pnrId)
    }

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      logger.error('[pnr_schedule_changes] Supabase error:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  const swrKey = `pnr_schedule_changes:${JSON.stringify(options || {})}`
  const { data: items = [], error, isLoading } = useSWR<PnrScheduleChange[]>(swrKey, fetcher)

  const create = useCallback(
    async (
      data: Omit<PnrScheduleChangeInsert, 'id' | 'created_at' | 'updated_at' | 'detected_at'>
    ) => {
      const result = await createPnrScheduleChange({
        ...data,
        detected_at: new Date().toISOString(),
      } as Parameters<typeof createPnrScheduleChange>[0])
      mutate(swrKey)
      await invalidatePnrScheduleChanges()
      return result as unknown as PnrScheduleChange
    },
    [swrKey]
  )

  const update = useCallback(
    async (id: string, updates: Partial<PnrScheduleChange>) => {
      const {
        id: _id,
        created_at: _ca,
        detected_at: _da,
        ...clean_updates
      } = updates as Record<string, unknown>
      await updatePnrScheduleChange(
        id,
        clean_updates as Parameters<typeof updatePnrScheduleChange>[1]
      )
      mutate(swrKey)
      await invalidatePnrScheduleChanges()
    },
    [swrKey]
  )

  return { items, isLoading, error, create, update, refetch: () => mutate(swrKey) }
}

// =====================================================
// AI 查詢 Hook
// =====================================================
export function usePnrAiQueries(pnrId?: string) {
  const workspaceId = getCurrentWorkspaceId()

  const fetcher = async (): Promise<PnrAiQuery[]> => {
    let query = supabase
      .from('pnr_ai_queries')
      .select(
        'id, pnr_id, query_text, response_text, query_context, response_metadata, queried_by, workspace_id, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(50) // 只保留最近 50 筆

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    if (pnrId) {
      query = query.eq('pnr_id', pnrId)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      logger.error('[pnr_ai_queries] Supabase error:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  const swrKey = pnrId ? `pnr_ai_queries:${pnrId}` : 'pnr_ai_queries'
  const { data: items = [], error, isLoading } = useSWR<PnrAiQuery[]>(swrKey, fetcher)

  const create = useCallback(
    async (data: Omit<PnrAiQueryInsert, 'id' | 'created_at'>) => {
      const result = await createPnrAiQuery(data as Parameters<typeof createPnrAiQuery>[0])
      mutate(swrKey)
      await invalidatePnrAiQueries()
      return result as unknown as PnrAiQuery
    },
    [swrKey]
  )

  return { items, isLoading, error, create, refetch: () => mutate(swrKey) }
}

// =====================================================
// 票價監控 Hook（整合票價歷史 + 變化計算）
// =====================================================
export function usePnrFareMonitor(pnrId: string) {
  const { items: fareHistory, isLoading, error, create } = usePnrFareHistory(pnrId)

  const currentFare = useMemo(() => fareHistory[0]?.total_fare || null, [fareHistory])
  const previousFare = useMemo(() => fareHistory[1]?.total_fare || null, [fareHistory])

  const priceChange = useMemo(() => {
    if (currentFare === null || previousFare === null) return null
    const amount = currentFare - previousFare
    const percent = (amount / previousFare) * 100
    return { amount, percent }
  }, [currentFare, previousFare])

  return {
    fareHistory,
    currentFare,
    previousFare,
    priceChange,
    isLoading,
    error,
    recordFare: create,
  }
}
