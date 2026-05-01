'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface RequestDateInputProps {
  value: string
  onChange: (date: string, isSpecialBilling: boolean) => void
  label?: string
}

export function RequestDateInput({
  value,
  onChange,
  label = t('requestDateInput.請款日期'),
}: RequestDateInputProps) {
  // 預設帶入今天（原本預設下週四是 Corner 專屬、其他租戶不適用）
  // 未來 workspace 設定上線後、可改為依 workspace.default_request_date_rule 設定
  useEffect(() => {
    if (!value) {
      onChange(getTodayString(), false)
    }
  }, [])

  const handleDateChange = (selectedDate: string) => {
  const t = useTranslations('finance')

    const isThursday = selectedDate ? new Date(selectedDate + 'T00:00:00').getDay() === 4 : false
    onChange(selectedDate, !isThursday)
  }

  const isSpecialBilling = value && new Date(value + 'T00:00:00').getDay() !== 4

  return (
    <div>
      <label className="text-sm font-medium text-morandi-primary">{label}</label>
      <DatePicker
        value={value}
        onChange={date => handleDateChange(date)}
        className={cn('mt-1', isSpecialBilling && 'bg-morandi-gold/10 border-morandi-gold/20')}
        placeholder={t('paymentItemRow.選擇日期')}
      />
      {value && (
        <p
          className={cn(
            'text-xs mt-1',
            isSpecialBilling ? 'text-morandi-gold' : 'text-morandi-secondary'
          )}
        >
          {isSpecialBilling ? '特殊出帳：非週四請款' : t('requestDateInput.一般請款_週四出帳')}
        </p>
      )}
    </div>
  )
}
