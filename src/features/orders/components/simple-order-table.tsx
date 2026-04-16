'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores'
import { deleteOrder } from '@/data'
import { recalculateParticipants } from '@/features/tours/services/tour-stats.service'
import { recalculateReceiptStats } from '@/features/finance/payments/services/receipt-core.service'
import { logger } from '@/lib/utils/logger'
import { User, Trash2, FileText, Pencil, Plus, HandCoins } from 'lucide-react'
import { Wallet as PhWallet, ReadCvLogo } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Order, Tour } from '@/stores/types'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { OrderMembersExpandable } from '@/features/orders/components/OrderMembersExpandable'
import { COMP_ORDERS_LABELS, SIMPLE_ORDER_TABLE_LABELS } from '../constants/labels'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import type { TableColumn } from '@/components/ui/enhanced-table'

interface SimpleOrderTableProps {
  orders: Order[]
  tours?: Pick<Tour, 'id' | 'departure_date'>[]
  showTourInfo?: boolean
  className?: string
  onQuickReceipt?: (order: Order) => void
  onQuickPaymentRequest?: (order: Order) => void
  onQuickInvoice?: (order: Order) => void
  onEdit?: (order: Order) => void
  onQuickVisa?: (order: Order) => void
  onAdd?: () => void
}

