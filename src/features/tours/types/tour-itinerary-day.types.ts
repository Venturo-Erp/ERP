/**
 * TourItineraryDay — 行程每日 metadata 型別
 *
 * 對應 DB 表 `tour_itinerary_days`
 * 與 `tour_itinerary_items` 互補：
 *   - tour_itinerary_items 存 item-level（每個景點/餐/宿一 row）
 *   - tour_itinerary_days  存 day-level（每天的 route/note/flag 一 row）
 */

export type MealPreset = 'hotel' | 'self' | 'airline' | null

export interface TourItineraryDay {
  id: string
  tour_id: string
  itinerary_id: string | null
  workspace_id: string | null
  day_number: number

  // Day-level metadata
  title: string | null
  route: string | null
  note: string | null
  blocks: unknown[] | null
  is_same_accommodation: boolean

  // 餐食預設
  breakfast_preset: MealPreset
  lunch_preset: MealPreset
  dinner_preset: MealPreset

  // Audit
  created_at: string | null
  updated_at: string | null
  created_by: string | null
  updated_by: string | null
}
