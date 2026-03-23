'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { QUICK_QUOTE_DIALOG_LABELS } from '../../constants/labels'

interface FormData {
  customer_name: string
  contact_phone: string
  contact_address: string
  tour_code: string
  handler_name: string
  issue_date: string
}

interface QuickQuoteHeaderProps {
  formData: FormData
  isEditing: boolean
  onFieldChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  actions?: React.ReactNode
}

export const QuickQuoteHeader: React.FC<QuickQuoteHeaderProps> = ({
  formData,
  isEditing,
  onFieldChange,
  actions,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-morandi-primary">
          {QUICK_QUOTE_DIALOG_LABELS.LABEL_8897}
        </h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {QUICK_QUOTE_DIALOG_LABELS.LABEL_4015}
          </label>
          <Input
            value={formData.customer_name}
            onChange={e => onFieldChange('customer_name', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {QUICK_QUOTE_DIALOG_LABELS.LABEL_5110}
          </label>
          <Input
            value={formData.contact_phone}
            onChange={e => onFieldChange('contact_phone', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {QUICK_QUOTE_DIALOG_LABELS.LABEL_3760}
          </label>
          <Input
            value={formData.contact_address}
            onChange={e => onFieldChange('contact_address', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {QUICK_QUOTE_DIALOG_LABELS.LABEL_4209}
          </label>
          <Input
            value={formData.tour_code}
            onChange={e => onFieldChange('tour_code', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {QUICK_QUOTE_DIALOG_LABELS.LABEL_4702}
          </label>
          <Input
            value={formData.handler_name}
            onChange={e => onFieldChange('handler_name', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isEditing}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {QUICK_QUOTE_DIALOG_LABELS.LABEL_8538}
          </label>
          <DatePicker
            value={formData.issue_date}
            onChange={date => onFieldChange('issue_date', date || '')}
            disabled={!isEditing}
            placeholder={QUICK_QUOTE_DIALOG_LABELS.選擇日期}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}
