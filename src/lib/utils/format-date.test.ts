import { describe, it, expect, vi } from 'vitest'
import {
  formatDate,
  formatDateTW,
  formatDateCompact,
  formatDateCompactPadded,
  formatMonthShort,
  formatDateTime,
  formatTimeOnly,
  getTodayString,
  isSameDay,
  daysBetween,
  formatDateChinese,
  formatDateMonthDayChinese,
  formatYearMonth,
  formatWeekday,
  formatDateChineseWithWeekday,
  formatDateMonthDayEN,
  getDay,
  formatDateISO,
  parseLocalDate,
  toTaipeiDateString,
  toTaipeiTimeString,
  startOfDay,
  formatDateShort,
  formatDateDisplay,
} from './format-date'

describe('formatDate', () => {
  it('formats Date object to YYYY-MM-DD', () => {
    expect(formatDate(new Date(2024, 0, 15))).toBe('2024-01-15')
  })
  it('formats ISO string', () => {
    expect(formatDate('2024-06-01T10:00:00Z')).toMatch(/^2024-06-0[12]$/)
  })
  it('returns empty for null', () => {
    expect(formatDate(null)).toBe('')
  })
  it('returns empty for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })
  it('returns empty for invalid string', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
  it('pads single digit month and day', () => {
    expect(formatDate(new Date(2024, 0, 5))).toBe('2024-01-05')
  })
})

describe('formatDateTW', () => {
  it('formats to YYYY-MM-DD', () => {
    expect(formatDateTW(new Date(2024, 0, 15))).toBe('2024-01-15')
  })
  it('returns empty for null', () => {
    expect(formatDateTW(null)).toBe('')
  })
  it('returns empty for invalid', () => {
    expect(formatDateTW('bad')).toBe('')
  })
  it('handles string input', () => {
    expect(formatDateTW('2024-12-25')).toMatch(/2024-12-25/)
  })
})

describe('formatDateDisplay', () => {
  it('is same as formatDateTW', () => {
    const d = new Date(2024, 5, 1)
    expect(formatDateDisplay(d)).toBe(formatDateTW(d))
  })
})

describe('formatDateCompact', () => {
  it('formats to MM-DD with padding', () => {
    expect(formatDateCompact(new Date(2024, 0, 5))).toBe('01-05')
  })
  it('returns empty for null', () => {
    expect(formatDateCompact(null)).toBe('')
  })
  it('returns empty for invalid', () => {
    expect(formatDateCompact('xyz')).toBe('')
  })
})

describe('formatDateCompactPadded', () => {
  it('formats to MM-DD', () => {
    expect(formatDateCompactPadded(new Date(2024, 0, 5))).toBe('01-05')
  })
  it('formats double digit', () => {
    expect(formatDateCompactPadded(new Date(2024, 11, 25))).toBe('12-25')
  })
  it('returns empty for null', () => {
    expect(formatDateCompactPadded(null)).toBe('')
  })
})

describe('formatMonthShort', () => {
  it('returns JAN for January', () => {
    expect(formatMonthShort(new Date(2024, 0, 1))).toBe('JAN')
  })
  it('returns DEC for December', () => {
    expect(formatMonthShort(new Date(2024, 11, 1))).toBe('DEC')
  })
  it('returns empty for null', () => {
    expect(formatMonthShort(null)).toBe('')
  })
  it('returns empty for invalid', () => {
    expect(formatMonthShort('invalid')).toBe('')
  })
  it('handles all months', () => {
    const expected = [
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
    for (let i = 0; i < 12; i++) {
      expect(formatMonthShort(new Date(2024, i, 1))).toBe(expected[i])
    }
  })
})

describe('formatDateTime', () => {
  it('formats date and time', () => {
    expect(formatDateTime(new Date(2024, 0, 15, 14, 30))).toBe('2024/1/15 14:30')
  })
  it('pads hours and minutes', () => {
    expect(formatDateTime(new Date(2024, 0, 1, 8, 5))).toBe('2024/1/1 08:05')
  })
  it('returns empty for null', () => {
    expect(formatDateTime(null)).toBe('')
  })
})

describe('formatTimeOnly', () => {
  it('formats HH:mm', () => {
    expect(formatTimeOnly(new Date(2024, 0, 1, 9, 5))).toBe('09:05')
  })
  it('returns empty for null', () => {
    expect(formatTimeOnly(null)).toBe('')
  })
  it('returns empty for invalid', () => {
    expect(formatTimeOnly('nope')).toBe('')
  })
})

describe('getTodayString', () => {
  it('returns today in YYYY-MM-DD', () => {
    const result = getTodayString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isSameDay', () => {
  it('returns true for same day', () => {
    expect(isSameDay(new Date(2024, 0, 1, 10), new Date(2024, 0, 1, 20))).toBe(true)
  })
  it('returns false for different days', () => {
    expect(isSameDay(new Date(2024, 0, 1), new Date(2024, 0, 2))).toBe(false)
  })
  it('works with string inputs', () => {
    expect(isSameDay('2024-01-15', '2024-01-15')).toBe(true)
  })
  it('returns false for different months', () => {
    expect(isSameDay('2024-01-15', '2024-02-15')).toBe(false)
  })
})

describe('daysBetween', () => {
  it('calculates days between two dates', () => {
    expect(daysBetween('2024-01-01', '2024-01-10')).toBe(9)
  })
  it('works with Date objects', () => {
    expect(daysBetween(new Date(2024, 0, 1), new Date(2024, 0, 4))).toBe(3)
  })
  it('returns 0 for same date', () => {
    expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0)
  })
  it('handles reverse order (absolute)', () => {
    expect(daysBetween('2024-01-10', '2024-01-01')).toBe(9)
  })
})

describe('formatDateChinese', () => {
  it('formats to YYYY年M月D日', () => {
    expect(formatDateChinese(new Date(2024, 0, 15))).toBe('2024年1月15日')
  })
  it('returns empty for null', () => {
    expect(formatDateChinese(null)).toBe('')
  })
})

describe('formatDateMonthDayChinese', () => {
  it('formats to M月D日', () => {
    expect(formatDateMonthDayChinese(new Date(2024, 0, 15))).toBe('1月15日')
  })
  it('returns empty for null', () => {
    expect(formatDateMonthDayChinese(null)).toBe('')
  })
})

describe('formatYearMonth', () => {
  it('formats to YYYY年M月', () => {
    expect(formatYearMonth(new Date(2024, 0, 15))).toBe('2024年1月')
  })
  it('returns empty for null', () => {
    expect(formatYearMonth(null)).toBe('')
  })
})

describe('formatWeekday', () => {
  it('returns 週日 for Sunday', () => {
    expect(formatWeekday(new Date(2024, 0, 7))).toBe('週日') // Sunday
  })
  it('returns 週一 for Monday', () => {
    expect(formatWeekday(new Date(2024, 0, 8))).toBe('週一')
  })
  it('returns empty for null', () => {
    expect(formatWeekday(null)).toBe('')
  })
  it('returns empty for invalid', () => {
    expect(formatWeekday('bad')).toBe('')
  })
})

describe('formatDateChineseWithWeekday', () => {
  it('formats full Chinese with weekday', () => {
    expect(formatDateChineseWithWeekday(new Date(2024, 0, 8))).toBe('2024年1月8日 週一')
  })
  it('returns empty for null', () => {
    expect(formatDateChineseWithWeekday(null)).toBe('')
  })
})

describe('formatDateMonthDayEN', () => {
  it('formats to Jan 15', () => {
    expect(formatDateMonthDayEN(new Date(2024, 0, 15))).toBe('Jan 15')
  })
  it('formats Dec', () => {
    expect(formatDateMonthDayEN(new Date(2024, 11, 25))).toBe('Dec 25')
  })
  it('returns empty for null', () => {
    expect(formatDateMonthDayEN(null)).toBe('')
  })
})

describe('getDay', () => {
  it('returns day of month', () => {
    expect(getDay(new Date(2024, 0, 15))).toBe(15)
  })
  it('returns 0 for null', () => {
    expect(getDay(null)).toBe(0)
  })
  it('returns 0 for invalid', () => {
    expect(getDay('bad')).toBe(0)
  })
})

describe('formatDateISO', () => {
  it('formats Date to YYYY-MM-DD', () => {
    expect(formatDateISO(new Date(2024, 0, 15))).toBe('2024-01-15')
  })
  it('returns empty for null', () => {
    expect(formatDateISO(null)).toBe('')
  })
  it('returns empty for undefined', () => {
    expect(formatDateISO(undefined)).toBe('')
  })
})

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD', () => {
    const d = parseLocalDate('2024-01-15')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2024)
    expect(d!.getMonth()).toBe(0)
    expect(d!.getDate()).toBe(15)
  })
  it('ignores time part', () => {
    const d = parseLocalDate('2024-01-15T10:30:00Z')
    expect(d!.getDate()).toBe(15)
  })
  it('returns null for null', () => {
    expect(parseLocalDate(null)).toBeNull()
  })
  it('returns null for undefined', () => {
    expect(parseLocalDate(undefined)).toBeNull()
  })
  it('returns null for bad format', () => {
    expect(parseLocalDate('2024/01/15')).toBeNull()
  })
  it('returns null for invalid month', () => {
    expect(parseLocalDate('2024-13-01')).toBeNull()
  })
  it('returns null for month 0', () => {
    expect(parseLocalDate('2024-00-01')).toBeNull()
  })
  it('returns null for day 0', () => {
    expect(parseLocalDate('2024-01-00')).toBeNull()
  })
  it('returns null for day 32', () => {
    expect(parseLocalDate('2024-01-32')).toBeNull()
  })
  it('returns null for non-numeric', () => {
    expect(parseLocalDate('abcd-ef-gh')).toBeNull()
  })
})

