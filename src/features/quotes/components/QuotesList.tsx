'use client'
/**
 * QuotesList - Displays quotes in a table format
 */

import React, { useMemo } from 'react'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { Quote } from '@/stores/types'
import { Tour } from '@/types/tour.types'
import { Archive, Calculator, Copy, Eye, Pin, Trash2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUOTE_STATUS_LABELS } from '@/lib/constants/quote-status'
import { STATUS_COLORS } from '../constants'
import { stripHtml } from '@/lib/utils/string-utils'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { LOCAL_PRICING_DIALOG_LABELS, QUOTES_LIST_LABELS } from '../constants/labels'

interface QuotesListProps {
  quotes: Quote[]
  tours: Tour[]
  searchTerm: string
  onQuoteClick: (quoteId: string) => void
  onPreview: (quoteId: string, e: React.MouseEvent) => void
  onDuplicate: (quoteId: string, e: React.MouseEvent) => void
  onTogglePin: (quoteId: string, isPinned: boolean, e: React.MouseEvent) => void
  onDelete: (quoteId: string, e: React.MouseEvent) => void
  onReject?: (quoteId: string, e: React.MouseEvent) => void
}

export const QuotesList: React.FC<QuotesListProps> = ({
  quotes,
  tours,
  searchTerm,
  onQuoteClick,
  onPreview,
  onDuplicate,
  onTogglePin,
  onDelete,
  onReject,
}) => {
  const tableColumns: TableColumn[] = useMemo(
    () => [
      {
        key: 'name',
        label: QUOTES_LIST_LABELS.團體名稱,
        sortable: true,
        render: (value, row) => {
          const quote = row as Quote
          const displayName = stripHtml(quote.name)
          return (
            <div className="flex items-center gap-2">
              {quote.is_pinned && <Pin size={14} className="text-morandi-gold" />}
              <span className="text-sm font-medium text-morandi-primary">{displayName || '-'}</span>
            </div>
          )
        },
      },
      {
        key: 'created_by_name',
        label: QUOTES_LIST_LABELS.作者,
        sortable: true,
        render: (value, row) => {
          const quote = row as Quote
          return (
            <span className="text-sm text-morandi-secondary">
              {quote.created_by_name || quote.handler_name || '-'}
            </span>
          )
        },
      },
      {
        key: 'status',
        label: QUOTES_LIST_LABELS.狀態,
        sortable: true,
        render: (value, row) => {
          const quote = row as Quote
          return (
            <span
              className={cn(
                'text-sm font-medium',
                STATUS_COLORS[quote.status || ''] || 'text-morandi-secondary'
              )}
            >
              {QUOTE_STATUS_LABELS[quote.status as keyof typeof QUOTE_STATUS_LABELS] ||
                quote.status}
            </span>
          )
        },
      },
      {
        key: 'group_size',
        label: LOCAL_PRICING_DIALOG_LABELS.人數,
        sortable: true,
        render: (value, row) => {
          const quote = row as Quote
          return (
            <div className="flex items-center text-sm text-morandi-secondary">
              <Users size={14} className="mr-1" />
              {quote.group_size || 0}人
            </div>
          )
        },
      },
      {
        key: 'total_cost',
        label: QUOTES_LIST_LABELS.總成本,
        sortable: true,
        render: (value, row) => {
          const quote = row as Quote
          return <CurrencyCell amount={quote.total_cost || 0} className="text-morandi-secondary" />
        },
      },
      {
        key: 'created_at',
        label: QUOTES_LIST_LABELS.建立時間,
        sortable: true,
        render: (value, row) => {
          const quote = row as Quote
          return (
            <DateCell date={quote.created_at} showIcon={false} className="text-morandi-secondary" />
          )
        },
      },
    ],
    [tours, quotes]
  )

  return (
    <EnhancedTable
      columns={tableColumns}
      data={quotes}
      searchableFields={['name', 'customer_name', 'code']}
      searchTerm={searchTerm}
      onRowClick={row => onQuoteClick((row as Quote).id)}
      bordered={true}
      actions={row => {
        const quote = row as Quote
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={e => onTogglePin(quote.id, quote.is_pinned || false, e)}
              className={cn(
                quote.is_pinned
                  ? 'text-morandi-gold hover:bg-morandi-gold/10'
                  : 'text-morandi-secondary hover:bg-morandi-secondary/10'
              )}
              title={
                quote.is_pinned ? QUOTES_LIST_LABELS.取消置頂 : QUOTES_LIST_LABELS.設為置頂範本
              }
            >
              <Pin size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={e => onPreview(quote.id, e)}
              className="text-morandi-green hover:bg-morandi-green/10"
              title={QUOTES_LIST_LABELS.預覽報價單}
            >
              <Eye size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={e => {
                e.stopPropagation()
                onQuoteClick(quote.id)
              }}
              className="text-morandi-gold hover:bg-morandi-gold/10"
              title={QUOTES_LIST_LABELS.編輯報價單}
            >
              <Calculator size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={e => onDuplicate(quote.id, e)}
              className="text-morandi-blue hover:bg-morandi-blue/10"
              title={QUOTES_LIST_LABELS.複製報價單}
            >
              <Copy size={16} />
            </Button>
            {onReject && quote.status !== 'rejected' && (
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={e => onReject(quote.id, e)}
                className="text-morandi-secondary hover:bg-morandi-secondary/10"
                title={QUOTES_LIST_LABELS.作廢報價單}
              >
                <Archive size={16} />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={e => onDelete(quote.id, e)}
              className="text-morandi-red hover:bg-morandi-red/10"
              title={QUOTES_LIST_LABELS.刪除報價單}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )
      }}
    />
  )
}
