'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type Granularity = 'month' | 'quarter' | 'year' | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
}

interface DateRangeSelectorProps {
  onChange: (range: DateRange) => void
  /** 預設顆粒度 */
  defaultGranularity?: Granularity
  /** 隱藏某些顆粒度選項 */
  hideGranularities?: Granularity[]
}

function getMonthRange(year: number, month: number): DateRange {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  return { startDate, endDate }
}

function getQuarterRange(year: number, quarter: number): DateRange {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`
  const lastDay = new Date(year, endMonth, 0).getDate()
  const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`
  return { startDate, endDate }
}

function getYearRange(year: number): DateRange {
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` }
}

function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  month: '月',
  quarter: '季',
  year: '年',
  custom: '自訂',
}

export function DateRangeSelector({
  onChange,
  defaultGranularity = 'month',
  hideGranularities = [],
}: DateRangeSelectorProps) {
  const now = new Date()
  const [granularity, setGranularity] = useState<Granularity>(defaultGranularity)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [quarter, setQuarter] = useState(getCurrentQuarter())
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const visibleGranularities = useMemo(
    () =>
      (['month', 'quarter', 'year', 'custom'] as Granularity[]).filter(
        g => !hideGranularities.includes(g)
      ),
    [hideGranularities]
  )

  const currentRange = useMemo((): DateRange => {
    switch (granularity) {
      case 'month':
        return getMonthRange(year, month)
      case 'quarter':
        return getQuarterRange(year, quarter)
      case 'year':
        return getYearRange(year)
      case 'custom':
        return { startDate: customStart, endDate: customEnd }
    }
  }, [granularity, year, month, quarter, customStart, customEnd])

  // 當 range 改變時通知父層
  const fireChange = useCallback(
    (range: DateRange) => {
      if (range.startDate && range.endDate) {
        onChange(range)
      }
    },
    [onChange]
  )

  const handleGranularityChange = (g: Granularity) => {
    setGranularity(g)
    if (g === 'month') fireChange(getMonthRange(year, month))
    else if (g === 'quarter') fireChange(getQuarterRange(year, quarter))
    else if (g === 'year') fireChange(getYearRange(year))
  }

  const handlePrev = () => {
    if (granularity === 'month') {
      const newMonth = month === 1 ? 12 : month - 1
      const newYear = month === 1 ? year - 1 : year
      setMonth(newMonth)
      setYear(newYear)
      fireChange(getMonthRange(newYear, newMonth))
    } else if (granularity === 'quarter') {
      const newQuarter = quarter === 1 ? 4 : quarter - 1
      const newYear = quarter === 1 ? year - 1 : year
      setQuarter(newQuarter)
      setYear(newYear)
      fireChange(getQuarterRange(newYear, newQuarter))
    } else if (granularity === 'year') {
      const newYear = year - 1
      setYear(newYear)
      fireChange(getYearRange(newYear))
    }
  }

  const handleNext = () => {
    if (granularity === 'month') {
      const newMonth = month === 12 ? 1 : month + 1
      const newYear = month === 12 ? year + 1 : year
      setMonth(newMonth)
      setYear(newYear)
      fireChange(getMonthRange(newYear, newMonth))
    } else if (granularity === 'quarter') {
      const newQuarter = quarter === 4 ? 1 : quarter + 1
      const newYear = quarter === 4 ? year + 1 : year
      setQuarter(newQuarter)
      setYear(newYear)
      fireChange(getQuarterRange(newYear, newQuarter))
    } else if (granularity === 'year') {
      const newYear = year + 1
      setYear(newYear)
      fireChange(getYearRange(newYear))
    }
  }

  const label = useMemo(() => {
    switch (granularity) {
      case 'month':
        return `${year} 年 ${month} 月`
      case 'quarter':
        return `${year} 年 Q${quarter}`
      case 'year':
        return `${year} 年`
      case 'custom':
        return '自訂區間'
    }
  }, [granularity, year, month, quarter])

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 顆粒度切換 */}
      <div className="flex items-center bg-morandi-container rounded-lg p-0.5">
        {visibleGranularities.map(g => (
          <button
            key={g}
            onClick={() => handleGranularityChange(g)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              granularity === g
                ? 'bg-white text-morandi-primary shadow-sm'
                : 'text-morandi-secondary hover:text-morandi-primary'
            }`}
          >
            {GRANULARITY_LABELS[g]}
          </button>
        ))}
      </div>

      {/* 日期導航 */}
      {granularity !== 'custom' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 text-morandi-secondary hover:text-morandi-primary transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="min-w-[120px] text-center font-semibold text-morandi-primary text-base">
            {label}
          </span>
          <button
            onClick={handleNext}
            className="p-1.5 text-morandi-secondary hover:text-morandi-primary transition-colors"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <DatePicker
            value={customStart}
            onChange={v => {
              setCustomStart(v)
              if (v && customEnd) fireChange({ startDate: v, endDate: customEnd })
            }}
            placeholder="開始日期"
            buttonClassName="h-8 text-xs"
          />
          <span className="text-morandi-secondary text-sm">~</span>
          <DatePicker
            value={customEnd}
            onChange={v => {
              setCustomEnd(v)
              if (customStart && v) fireChange({ startDate: customStart, endDate: v })
            }}
            placeholder="結束日期"
            buttonClassName="h-8 text-xs"
          />
        </div>
      )}
    </div>
  )
}
