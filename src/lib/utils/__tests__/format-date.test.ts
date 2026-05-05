import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTW,
  formatDateCompact,
  formatDateCompactPadded,
  formatDateChinese,
  formatDateMonthDayChinese,
  isSameDay,
  daysBetween,
  formatWeekday,
  formatYearMonth,
  parseLocalDate,
  startOfDay,
  formatDateISO,
  getDay,
  formatDateShort,
} from '../format-date'

describe('format-date', () => {
  // formatDate
  describe('formatDate', () => {
    it('formats Date object to YYYY-MM-DD', () => {
      expect(formatDate(new Date(2024, 0, 15))).toBe('2024-01-15')
    })

    it('formats ISO string to YYYY-MM-DD', () => {
      expect(formatDate('2024-06-01T12:00:00Z')).toMatch(/^2024-0[56]-\d{2}$/)
    })

    it('returns empty for null', () => {
      expect(formatDate(null)).toBe('')
    })

    it('returns empty for undefined', () => {
      expect(formatDate(undefined)).toBe('')
    })

    it('returns empty for invalid date string', () => {
      expect(formatDate('not-a-date')).toBe('')
    })

    it('pads single digit month and day', () => {
      expect(formatDate(new Date(2024, 2, 5))).toBe('2024-03-05')
    })
  })

  // formatDateTW (公司統一格式 YYYY-MM-DD)
  describe('formatDateTW', () => {
    it('formats to YYYY-MM-DD', () => {
      expect(formatDateTW(new Date(2024, 0, 5))).toBe('2024-01-05')
    })

    it('returns empty for null', () => {
      expect(formatDateTW(null)).toBe('')
    })

    it('pads month and day', () => {
      expect(formatDateTW(new Date(2024, 11, 25))).toBe('2024-12-25')
    })
  })

  // formatDateCompact (MM-DD)
  describe('formatDateCompact', () => {
    it('formats to MM-DD with padding', () => {
      expect(formatDateCompact(new Date(2024, 0, 5))).toBe('01-05')
    })

    it('returns empty for null', () => {
      expect(formatDateCompact(null)).toBe('')
    })
  })

  // formatDateCompactPadded（已 deprecated、行為等同 formatDateCompact）
  describe('formatDateCompactPadded', () => {
    it('formats to MM-DD with padding', () => {
      expect(formatDateCompactPadded(new Date(2024, 0, 5))).toBe('01-05')
    })

    it('returns empty for undefined', () => {
      expect(formatDateCompactPadded(undefined)).toBe('')
    })
  })

  // formatDateChinese
  describe('formatDateChinese', () => {
    it('formats to Chinese date', () => {
      const result = formatDateChinese(new Date(2024, 0, 15))
      expect(result).toContain('2024')
      expect(result).toContain('1')
      expect(result).toContain('15')
    })

    it('returns empty for null', () => {
      expect(formatDateChinese(null)).toBe('')
    })
  })

  // formatDateMonthDayChinese
  describe('formatDateMonthDayChinese', () => {
    it('formats month and day in Chinese', () => {
      const result = formatDateMonthDayChinese(new Date(2024, 2, 8))
      expect(result).toContain('3')
      expect(result).toContain('8')
    })

    it('returns empty for null', () => {
      expect(formatDateMonthDayChinese(null)).toBe('')
    })
  })

  // isSameDay
  describe('isSameDay', () => {
    it('returns true for same day', () => {
      expect(isSameDay(new Date(2024, 0, 15, 10), new Date(2024, 0, 15, 20))).toBe(true)
    })

    it('returns false for different days', () => {
      expect(isSameDay(new Date(2024, 0, 15), new Date(2024, 0, 16))).toBe(false)
    })

    it('works with string inputs', () => {
      expect(isSameDay('2024-01-15', '2024-01-15')).toBe(true)
    })
  })

  // daysBetween
  describe('daysBetween', () => {
    it('calculates days between two dates', () => {
      expect(daysBetween('2024-01-01', '2024-01-11')).toBe(10)
    })

    it('returns 0 for same day', () => {
      expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0)
    })

    it('works with Date objects', () => {
      expect(daysBetween(new Date(2024, 0, 1), new Date(2024, 0, 6))).toBe(5)
    })
  })

  // formatWeekday
  describe('formatWeekday', () => {
    it('returns weekday string', () => {
      // 2024-01-15 is Monday
      const result = formatWeekday(new Date(2024, 0, 15))
      expect(result).toBeTruthy()
    })

    it('returns empty for null', () => {
      expect(formatWeekday(null)).toBe('')
    })
  })

  // formatYearMonth
  describe('formatYearMonth', () => {
    it('formats year and month', () => {
      const result = formatYearMonth(new Date(2024, 5, 15))
      expect(result).toBeTruthy()
    })

    it('returns empty for null', () => {
      expect(formatYearMonth(null)).toBe('')
    })
  })

  // parseLocalDate
  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD string to Date', () => {
      const result = parseLocalDate('2024-01-15')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getFullYear()).toBe(2024)
      expect(result!.getMonth()).toBe(0)
      expect(result!.getDate()).toBe(15)
    })

    it('returns null for null input', () => {
      expect(parseLocalDate(null)).toBeNull()
    })

    it('returns null for undefined', () => {
      expect(parseLocalDate(undefined)).toBeNull()
    })
  })

  // startOfDay
  describe('startOfDay', () => {
    it('sets time to 00:00:00', () => {
      const result = startOfDay(new Date(2024, 0, 15, 14, 30, 45))
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })
  })

  // formatDateISO
  describe('formatDateISO', () => {
    it('formats Date to ISO string', () => {
      const result = formatDateISO(new Date(2024, 0, 15))
      expect(result).toContain('2024')
    })

    it('returns empty for null', () => {
      expect(formatDateISO(null)).toBe('')
    })
  })

  // getDay
  describe('getDay', () => {
    it('returns day of month', () => {
      expect(getDay(new Date(2024, 0, 15))).toBe(15)
    })

    it('returns 1 for first day of month', () => {
      expect(getDay(new Date(2024, 0, 1))).toBe(1)
    })
  })

  // formatDateShort
  describe('formatDateShort', () => {
    it('returns a short format string', () => {
      const result = formatDateShort(new Date(2024, 0, 15))
      expect(result).toBeTruthy()
    })

    it('returns empty for null', () => {
      expect(formatDateShort(null)).toBe('')
    })
  })
})
