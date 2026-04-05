/**
 * DisbursementColumns
 * 表格欄位配置
 */

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, CurrencyCell, TextCell, ActionCell } from '@/components/table-cells'
import { Trash2, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PAYMENT_REQUEST_STATUS_LABELS,
  PAYMENT_REQUEST_STATUS_COLORS,
  DISBURSEMENT_STATUS_LABELS,
  DISBURSEMENT_STATUS_COLORS,
} from '../constants'
import { DisbursementOrder, PaymentRequest } from '../types'
import { DISBURSEMENT_LABELS } from '../constants/labels'

type PendingTableRow = PaymentRequest & {
  tour_name?: string
}

type CurrentOrderTableRow = PaymentRequest & {
  tour_name?: string
}

type HistoryTableRow = DisbursementOrder

interface UsePendingColumnsProps {
  selectedRequests: string[]
  onSelectRequest: (requestId: string) => void
}

export function usePendingColumns({ selectedRequests, onSelectRequest }: UsePendingColumnsProps) {
  return useMemo<TableColumn[]>(
    () => [
      {
        key: 'select',
        label: '',
        width: '50px',
        render: (_value: unknown, row: unknown) => {
          const typedRow = row as PendingTableRow
          return (
            <input
              type="checkbox"
              checked={selectedRequests.includes(typedRow.id)}
              onChange={() => onSelectRequest(typedRow.id)}
              className="rounded border-morandi-secondary"
            />
          )
        },
      },
      {
        key: 'request_number',
        label: DISBURSEMENT_LABELS.請款單號,
        sortable: true,
        render: (value: unknown) => (
          <div className="font-medium text-morandi-primary">{value as string}</div>
        ),
      },
      {
        key: 'code',
        label: DISBURSEMENT_LABELS.團號,
        sortable: true,
        render: (value: unknown) => <div className="font-medium">{value as string}</div>,
      },
      {
        key: 'tour_name',
        label: DISBURSEMENT_LABELS.團體名稱,
        sortable: true,
        render: (value: unknown) => (
          <div className="text-sm text-morandi-secondary truncate max-w-[200px]">
            {value as string}
          </div>
        ),
      },
      {
        key: 'amount',
        label: DISBURSEMENT_LABELS.金額,
        sortable: true,
        render: (value: unknown) => <CurrencyCell amount={value as number} />,
      },
      {
        key: 'request_date',
        label: DISBURSEMENT_LABELS.請款日期,
        sortable: true,
        render: (value: unknown) => <DateCell date={value as string} />,
      },
      {
        key: 'status',
        label: DISBURSEMENT_LABELS.狀態,
        render: (value: unknown) => (
          <Badge
            className={cn(
              'text-white',
              PAYMENT_REQUEST_STATUS_COLORS[value as keyof typeof PAYMENT_REQUEST_STATUS_COLORS]
            )}
          >
            {PAYMENT_REQUEST_STATUS_LABELS[value as keyof typeof PAYMENT_REQUEST_STATUS_LABELS]}
          </Badge>
        ),
      },
    ],
    [selectedRequests, onSelectRequest]
  )
}

interface UseCurrentOrderColumnsProps {
  currentOrder: DisbursementOrder | null
  onRemove: (requestId: string) => void
}

export function useCurrentOrderColumns({ currentOrder, onRemove }: UseCurrentOrderColumnsProps) {
  return useMemo<TableColumn[]>(
    () => [
      {
        key: 'request_number',
        label: DISBURSEMENT_LABELS.請款單號,
        sortable: true,
        render: (value: unknown) => (
          <div className="font-medium text-morandi-primary">{value as string}</div>
        ),
      },
      {
        key: 'code',
        label: DISBURSEMENT_LABELS.團號,
        sortable: true,
        render: (value: unknown) => <div className="font-medium">{value as string}</div>,
      },
      {
        key: 'tour_name',
        label: DISBURSEMENT_LABELS.團體名稱,
        sortable: true,
        render: (value: unknown) => (
          <div className="text-sm text-morandi-secondary truncate max-w-[200px]">
            {value as string}
          </div>
        ),
      },
      {
        key: 'amount',
        label: DISBURSEMENT_LABELS.金額,
        sortable: true,
        render: (value: unknown) => <CurrencyCell amount={value as number} />,
      },
      {
        key: 'request_date',
        label: DISBURSEMENT_LABELS.請款日期,
        sortable: true,
        render: (value: unknown) => <DateCell date={value as string} />,
      },
      {
        key: 'actions',
        label: DISBURSEMENT_LABELS.操作,
        width: '80px',
        render: (_value: unknown, row: unknown) => {
          const typedRow = row as CurrentOrderTableRow
          return (
            <ActionCell
              actions={[
                {
                  icon: Trash2,
                  label: DISBURSEMENT_LABELS.移除,
                  onClick: () => onRemove(typedRow.id),
                  variant: 'danger',
                  disabled: currentOrder?.status !== 'pending',
                },
              ]}
            />
          )
        },
      },
    ],
    [currentOrder, onRemove]
  )
}

interface UseHistoryColumnsProps {
  onPrintPDF: (order: DisbursementOrder) => void
  getEmployeeName?: (id: string) => string
}

export function useHistoryColumns({ onPrintPDF, getEmployeeName }: UseHistoryColumnsProps) {
  return useMemo<TableColumn[]>(
    () => [
      {
        key: 'order_number',
        label: DISBURSEMENT_LABELS.出納單號,
        sortable: true,
        render: (value: unknown) => (
          <div className="font-medium text-morandi-primary">{value as string}</div>
        ),
      },
      {
        key: 'disbursement_date',
        label: DISBURSEMENT_LABELS.出帳日期,
        sortable: true,
        render: (value: unknown) => <DateCell date={value as string} />,
      },
      {
        key: 'amount',
        label: DISBURSEMENT_LABELS.總金額,
        sortable: true,
        render: (value: unknown) => <CurrencyCell amount={value as number} />,
      },
      {
        key: 'payment_request_ids',
        label: DISBURSEMENT_LABELS.請款單數,
        render: (value: unknown) => (
          <div className="text-center">
            {(value as string[]).length}
            {DISBURSEMENT_LABELS.筆}
          </div>
        ),
      },
      {
        key: 'status',
        label: DISBURSEMENT_LABELS.狀態,
        render: (value: unknown) => (
          <Badge
            className={cn(
              'text-white',
              DISBURSEMENT_STATUS_COLORS[value as keyof typeof DISBURSEMENT_STATUS_COLORS]
            )}
          >
            {DISBURSEMENT_STATUS_LABELS[value as keyof typeof DISBURSEMENT_STATUS_LABELS]}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        label: DISBURSEMENT_LABELS.建立時間,
        sortable: true,
        render: (value: unknown) => <DateCell date={value as string} format="long" />,
      },
      {
        key: 'created_by',
        label: DISBURSEMENT_LABELS.建立人員,
        width: '100px',
        render: (value: unknown) => (
          <TextCell
            text={getEmployeeName ? getEmployeeName(value as string) : String(value || '-')}
          />
        ),
      },
      {
        key: 'actions',
        label: DISBURSEMENT_LABELS.操作,
        width: '100px',
        render: (_value: unknown, row: unknown) => {
          const typedRow = row as HistoryTableRow
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPrintPDF(typedRow)}
              className="text-morandi-gold border-morandi-gold hover:bg-morandi-gold/10"
            >
              <Printer size={14} className="mr-1" />
              PDF
            </Button>
          )
        },
      },
    ],
    [onPrintPDF, getEmployeeName]
  )
}