describe('toTaipeiDateString', () => {
  it('returns empty for null', () => {
    expect(toTaipeiDateString(null)).toBe('')
  })
  it('returns empty for undefined', () => {
    expect(toTaipeiDateString(undefined)).toBe('')
  })
  it('converts valid ISO string', () => {
    const result = toTaipeiDateString('2024-01-15T16:00:00.000Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('returns original for invalid', () => {
    expect(toTaipeiDateString('bad')).toBe('bad')
  })
})

describe('toTaipeiTimeString', () => {
  it('returns empty for null', () => {
    expect(toTaipeiTimeString(null)).toBe('')
  })
  it('returns time for valid ISO', () => {
    const result = toTaipeiTimeString('2024-01-15T06:30:00.000Z')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })
  it('returns empty for invalid', () => {
    expect(toTaipeiTimeString('bad')).toBe('')
  })
  it('skipMidnight returns empty for midnight', () => {
    // Create a date that's midnight in Taipei (16:00 UTC previous day)
    const result = toTaipeiTimeString('2024-01-14T16:00:00.000Z', { skipMidnight: true })
    expect(result).toBe('')
  })
})

describe('startOfDay', () => {
  it('sets time to midnight', () => {
    const d = startOfDay(new Date(2024, 0, 15, 14, 30, 45, 123))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getMilliseconds()).toBe(0)
  })
  it('preserves the date', () => {
    const d = startOfDay(new Date(2024, 5, 15, 23, 59))
    expect(d.getDate()).toBe(15)
    expect(d.getMonth()).toBe(5)
  })
  it('does not mutate original', () => {
    const orig = new Date(2024, 0, 15, 14, 30)
    startOfDay(orig)
    expect(orig.getHours()).toBe(14)
  })
})

describe('formatDateShort', () => {
  it('formats Date to JAN 15', () => {
    expect(formatDateShort(new Date(2024, 0, 15))).toBe('JAN 15')
  })
  it('formats MM/DD string', () => {
    expect(formatDateShort('1/15')).toBe('JAN 15')
  })
  it('formats 12/25 string', () => {
    expect(formatDateShort('12/25')).toBe('DEC 25')
  })
  it('returns empty for null', () => {
    expect(formatDateShort(null)).toBe('')
  })
  it('returns empty for undefined', () => {
    expect(formatDateShort(undefined)).toBe('')
  })
  it('handles ISO string', () => {
    const result = formatDateShort('2024-01-15')
    expect(result).toMatch(/JAN 15/)
  })
})
