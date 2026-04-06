/**
 * PNR Revalidation 追蹤服務
 *
 * 功能：
 * 1. 偵測航變（Schedule Changes）
 * 2. 評估影響（是否需要 Revalidation/Reissue/Refund）
 * 3. 建立和管理航變記錄
 * 4. 追蹤處理狀態
 */

import { supabase } from '@/lib/supabase/client'
import { getRequiredWorkspaceId } from '@/lib/workspace-context'
import { logger } from '@/lib/utils/logger'
import type { Database } from '@/lib/supabase/types'
import type {
  PNRSegment,
  ScheduleChangeType,
  ScheduleChangeStatus,
  SCHEDULE_CHANGE_TYPE_LABELS,
  SCHEDULE_CHANGE_STATUS_LABELS,
} from '@/types/pnr.types'

type PnrScheduleChange = Database['public']['Tables']['pnr_schedule_changes']['Row']
type PnrScheduleChangeInsert = Database['public']['Tables']['pnr_schedule_changes']['Insert']

// =====================================================
// Schedule Change Detection
// =====================================================

export interface DetectedScheduleChange {
  segment: PNRSegment
  changeType: ScheduleChangeType
  originalFlightNumber: string | null
  originalDepartureTime: string | null
  originalDepartureDate: string | null
  originalArrivalTime: string | null
  newFlightNumber: string | null
  newDepartureTime: string | null
  newDepartureDate: string | null
  newArrivalTime: string | null
  requiresRevalidation: boolean
  requiresReissue: boolean
  requiresRefund: boolean
  severity: 'minor' | 'major' | 'critical'
  description: string
}

/**
 * 偵測航變
 */
export function detectScheduleChanges(
  oldSegments: PNRSegment[],
  newSegments: PNRSegment[]
): DetectedScheduleChange[] {
  const changes: DetectedScheduleChange[] = []

  for (const newSeg of newSegments) {
    // 根據航段順序和日期尋找對應的舊航段
    const oldSeg = oldSegments.find(
      s =>
        s.lineNumber === newSeg.lineNumber ||
        (s.origin === newSeg.origin &&
          s.destination === newSeg.destination &&
          s.departureDate === newSeg.departureDate)
    )

    if (!oldSeg) continue

    // 檢查航班號變更
    if (oldSeg.airline !== newSeg.airline || oldSeg.flightNumber !== newSeg.flightNumber) {
      const change = createScheduleChange(oldSeg, newSeg, 'flight_change')
      changes.push(change)
      continue
    }

    // 檢查日期變更
    if (oldSeg.departureDate !== newSeg.departureDate) {
      const change = createScheduleChange(oldSeg, newSeg, 'time_change')
      change.severity = 'major'
      change.requiresRevalidation = true
      changes.push(change)
      continue
    }

    // 檢查時間變更（需要解析 HHMM 格式）
    const oldDepTime = oldSeg.departureTime
    const newDepTime = newSeg.departureTime
    const oldArrTime = oldSeg.arrivalTime
    const newArrTime = newSeg.arrivalTime

    if (oldDepTime && newDepTime && oldDepTime !== newDepTime) {
      const timeDiff = calculateTimeDifference(oldDepTime, newDepTime)
      const change = createScheduleChange(oldSeg, newSeg, 'time_change')

      // 時間變更超過 2 小時視為重大變更
      if (Math.abs(timeDiff) >= 120) {
        change.severity = 'major'
        change.requiresRevalidation = true
      } else if (Math.abs(timeDiff) >= 60) {
        change.severity = 'minor'
      }

      change.description = `出發時間變更: ${formatTime(oldDepTime)} → ${formatTime(newDepTime)} (${timeDiff > 0 ? '+' : ''}${timeDiff}分鐘)`
      changes.push(change)
    }

    // 檢查航班取消
    if (newSeg.status === 'XX' || newSeg.status === 'SC') {
      if (oldSeg.status !== 'XX' && oldSeg.status !== 'SC') {
        const change = createScheduleChange(oldSeg, newSeg, 'cancellation')
        change.severity = 'critical'
        change.requiresRevalidation = true
        change.requiresReissue = true
        change.description = '航班已取消'
        changes.push(change)
      }
    }
  }

  // 檢查被移除的航段（可能是航線變更）
  for (const oldSeg of oldSegments) {
    const stillExists = newSegments.find(
      s =>
        s.lineNumber === oldSeg.lineNumber ||
        (s.origin === oldSeg.origin && s.destination === oldSeg.destination)
    )

    if (!stillExists) {
      changes.push({
        segment: oldSeg,
        changeType: 'route_change',
        originalFlightNumber: `${oldSeg.airline}${oldSeg.flightNumber}`,
        originalDepartureTime: oldSeg.departureTime || null,
        originalDepartureDate: oldSeg.departureDate,
        originalArrivalTime: oldSeg.arrivalTime || null,
        newFlightNumber: null,
        newDepartureTime: null,
        newDepartureDate: null,
        newArrivalTime: null,
        requiresRevalidation: true,
        requiresReissue: true,
        requiresRefund: false,
        severity: 'critical',
        description: `航段 ${oldSeg.origin}-${oldSeg.destination} 已被移除`,
      })
    }
  }

  return changes
}

