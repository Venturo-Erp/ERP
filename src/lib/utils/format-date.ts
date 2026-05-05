/**
 * 日期格式化工具
 * 統一全專案日期顯示格式
 */

/**
 * 格式化日期為 YYYY-MM-DD
 * @param date - ISO 字串或 Date 物件
 * @returns YYYY-MM-DD 格式的日期字串
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * 格式化日期為公司統一格式 (YYYY-MM-DD)
 * 2026-05-05 規範：全公司日期顯示一律 YYYY-MM-DD、月日補零
 * 函式名稱保留 formatDateTW 以維持既有 import、行為等同 formatDate
 * @param date - ISO 字串或 Date 物件
 * @returns 2024-01-15 格式的日期字串
 */
export function formatDateTW(date: string | Date | null | undefined): string {
  return formatDate(date)
}

/**
 * 格式化日期為簡短格式 (MM-DD)
 * 2026-05-05 規範：補零、用 - 連接、跟全站 YYYY-MM-DD 一致
 * @param date - ISO 字串或 Date 物件
 * @returns 01-15 格式的日期字串
 */
export function formatDateCompact(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * @deprecated 用 formatDateCompact 取代、行為一致（MM-DD）
 */
export const formatDateCompactPadded = formatDateCompact

/**
 * 格式化日期為顯示格式 (同 formatDate / formatDateTW，YYYY-MM-DD)
 */
export const formatDateDisplay = formatDateTW

/**
 * 格式化月份為英文短格式
 * @param date - ISO 字串或 Date 物件
 * @returns JAN, FEB, MAR 等
 */
export function formatMonthShort(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    return months[d.getMonth()]
  } catch {
    return ''
  }
}

/**
 * 格式化日期時間為顯示格式
 * @param date - ISO 字串或 Date 物件
 * @returns 2024-01-15 14:30 格式
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const datePart = formatDateTW(d)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${datePart} ${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * 只格式化時間
 * @param date - ISO 字串或 Date 物件
 * @returns HH:mm 格式
 */
export function formatTimeOnly(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * 取得今天的日期字串 (YYYY-MM-DD)
 */
export function getTodayString(): string {
  return formatDate(new Date())
}

/**
 * 判斷兩個日期是否為同一天
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * 計算兩個日期間的天數差
 */
export function daysBetween(start: Date | string, end: Date | string): number {
  const d1 = typeof start === 'string' ? new Date(start) : start
  const d2 = typeof end === 'string' ? new Date(end) : end

  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 格式化日期為中文完整格式 (YYYY年M月D日)
 * @param date - ISO 字串或 Date 物件
 * @returns 2024年1月15日 格式
 */
export function formatDateChinese(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  } catch {
    return ''
  }
}

/**
 * 格式化日期為中文月日格式 (M月D日)
 * @param date - ISO 字串或 Date 物件
 * @returns 1月15日 格式
 */
export function formatDateMonthDayChinese(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch {
    return ''
  }
}

/**
 * 格式化為年月格式 (YYYY年M月)
 * @param date - ISO 字串或 Date 物件
 * @returns 2024年1月 格式
 */
export function formatYearMonth(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  } catch {
    return ''
  }
}

/**
 * 格式化星期幾 (週X)
 * @param date - ISO 字串或 Date 物件
 * @returns 週一、週二... 格式
 */
export function formatWeekday(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
    return weekdays[d.getDay()]
  } catch {
    return ''
  }
}

/**
 * 格式化日期為中文完整格式含星期 (YYYY年M月D日 週X)
 * @param date - ISO 字串或 Date 物件
 * @returns 2024年1月15日 週一 格式
 */
export function formatDateChineseWithWeekday(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    return `${formatDateChinese(d)} ${formatWeekday(d)}`
  } catch {
    return ''
  }
}

/**
 * 格式化日期為英文月日格式 (Jan 15)
 * @param date - ISO 字串或 Date 物件
 * @returns Jan 15 格式
 */
export function formatDateMonthDayEN(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return `${months[d.getMonth()]} ${d.getDate()}`
  } catch {
    return ''
  }
}

/**
 * 取得日期的日 (1-31)
 * @param date - ISO 字串或 Date 物件
 * @returns 日期數字
 */
export function getDay(date: string | Date | null | undefined): number {
  if (!date) return 0

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 0

    return d.getDate()
  } catch {
    return 0
  }
}

/**
 * 格式化為 ISO 日期格式 (YYYY-MM-DD)，使用台北時區
 * 用於 FullCalendar 等需要純日期字串的場景
 * @param date - Date 物件
 * @returns YYYY-MM-DD 格式
 */
