'use client'

/**
 * OrderListView - 訂單列表 + 快速動作容器
 *
 * 把訂單表格 + 收款/請款/發票/編輯 4 個 Dialog 包在一起。
 * `/orders` 主頁和 `/tours/[code]?tab=orders` 共用、差別只是外面怎麼餵 orders 進來。
 *
 * 不在此組件內處理：
 * - 新增訂單（各頁自己有不同的 tour context）
 * - 批次簽證 / 網卡 等 `/orders` 專屬流程（由上層自行附加）
 * - 搜尋 / tabs / 排序（由上層決定後把結果餵進來）
 */

import React, { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Order, Tour } from '@/stores/types'
import { SimpleOrderTable } from '@/features/orders/components/simple-order-table'
import { OrderEditDialog } from '@/features/orders/components/order-edit-dialog'
import { BatchVisaDialog } from '@/features/orders/components/BatchVisaDialog'
import { AddReceiptDialog } from '@/features/finance/payments'
import { useWorkspaceFeatures } from '@/lib/permissions/hooks'

const AddRequestDialog = dynamic(
  () =>
    import('@/features/finance/requests/components/AddRequestDialog').then(m => m.AddRequestDialog),
  { ssr: false }
)

interface OrderListViewProps {
  orders: Order[]
  tours?: Pick<Tour, 'id' | 'departure_date'>[]
  /** 是否在表格顯示團號/團名欄位（/orders 用 true、tour-orders 用 false） */
  showTourInfo?: boolean
  className?: string
  /** 收款成功後的額外動作（SWR 會自動 invalidate、這裡通常不需要） */
  onReceiptSuccess?: () => void
  /** 請款成功後的額外動作（例如 toast） */
  onRequestSuccess?: () => void
  /** Server-side 分頁（給 /orders 主頁用、tour-orders 子頁不傳）*/
  serverPagination?: {
    currentPage: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
  }
}

export function OrderListView({
  orders,
  tours,
  showTourInfo = false,
  className,
  onReceiptSuccess,
  onRequestSuccess,
  serverPagination,
}: OrderListViewProps) {
  // 功能開關：租戶沒開啟簽證管理 → 不顯示「批次簽證」按鈕
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const visasEnabled = isFeatureEnabled('visas')

  // Dialog 狀態（集中管）
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [visaOpen, setVisaOpen] = useState(false)

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const openReceipt = useCallback((order: Order) => {
    setSelectedOrder(order)
    setReceiptOpen(true)
  }, [])
  const openRequest = useCallback((order: Order) => {
    setSelectedOrder(order)
    setRequestOpen(true)
  }, [])
  const openEdit = useCallback((order: Order) => {
    setSelectedOrder(order)
    setEditOpen(true)
  }, [])
  const openVisa = useCallback((order: Order) => {
    setSelectedOrder(order)
    setVisaOpen(true)
  }, [])

  const clearIfAllClosed = useCallback((r: boolean, q: boolean, e: boolean, v: boolean) => {
    if (!r && !q && !e && !v) setSelectedOrder(null)
  }, [])

  return (
    <>
      <SimpleOrderTable
        className={className}
        orders={orders}
        tours={tours}
        showTourInfo={showTourInfo}
        serverPagination={serverPagination}
        onQuickReceipt={openReceipt}
        onQuickPaymentRequest={openRequest}
        onEdit={openEdit}
        onQuickVisa={visasEnabled ? openVisa : undefined}
      />

      <AddReceiptDialog
        open={receiptOpen}
        onOpenChange={open => {
          setReceiptOpen(open)
          clearIfAllClosed(open, requestOpen, editOpen, visaOpen)
        }}
        defaultTourId={selectedOrder?.tour_id || undefined}
        defaultOrderId={selectedOrder?.id}
        onSuccess={onReceiptSuccess}
      />

      <AddRequestDialog
        open={requestOpen}
        onOpenChange={open => {
          setRequestOpen(open)
          clearIfAllClosed(receiptOpen, open, editOpen, visaOpen)
        }}
        defaultTourId={selectedOrder?.tour_id || undefined}
        defaultOrderId={selectedOrder?.id}
        onSuccess={onRequestSuccess}
      />

      {selectedOrder && (
        <OrderEditDialog
          open={editOpen}
          onOpenChange={open => {
            setEditOpen(open)
            clearIfAllClosed(receiptOpen, requestOpen, open, visaOpen)
          }}
          order={selectedOrder}
        />
      )}

      {visasEnabled && (
        <BatchVisaDialog
          open={visaOpen}
          onOpenChange={open => {
            setVisaOpen(open)
            clearIfAllClosed(receiptOpen, requestOpen, editOpen, open)
          }}
          order={selectedOrder}
        />
      )}
    </>
  )
}
