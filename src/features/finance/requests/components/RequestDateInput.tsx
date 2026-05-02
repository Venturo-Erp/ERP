'use client'

import { getTodayString } from '@/lib/utils/format-date'
import { useEffect } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { useLayoutContext } from '@/lib/auth/useLayoutContext'
import { PAYMENT_ITEM_ROW_LABELS, REQUEST_DATE_INPUT_LABELS } from '../../constants/labels'

const WEEKDAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

interface RequestDateInputProps {
  value: string
  onChange: (date: string, isSpecialBilling: boolean) => void
  label?: string
}

export function RequestDateInput({
  value,
  onChange,
  label = REQUEST_DATE_INPUT_LABELS.請款日期,
}: RequestDateInputProps) {
  // SSOT：workspace.default_billing_day_of_week（admin 在 /settings/company 設定）
  // 沒設值（NULL）fallback 4=週四（Corner 既有規則 / migration 預設）
  const { payload } = useLayoutContext()
  const defaultBillingDay = payload.workspace?.default_billing_day_of_week ?? 4

  // 預設帶入今天
  useEffect(() => {
    if (!value) {
      const today = getTodayString()
      const isToday = new Date(today + 'T00:00:00').getDay() === defaultBillingDay
      onChange(today, !isToday)
    }
  }, [defaultBillingDay])

  const handleDateChange = (selectedDate: string) => {
    const isDefaultDay = selectedDate
      ? new Date(selectedDate + 'T00:00:00').getDay() === defaultBillingDay
      : false
    onChange(selectedDate, !isDefaultDay)
  }

  const isSpecialBilling =
    !!value && new Date(value + 'T00:00:00').getDay() !== defaultBillingDay

  // 跟 Combobox 同高、不放 label 跟提示文字（避免 header flex row 高度不齊）
  // special billing 用底色提示、滑鼠 hover 看 title 完整文字
  const defaultDayName = WEEKDAY_NAMES[defaultBillingDay] || '週四'
  const tooltip = value
    ? isSpecialBilling
      ? `特殊出帳：非${defaultDayName}請款`
      : `正常出帳：${defaultDayName}請款`
    : undefined

  return (
    <div title={tooltip}>
      <DatePicker
        value={value}
        onChange={date => handleDateChange(date)}
        className={cn(isSpecialBilling && 'bg-morandi-gold/10 border-morandi-gold/30')}
        placeholder={label || PAYMENT_ITEM_ROW_LABELS.選擇日期}
      />
    </div>
  )
}
