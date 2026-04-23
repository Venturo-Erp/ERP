/**
 * 團狀態自動更新
 * 根據日期自動調整團狀態（upcoming → ongoing → returned）
 */

import { createClient } from '@supabase/supabase-js'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * 根據日期計算應該的團狀態
 */
function calculateTourStatus(
  currentStatus: string,
  departureDate: string | null,
  returnDate: string | null
): string | null {
  // 終點狀態、模板、提案都不自動改
  if (currentStatus === TOUR_STATUS.CLOSED) return null
  if (currentStatus === TOUR_STATUS.PROPOSAL) return null
  if (currentStatus === TOUR_STATUS.TEMPLATE) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const departure = departureDate ? new Date(departureDate) : null
  const returnDay = returnDate ? new Date(returnDate) : null

  if (departure) departure.setHours(0, 0, 0, 0)
  if (returnDay) returnDay.setHours(0, 0, 0, 0)

  if (returnDay && today > returnDay) {
    return currentStatus !== TOUR_STATUS.RETURNED ? TOUR_STATUS.RETURNED : null
  }
  if (departure && today >= departure) {
    return currentStatus !== TOUR_STATUS.ONGOING ? TOUR_STATUS.ONGOING : null
  }
  if (departure && today < departure) {
    return currentStatus !== TOUR_STATUS.UPCOMING ? TOUR_STATUS.UPCOMING : null
  }

  return null
}

/**
 * 更新所有需要更新狀態的團
 */
export async function updateAllTourStatuses(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  // 查詢：排除 closed / proposal / template
  const { data: tours, error } = await supabase
    .from('tours')
    .select('id, code, status, departure_date, return_date')
    .not('status', 'in', `(${TOUR_STATUS.CLOSED},${TOUR_STATUS.PROPOSAL},${TOUR_STATUS.TEMPLATE})`)

  if (error) {
    return { updated: 0, errors: [error.message] }
  }

  for (const tour of tours || []) {
    const newStatus = calculateTourStatus(tour.status, tour.departure_date, tour.return_date)

    if (newStatus) {
      const { error: updateError } = await supabase
        .from('tours')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tour.id)

      if (updateError) {
        errors.push(`${tour.code}: ${updateError.message}`)
      } else {
        updated++
      }
    }
  }

  return { updated, errors }
}

/**
 * 更新單一團的狀態
 */
export async function updateTourStatus(tourId: string): Promise<boolean> {
  const { data: tour, error } = await supabase
    .from('tours')
    .select('id, code, status, departure_date, return_date')
    .eq('id', tourId)
    .single()

  if (error || !tour) return false

  const newStatus = calculateTourStatus(tour.status, tour.departure_date, tour.return_date)

  if (newStatus) {
    const { error: updateError } = await supabase
      .from('tours')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tourId)

    return !updateError
  }

  return false
}
