/**
 * PNR 航班狀態服務
 *
 * 功能：
 * 1. 從電報解析航班狀態
 * 2. 記錄狀態歷史
 * 3. 偵測狀態變更
 * 4. 預留外部 API 整合接口
 */

import { supabase } from '@/lib/supabase/client'
import { getRequiredWorkspaceId } from '@/lib/workspace-context'
import { logger } from '@/lib/utils/logger'
import type { Database } from '@/lib/supabase/types'
import type { PNRSegment, BookingStatus, OperationalStatus } from '@/types/pnr.types'

type PnrFlightStatusHistory = Database['public']['Tables']['pnr_flight_status_history']['Row']
type PnrFlightStatusHistoryInsert =
  Database['public']['Tables']['pnr_flight_status_history']['Insert']
type FlightStatusSubscription = Database['public']['Tables']['flight_status_subscriptions']['Row']

// =====================================================
// Flight Status Adapter Interface (預留外部 API 接口)
// =====================================================

export interface FlightQuery {
  airlineCode: string
  flightNumber: string
  flightDate: string // YYYY-MM-DD format
  origin?: string
  destination?: string
}

export interface FlightStatus {
  airlineCode: string
  flightNumber: string
  flightDate: string
  operationalStatus: OperationalStatus
  scheduledDeparture?: string
  actualDeparture?: string
  scheduledArrival?: string
  actualArrival?: string
  delayMinutes?: number
  gateInfo?: string
  terminal?: string
  remarks?: string
  lastUpdated: string
}

export interface FlightStatusAdapter {
  provider: string
  getStatus(query: FlightQuery): Promise<FlightStatus | null>
  subscribe?(query: FlightQuery, webhookUrl: string): Promise<string | null>
  unsubscribe?(subscriptionId: string): Promise<boolean>
}

// =====================================================
// Status Change Detection
// =====================================================

export interface StatusChange {
  segment: PNRSegment
  previousBookingStatus?: BookingStatus
  newBookingStatus?: BookingStatus
  previousOperationalStatus?: OperationalStatus
  newOperationalStatus?: OperationalStatus
  changeType: 'booking' | 'operational' | 'both'
  severity: 'info' | 'warning' | 'critical'
  message: string
}

/**
 * 訂位狀態代碼說明
 */
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  HK: '已確認',
  TK: '已開票',
  UC: '待確認',
  XX: '已取消',
  HL: '候補優先',
  HN: '候補',
  LL: '候補請求',
  WL: '等待名單',
  RR: '已開票確認',
  DK: '已確認（本地）',
  KK: '已確認（連線）',
  UN: '航空公司無法確認',
  NO: '拒絕',
  SC: '航班取消',
}

/**
 * 營運狀態嚴重程度
 */
const OPERATIONAL_STATUS_SEVERITY: Record<string, 'info' | 'warning' | 'critical'> = {
  ON_TIME: 'info',
  DEPARTED: 'info',
  ARRIVED: 'info',
  GATE_CHANGE: 'warning',
  DELAYED: 'warning',
  DIVERTED: 'critical',
  CANCELLED: 'critical',
}

/**
 * 從電報解析訂位狀態變更
 */
export function parseStatusFromTelegram(
  segments: PNRSegment[]
): Array<{ segment: PNRSegment; bookingStatus: BookingStatus }> {
  return segments.map(segment => ({
    segment,
    bookingStatus: segment.status as BookingStatus,
  }))
}

/**
 * 偵測航班狀態變更
 */
export function detectStatusChanges(
  oldSegments: PNRSegment[],
  newSegments: PNRSegment[]
): StatusChange[] {
  const changes: StatusChange[] = []

  for (const newSeg of newSegments) {
    // 找到對應的舊航段（根據航班號和日期匹配）
    const oldSeg = oldSegments.find(
      s =>
        s.airline === newSeg.airline &&
        s.flightNumber === newSeg.flightNumber &&
        s.departureDate === newSeg.departureDate
    )

    if (!oldSeg) {
      // 新航段
      changes.push({
        segment: newSeg,
        newBookingStatus: newSeg.status as BookingStatus,
        changeType: 'booking',
        severity: 'info',
        message: `新增航段 ${newSeg.airline}${newSeg.flightNumber} ${newSeg.origin}-${newSeg.destination}`,
      })
      continue
    }

    // 檢查訂位狀態變更
    if (oldSeg.status !== newSeg.status) {
      const severity = getBookingStatusChangeSeverity(
        oldSeg.status as BookingStatus,
        newSeg.status as BookingStatus
      )

      changes.push({
        segment: newSeg,
        previousBookingStatus: oldSeg.status as BookingStatus,
        newBookingStatus: newSeg.status as BookingStatus,
        changeType: 'booking',
        severity,
        message: `航班 ${newSeg.airline}${newSeg.flightNumber} 狀態從 ${BOOKING_STATUS_LABELS[oldSeg.status] || oldSeg.status} 變更為 ${BOOKING_STATUS_LABELS[newSeg.status] || newSeg.status}`,
      })
    }
  }

  // 檢查被刪除的航段
  for (const oldSeg of oldSegments) {
    const stillExists = newSegments.find(
      s =>
        s.airline === oldSeg.airline &&
        s.flightNumber === oldSeg.flightNumber &&
        s.departureDate === oldSeg.departureDate
    )

    if (!stillExists) {
      changes.push({
        segment: oldSeg,
        previousBookingStatus: oldSeg.status as BookingStatus,
        changeType: 'booking',
        severity: 'warning',
        message: `航段 ${oldSeg.airline}${oldSeg.flightNumber} ${oldSeg.origin}-${oldSeg.destination} 已被移除`,
      })
    }
  }

  return changes
}

