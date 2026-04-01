'use client'
/**
 * QuickQuoteItemsTable - 收費明細表
 */

import React from 'react'
import { QuickQuoteItem } from '@/types/quote.types'
import { MORANDI_COLORS, TABLE_STYLES } from '@/lib/print'
import { QUICK_QUOTE_LABELS } from './constants/labels'

interface QuickQuoteItemsTableProps {
  items: QuickQuoteItem[]
}

export const QuickQuoteItemsTable: React.FC<QuickQuoteItemsTableProps> = ({ items }) => {
  return (
    <>
      <div className="mb-2">
        <h3 className="text-lg font-semibold" style={{ color: MORANDI_COLORS.brown }}>
          收費明細表 ▽
        </h3>
      </div>

      <table
        className="w-full mb-6 text-sm"
        style={{ ...TABLE_STYLES, tableLayout: 'fixed', maxWidth: '100%' }}
      >
        <thead>
          <tr style={{ backgroundColor: MORANDI_COLORS.lightBrown }}>
            <th
              className="px-2 py-2 text-left"
              style={{
                width: '30%',
                borderBottom: `1px solid ${MORANDI_COLORS.border}`,
                color: MORANDI_COLORS.brown,
                fontWeight: 600,
              }}
            >
              {QUICK_QUOTE_LABELS.LABEL_466}
            </th>
            <th
              className="px-2 py-2 text-center"
              style={{
                width: '10%',
                borderBottom: `1px solid ${MORANDI_COLORS.border}`,
                borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                color: MORANDI_COLORS.brown,
                fontWeight: 600,
              }}
            >
              {QUICK_QUOTE_LABELS.QUANTITY}
            </th>
            <th
              className="px-2 py-2 text-center"
              style={{
                width: '14%',
                borderBottom: `1px solid ${MORANDI_COLORS.border}`,
                borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                color: MORANDI_COLORS.brown,
                fontWeight: 600,
              }}
            >
              {QUICK_QUOTE_LABELS.LABEL_9413}
            </th>
            <th
              className="px-2 py-2 text-center"
              style={{
                width: '14%',
                borderBottom: `1px solid ${MORANDI_COLORS.border}`,
                borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                color: MORANDI_COLORS.brown,
                fontWeight: 600,
              }}
            >
              {QUICK_QUOTE_LABELS.AMOUNT}
            </th>
            <th
              className="px-2 py-2 text-left"
              style={{
                width: '22%',
                borderBottom: `1px solid ${MORANDI_COLORS.border}`,
                borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                color: MORANDI_COLORS.brown,
                fontWeight: 600,
              }}
            >
              {QUICK_QUOTE_LABELS.REMARKS}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="h-8">
              <td
                className="px-2 py-1"
                style={{
                  borderBottom:
                    index === items.length - 1 ? 'none' : `1px solid ${MORANDI_COLORS.border}`,
                  color: MORANDI_COLORS.gray,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                }}
              >
                {item.description || '\u00A0'}
              </td>
              <td
                className="px-2 py-1 text-center"
                style={{
                  borderBottom:
                    index === items.length - 1 ? 'none' : `1px solid ${MORANDI_COLORS.border}`,
                  borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                  color: MORANDI_COLORS.gray,
                }}
              >
                {item.quantity && item.quantity !== 0 ? item.quantity : '\u00A0'}
              </td>
              <td
                className="px-2 py-1 text-right"
                style={{
                  borderBottom:
                    index === items.length - 1 ? 'none' : `1px solid ${MORANDI_COLORS.border}`,
                  borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                  color: MORANDI_COLORS.gray,
                }}
              >
                {item.unit_price && item.unit_price !== 0
                  ? (item.unit_price || 0).toLocaleString()
                  : '\u00A0'}
              </td>
              <td
                className="px-2 py-1 text-right"
                style={{
                  borderBottom:
                    index === items.length - 1 ? 'none' : `1px solid ${MORANDI_COLORS.border}`,
                  borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                  color: MORANDI_COLORS.brown,
                  fontWeight: 600,
                }}
              >
                {item.amount && item.amount !== 0 ? (item.amount || 0).toLocaleString() : '\u00A0'}
              </td>
              <td
                className="px-2 py-1"
                style={{
                  borderBottom:
                    index === items.length - 1 ? 'none' : `1px solid ${MORANDI_COLORS.border}`,
                  borderLeft: `1px solid ${MORANDI_COLORS.border}`,
                  color: MORANDI_COLORS.gray,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                }}
              >
                {item.notes || '\u00A0'}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-8 text-center"
                style={{ color: MORANDI_COLORS.lightGray }}
              >
                {QUICK_QUOTE_LABELS.EMPTY_842}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}
