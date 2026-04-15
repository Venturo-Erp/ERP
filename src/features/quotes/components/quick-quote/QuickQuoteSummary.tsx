'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { CurrencyCell } from '@/components/table-cells'
import { QUICK_QUOTE_SECTION_LABELS } from '../../constants/labels'

interface QuickQuoteSummaryProps {
  totalCost: number
  totalAmount: number
  totalProfit: number
  receivedAmount: number
  balanceAmount: number
  isEditing: boolean
  expenseDescription: string
  onReceivedAmountChange: (value: number) => void
  onExpenseDescriptionChange: (value: string) => void
}

export const QuickQuoteSummary: React.FC<QuickQuoteSummaryProps> = ({
  totalCost,
  totalAmount,
  totalProfit,
  receivedAmount,
  balanceAmount,
  isEditing,
  expenseDescription,
  onReceivedAmountChange,
  onExpenseDescriptionChange,
}) => {
  const normalizeNumber = (val: string): string => {
    // 全形轉半形
    val = val.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    val = val.replace(/[．]/g, '.')
    val = val.replace(/[－]/g, '-')
    return val
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <>
      {/* 費用說明 - 只在編輯模式或有內容時顯示 */}
      {(isEditing || expenseDescription) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-morandi-primary">
            {QUICK_QUOTE_SECTION_LABELS.LABEL_9264}
          </h2>
          {isEditing ? (
            <textarea
              value={expenseDescription}
              onChange={e => onExpenseDescriptionChange(e.target.value)}
              placeholder={QUICK_QUOTE_SECTION_LABELS.輸入整體報價說明_例如_含機票_住宿_餐食}
              className="w-full min-h-[100px] p-3 border border-border rounded-md text-sm resize-y bg-card focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
            />
          ) : (
            <p className="text-sm text-morandi-secondary whitespace-pre-wrap">
              {expenseDescription}
            </p>
          )}
        </div>
      )}

      {/* 金額統計 */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-morandi-primary mb-4">
          {QUICK_QUOTE_SECTION_LABELS.LABEL_9365}
        </h2>
        <div className={`grid gap-4 ${isEditing ? 'grid-cols-5' : 'grid-cols-3'}`}>
          {isEditing && (
            <div className="p-4 bg-morandi-container/10 rounded-lg">
              <label className="text-sm font-medium text-morandi-primary">
                {QUICK_QUOTE_SECTION_LABELS.TOTAL_2585}
              </label>
              <CurrencyCell amount={totalCost} className="mt-1 text-2xl font-bold" />
            </div>
          )}
          <div className="p-4 bg-morandi-container/10 rounded-lg">
            <label className="text-sm font-medium text-morandi-primary">
              {QUICK_QUOTE_SECTION_LABELS.LABEL_6261}
            </label>
            <CurrencyCell amount={totalAmount} className="mt-1 text-2xl font-bold" />
          </div>
          {isEditing && (
            <div className="p-4 bg-morandi-container/10 rounded-lg">
              <label className="text-sm font-medium text-morandi-primary">
                {QUICK_QUOTE_SECTION_LABELS.TOTAL_8800}
              </label>
              <CurrencyCell
                amount={totalProfit}
                variant={totalProfit >= 0 ? 'income' : 'expense'}
                className="mt-1 text-2xl font-bold"
              />
            </div>
          )}
          <div className="p-4 bg-morandi-container/10 rounded-lg">
            <label className="text-sm font-medium text-morandi-primary">
              {QUICK_QUOTE_SECTION_LABELS.LABEL_8143}
            </label>
            {isEditing ? (
              <Input
                type="text"
                inputMode="decimal"
                value={receivedAmount === 0 ? '' : receivedAmount}
                onChange={e => {
                  const val = normalizeNumber(e.target.value)
                  if (val === '' || val === '-') {
                    onReceivedAmountChange(0)
                  } else {
                    const num = parseFloat(val)
                    if (!isNaN(num)) {
                      onReceivedAmountChange(num)
                    }
                  }
                }}
                onKeyDown={handleKeyDown}
                className="mt-1 text-xl font-bold"
                step="0.01"
                placeholder=""
              />
            ) : (
              <CurrencyCell amount={receivedAmount} className="mt-1 text-2xl font-bold" />
            )}
          </div>
          <div className="p-4 bg-morandi-container/10 rounded-lg">
            <label className="text-sm font-medium text-morandi-primary">
              {QUICK_QUOTE_SECTION_LABELS.LABEL_2302}
            </label>
            <CurrencyCell
              amount={balanceAmount}
              variant={balanceAmount > 0 ? 'expense' : 'income'}
              className="mt-1 text-2xl font-bold"
            />
          </div>
        </div>
      </div>
    </>
  )
}
