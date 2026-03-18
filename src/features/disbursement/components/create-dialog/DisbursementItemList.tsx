'use client'
/**
 * DisbursementItemList
 * 請款單列表區塊（搜尋、篩選、列表）
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, X, Calendar } from 'lucide-react'
import { PaymentRequest } from '@/stores/types'
import { cn } from '@/lib/utils'
import { statusLabels } from '@/features/finance/requests/types'
import { DISBURSEMENT_LABELS } from '../../constants/labels'

interface DisbursementItemListProps {
  filteredRequests: PaymentRequest[]
  selectedRequestIds: string[]
  selectedAmount: number
  searchTerm: string
  dateFilter: string
  onSearchChange: (value: string) => void
  onDateFilterChange: (value: string) => void
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onSetToday: () => void
  onClearFilters: () => void
}

export function DisbursementItemList({
  filteredRequests,
  selectedRequestIds,
  selectedAmount,
  searchTerm,
  dateFilter,
  onSearchChange,
  onDateFilterChange,
  onToggleSelect,
  onToggleSelectAll,
  onSetToday,
  onClearFilters,
}: DisbursementItemListProps) {
  // 取得狀態顯示
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-morandi-gold',
      approved: 'bg-status-info',
      confirmed: 'bg-morandi-green',
      processing: 'bg-status-warning',
    }
    return (
      <Badge className={cn('text-white text-xs', colors[status] || 'bg-morandi-muted')}>
        {(statusLabels as Record<string, string>)[status] || status}
      </Badge>
    )
  }

  return (
    <>
      {/* 請款編號列表標題 + 篩選 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="font-semibold text-morandi-primary">
          {DISBURSEMENT_LABELS.LABEL_623}
          {selectedRequestIds.length > 0 && (
            <span className="ml-2 text-morandi-gold">
              {DISBURSEMENT_LABELS.SELECTED_PAREN_PREFIX}
              {selectedRequestIds.length}
              {DISBURSEMENT_LABELS.SELECTED_PAREN_MID}
              {selectedAmount.toLocaleString()}
              {DISBURSEMENT_LABELS.SELECTED_PAREN_SUFFIX}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {/* 搜尋 */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-muted"
            />
            <Input
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={DISBURSEMENT_LABELS.搜尋請款編號或團名}
              className="pl-9 w-56"
            />
          </div>
          {/* 出帳日期篩選 */}
          <DatePicker
            value={dateFilter}
            onChange={onDateFilterChange}
            placeholder={DISBURSEMENT_LABELS.搜尋出帳日期}
            className="w-40"
          />
          {/* 當日按鈕 */}
          <Button variant="outline" size="sm" onClick={onSetToday} className="whitespace-nowrap">
            <Calendar size={14} className="mr-1" />
            {DISBURSEMENT_LABELS.LABEL_2377}
          </Button>
          {/* 清除按鈕 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="whitespace-nowrap"
          >
            <X size={14} className="mr-1" />
            {DISBURSEMENT_LABELS.CLEAR}
          </Button>
        </div>
      </div>

      {/* 請款單列表 */}
      <div className="flex-1 min-h-0 overflow-auto border border-morandi-container/20 rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-morandi-background z-10">
            <tr className="border-b border-morandi-container/20">
              <th className="py-3 px-4 text-left w-12">
                <Checkbox
                  checked={
                    selectedRequestIds.length === filteredRequests.length &&
                    filteredRequests.length > 0
                  }
                  onCheckedChange={onToggleSelectAll}
                />
              </th>
              <th className="py-3 px-4 text-left text-morandi-muted font-medium">
                {DISBURSEMENT_LABELS.LABEL_6208}
              </th>
              <th className="py-3 px-4 text-left text-morandi-muted font-medium">
                {DISBURSEMENT_LABELS.團名_th}
              </th>
              <th className="py-3 px-4 text-left text-morandi-muted font-medium">
                {DISBURSEMENT_LABELS.出帳日期_label}
              </th>
              <th className="py-3 px-4 text-left text-morandi-muted font-medium">
                {DISBURSEMENT_LABELS.請款人}
              </th>
              <th className="py-3 px-4 text-right text-morandi-muted font-medium">
                {DISBURSEMENT_LABELS.總金額_label}
              </th>
              <th className="py-3 px-4 text-center text-morandi-muted font-medium">
                {DISBURSEMENT_LABELS.狀態}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-morandi-muted">
                  {DISBURSEMENT_LABELS.NOT_FOUND_1858}
                </td>
              </tr>
            ) : (
              filteredRequests.map(request => (
                <tr
                  key={request.id}
                  className={cn(
                    'border-b border-morandi-container/10 cursor-pointer hover:bg-morandi-background/30 transition-colors',
                    selectedRequestIds.includes(request.id) && 'bg-morandi-gold/10'
                  )}
                  onClick={() => onToggleSelect(request.id)}
                >
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRequestIds.includes(request.id)}
                      onCheckedChange={() => onToggleSelect(request.id)}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-morandi-gold hover:underline">
                      {request.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-morandi-primary max-w-[200px] truncate">
                    {request.request_category === 'company'
                      ? DISBURSEMENT_LABELS.公司
                      : request.tour_name || '-'}
                  </td>
                  <td className="py-3 px-4 text-morandi-secondary">
                    {request.request_date || request.created_at?.split('T')[0] || '-'}
                  </td>
                  <td className="py-3 px-4 text-morandi-secondary">
                    {request.created_by_name || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {(request.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(request.status || 'pending')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
