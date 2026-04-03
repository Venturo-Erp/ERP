'use client'
/**
 * QuickQuoteSummary - 金額統計摘要
 */

import React from 'react'
import { MORANDI_COLORS } from '@/lib/print'
import { QUICK_QUOTE_LABELS } from './constants/labels'

interface QuickQuoteSummaryProps {
  totalAmount: number
  receivedAmount?: number
}

export const QuickQuoteSummary: React.FC<QuickQuoteSummaryProps> = ({
  totalAmount,
  receivedAmount,
}) => {
  const balanceAmount = totalAmount - (receivedAmount || 0)
  const hasReceivedAmount = receivedAmount && receivedAmount > 0

  return (
    <div className="mb-6">
      {hasReceivedAmount ? (
        <div
          className="px-4 py-3 flex items-center justify-end gap-8"
          style={{
            backgroundColor: MORANDI_COLORS.lightBrown,
            borderRadius: '8px',
            border: `1px solid ${MORANDI_COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: MORANDI_COLORS.brown }}>
              {QUICK_QUOTE_LABELS.LABEL_6261}
            </span>
            <span className="text-xl font-bold" style={{ color: MORANDI_COLORS.brown }}>
              NT$ {totalAmount.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              width: '1px',
              height: '24px',
              backgroundColor: '#D1D5DB',
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: MORANDI_COLORS.brown }}>
              {QUICK_QUOTE_LABELS.LABEL_8143}
            </span>
            <span className="text-xl font-bold" style={{ color: MORANDI_COLORS.brown }}>
              NT$ {(receivedAmount || 0).toLocaleString()}
            </span>
          </div>
          <div
            style={{
              width: '1px',
              height: '24px',
              backgroundColor: '#D1D5DB',
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: MORANDI_COLORS.brown }}>
              {QUICK_QUOTE_LABELS.LABEL_2302}
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: balanceAmount > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}
            >
              NT$ {balanceAmount.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="px-4 py-3 flex items-center justify-end gap-2"
          style={{
            backgroundColor: MORANDI_COLORS.lightBrown,
            borderRadius: '8px',
            border: `1px solid ${MORANDI_COLORS.border}`,
          }}
        >
          <span className="text-xs font-semibold" style={{ color: MORANDI_COLORS.brown }}>
            {QUICK_QUOTE_LABELS.LABEL_6261}
          </span>
          <span className="text-xl font-bold" style={{ color: MORANDI_COLORS.brown }}>
            NT$ {totalAmount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}