/**
 * 建立航變物件
 */
function createScheduleChange(
  oldSeg: PNRSegment,
  newSeg: PNRSegment,
  changeType: ScheduleChangeType
): DetectedScheduleChange {
  return {
    segment: newSeg,
    changeType,
    originalFlightNumber: `${oldSeg.airline}${oldSeg.flightNumber}`,
    originalDepartureTime: oldSeg.departureTime || null,
    originalDepartureDate: oldSeg.departureDate,
    originalArrivalTime: oldSeg.arrivalTime || null,
    newFlightNumber: `${newSeg.airline}${newSeg.flightNumber}`,
    newDepartureTime: newSeg.departureTime || null,
    newDepartureDate: newSeg.departureDate,
    newArrivalTime: newSeg.arrivalTime || null,
    requiresRevalidation: changeType === 'flight_change' || changeType === 'route_change',
    requiresReissue: changeType === 'route_change' || changeType === 'cancellation',
    requiresRefund: false,
    severity: changeType === 'cancellation' ? 'critical' : 'minor',
    description: getChangeDescription(changeType, oldSeg, newSeg),
  }
}

/**
 * 取得變更描述
 */
function getChangeDescription(
  changeType: ScheduleChangeType,
  oldSeg: PNRSegment,
  newSeg: PNRSegment
): string {
  switch (changeType) {
    case 'flight_change':
      return `航班號變更: ${oldSeg.airline}${oldSeg.flightNumber} → ${newSeg.airline}${newSeg.flightNumber}`
    case 'time_change':
      return `時間變更: ${oldSeg.departureDate} ${oldSeg.departureTime || ''} → ${newSeg.departureDate} ${newSeg.departureTime || ''}`
    case 'route_change':
      return `航線變更: ${oldSeg.origin}-${oldSeg.destination}`
    case 'equipment_change':
      return `機型變更: ${oldSeg.aircraft || '未知'} → ${newSeg.aircraft || '未知'}`
    case 'cancellation':
      return `航班取消: ${oldSeg.airline}${oldSeg.flightNumber}`
    default:
      return '航班資訊變更'
  }
}

// =====================================================
// Impact Assessment
// =====================================================

export interface ImpactAssessment {
  revalidation: boolean
  reissue: boolean
  refund: boolean
  reason: string[]
}

/**
 * 評估航變影響
 */
export function assessImpact(change: DetectedScheduleChange): ImpactAssessment {
  const assessment: ImpactAssessment = {
    revalidation: false,
    reissue: false,
    refund: false,
    reason: [],
  }

  // 航班取消
  if (change.changeType === 'cancellation') {
    assessment.revalidation = true
    assessment.reissue = true
    assessment.reason.push('航班取消，需要重新訂位並重新開票')
    return assessment
  }

  // 航班號變更
  if (change.changeType === 'flight_change') {
    assessment.revalidation = true
    assessment.reason.push('航班號變更，需要 Revalidation')
  }

  // 航線變更
  if (change.changeType === 'route_change') {
    assessment.revalidation = true
    assessment.reissue = true
    assessment.reason.push('航線變更，需要 Reissue')
  }

  // 重大時間變更（超過2小時）
  if (change.severity === 'major' || change.severity === 'critical') {
    assessment.revalidation = true
    assessment.reason.push('時間變更超過2小時，可能需要 Revalidation')
  }

  // 如果需要 reissue，通常也需要 revalidation
  if (assessment.reissue && !assessment.revalidation) {
    assessment.revalidation = true
  }

  return assessment
}

