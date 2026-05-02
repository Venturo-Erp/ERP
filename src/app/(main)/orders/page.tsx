'use client'

import { LABELS } from './constants/labels'

import React, { useState } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useOrdersPaginated, createOrder } from '@/data'
import { useToursListSlim } from '@/hooks/useListSlim'
import { useAuthStore } from '@/stores/auth-store'
import { ShoppingCart, Plus } from 'lucide-react'
import { OrderListView } from '@/features/orders/components/OrderListView'
import { AddOrderForm } from '@/features/orders/components/add-order-form'
import type { Order } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { alert as showAlert } from '@/lib/ui/alert-dialog'

export default function OrdersPage() {
  const { items: tours } = useToursListSlim()
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Server-side 分頁 + 搜尋（William 拍板：團號 / 團名 / 日期、用出團日 desc 排序）
  // 規範見 docs/LIST_PAGE_PERFORMANCE.md
  const { items: orders, totalCount } = useOrdersPaginated({
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery.trim() || undefined,
    searchFields: ['code', 'tour_name'],
    sortBy: 'departure_date',
    sortOrder: 'desc',
  })

  const addOrder = createOrder
  const sortedOrders = orders

  const handleAddOrder = async (orderData: {
    tour_id: string
    contact_person: string
    sales_person: string
    assistant: string
  }) => {
    const selectedTour = tours.find(t => t.id === orderData.tour_id)
    if (!selectedTour) {
      void showAlert(LABELS.SELECT_TOUR, 'warning')
      return
    }
    if (!user?.workspace_id) {
      void showAlert(LABELS.WORKSPACE_ERROR, 'error')
      return
    }
    if (!orderData.sales_person?.trim()) {
      void showAlert(LABELS.SELECT_SALES, 'warning')
      return
    }

    try {
      const tourOrders = orders.filter(o => o.tour_id === orderData.tour_id)
      const nextOrderNumber = tourOrders.length + 1
      const orderNumber = `${selectedTour.code}-O${nextOrderNumber.toString().padStart(2, '0')}`

      const estimatedPeople = 2
      const sellingPricePerPerson = selectedTour.selling_price_per_person || 0
      const initialTotalAmount = sellingPricePerPerson * estimatedPeople

      await addOrder({
        order_number: orderNumber,
        tour_id: orderData.tour_id,
        tour_name: selectedTour.name,
        contact_person: orderData.contact_person,
        contact_phone: null,
        sales_person: orderData.sales_person,
        assistant: orderData.assistant,
        member_count: 0,
        total_amount: initialTotalAmount,
        paid_amount: 0,
        payment_status: 'unpaid',
        remaining_amount: initialTotalAmount,
        status: null,
        notes: null,
        customer_id: null,
      } as Omit<Order, 'id' | 'created_at' | 'updated_at'>)

      setIsAddDialogOpen(false)
    } catch (error) {
      logger.error('[Orders] 新增訂單失敗:', error)
      void showAlert(error instanceof Error ? error.message : LABELS.ADD_ORDER_FAILED, 'error')
    }
  }

  return (
    <ContentPageLayout
      title={LABELS.MANAGE_949}
      icon={ShoppingCart}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="搜尋團號 / 團名"
      primaryAction={{
        label: LABELS.ADD_ORDER,
        icon: Plus,
        onClick: () => setIsAddDialogOpen(true),
      }}
      contentClassName="flex-1 overflow-auto flex flex-col"
    >
      <OrderListView
        className="flex-1"
        orders={sortedOrders}
        tours={tours}
        showTourInfo={true}
        serverPagination={{
          currentPage: page,
          pageSize: PAGE_SIZE,
          totalCount,
          onPageChange: setPage,
        }}
      />

      {/* 新增訂單對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent level={1} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{LABELS.ADD_ORDER}</DialogTitle>
          </DialogHeader>
          <AddOrderForm onSubmit={handleAddOrder} onCancel={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
