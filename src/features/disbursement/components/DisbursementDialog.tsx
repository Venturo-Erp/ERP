'use client'
/**
 * DisbursementDialog
 * 新增出納單對話框
 */

import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell } from '@/components/table-cells'
import { FileText } from 'lucide-react'
import { formatDateTW } from '@/lib/utils/format-date'
import { PaymentRequest } from '../types'
import { useMemo } from 'react'
import { DISBURSEMENT_LABELS } from '../constants/labels'

interface DisbursementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingRequests: PaymentRequest[]
  selectedRequests: string[]
  selectedAmount: number
  searchTerm: string
  orderNumber: string
  nextThursday: string | Date
  onSearchChange: (term: string) => void
  onSelectRequest: (requestId: string) => void
  onSelectAll: () => void
  onCreate: () => void
  onCancel: () => void
}

function DisbursementDialog({
  open,
  onOpenChange,
  pendingRequests,
  selectedRequests,
  selectedAmount,
  searchTerm,
  orderNumber,
  nextThursday,
  onSearchChange,
  onSelectRequest,
  onSelectAll,
  onCreate,
  onCancel,
}: DisbursementDialogProps) {
  const columns = useMemo<TableColumn[]>(
    () => [
      {
        key: 'select',
        label: (
          <Checkbox
            checked={
              selectedRequests.length === pendingRequests.length && pendingRequests.length > 0
            }
            onCheckedChange={onSelectAll}
          />
        ),
        width: '50px',
        render: (_value, row) => {
          const request = row as PaymentRequest
          return (
            <Checkbox
              checked={selectedRequests.includes(request.id)}
              onCheckedChange={() => onSelectRequest(request.id)}
            />
          )
        },
      },
      {
        key: 'request_number',
        label: DISBURSEMENT_LABELS.請款單號,
        sortable: true,
        render: value => (
          <div className="font-medium text-morandi-primary">{String(value || '')}</div>
        ),
      },
      {
        key: 'code',
        label: DISBURSEMENT_LABELS.團號,
        sortable: true,
        render: value => <div className="font-medium">{String(value || '')}</div>,
      },
      {
        key: 'tour_name',
        label: DISBURSEMENT_LABELS.團名,
        sortable: true,
        render: value => <div className="text-morandi-secondary">{String(value || '')}</div>,
      },
      {
        key: 'request_date',
        label: DISBURSEMENT_LABELS.請款日期,
        sortable: true,
        render: value => (
          <div className="text-sm text-morandi-secondary">{String(value || '')}</div>
        ),
      },
      {
        key: 'amount',
        label: DISBURSEMENT_LABELS.金額,
        sortable: true,
        render: (value: unknown) => (
          <div className="font-bold text-morandi-primary text-right">
            <CurrencyCell amount={(value as number) ?? 0} />
          </div>
        ),
      },
    ],
    [selectedRequests, pendingRequests.length, onSelectRequest, onSelectAll]
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={DISBURSEMENT_LABELS.新增出納單}
      subtitle={`${orderNumber} • ${typeof nextThursday === 'string' ? nextThursday : formatDateTW(nextThursday)}`}
      onSubmit={onCreate}
      onCancel={onCancel}
      submitLabel={DISBURSEMENT_LABELS.建立出納單筆.replace(
        '{count}',
        selectedRequests.length.toString()
      )}
      submitDisabled={selectedRequests.length === 0}
      maxWidth="6xl"
      contentClassName="max-h-[70vh] overflow-hidden flex flex-col"
    >
      <div className="flex-1 overflow-hidden flex flex-col -mx-6 -my-4">
        {pendingRequests.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-morandi-secondary opacity-50" />
              <p className="text-lg text-morandi-secondary">
                {DISBURSEMENT_LABELS.目前沒有待出帳的請款單}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 統計和搜尋 */}
            <div className="flex items-center justify-between py-3 px-4 border-b bg-muted">
              <div className="flex items-center space-x-4">
                <span className="font-medium">
                  {DISBURSEMENT_LABELS.共筆請款單.replace(
                    '{count}',
                    pendingRequests.length.toString()
                  )}
                </span>
                {selectedRequests.length > 0 && (
                  <span className="text-sm text-morandi-secondary">
                    {DISBURSEMENT_LABELS.已選筆.replace(
                      '{count}',
                      selectedRequests.length.toString()
                    )}
                    <span className="font-bold text-morandi-primary ml-1">
                      <CurrencyCell amount={selectedAmount} />
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder={DISBURSEMENT_LABELS.搜尋請款單號_團號或團名}
                  value={searchTerm}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>

            {/* 表格 */}
            <div className="flex-1 overflow-hidden">
              <EnhancedTable
                data={pendingRequests}
                columns={columns}
                searchableFields={['request_number', 'code', 'tour_name']}
                searchTerm={searchTerm}
                initialPageSize={15}
              />
            </div>
          </>
        )}
      </div>
    </FormDialog>
  )
}