// =====================================================
// Database Operations
// =====================================================

/**
 * 建立航變記錄
 */
export async function createScheduleChangeRecord(
  pnrId: string,
  change: DetectedScheduleChange,
  segmentId?: string
): Promise<PnrScheduleChange | null> {
  try {
    const record: PnrScheduleChangeInsert = {
      pnr_id: pnrId,
      workspace_id: getRequiredWorkspaceId(),
      segment_id: segmentId || null,
      change_type: change.changeType,
      original_flight_number: change.originalFlightNumber,
      original_departure_time: change.originalDepartureTime,
      original_departure_date: change.originalDepartureDate,
      original_arrival_time: change.originalArrivalTime,
      new_flight_number: change.newFlightNumber,
      new_departure_time: change.newDepartureTime,
      new_departure_date: change.newDepartureDate,
      new_arrival_time: change.newArrivalTime,
      requires_revalidation: change.requiresRevalidation,
      requires_reissue: change.requiresReissue,
      requires_refund: change.requiresRefund,
      status: 'pending',
      notes: change.description,
      detected_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('pnr_schedule_changes')
      .insert(record)
      .select()
      .single()

    if (error) {
      logger.error('[Revalidation] Failed to create schedule change record:', error)
      return null
    }

    // 更新 PNR 的 has_schedule_change 標記
    await updatePnrScheduleChangeFlag(pnrId, true)

    return data
  } catch (err) {
    logger.error('[Revalidation] Error creating schedule change record:', err)
    return null
  }
}

/**
 * 更新航變處理狀態
 */
export async function updateScheduleChangeStatus(
  changeId: string,
  status: ScheduleChangeStatus,
  options?: {
    processedBy?: string
    notes?: string
  }
): Promise<boolean> {
  try {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (['revalidated', 'reissued', 'refunded', 'cancelled'].includes(status)) {
      updates.processed_at = new Date().toISOString()
      updates.processed_by = options?.processedBy || null
    }

    if (options?.notes) {
      updates.notes = options.notes
    }

    const { error } = await supabase.from('pnr_schedule_changes').update(updates).eq('id', changeId)

    if (error) {
      logger.error('[Revalidation] Failed to update schedule change status:', error)
      return false
    }

    // 檢查是否所有航變都已處理
    const { data: change } = await supabase
      .from('pnr_schedule_changes')
      .select('pnr_id')
      .eq('id', changeId)
      .single()

    if (change) {
      await checkAndUpdatePnrScheduleChangeFlag(change.pnr_id)
    }

    return true
  } catch (err) {
    logger.error('[Revalidation] Error updating schedule change status:', err)
    return false
  }
}

/**
 * 取得 PNR 的航變記錄
 */
export async function getScheduleChanges(
  pnrId: string,
  options?: {
    status?: ScheduleChangeStatus | ScheduleChangeStatus[]
    unprocessedOnly?: boolean
  }
): Promise<PnrScheduleChange[]> {
  try {
    let query = supabase
      .from('pnr_schedule_changes')
      .select(
        'id, pnr_id, segment_id, change_type, original_flight_number, new_flight_number, original_departure_date, new_departure_date, original_departure_time, new_departure_time, original_arrival_time, new_arrival_time, detected_at, processed_at, processed_by, status, requires_reissue, requires_revalidation, requires_refund, notes, workspace_id, created_at, updated_at'
      )
      .eq('pnr_id', pnrId)
      .order('detected_at', { ascending: false })
      .limit(500)

    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status)
      } else {
        query = query.eq('status', options.status)
      }
    }

    if (options?.unprocessedOnly) {
      query = query.in('status', ['pending', 'contacted'])
    }

    const { data, error } = await query

    if (error) {
      logger.error('[Revalidation] Failed to get schedule changes:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[Revalidation] Error getting schedule changes:', err)
    return []
  }
}

