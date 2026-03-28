/**
 * 團狀態自動更新
 * 根據日期自動調整團狀態
 */

import { createClient } from '@supabase/supabase-js'

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
  // 如果已經是「已結團」，不自動改
  if (currentStatus === '已結團') return null
  
  // 如果是提案階段，不自動改
  if (currentStatus === '提案') return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const departure = departureDate ? new Date(departureDate) : null
  const returnDay = returnDate ? new Date(returnDate) : null

  if (departure) departure.setHours(0, 0, 0, 0)
  if (returnDay) returnDay.setHours(0, 0, 0, 0)

  // 判斷狀態
  if (returnDay && today > returnDay) {
    return currentStatus !== '待結團' ? '待結團' : null
  }
  if (departure && today >= departure) {
    return currentStatus !== '已出發' ? '已出發' : null
  }
  if (departure && today < departure) {
    return currentStatus !== '待出發' ? '待出發' : null
  }

  return null
}

/**
 * 更新所有需要更新狀態的團
 */
export async function updateAllTourStatuses(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  // 查詢所有非已結團的團
  const { data: tours, error } = await supabase
    .from('tours')
    .select('id, code, status, departure_date, return_date')
    .not('status', 'eq', '已結團')
    .not('status', 'eq', '提案')

  if (error) {
    return { updated: 0, errors: [error.message] }
  }

  for (const tour of tours || []) {
    const newStatus = calculateTourStatus(
      tour.status,
      tour.departure_date,
      tour.return_date
    )

    if (newStatus) {
      const { error: updateError } = await supabase
        .from('tours')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', tour.id)

      if (updateError) {
        errors.push(`${tour.code}: ${updateError.message}`)
      } else {
        updated++
        console.log(`團 ${tour.code} 狀態更新: ${tour.status} → ${newStatus}`)
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

  const newStatus = calculateTourStatus(
    tour.status,
    tour.departure_date,
    tour.return_date
  )

  if (newStatus) {
    const { error: updateError } = await supabase
      .from('tours')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', tourId)

    return !updateError
  }

  return false
}