export function formatDateISO(date: Date | null | undefined): string {
  if (!date) return ''

  try {
    if (isNaN(date.getTime())) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

// ============================================================
// 日期解析工具（避免時區問題）
// ============================================================

/**
 * 將日期字串解析為本地時間的 Date 物件（午夜）
 *
 * 重要：這是解決時區問題的標準方法！
 *
 * 問題：new Date('2024-01-15') 或 parseISO('2024-01-15') 會被解析為 UTC 午夜
 *       在台灣時區 (UTC+8) 會變成 2024-01-15 08:00，可能導致日期比較錯誤
 *
 * 解決：使用 new Date(year, month-1, day) 建立本地時間的日期物件
 *
 * @param dateStr - 日期字串，支援以下格式：
 *   - "2024-01-15" (純日期)
 *   - "2024-01-15T00:00:00" (含時間)
 *   - "2024-01-15T00:00:00.000Z" (ISO 格式)
 * @returns 本地時間午夜的 Date 物件，或 null（解析失敗時）
 *
 * @example
 * parseLocalDate('2024-01-15') // → new Date(2024, 0, 15) 本地午夜
 * parseLocalDate('2024-01-15T08:30:00') // → new Date(2024, 0, 15) 本地午夜
 */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null

  try {
    // 只取日期部分 YYYY-MM-DD（忽略時間部分）
    const datePart = dateStr.split('T')[0]
    const parts = datePart.split('-')
    if (parts.length !== 3) return null

    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)

    // 驗證數值合理性
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null

    // 使用 new Date(year, month-1, day) 建立本地時間日期
    const date = new Date(year, month - 1, day)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * 從 ISO 時間字串取得台灣時區的日期字串 (YYYY-MM-DD)
 *
 * 用途：將含時間的 ISO 字串轉為純日期字串，確保使用台灣時區
 * 常用於 FullCalendar 的全天事件
 *
 * @param isoString - ISO 格式時間字串，如 "2024-01-15T16:00:00.000Z"
 * @returns YYYY-MM-DD 格式的日期字串（台灣時區）
 *
 * @example
 * // UTC 2024-01-15 16:00 = 台灣 2024-01-16 00:00
 * toTaipeiDateString('2024-01-15T16:00:00.000Z') // → "2024-01-16"
 */
export function toTaipeiDateString(isoString: string | null | undefined): string {
  if (!isoString) return ''

  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString

    // 使用 sv-SE locale 取得 YYYY-MM-DD 格式，指定台北時區
    return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  } catch {
    return isoString
  }
}

/**
 * 從 ISO 時間字串取得台灣時區的時間字串 (HH:MM)
 *
 * @param isoString - ISO 格式時間字串
 * @param options - 選項
 * @param options.skipMidnight - 是否跳過午夜時間（回傳空字串）
 * @returns HH:MM 格式的時間字串
 */
export function toTaipeiTimeString(
  isoString: string | null | undefined,
  options: { skipMidnight?: boolean } = {}
): string {
  if (!isoString) return ''

  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''

    const timeStr = date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Taipei',
    })

    // 如果是午夜且設定跳過，回傳空字串
    if (options.skipMidnight && timeStr === '00:00') return ''

    return timeStr
  } catch {
    return ''
  }
}

/**
 * 取得日期的開始時間（午夜 00:00:00.000）
 * 用於日期比較時消除時間影響
 *
 * @param date - Date 物件
 * @returns 該日期午夜的 Date 物件
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * 格式化日期為簡短英文格式 (JAN 15)
 * @param date - ISO 字串或 Date 物件
 * @returns "JAN 15" 格式的日期字串
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    // Handle MM/DD format strings
    if (typeof date === 'string') {
      const mmddMatch = date.match(/^(\d{1,2})\/(\d{1,2})$/)
      if (mmddMatch) {
        const months = [
          'JAN',
          'FEB',
          'MAR',
          'APR',
          'MAY',
          'JUN',
          'JUL',
          'AUG',
          'SEP',
          'OCT',
          'NOV',
          'DEC',
        ]
        const month = parseInt(mmddMatch[1], 10) - 1
        const day = parseInt(mmddMatch[2], 10)
        if (month >= 0 && month < 12) return `${months[month]} ${day}`
      }
    }

    const d = typeof date === 'string' ? new Date(date.replace(/\//g, '-')) : date
    if (isNaN(d.getTime())) return ''

    const month = formatMonthShort(d)
    const day = d.getDate()
    return `${month} ${day}`
  } catch {
    return typeof date === 'string' ? date : ''
  }
}
