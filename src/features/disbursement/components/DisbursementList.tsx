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
import { useEmployeeDictionary } from '@/data'
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

export function PendingList({
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
        initialPageSize={20}
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

export function CurrentOrderList({
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
            {currentOrder.disbursement_date} • {(currentOrder.payment_request_ids || []).length}{' '}
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
        initialPageSize={20}
        searchTerm={searchTerm}
      />
    </div>
  )
}

interface EmptyCurrentOrderProps {
  onNavigate: () => void
}

export function EmptyCurrentOrder({ onNavigate }: EmptyCurrentOrderProps) {
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

export function HistoryList({ data, searchTerm, onPrintPDF }: HistoryListProps) {
  const { get: getEmployee } = useEmployeeDictionary()
  const getEmployeeName = (id: string) => {
    if (!id) return '-'
    const emp = getEmployee(id)
    return emp?.chinese_name || emp?.display_name || '-'
  }
  const columns = useHistoryColumns({ onPrintPDF, getEmployeeName })

  return (
    <EnhancedTable
      className="min-h-full"
      data={data}
      columns={columns}
      searchableFields={['order_number']}
      initialPageSize={20}
      searchTerm={searchTerm}
    />
  )
}

// 供應商分組資料類型
interface SupplierGroup {
  supplier_id: string
  supplier_name: string
  items: Array<{
    request: PaymentRequest
    item: PaymentRequestItem
  }>
  total: number
}

interface SupplierGroupListProps {
  groups: SupplierGroup[]
  searchTerm: string
}

export function SupplierGroupList({ groups, searchTerm }: SupplierGroupListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // 篩選符合搜尋條件的供應商
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups
    const lowerSearch = searchTerm.toLowerCase()
    return groups.filter(
      group =>
        group.supplier_name.toLowerCase().includes(lowerSearch) ||
        group.items.some(
          item =>
            item.request.code?.toLowerCase().includes(lowerSearch) ||
            item.request.tour_name?.toLowerCase().includes(lowerSearch) ||
            item.item.description?.toLowerCase().includes(lowerSearch)
        )
    )
  }, [groups, searchTerm])

  const toggleGroup = (supplierId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId],
    }))
  }

  // 計算總金額
  const totalAmount = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.total, 0),
    [filteredGroups]
  )

  if (filteredGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-morandi-secondary mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-morandi-primary mb-2">
          {DISBURSEMENT_LABELS.LABEL_5620}
        </h3>
        <p className="text-morandi-secondary">{DISBURSEMENT_LABELS.NOT_FOUND_6490}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 統計摘要 */}
      <div className="flex items-center justify-between p-4 bg-morandi-background/50 rounded-lg">
        <div className="text-sm text-morandi-secondary">
          {DISBURSEMENT_LABELS.SUPPLIERS_PREFIX}
          {filteredGroups.length}
          {DISBURSEMENT_LABELS.SUPPLIERS_SUFFIX}
        </div>
        <CurrencyCell amount={totalAmount} className="text-lg font-bold text-morandi-gold" />
      </div>

      {/* 供應商卡片列表 */}
      <div className="space-y-3">
        {filteredGroups.map(group => (
          <div
            key={group.supplier_id}
            className="border border-morandi-container/20 rounded-lg overflow-hidden"
          >
            {/* 供應商標題列 */}
            <div
              className="flex items-center justify-between p-4 bg-morandi-background/30 cursor-pointer hover:bg-morandi-background/50 transition-colors"
              onClick={() => toggleGroup(group.supplier_id)}
            >
              <div className="flex items-center gap-3">
                <button className="text-morandi-secondary">
                  {expandedGroups[group.supplier_id] ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                </button>
                <div>
                  <h3 className="font-semibold text-morandi-primary">{group.supplier_name}</h3>
                  <p className="text-xs text-morandi-secondary">
                    {group.items.length}
                    {DISBURSEMENT_LABELS.ITEMS_SUFFIX}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <CurrencyCell
                  amount={group.total}
                  className="text-lg font-bold text-morandi-gold"
                />
              </div>
            </div>

            {/* 展開的項目列表 */}
            {expandedGroups[group.supplier_id] && (
              <div className="border-t border-morandi-container/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-morandi-background/20">
                      <th className="text-left py-2 px-4 text-morandi-muted font-medium">
                        {DISBURSEMENT_LABELS.LABEL_9308}
                      </th>
                      <th className="text-left py-2 px-4 text-morandi-muted font-medium">
                        {DISBURSEMENT_LABELS.LABEL_9750}
                      </th>
                      <th className="text-left py-2 px-4 text-morandi-muted font-medium">
                        {DISBURSEMENT_LABELS.LABEL_2946}
                      </th>
                      <th className="text-left py-2 px-4 text-morandi-muted font-medium">
                        {DISBURSEMENT_LABELS.LABEL_5591}
                      </th>
                      <th className="text-right py-2 px-4 text-morandi-muted font-medium">
                        {DISBURSEMENT_LABELS.LABEL_9413}
                      </th>
                      <th className="text-right py-2 px-4 text-morandi-muted font-medium">
                        {DISBURSEMENT_LABELS.QUANTITY}
                      </th>
                      <th className="text-right py-2 px-4 text-morandi-muted font-medium">
                        {DISBURSEMENT_LABELS.LABEL_832}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map(({ request, item }, index) => (
                      <tr
                        key={`${item.id}-${index}`}
                        className="border-b border-morandi-container/10 hover:bg-morandi-background/10"
                      >
                        <td className="py-2 px-4 text-morandi-primary">{request.code}</td>
                        <td className="py-2 px-4 text-morandi-secondary">
                          {request.tour_code || '-'}
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-morandi-secondary max-w-[200px] truncate">
                          {item.description || '-'}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <CurrencyCell amount={item.unit_price || 0} />
                        </td>
                        <td className="py-2 px-4 text-right">{item.quantity}</td>
                        <td className="py-2 px-4 text-right">
                          <CurrencyCell
                            amount={item.subtotal || 0}
                            className="font-medium text-morandi-gold"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-morandi-background/30">
                      <td colSpan={6} className="py-2 px-4 text-right font-semibold">
                        {DISBURSEMENT_LABELS.SUBTOTAL}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <CurrencyCell
                          amount={group.total}
                          className="font-bold text-morandi-gold"
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
