/**
 * PNR 票價監控服務
 *
 * 功能：
 * 1. 記錄票價歷史
 * 2. 偵測票價變動
 * 3. 觸發票價警報
 * 4. 計算價差百分比
 */

import { supabase } from '@/lib/supabase/client'
import { getRequiredWorkspaceId } from '@/lib/workspace-context'
import { parseFareFromTelegram, type ParsedFareData } from '@/lib/pnr-parser'
import { logger } from '@/lib/utils/logger'
import type { Database } from '@/lib/supabase/types'

type PnrFareHistory = Database['public']['Tables']['pnr_fare_history']['Row']
type PnrFareHistoryInsert = Database['public']['Tables']['pnr_fare_history']['Insert']
type PnrFareAlert = Database['public']['Tables']['pnr_fare_alerts']['Row']

export interface FareChangeResult {
  hasChange: boolean
  previousFare: number | null
  currentFare: number
  changeAmount: number
  changePercent: number
  direction: 'increase' | 'decrease' | 'same'
}

export interface FareAlertTrigger {
  alertId: string
  alertType: string
  pnrId: string
  triggered: boolean
  message: string
  previousFare: number
  currentFare: number
  changeAmount: number
  changePercent: number
}

/**
 * 記錄票價歷史
 */
export async function recordFareHistory(
  pnrId: string,
  fareData: ParsedFareData,
  source: 'telegram' | 'manual' | 'api' = 'telegram',
  recordedBy?: string
): Promise<PnrFareHistory | null> {
  try {
    const historyRecord: PnrFareHistoryInsert = {
      pnr_id: pnrId,
      workspace_id: getRequiredWorkspaceId(),
      fare_basis: fareData.fareBasis,
      currency: fareData.currency,
      base_fare: fareData.baseFare,
      taxes: fareData.taxes,
      total_fare: fareData.totalFare,
      source,
      recorded_by: recordedBy || null,
      raw_fare_data: JSON.parse(
        JSON.stringify({
          taxBreakdown: fareData.taxBreakdown,
          validatingCarrier: fareData.validatingCarrier,
          perPassenger: fareData.perPassenger,
          raw: fareData.raw,
        })
      ),
      recorded_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('pnr_fare_history')
      .insert(historyRecord)
      .select()
      .single()

    if (error) {
      logger.error('[FareMonitoring] Failed to record fare history:', error)
      return null
    }

    // 更新 PNR 的 current_fare
    await updatePnrCurrentFare(pnrId, fareData.totalFare, fareData.currency)

    return data
  } catch (err) {
    logger.error('[FareMonitoring] Error recording fare history:', err)
    return null
  }
}

/**
 * 更新 PNR 記錄的當前票價
 */
async function updatePnrCurrentFare(pnrId: string, fare: number, currency: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('pnr_records')
      .update({
        current_fare: fare,
        fare_currency: currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pnrId)

    if (error) {
      logger.error('[FareMonitoring] Failed to update PNR current fare:', error)
    }
  } catch (err) {
    logger.error('[FareMonitoring] Error updating PNR current fare:', err)
  }
}

/**
 * 取得最新的票價歷史
 */
export async function getLatestFareHistory(pnrId: string): Promise<PnrFareHistory | null> {
  try {
    const { data, error } = await supabase
      .from('pnr_fare_history')
      .select('id, pnr_id, base_fare, taxes, total_fare, currency, fare_basis, source, raw_fare_data, recorded_at, recorded_by, workspace_id, created_at')
      .eq('pnr_id', pnrId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      logger.error('[FareMonitoring] Failed to get latest fare history:', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('[FareMonitoring] Error getting latest fare history:', err)
    return null
  }
}

/**
 * 取得票價歷史列表
 */
export async function getFareHistory(pnrId: string, limit: number = 10): Promise<PnrFareHistory[]> {
  try {
    const { data, error } = await supabase
      .from('pnr_fare_history')
      .select('id, pnr_id, base_fare, taxes, total_fare, currency, fare_basis, source, raw_fare_data, recorded_at, recorded_by, workspace_id, created_at')
      .eq('pnr_id', pnrId)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('[FareMonitoring] Failed to get fare history:', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('[FareMonitoring] Error getting fare history:', err)
    return []
  }
}

/**
 * 計算票價變動
 */
export function calculateFareChange(
  currentFare: number,
  previousFare: number | null
): FareChangeResult {
  if (previousFare === null || previousFare === 0) {
    return {
      hasChange: false,
      previousFare: null,
      currentFare,
      changeAmount: 0,
      changePercent: 0,
      direction: 'same',
    }
  }

  const changeAmount = currentFare - previousFare
  const changePercent = (changeAmount / previousFare) * 100

  let direction: 'increase' | 'decrease' | 'same' = 'same'
  if (changeAmount > 0) direction = 'increase'
  else if (changeAmount < 0) direction = 'decrease'

  return {
    hasChange: changeAmount !== 0,
    previousFare,
    currentFare,
    changeAmount,
    changePercent: Math.round(changePercent * 100) / 100,
    direction,
  }
}

/**
 * 檢查並觸發票價警報
 */
export async function checkFareAlerts(
  pnrId: string,
  currentFare: number,
  previousFare: number | null
): Promise<FareAlertTrigger[]> {
  const triggers: FareAlertTrigger[] = []

  if (previousFare === null) {
    return triggers
  }

  try {
    // 取得該 PNR 的有效警報設定
    const { data: alerts, error } = await supabase
      .from('pnr_fare_alerts')
      .select('id, pnr_id, alert_type, threshold_amount, threshold_percent, last_fare, is_active, last_checked_at, workspace_id, created_at, updated_at')
      .eq('pnr_id', pnrId)
      .eq('is_active', true)
      .limit(500)

    if (error) {
      logger.error('[FareMonitoring] Failed to get fare alerts:', error)
      return triggers
    }

    if (!alerts || alerts.length === 0) {
      return triggers
    }

    const fareChange = calculateFareChange(currentFare, previousFare)

    for (const alert of alerts) {
      let triggered = false
      let message = ''

      switch (alert.alert_type) {
        case 'price_increase':
          // 價格上漲警報
          if (fareChange.direction === 'increase') {
            if (alert.threshold_percent && fareChange.changePercent >= alert.threshold_percent) {
              triggered = true
              message = `票價上漲 ${fareChange.changePercent.toFixed(1)}%，超過警報門檻 ${alert.threshold_percent}%`
            } else if (
              alert.threshold_amount &&
              fareChange.changeAmount >= alert.threshold_amount
            ) {
              triggered = true
              message = `票價上漲 ${fareChange.changeAmount}，超過警報門檻 ${alert.threshold_amount}`
            } else if (!alert.threshold_percent && !alert.threshold_amount) {
              // 沒有門檻，任何上漲都觸發
              triggered = true
              message = `票價上漲 ${fareChange.changeAmount} (${fareChange.changePercent.toFixed(1)}%)`
            }
          }
          break

        case 'price_decrease':
          // 價格下跌警報
          if (fareChange.direction === 'decrease') {
            const absChangePercent = Math.abs(fareChange.changePercent)
            const absChangeAmount = Math.abs(fareChange.changeAmount)

            if (alert.threshold_percent && absChangePercent >= alert.threshold_percent) {
              triggered = true
              message = `票價下跌 ${absChangePercent.toFixed(1)}%，超過警報門檻 ${alert.threshold_percent}%`
            } else if (alert.threshold_amount && absChangeAmount >= alert.threshold_amount) {
              triggered = true
              message = `票價下跌 ${absChangeAmount}，超過警報門檻 ${alert.threshold_amount}`
            } else if (!alert.threshold_percent && !alert.threshold_amount) {
              triggered = true
              message = `票價下跌 ${absChangeAmount} (${absChangePercent.toFixed(1)}%)`
            }
          }
          break

        case 'threshold':
          // 固定門檻警報（當票價超過或低於特定金額時觸發）
          if (alert.threshold_amount) {
            if (currentFare > alert.threshold_amount && previousFare <= alert.threshold_amount) {
              triggered = true
              message = `票價 ${currentFare} 超過門檻 ${alert.threshold_amount}`
            } else if (
              currentFare < alert.threshold_amount &&
              previousFare >= alert.threshold_amount
            ) {
              triggered = true
              message = `票價 ${currentFare} 低於門檻 ${alert.threshold_amount}`
            }
          }
          break
      }

      if (triggered) {
        triggers.push({
          alertId: alert.id,
          alertType: alert.alert_type,
          pnrId,
          triggered: true,
          message,
          previousFare,
          currentFare,
          changeAmount: fareChange.changeAmount,
          changePercent: fareChange.changePercent,
        })

        // 更新警報的 last_fare 和 last_checked_at
        await supabase
          .from('pnr_fare_alerts')
          .update({
            last_fare: currentFare,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', alert.id)
      }
    }

    return triggers
  } catch (err) {
    logger.error('[FareMonitoring] Error checking fare alerts:', err)
    return triggers
  }
}

/**
 * 建立票價警報
 */
export async function createFareAlert(
  pnrId: string,
  alertType: 'price_increase' | 'price_decrease' | 'threshold',
  options?: {
    thresholdAmount?: number
    thresholdPercent?: number
    notifyChannelId?: string
    notifyEmployeeIds?: string[]
  }
): Promise<PnrFareAlert | null> {
  try {
    // 取得當前票價作為基準
    const latestFare = await getLatestFareHistory(pnrId)

    const { data, error } = await supabase
      .from('pnr_fare_alerts')
      .insert({
        pnr_id: pnrId,
        workspace_id: getRequiredWorkspaceId(),
        alert_type: alertType,
        threshold_amount: options?.thresholdAmount || null,
        threshold_percent: options?.thresholdPercent || null,
        is_active: true,
        last_fare: latestFare?.total_fare || null,
        notify_channel_id: options?.notifyChannelId || null,
        notify_employee_ids: options?.notifyEmployeeIds || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('[FareMonitoring] Failed to create fare alert:', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('[FareMonitoring] Error creating fare alert:', err)
    return null
  }
}

/**
 * 處理 PNR 更新時的票價監控
 *
 * 這個函數應該在 PNR 更新（例如重新解析電報）時調用
 */
export async function processPnrFareUpdate(
  pnrId: string,
  rawPnr: string,
  userId?: string
): Promise<{
  fareRecorded: boolean
  fareChange: FareChangeResult | null
  alertsTrigered: FareAlertTrigger[]
}> {
  const result = {
    fareRecorded: false,
    fareChange: null as FareChangeResult | null,
    alertsTrigered: [] as FareAlertTrigger[],
  }

  // 1. 解析票價
  const fareData = parseFareFromTelegram(rawPnr)
  if (!fareData) {
    logger.log('[FareMonitoring] No fare data found in PNR')
    return result
  }

  // 2. 取得前一次票價
  const previousRecord = await getLatestFareHistory(pnrId)
  const previousFare = previousRecord?.total_fare ?? null

  // 3. 記錄新票價
  const historyRecord = await recordFareHistory(pnrId, fareData, 'telegram', userId)

  if (historyRecord) {
    result.fareRecorded = true

    // 4. 計算票價變動
    result.fareChange = calculateFareChange(fareData.totalFare, previousFare)

    // 5. 檢查警報
    if (result.fareChange.hasChange) {
      result.alertsTrigered = await checkFareAlerts(pnrId, fareData.totalFare, previousFare)

      // 記錄觸發的警報
      if (result.alertsTrigered.length > 0) {
        logger.log(
          `[FareMonitoring] ${result.alertsTrigered.length} fare alert(s) triggered for PNR ${pnrId}`
        )
      }
    }
  }

  return result
}

/**
 * 手動記錄票價（用於 UI 手動輸入）
 */
export async function recordManualFare(
  pnrId: string,
  fare: {
    currency: string
    baseFare?: number
    taxes?: number
    totalFare: number
    fareBasis?: string
  },
  userId?: string
): Promise<PnrFareHistory | null> {
  const fareData: ParsedFareData = {
    currency: fare.currency,
    baseFare: fare.baseFare ?? null,
    taxes: fare.taxes ?? null,
    totalFare: fare.totalFare,
    fareBasis: fare.fareBasis ?? null,
    validatingCarrier: null,
    taxBreakdown: [],
    perPassenger: true,
    raw: `Manual entry: ${fare.currency} ${fare.totalFare}`,
  }

  return recordFareHistory(pnrId, fareData, 'manual', userId)
}

export default {
  recordFareHistory,
  getLatestFareHistory,
  getFareHistory,
  calculateFareChange,
  checkFareAlerts,
  createFareAlert,
  processPnrFareUpdate,
  recordManualFare,
}
