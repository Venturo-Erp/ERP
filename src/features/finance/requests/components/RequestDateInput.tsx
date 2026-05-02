'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { PAYMENT_ITEM_ROW_LABELS, REQUEST_DATE_INPUT_LABELS } from '../../constants/labels'

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
  // 預設帶入今天（原本預設下週四是 Corner 專屬、其他租戶不適用）
  // 未來 workspace 設定上線後、可改為依 workspace.default_request_date_rule 設定
  useEffect(() => {
    if (!value) {
      onChange(getTodayString(), false)
    }
  }, [])

  const handleDateChange = (selectedDate: string) => {
    const isThursday = selectedDate ? new Date(selectedDate + 'T00:00:00').getDay() === 4 : false
    onChange(selectedDate, !isThursday)
  }

  const isSpecialBilling = value && new Date(value + 'T00:00:00').getDay() !== 4

  // 跟 Combobox 同高、不放 label 跟提示文字（避免 header flex row 高度不齊）
  // special billing 用底色提示、滑鼠 hover 看 wrap 的 title 完整文字
  const tooltip = value
    ? isSpecialBilling
      ? '特殊出帳：非週四請款'
      : REQUEST_DATE_INPUT_LABELS.一般請款_週四出帳
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