/**
 * 判斷訂位狀態變更的嚴重程度
 */
function getBookingStatusChangeSeverity(
  oldStatus: BookingStatus,
  newStatus: BookingStatus
): 'info' | 'warning' | 'critical' {
  // 取消相關的變更為 critical
  if (newStatus === 'XX' || newStatus === 'SC' || newStatus === 'NO') {
    return 'critical'
  }

  // 從確認變成待確認為 warning
  if (['HK', 'TK', 'RR', 'DK', 'KK'].includes(oldStatus) && ['UC', 'UN'].includes(newStatus)) {
    return 'warning'
  }

  // 變成候補為 warning
  if (['HL', 'HN', 'LL', 'WL'].includes(newStatus)) {
    return 'warning'
  }

  // 從未確認變成確認為 info
  if (['UC', 'UN'].includes(oldStatus) && ['HK', 'TK', 'RR'].includes(newStatus)) {
    return 'info'
  }

  return 'info'
}

// =====================================================
// Database Operations
// =====================================================

/**
 * 記錄航班狀態歷史
 */
export async function recordStatusHistory(
  pnrId: string,
  segment: PNRSegment,
  options?: {
    operationalStatus?: OperationalStatus
    delayMinutes?: number
    newDepartureTime?: string
    newArrivalTime?: string
    gateInfo?: string
    remarks?: string
    source?: 'telegram' | 'api' | 'manual'
    externalData?: Record<string, unknown>
  }
): Promise<PnrFlightStatusHistory | null> {
  try {
    // 轉換日期格式 (18JUL -> 2025-07-18)
    const flightDate = convertAmadeusDate(segment.departureDate)

    const historyRecord: PnrFlightStatusHistoryInsert = {
      pnr_id: pnrId,
      workspace_id: getRequiredWorkspaceId(),
      segment_id: null, // 可由呼叫者提供
      airline_code: segment.airline,
      flight_number: segment.flightNumber,
      flight_date: flightDate,
      booking_status: segment.status,
      operational_status: options?.operationalStatus || null,
      delay_minutes: options?.delayMinutes || null,
      new_departure_time: options?.newDepartureTime || null,
      new_arrival_time: options?.newArrivalTime || null,
      gate_info: options?.gateInfo || null,
      remarks: options?.remarks || null,
      source: options?.source || 'telegram',
      external_data: options?.externalData
        ? JSON.parse(JSON.stringify(options.externalData))
        : null,
      recorded_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('pnr_flight_status_history')
      .insert(historyRecord)
      .select()
      .single()

    if (error) {
      logger.error('[FlightStatus] Failed to record status history:', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('[FlightStatus] Error recording status history:', err)
    return null
  }
}

/**
 * 取得航班狀態歷史
 */
export async function getStatusHistory(
  pnrId: string,
  options?: {
    airlineCode?: string
    flightNumber?: string
    limit?: number
  }
): Promise<PnrFlightStatusHistory[]> {
  try {
    let query = supabase
      .from('pnr_flight_status_history')
      .select('id, pnr_id, segment_id, flight_number, airline_code, flight_date, operational_status, booking_status, delay_minutes, gate_info, new_departure_time, new_arrival_time, external_data, source, remarks, recorded_at, workspace_id')
      .eq('pnr_id', pnrId)
      .order('recorded_at', { ascending: false })
      .limit(500)

    if (options?.airlineCode) {
      query = query.eq('airline_code', options.airlineCode)
    }

    if (options?.flightNumber) {
      query = query.eq('flight_number', options.flightNumber)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[FlightStatus] Failed to get status history:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[FlightStatus] Error getting status history:', err)
    return []
  }
}

/**
 * 取得最新的航班狀態
 */
export async function getLatestFlightStatus(
  pnrId: string,
  airlineCode: string,
  flightNumber: string
): Promise<PnrFlightStatusHistory | null> {
  try {
    const { data, error } = await supabase
      .from('pnr_flight_status_history')
      .select('id, pnr_id, segment_id, flight_number, airline_code, flight_date, operational_status, booking_status, delay_minutes, gate_info, new_departure_time, new_arrival_time, external_data, source, remarks, recorded_at, workspace_id')
      .eq('pnr_id', pnrId)
      .eq('airline_code', airlineCode)
      .eq('flight_number', flightNumber)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      logger.error('[FlightStatus] Failed to get latest status:', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('[FlightStatus] Error getting latest status:', err)
    return null
  }
}

// =====================================================
// Flight Subscriptions (預留外部 API 整合)
// =====================================================

/**
 * 建立航班訂閱
 */
export async function createFlightSubscription(
  flight: FlightQuery,
  options?: {
    pnrId?: string
    notifyOn?: Array<'delay' | 'cancel' | 'gate_change' | 'departed' | 'arrived'>
    notifyChannelId?: string
    notifyEmployeeIds?: string[]
  }
): Promise<FlightStatusSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('flight_status_subscriptions')
      .insert({
        workspace_id: getRequiredWorkspaceId(),
        pnr_id: options?.pnrId || null,
        segment_id: null,
        airline_code: flight.airlineCode,
        flight_number: flight.flightNumber,
        flight_date: flight.flightDate,
        notify_on: options?.notifyOn || ['delay', 'cancel', 'gate_change'],
        notify_channel_id: options?.notifyChannelId || null,
        notify_employee_ids: options?.notifyEmployeeIds || null,
        external_provider: null,
        external_subscription_id: null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('[FlightStatus] Failed to create subscription:', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('[FlightStatus] Error creating subscription:', err)
    return null
  }
}

/**
 * 取消航班訂閱
 */
export async function cancelFlightSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('flight_status_subscriptions')
      .update({ is_active: false })
      .eq('id', subscriptionId)

    if (error) {
      logger.error('[FlightStatus] Failed to cancel subscription:', error)
      return false
    }

    return true
  } catch (err) {
    logger.error('[FlightStatus] Error canceling subscription:', err)
    return false
  }
}

/**
 * 取得 PNR 的所有訂閱
 */
export async function getPnrSubscriptions(pnrId: string): Promise<FlightStatusSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('flight_status_subscriptions')
      .select('id, pnr_id, flight_number, flight_date, airline_code, segment_id, is_active, last_checked_at, external_provider, external_subscription_id, notify_on, notify_employee_ids, notify_channel_id, workspace_id, created_at, updated_at')
      .eq('pnr_id', pnrId)
      .eq('is_active', true)
      .limit(500)

    if (error) {
      logger.error('[FlightStatus] Failed to get subscriptions:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[FlightStatus] Error getting subscriptions:', err)
    return []
  }
}

// =====================================================
// Process PNR Status Update
// =====================================================

/**
 * 處理 PNR 更新時的航班狀態記錄
 */
export async function processPnrStatusUpdate(
  pnrId: string,
  oldSegments: PNRSegment[],
  newSegments: PNRSegment[]
): Promise<{
  statusChanges: StatusChange[]
  historyRecorded: number
}> {
  const result = {
    statusChanges: [] as StatusChange[],
    historyRecorded: 0,
  }

  // 1. 偵測狀態變更
  result.statusChanges = detectStatusChanges(oldSegments, newSegments)

  // 2. 記錄每個航段的狀態歷史
  for (const segment of newSegments) {
    const history = await recordStatusHistory(pnrId, segment, {
      source: 'telegram',
    })

    if (history) {
      result.historyRecorded++
    }
  }

  // 3. 如果有重要變更，記錄日誌
  const criticalChanges = result.statusChanges.filter(c => c.severity === 'critical')
  if (criticalChanges.length > 0) {
    logger.warn(
      `[FlightStatus] ${criticalChanges.length} critical status change(s) detected for PNR ${pnrId}`
    )
  }

  return result
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * 轉換 Amadeus 日期格式 (18JUL -> 2025-07-18)
 */
function convertAmadeusDate(amadeusDate: string): string {
  const monthMap: Record<string, string> = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12',
  }

  const day = amadeusDate.slice(0, 2)
  const monthStr = amadeusDate.slice(2, 5).toUpperCase()
  const month = monthMap[monthStr]

  if (!month) {
    return amadeusDate // 無法解析，返回原值
  }

  // 判斷年份（如果日期在過去，使用明年）
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  let year = currentYear
  const monthNum = parseInt(month, 10)
  const dayNum = parseInt(day, 10)

  if (monthNum < currentMonth || (monthNum === currentMonth && dayNum < now.getDate())) {
    year++
  }

  return `${year}-${month}-${day}`
}

/**
 * 格式化航班資訊
 */
export function formatFlightInfo(
  airlineCode: string,
  flightNumber: string,
  flightDate: string
): string {
  return `${airlineCode}${flightNumber} (${flightDate})`
}

export default {
  parseStatusFromTelegram,
  detectStatusChanges,
  recordStatusHistory,
  getStatusHistory,
  getLatestFlightStatus,
  createFlightSubscription,
  cancelFlightSubscription,
  getPnrSubscriptions,
  processPnrStatusUpdate,
  formatFlightInfo,
  BOOKING_STATUS_LABELS,
}
