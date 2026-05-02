'use client'
/**
 * QuoteDialog - Form dialog for adding/editing quotes
 */

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tour } from '@/types/tour.types'
import { QUOTE_DIALOG_LABELS } from '../constants/labels'

interface QuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: {
    name: string
    status: 'proposed' | 'approved'
    group_size: number | ''
    tour_id: string | null
    is_pinned: boolean
    code: string
  }
  setFormField: (field: string, value: string | number | boolean | null) => void
  tours: Tour[]
  onSubmit: () => Promise<boolean>
  onClose: () => void
}

const QuoteDialog: React.FC<QuoteDialogProps> = ({
  open,
  onOpenChange,
  formData,
  setFormField,
  tours,
  onSubmit,
  onClose,
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim()) {
      const success = await onSubmit()
      if (success) {
        onClose()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        level={1}
        className="max-w-md"
        onInteractOutside={e => {
          const target = e.target as HTMLElement
          if (
            target.closest('[role="listbox"]') ||
            target.closest('[data-radix-select-viewport]') ||
            target.closest('[cmdk-root]')
          ) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{QUOTE_DIALOG_LABELS.ADD_8248}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 選擇是否關聯旅遊團 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {QUOTE_DIALOG_LABELS.LABEL_333}
            </label>
            <Combobox
              options={[
                { value: '', label: QUOTE_DIALOG_LABELS.獨立報價單_無旅遊團 },
                ...tours.map(tour => ({
                  value: tour.id,
                  label: `${tour.code} - ${tour.name}`,
                  data: tour,
                })),
              ]}
              value={formData.tour_id || ''}
              onChange={value => {
                if (!value) {
                  setFormField('tour_id', null)
                  setFormField('accommodation_days', 0)
                } else {
                  const tour = tours.find(t => t.id === value)
                  if (tour) {
                    setFormField('tour_id', value)
                    setFormField('name', tour.name)
                    setFormField('group_size', tour.max_participants || 1)

                    // 計算住宿天數
                    let accommodationDays = 0
                    if (tour.departure_date && tour.return_date) {
                      const startDate = new Date(tour.departure_date)
                      const endDate = new Date(tour.return_date)
                      const totalDays =
                        Math.ceil(
                          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                        ) + 1
                      accommodationDays = Math.max(0, totalDays - 1)
                    }
                    setFormField('accommodation_days', accommodationDays)
                  }
                }
              }}
              placeholder={QUOTE_DIALOG_LABELS.搜尋或選擇旅遊團}
              emptyMessage={QUOTE_DIALOG_LABELS.找不到旅遊團}
              className="mt-1"
            />
            <p className="text-xs text-morandi-secondary mt-1">{QUOTE_DIALOG_LABELS.SELECT_6732}</p>
          </div>

          {/* 團體名稱 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {QUOTE_DIALOG_LABELS.LABEL_7457}
            </label>
            <Input
              value={formData.name}
              onChange={e => setFormField('name', e.target.value)}
              placeholder={QUOTE_DIALOG_LABELS.輸入團體名稱}
              className="mt-1"
            />
          </div>

          {/* 人數 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {QUOTE_DIALOG_LABELS.LABEL_6764}
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={formData.group_size}
              onChange={e => {
                const value = e.target.value
                setFormField('group_size', value === '' ? '' : Number(value))
              }}
              placeholder="1"
              className="mt-1"
              min="1"
            />
          </div>

          {/* 狀態 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {QUOTE_DIALOG_LABELS.STATUS}
            </label>
            <Select value={formData.status} onValueChange={value => setFormField('status', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposed">{QUOTE_DIALOG_LABELS.LABEL_5485}</SelectItem>
                <SelectItem value="approved">{QUOTE_DIALOG_LABELS.LABEL_2328}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 置頂選項 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_pinned"
                checked={formData.is_pinned}
                onChange={e => setFormField('is_pinned', e.target.checked)}
                className="h-4 w-4 rounded border-border text-morandi-gold focus:ring-morandi-gold"
              />
              <label htmlFor="is_pinned" className="text-sm text-morandi-primary cursor-pointer">
                {QUOTE_DIALOG_LABELS.COPYING_2742}
              </label>
            </div>

            {formData.is_pinned && (
              <div>
                <label className="text-sm font-medium text-morandi-primary">
                  {QUOTE_DIALOG_LABELS.LABEL_9029}
                </label>
                <Input
                  value={formData.code}
                  onChange={e => setFormField('code', e.target.value)}
                  placeholder={QUOTE_DIALOG_LABELS.例如_JP_BASIC_EU_LUXURY}
                  className="mt-1"
                />
                <p className="text-xs text-morandi-secondary mt-1">
                  {QUOTE_DIALOG_LABELS.GENERATING_4057}
                </p>
              </div>
            )}
          </div>

          {/* 動作按鈕 */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} className="gap-2">
              <X size={16} />
              {QUOTE_DIALOG_LABELS.CANCEL}
            </Button>
            <Button
              type="submit"
              disabled={!formData.name.trim() || !formData.group_size || formData.group_size < 1}
              className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors gap-2"
            >
              <Plus size={16} />
              {QUOTE_DIALOG_LABELS.ADD} <span className="ml-1 text-xs opacity-70">(Enter)</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
