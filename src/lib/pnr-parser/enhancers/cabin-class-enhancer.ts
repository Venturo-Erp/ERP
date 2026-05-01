/**
 * 艙等資訊增強器
 * 整合 amadeus-airline-specific-cabins.md 資料
 *
 * 注意：目前使用預設資料，未來可整合資料庫查詢
 */

import type { FlightSegment } from '../types'

interface CabinClassInfo {
  code: string
  airlineCode: string
  category: 'Economy' | 'Premium Economy' | 'Business' | 'First' | 'Unknown'
  fareFamily: string | null
  priceOrder: number
  description: string
  refundable: boolean
  changeable: boolean
  mileageAccrualPct: number | null
}

export interface EnhancedFlightSegment extends FlightSegment {
  cabinInfo?: CabinClassInfo
}

// 艙等分類對照表
const CABIN_CATEGORY_MAP: Record<string, 'Economy' | 'Premium Economy' | 'Business' | 'First'> = {
  Y: 'Economy',
  B: 'Economy',
  M: 'Economy',
  H: 'Economy',
  Q: 'Economy',
  V: 'Economy',
  W: 'Economy',
  S: 'Economy',
  T: 'Economy',
  L: 'Economy',
  K: 'Economy',
  N: 'Economy',
  E: 'Economy',
  G: 'Economy',
  X: 'Economy',
  P: 'Premium Economy',
  R: 'Premium Economy',
  U: 'Premium Economy',
  C: 'Business',
  D: 'Business',
  I: 'Business',
  J: 'Business',
  Z: 'Business',
  F: 'First',
  A: 'First',
}

// 預設價格順序（從便宜到貴）
const DEFAULT_PRICE_ORDER: Record<string, number> = {
  X: 1,
  T: 2,
  E: 3,
  N: 4,
  G: 5,
  L: 6,
  K: 7,
  V: 8,
  W: 9,
  S: 10,
  Q: 11,
  H: 12,
  M: 13,
  B: 14,
  Y: 15,
  P: 16,
  R: 17,
  U: 18,
  I: 19,
  D: 20,
  Z: 21,
  C: 22,
  J: 23,
  A: 24,
  F: 25,
}

/**
 * 取得艙等資訊
 */
function getCabinClassInfo(airlineCode: string, cabinCode: string): CabinClassInfo {
  const category = CABIN_CATEGORY_MAP[cabinCode] || 'Unknown'
  const priceOrder = DEFAULT_PRICE_ORDER[cabinCode] || 99

  return {
    code: cabinCode,
    airlineCode,
    category,
    fareFamily: null,
    priceOrder,
    description: `${category} ${cabinCode}`,
    refundable: false,
    changeable: false,
    mileageAccrualPct: null,
  }
}

/**
 * 增強所有航段的艙等資訊
 */
export function enhanceAllSegmentsCabinClass(segments: FlightSegment[]): EnhancedFlightSegment[] {
  return segments.map(segment => ({
    ...segment,
    cabinInfo: getCabinClassInfo(segment.airline, segment.class),
  }))
}