/**
 * 取得待處理的航變記錄（全 workspace）
 */
export async function getPendingScheduleChanges(limit: number = 50): Promise<PnrScheduleChange[]> {
  try {
    const { data, error } = await supabase
      .from('pnr_schedule_changes')
      .select(
        'id, pnr_id, segment_id, change_type, original_flight_number, new_flight_number, original_departure_date, new_departure_date, original_departure_time, new_departure_time, original_arrival_time, new_arrival_time, detected_at, processed_at, processed_by, status, requires_reissue, requires_revalidation, requires_refund, notes, workspace_id, created_at, updated_at'
      )
      .in('status', ['pending', 'contacted'])
      .order('detected_at', { ascending: true })
      .limit(limit)

    if (error) {
      logger.error('[Revalidation] Failed to get pending schedule changes:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[Revalidation] Error getting pending schedule changes:', err)
    return []
  }
}

// =====================================================
// Process PNR Schedule Changes
// =====================================================

/**
 * 處理 PNR 更新時的航變偵測
 */
export async function processPnrScheduleChanges(
  pnrId: string,
  oldSegments: PNRSegment[],
  newSegments: PNRSegment[]
): Promise<{
  changesDetected: DetectedScheduleChange[]
  recordsCreated: number
}> {
  const result = {
    changesDetected: [] as DetectedScheduleChange[],
    recordsCreated: 0,
  }

  // 1. 偵測航變
  result.changesDetected = detectScheduleChanges(oldSegments, newSegments)

  if (result.changesDetected.length === 0) {
    return result
  }

  logger.log(
    `[Revalidation] Detected ${result.changesDetected.length} schedule change(s) for PNR ${pnrId}`
  )

  // 2. 建立航變記錄
  for (const change of result.changesDetected) {
    const record = await createScheduleChangeRecord(pnrId, change)
    if (record) {
      result.recordsCreated++
    }
  }

  return result
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * 更新 PNR 的 has_schedule_change 標記
 */
async function updatePnrScheduleChangeFlag(pnrId: string, hasChange: boolean): Promise<void> {
  try {
    await supabase
      .from('pnr_records')
      .update({
        has_schedule_change: hasChange,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pnrId)
  } catch (err) {
    logger.error('[Revalidation] Error updating PNR schedule change flag:', err)
  }
}

/**
 * 檢查並更新 PNR 的 has_schedule_change 標記
 */
async function checkAndUpdatePnrScheduleChangeFlag(pnrId: string): Promise<void> {
  try {
    // 檢查是否還有未處理的航變
    const { count, error } = await supabase
      .from('pnr_schedule_changes')
      .select('*', { count: 'exact', head: true })
      .eq('pnr_id', pnrId)
      .in('status', ['pending', 'contacted'])

    if (error) {
      logger.error('[Revalidation] Error checking schedule changes:', error)
      return
    }

    await updatePnrScheduleChangeFlag(pnrId, (count || 0) > 0)
  } catch (err) {
    logger.error('[Revalidation] Error checking and updating flag:', err)
  }
}

/**
 * 計算時間差（分鐘）
 */
function calculateTimeDifference(oldTime: string, newTime: string): number {
  const oldMinutes = parseInt(oldTime.slice(0, 2)) * 60 + parseInt(oldTime.slice(2))
  const newMinutes = parseInt(newTime.slice(0, 2)) * 60 + parseInt(newTime.slice(2))
  return newMinutes - oldMinutes
}

/**
 * 格式化時間 (HHMM -> HH:MM)
 */
function formatTime(time: string): string {
  if (time.length !== 4) return time
  return `${time.slice(0, 2)}:${time.slice(2)}`
}

export default {
  detectScheduleChanges,
  assessImpact,
  createScheduleChangeRecord,
  updateScheduleChangeStatus,
  getScheduleChanges,
  getPendingScheduleChanges,
  processPnrScheduleChanges,
}
