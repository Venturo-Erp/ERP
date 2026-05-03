'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Save, X } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EditEventDialogState } from '../types'
import { CALENDAR_LABELS } from '../constants/labels'

interface EditEventDialogProps {
  dialog: EditEventDialogState
  onDialogChange: (dialog: EditEventDialogState) => void
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

export function EditEventDialog({
  dialog,
  onDialogChange,
  onSubmit,
  onClose,
}: EditEventDialogProps) {
  return (
    <Dialog open={dialog.open} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{CALENDAR_LABELS.EDIT_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={e => {
            e.preventDefault()
            if (dialog.title.trim()) {
              onSubmit()
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {CALENDAR_LABELS.START_DATE}
              </label>
              <DatePicker
                value={dialog.startDate}
                onChange={date => onDialogChange({ ...dialog, startDate: date })}
                placeholder={CALENDAR_LABELS.PLACEHOLDER_SELECT_DATE}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {CALENDAR_LABELS.END_DATE_OPTIONAL_2}
              </label>
              <DatePicker
                value={dialog.endDate}
                onChange={date => onDialogChange({ ...dialog, endDate: date })}
                placeholder={CALENDAR_LABELS.PLACEHOLDER_SELECT_DATE}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {CALENDAR_LABELS.TITLE_LABEL}
            </label>
            <Input
              value={dialog.title}
              onChange={e => onDialogChange({ ...dialog, title: e.target.value })}
              placeholder={CALENDAR_LABELS.PLACEHOLDER_ENTER_TITLE}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {CALENDAR_LABELS.EVENT_TYPE}
              </label>
              <Select
                value={dialog.visibility}
                onValueChange={(value: 'personal' | 'company') =>
                  onDialogChange({
                    ...dialog,
                    visibility: value,
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={CALENDAR_LABELS.PLACEHOLDER_SELECT_EVENT_TYPE} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">{CALENDAR_LABELS.PERSONAL_CALENDAR}</SelectItem>
                  <SelectItem value="company">{CALENDAR_LABELS.COMPANY_CALENDAR}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {CALENDAR_LABELS.START_TIME_OPTIONAL_2}
              </label>
              <Input
                value={dialog.startTime}
                onChange={e => onDialogChange({ ...dialog, startTime: e.target.value })}
                onBlur={e => {
                  const { start, end } = parseTimeRange(e.target.value)
                  onDialogChange({
                    ...dialog,
                    startTime: start,
                    endTime: end || dialog.endTime,
                  })
                }}
                placeholder={CALENDAR_LABELS.PLACEHOLDER_TIME_RANGE}
                className="mt-1"
              />
            </div>
          </div>

          {/* 結束時間 - 有開始時間才顯示 */}
          {dialog.startTime && (
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {CALENDAR_LABELS.END_TIME_OPTIONAL}
              </label>
              <Input
                value={dialog.endTime}
                onChange={e => onDialogChange({ ...dialog, endTime: e.target.value })}
                onBlur={e =>
                  onDialogChange({ ...dialog, endTime: formatSingleTime(e.target.value) })
                }
                placeholder={CALENDAR_LABELS.PLACEHOLDER_END_TIME}
                className="mt-1"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {CALENDAR_LABELS.DESCRIPTION_OPTIONAL_2}
            </label>
            <Input
              value={dialog.description}
              onChange={e => onDialogChange({ ...dialog, description: e.target.value })}
              placeholder={CALENDAR_LABELS.PLACEHOLDER_ENTER_DESCRIPTION}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="soft-gold" onClick={onClose} className="gap-2">
              <X size={16} />
              {CALENDAR_LABELS.CANCEL}
            </Button>
            <Button variant="soft-gold"
              type="submit"
              disabled={!dialog.title.trim()}
 className="gap-2"
            >
              <Save size={16} />
              {CALENDAR_LABELS.SAVE_CHANGES}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
