/**
 * 旅客年齡驗證器
 *
 * 功能：
 * 1. 根據出生日期和起飛日期計算年齡
 * 2. 驗證旅客類型是否正確（INF/CHD/ADT）
 * 3. 產生警告訊息
 */

import type { PassengerInfo, FlightSegment } from '../types'

export interface PassengerAgeValidation {
  passengerIndex: number
  passengerName: string
  birthDate: string | undefined
  ageOnDeparture: number
  expectedType: 'ADT' | 'CHD' | 'INF'
  actualType: 'ADT' | 'CHD' | 'INF' | 'INS'
  isValid: boolean
  warning?: string
  suggestion?: string
}

/**
 * 計算年齡（以年為單位）
 */
function calculateAge(birthDate: Date, targetDate: Date): number {
  const ageInMs = targetDate.getTime() - birthDate.getTime()
  const ageInYears = ageInMs / (365.25 * 24 * 60 * 60 * 1000)
  return ageInYears
}

/**
 * 解析 Amadeus 日期格式（DDMMMYY）
 */
function parseAmadeusDateString(dateStr: string): Date | null {
  const monthMap: Record<string, number> = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  }

  const match = dateStr.match(/^(\d{2})([A-Z]{3})(\d{2})$/i)
  if (!match) return null

  const day = parseInt(match[1])
  const month = monthMap[match[2].toUpperCase()]
  const year = parseInt(match[3]) + 2000 // 假設 2000 年代

  if (month === undefined) return null

  return new Date(year, month, day)
}

/**
 * 根據年齡判斷應該的旅客類型
 */
function getExpectedPassengerType(ageInYears: number): 'ADT' | 'CHD' | 'INF' {
  if (ageInYears < 2) return 'INF'
  if (ageInYears < 12) return 'CHD'
  return 'ADT'
}

/**
 * 驗證單一旅客的年齡
 */
function validatePassengerAge(
  passenger: PassengerInfo,
  departureDate: Date
): PassengerAgeValidation {
  // 如果沒有出生日期，無法驗證
  if (!passenger.birthDate) {
    return {
      passengerIndex: passenger.index,
      passengerName: passenger.name,
      birthDate: undefined,
      ageOnDeparture: 0,
      expectedType: passenger.type === 'INS' ? 'INF' : passenger.type,
      actualType: passenger.type,
      isValid: true,
      suggestion:
        passenger.type === 'INF' || passenger.type === 'INS' || passenger.type === 'CHD'
          ? '建議輸入出生日期以驗證年齡'
          : undefined,
    }
  }

  const birthDate = parseAmadeusDateString(passenger.birthDate)
  if (!birthDate) {
    return {
      passengerIndex: passenger.index,
      passengerName: passenger.name,
      birthDate: passenger.birthDate,
      ageOnDeparture: 0,
      expectedType: passenger.type === 'INS' ? 'INF' : passenger.type,
      actualType: passenger.type,
      isValid: false,
      warning: `出生日期格式錯誤：${passenger.birthDate}`,
    }
  }

  const ageInYears = calculateAge(birthDate, departureDate)
  const expectedType = getExpectedPassengerType(ageInYears)
  const actualType = passenger.type === 'INS' ? 'INF' : passenger.type

  const isValid = expectedType === actualType
  const ageOnDeparture = Math.floor(ageInYears * 10) / 10 // 保留一位小數

  let warning: string | undefined
  let suggestion: string | undefined

  if (!isValid) {
    warning = `⚠️ 年齡驗證失敗：起飛時 ${ageOnDeparture.toFixed(1)} 歲，應為 ${expectedType}，但 PNR 標示為 ${actualType}`

    if (actualType === 'INF' && expectedType === 'CHD') {
      suggestion = '起飛時已滿 2 歲，請改訂兒童票（CHD）並加訂座位'
    } else if (actualType === 'INF' && expectedType === 'ADT') {
      suggestion = '起飛時已滿 12 歲，請改訂成人票（ADT）'
    } else if (actualType === 'CHD' && expectedType === 'ADT') {
      suggestion = '起飛時已滿 12 歲，請改訂成人票（ADT）'
    } else if (actualType === 'CHD' && expectedType === 'INF') {
      suggestion = '起飛時未滿 2 歲，可改訂嬰兒票（INF）節省費用'
    } else if (actualType === 'ADT' && expectedType === 'CHD') {
      suggestion = '起飛時未滿 12 歲，可改訂兒童票（CHD）節省費用'
    }
  } else if (ageInYears >= 1.8 && ageInYears < 2) {
    // 接近 2 歲臨界點的警告
    warning = `🔔 注意：起飛時 ${ageOnDeparture.toFixed(1)} 歲，接近 2 歲臨界點，請再次確認`
  } else if (ageInYears >= 11.8 && ageInYears < 12) {
    // 接近 12 歲臨界點的警告
    warning = `🔔 注意：起飛時 ${ageOnDeparture.toFixed(1)} 歲，接近 12 歲臨界點，請再次確認`
  }

  return {
    passengerIndex: passenger.index,
    passengerName: passenger.name,
    birthDate: passenger.birthDate,
    ageOnDeparture,
    expectedType,
    actualType,
    isValid,
    warning,
    suggestion,
  }
}

/**
 * 驗證所有旅客的年齡
 */
export function validateAllPassengerAges(
  passengers: PassengerInfo[],
  segments: FlightSegment[]
): PassengerAgeValidation[] {
  if (segments.length === 0) {
    return []
  }

  // 使用第一段航班的出發日期
  const firstSegment = segments[0]
  const departureDate = parseAmadeusDateString(firstSegment.departureDate)

  if (!departureDate) {
    return []
  }

  return passengers.map(passenger => validatePassengerAge(passenger, departureDate))
}

/**
 * 檢查是否有嬰兒數量超過成人數量的問題
 */
export function validateInfantAdultRatio(passengers: PassengerInfo[]): {
  isValid: boolean
  error?: string
} {
  const adults = passengers.filter(p => p.type === 'ADT').length
  const infants = passengers.filter(p => p.type === 'INF' || p.type === 'INS').length

  if (infants > adults) {
    return {
      isValid: false,
      error: `嬰兒數量（${infants}）超過成人數量（${adults}）。每位成人最多只能帶 1 位嬰兒。`,
    }
  }

  return { isValid: true }
}