export const SimpleOrderTable = React.memo(function SimpleOrderTable({
  orders,
  tours = [],
  showTourInfo = false,
  className,
  onQuickReceipt,
  onQuickPaymentRequest,
  onQuickInvoice,
  onEdit,
  onQuickVisa,
  onAdd,
}: SimpleOrderTableProps) {
  const router = useRouter()
  const workspaceId = useAuthStore(state => state.user?.workspace_id) || ''
  const [expanded, setExpanded] = useState<string[]>([])

  const handleDelete = useCallback(async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await confirm(
      SIMPLE_ORDER_TABLE_LABELS.DELETE_CONFIRM(order.order_number || ''),
      { title: COMP_ORDERS_LABELS.刪除訂單, type: 'warning' }
    )
    if (!confirmed) return
    try {
      const tour_id = order.tour_id
      await deleteOrder(order.id)
      if (tour_id) {
        recalculateParticipants(tour_id).catch(err =>
          logger.error('[OrderTable] 重算團人數失敗:', err)
        )
        recalculateReceiptStats(null, tour_id).catch(err =>
          logger.error('[OrderTable] 重算收入失敗:', err)
        )
      }
    } catch {
      await alert(COMP_ORDERS_LABELS.刪除失敗_請稍後再試, 'error')
    }
  }, [])

  const handleToggleExpand = useCallback((orderId: string) => {
    setExpanded(prev =>
      prev.includes(orderId) ? prev.filter(x => x !== orderId) : [...prev, orderId]
    )
  }, [])

  const columns: TableColumn<Order>[] = [
    {
      key: 'order_number',
      label: COMP_ORDERS_LABELS.LABEL_7017,
      sortable: true,
      render: value => <span className="font-medium">{String(value || '')}</span>,
    },
    ...(showTourInfo
      ? ([
          {
            key: 'tour_name',
            label: COMP_ORDERS_LABELS.LABEL_8875,
            sortable: true,
          },
        ] as TableColumn<Order>[])
      : []),
    {
      key: 'contact_person',
      label: COMP_ORDERS_LABELS.LABEL_7009,
      sortable: true,
      render: value => (
        <div className="flex items-center gap-1.5">
          <User size={14} className="text-morandi-secondary shrink-0" />
          <span className="font-medium">{String(value || '')}</span>
        </div>
      ),
    },
    {
      key: 'sales_person',
      label: COMP_ORDERS_LABELS.LABEL_8362,
      sortable: true,
    },
  ]

  return (
    <EnhancedTable<Order>
      className={className}
      columns={columns}
      data={orders}
      striped
      showFilters={false}
      actionsWidth="1%"
      actionsHeader={
        onAdd ? (
          <div className="flex justify-end">
            <Button variant="default" size="sm" className="h-7 px-3 text-xs" onClick={onAdd}>
              <Plus size={12} className="mr-1" />
              {COMP_ORDERS_LABELS.新增}
            </Button>
          </div>
        ) : undefined
      }
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 text-morandi-secondary">
          <FileText size={32} className="mb-2 opacity-30" />
          <p className="text-sm">{COMP_ORDERS_LABELS.尚無訂單}</p>
        </div>
      }
      expandable={{
        expanded,
        onExpand: handleToggleExpand,
        renderExpanded: order => (
          <OrderMembersExpandable
            orderId={order.id}
            tourId={order.tour_id || ''}
            workspaceId={workspaceId}
            onClose={() => handleToggleExpand(order.id)}
            embedded
            tour={
              tours.find(t => t.id === order.tour_id) as import('@/stores/types').Tour | undefined
            }
          />
        ),
      }}
      actions={order => (
        <div
          className="flex items-center gap-1 justify-end whitespace-nowrap"
          onClick={e => e.stopPropagation()}
        >
          {/* 展開成員 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={e => {
              e.stopPropagation()
              handleToggleExpand(order.id)
            }}
            className={cn(
              'h-7 px-2 gap-1 text-xs text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-gold-light',
              expanded.includes(order.id) && 'text-morandi-primary bg-morandi-gold-light'
            )}
          >
            <User size={12} />
            成員
          </Button>

          {/* 收款 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={e => {
              e.stopPropagation()
              if (onQuickReceipt) {
                onQuickReceipt(order)
              } else {
                router.push(
                  `/finance/payments?tour_code=${order.code}&order_id=${order.id}&order_number=${order.order_number}&contact_person=${order.contact_person}&amount=${order.remaining_amount}`
                )
              }
            }}
            className="h-7 px-2 gap-1 text-xs text-morandi-green hover:text-morandi-green hover:bg-morandi-green/10"
          >
            <PhWallet size={12} weight="regular" />
            收款
          </Button>

          {/* 開發票 */}
          {onQuickInvoice && (
            <Button
              size="sm"
              variant="ghost"
              onClick={e => {
                e.stopPropagation()
                onQuickInvoice(order)
              }}
              className="h-7 px-2 gap-1 text-xs text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10"
            >
              <FileText size={12} />
              開發票
            </Button>
          )}

          {/* 請款 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={e => {
              e.stopPropagation()
              if (onQuickPaymentRequest) {
                onQuickPaymentRequest(order)
              } else {
                router.push(
                  `/finance/requests?tour_id=${order.tour_id}&order_id=${order.id}&order_number=${order.order_number}`
                )
              }
            }}
            className="h-7 px-2 gap-1 text-xs text-morandi-gold hover:text-morandi-gold-hover hover:bg-morandi-gold-light"
          >
            <HandCoins size={12} />
            請款
          </Button>

          {/* 簽證 */}
          {onQuickVisa && (
            <Button
              size="sm"
              variant="ghost"
              onClick={e => {
                e.stopPropagation()
                onQuickVisa(order)
              }}
              className="h-7 px-2 gap-1 text-xs text-morandi-primary hover:text-morandi-primary hover:bg-morandi-gold-light"
            >
              <ReadCvLogo size={12} weight="regular" />
              簽證
            </Button>
          )}

          {/* 編輯 */}
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={e => {
                e.stopPropagation()
                onEdit(order)
              }}
              className="h-7 px-2 gap-1 text-xs text-morandi-primary hover:text-morandi-primary hover:bg-morandi-gold-light"
            >
              <Pencil size={12} />
              編輯
            </Button>
          )}

          {/* 刪除 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={e => handleDelete(order, e)}
            className="h-7 px-2 gap-1 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10"
          >
            <Trash2 size={12} />
            刪除
          </Button>
        </div>
      )}
    />
  )
})
