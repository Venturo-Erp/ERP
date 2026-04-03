'use client'

import { X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddEventDialogState, NewEventForm } from '../types'
import { CALENDAR_LABELS } from '../constants/labels'

interface AddEventDialogProps {
  dialog: AddEventDialogState
  newEvent: NewEventForm
  onNewEventChange: (event: NewEventForm) => void
  onDialogChange: (dialog: AddEventDialogState) => void
  onSubmit: () => void
  onClose: () => void
}

// 全形轉半形
const toHalfWidth = (str: string): string => {
  return str
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[－]/g, '-')
    .replace(/[～]/g, '~')
    .replace(/[：]/g, ':')
}

// 格式化單一時間（0800 → 08:00）
const formatSingleTime = (value: string): string => {
  const normalized = toHalfWidth(value)
  const digits = normalized.replace(/[^\d]/g, '')
  if (!digits) return ''

  let hour = 0
  let minute = 0

  if (digits.length === 1) {
    hour = parseInt(digits, 10)
  } else if (digits.length === 2) {
    hour = parseInt(digits, 10)
  } else if (digits.length === 3) {
    hour = parseInt(digits.slice(0, 1), 10)
    minute = parseInt(digits.slice(1), 10)
  } else if (digits.length >= 4) {
    hour = parseInt(digits.slice(0, 2), 10)
    minute = parseInt(digits.slice(2, 4), 10)
  }

  if (hour > 23) hour = 23
  if (minute > 59) minute = 59

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

// 解析時間範圍（0800-1400 → { start: '08:00', end: '14:00' }）
const parseTimeRange = (value: string): { start: string; end: string | null } => {
  const normalized = toHalfWidth(value)
  const separatorMatch = normalized.match(/[-~]/)
  if (separatorMatch) {
    const parts = normalized.split(/[-~]/)
    if (parts.length === 2) {
      const start = formatSingleTime(parts[0].trim())
      const end = formatSingleTime(parts[1].trim())
      return { start, end: end || null }
    }
  }
  return { start: formatSingleTime(normalized), end: null }
}

// 輸入框樣式
const inputClassName =
  'w-full px-4 py-2.5 rounded-lg border border-morandi-container bg-card text-[var(--morandi-primary)] placeholder:text-[var(--morandi-primary)]/30 focus:outline-none focus:ring-1 focus:ring-[#B8A99A] focus:border-morandi-container transition-shadow text-sm shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]'

export function AddEventDialog({
  dialog,
  newEvent,
  onNewEventChange,
  onDialogChange,
  onSubmit,
  onClose,
}: AddEventDialogProps) {
  return (
    <Dialog open={dialog.open} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className="max-w-[600px] p-0 rounded-2xl border-morandi-container shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] overflow-hidden [&>button:last-child]:hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--morandi-primary)]">
            {CALENDAR_LABELS.ADD_DIALOG_TITLE}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--morandi-primary)]/40 hover:text-[var(--morandi-primary)] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={e => {
            e.preventDefault()
            if (newEvent.title.trim()) {
              onSubmit()
            }
          }}
          className="p-6 pt-4 space-y-6"
        >
          {/* 日期欄位 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
                {CALENDAR_LABELS.START_DATE}
              </label>
              <DatePicker
                value={dialog.selectedDate}
                onChange={date => onDialogChange({ ...dialog, selectedDate: date })}
                placeholder={CALENDAR_LABELS.PLACEHOLDER_SELECT_DATE}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
                {CALENDAR_LABELS.END_DATE_OPTIONAL}
              </label>
              <DatePicker
                value={newEvent.end_date}
                onChange={date => onNewEventChange({ ...newEvent, end_date: date })}
                placeholder={CALENDAR_LABELS.PLACEHOLDER_SELECT_DATE}
              />
            </div>
          </div>

          {/* 標題 */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
              {CALENDAR_LABELS.TITLE_LABEL}
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={e => onNewEventChange({ ...newEvent, title: e.target.value })}
              placeholder={CALENDAR_LABELS.PLACEHOLDER_ENTER_TITLE}
              className={inputClassName}
            />
          </div>

          {/* 類型與時間 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
                {CALENDAR_LABELS.EVENT_TYPE}
              </label>
              <Select
                value={newEvent.visibility}
                onValueChange={(value: 'personal' | 'company') =>
                  onNewEventChange({
                    ...newEvent,
                    visibility: value,
                  })
                }
              >
                <SelectTrigger className={inputClassName}>
                  <SelectValue placeholder={CALENDAR_LABELS.PLACEHOLDER_SELECT_EVENT_TYPE} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">{CALENDAR_LABELS.PERSONAL_CALENDAR}</SelectItem>
                  <SelectItem value="company">{CALENDAR_LABELS.COMPANY_CALENDAR}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
                {CALENDAR_LABELS.START_TIME_OPTIONAL}
              </label>
              <input
                type="text"
                value={newEvent.start_time}
                onChange={e => onNewEventChange({ ...newEvent, start_time: e.target.value })}
                onBlur={e => {
                  const { start, end } = parseTimeRange(e.target.value)
                  onNewEventChange({
                    ...newEvent,
                    start_time: start,
                    end_time: end || newEvent.end_time,
                  })
                }}
                placeholder={CALENDAR_LABELS.PLACEHOLDER_TIME_RANGE}
                className={inputClassName}
              />
            </div>
          </div>

          {/* 說明 */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--morandi-primary)]/80">
              {CALENDAR_LABELS.DESCRIPTION_OPTIONAL}
            </label>
            <textarea
              value={newEvent.description}
              onChange={e => onNewEventChange({ ...newEvent, description: e.target.value })}
              placeholder={CALENDAR_LABELS.PLACEHOLDER_ENTER_DESCRIPTION}
              rows={3}
              className={`${inputClassName} resize-none`}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-morandi-container text-[var(--morandi-primary)] bg-card hover:bg-background transition-colors text-sm font-medium"
          >
            {CALENDAR_LABELS.CANCEL}
          </button>
          <button
            type="submit"
            disabled={!newEvent.title.trim()}
            onClick={() => newEvent.title.trim() && onSubmit()}
            className="px-6 py-2.5 rounded-lg bg-morandi-container hover:bg-morandi-container text-white shadow-md hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {CALENDAR_LABELS.ADD_ENTER}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
