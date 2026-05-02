'use client'
/**
 * DisbursementList
 * 出納單列表組件
 */

import { useMemo, useState } from 'react'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Printer,
  FileText,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowRight,
} from 'lucide-react'
import { PaymentRequest, DisbursementOrder } from '../types'
import { PaymentRequestItem } from '@/stores/types'
import { usePendingColumns, useCurrentOrderColumns, useHistoryColumns } from './DisbursementColumns'
import { cn } from '@/lib/utils'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { useEmployeeDictionary, usePaymentRequests } from '@/data'
import { DISBURSEMENT_LABELS } from './constants/labels'

interface PendingListProps {
  data: PaymentRequest[]
  selectedRequests: string[]
  selectedAmount: number
  searchTerm: string
  nextThursday: string | Date
  onSelectRequest: (requestId: string) => void
  onAddToDisbursement: () => void
}

function PendingList({
  data,
  selectedRequests,
  selectedAmount,
  searchTerm,
  nextThursday,
  onSelectRequest,
  onAddToDisbursement,
}: PendingListProps) {
  const columns = usePendingColumns({ selectedRequests, onSelectRequest })

  return (
    <>
      {/* 批次操作列 */}
      {selectedRequests.length > 0 && (
        <div className="bg-morandi-gold/10 border border-morandi-gold/20 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-morandi-secondary flex items-center gap-1">
              {DISBURSEMENT_LABELS.SELECTED_PREFIX}
              {selectedRequests.length}
              {DISBURSEMENT_LABELS.SELECTED_MID}
              <CurrencyCell amount={selectedAmount} />
            </span>
            <Button
              onClick={onAddToDisbursement}
              className="bg-morandi-gold hover:bg-morandi-gold-hover"
            >
              {DISBURSEMENT_LABELS.LABEL_3476}
            </Button>
          </div>
        </div>
      )}

      {/* 統計資訊 */}
      {data.length > 0 && (
        <div className="mb-4 flex items-center justify-end">
          <div className="text-sm text-morandi-secondary flex items-center gap-1">
            {data.length}
            {DISBURSEMENT_LABELS.ITEMS_COUNT_SUFFIX}
            {DISBURSEMENT_LABELS.NEXT_DISBURSEMENT_PREFIX}
            <DateCell
              date={nextThursday}
              showIcon={false}
              className="inline-flex text-morandi-secondary"
            />
          </div>
        </div>
      )}

      {/* 表格 */}
      <EnhancedTable
        className="min-h-full"
        data={data}
        columns={columns}
        searchableFields={['request_number', 'code', 'tour_name']}
        initialPageSize={15}
        searchTerm={searchTerm}
      />
    </>
  )
}

interface CurrentOrderListProps {
  currentOrder: DisbursementOrder
  requests: PaymentRequest[]
  searchTerm: string
  onRemove: (requestId: string) => void
  onConfirm: () => void
  onPrintPDF: (order: DisbursementOrder) => void
}

function CurrentOrderList({
  currentOrder,
  requests,
  searchTerm,
  onRemove,
  onConfirm,
  onPrintPDF,
}: CurrentOrderListProps) {
  const columns = useCurrentOrderColumns({ currentOrder, onRemove })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-morandi-primary">
            {currentOrder.order_number}
          </h3>
          <p className="text-sm text-morandi-secondary">
            {DISBURSEMENT_LABELS.DISBURSEMENT_DATE_PREFIX}
            {currentOrder.disbursement_date} • {requests.filter(r => r.disbursement_order_id === currentOrder.id).length}{' '}
            {DISBURSEMENT_LABELS.PAYMENT_REQUESTS_SUFFIX}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <CurrencyCell
              amount={currentOrder.amount}
              className="text-2xl font-bold text-morandi-primary"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => onPrintPDF(currentOrder)}
            className="text-morandi-gold border-morandi-gold hover:bg-morandi-gold/10"
          >
            <Printer size={16} className="mr-2" />
            {DISBURSEMENT_LABELS.PRINT_1814}
          </Button>
          {currentOrder.status === 'pending' && (
            <Button
              onClick={onConfirm}
              className="bg-morandi-green hover:bg-morandi-green/90 gap-2"
            >
              <Check size={16} />
              {DISBURSEMENT_LABELS.CONFIRM_5440}
            </Button>
          )}
        </div>
      </div>

      <EnhancedTable
        className="min-h-full"
        data={requests}
        columns={columns}
        searchableFields={['request_number', 'code', 'tour_name']}
        initialPageSize={15}
        searchTerm={searchTerm}
      />
    </div>
  )
}

interface EmptyCurrentOrderProps {
  onNavigate: () => void
}

function EmptyCurrentOrder({ onNavigate }: EmptyCurrentOrderProps) {
  return (
    <div className="text-center py-12">
      <Calendar className="h-16 w-16 text-morandi-secondary mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium text-morandi-primary mb-2">
        {DISBURSEMENT_LABELS.EMPTY_8471}
      </h3>
      <p className="text-morandi-secondary mb-4">{DISBURSEMENT_LABELS.LABEL_2549}</p>
      <Button onClick={onNavigate} variant="outline" className="gap-2">
        {DISBURSEMENT_LABELS.SELECT_3950}
        <ArrowRight size={16} />
      </Button>
    </div>
  )
}

interface HistoryListProps {
  data: DisbursementOrder[]
  searchTerm: string
  onPrintPDF: (order: DisbursementOrder) => void
}

function HistoryList({ data, searchTerm, onPrintPDF }: HistoryListProps) {
  const { get: getEmployee } = useEmployeeDictionary()
  const { items: payment_requests } = usePaymentRequests()
  const getEmployeeName = (id: string) => {
    if (!id) return '-'
    const emp = getEmployee(id)
    return emp?.chinese_name || emp?.display_name || '-'
  }
  const columns = useHistoryColumns({ onPrintPDF, getEmployeeName, payment_requests })

  return (
    <EnhancedTable
      className="min-h-full"
      data={data}
      columns={columns}
      searchableFields={['order_number']}
      initialPageSize={15}
      searchTerm={searchTerm}
    />
  )
}
