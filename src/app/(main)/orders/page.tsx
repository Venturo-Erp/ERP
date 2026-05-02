'use client'

import { LABELS } from './constants/labels'

import React, { useState, useEffect, useMemo } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useOrdersListSlim, useToursListSlim } from '@/hooks/useListSlim'
import { useWorkspaceChannels } from '@/stores/workspace-store'
import { ShoppingCart, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { OrderListView } from '@/features/orders/components/OrderListView'
import { AddOrderForm } from '@/features/orders/components/add-order-form'
import type { Order } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { alert as showAlert } from '@/lib/ui/alert-dialog'
import { ORDERS_PAGE_LABELS } from '@/features/orders/constants/labels'

export default function OrdersPage() {
  const { items: orders, create: addOrder } = useOrdersListSlim()
  const { items: tours } = useToursListSlim()
  const { currentWorkspace, loadWorkspaces } = useWorkspaceChannels()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const tourDepartureDates = useMemo(() => {
    const map = new Map<string, number>()
    tours.forEach(t => {
      map.set(t.id, t.departure_date ? new Date(t.departure_date).getTime() : 0)
    })
    return map
  }, [tours])

  const filteredOrders = orders.filter(order => {
    const isVisaOrEsim =
      order.tour_name?.includes(ORDERS_PAGE_LABELS.VISA_TOUR) ||
      order.tour_name?.includes(ORDERS_PAGE_LABELS.ESIM_TOUR)
    if (isVisaOrEsim) return false

    // 改用金額算、不再依賴 payment_status enum (SSOT 簡化、收多少錢才是事實)
    const paid = order.paid_amount ?? 0
    const total = order.total_amount ?? 0
    const matchesFilter =
      statusFilter === 'all' ||
      (statusFilter === 'unpaid' && paid <= 0) ||
      (statusFilter === 'partial' && paid > 0 && paid < total) ||
      (statusFilter === 'paid' && paid >= total && total > 0)

    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      (order.order_number || '').toLowerCase().includes(searchLower) ||
      order.code?.toLowerCase().includes(searchLower) ||
      order.tour_name?.toLowerCase().includes(searchLower) ||
      order.contact_person.toLowerCase().includes(searchLower) ||
      order.sales_person?.toLowerCase().includes(searchLower) ||
      order.assistant?.toLowerCase().includes(searchLower)

    return matchesFilter && matchesSearch
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = a.tour_id ? (tourDepartureDates.get(a.tour_id) ?? 0) : 0
    const dateB = b.tour_id ? (tourDepartureDates.get(b.tour_id) ?? 0) : 0
    return dateA - dateB
  })

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
    if (!currentWorkspace) {
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
      searchPlaceholder={LABELS.SEARCH_PLACEHOLDER}
      tabs={[
        { value: 'all', label: ORDERS_PAGE_LABELS.TAB_ALL, icon: ShoppingCart },
        { value: 'unpaid', label: ORDERS_PAGE_LABELS.TAB_UNPAID, icon: AlertCircle },
        { value: 'partial', label: ORDERS_PAGE_LABELS.TAB_PARTIAL, icon: Clock },
        { value: 'paid', label: ORDERS_PAGE_LABELS.TAB_PAID, icon: CheckCircle },
      ]}
      activeTab={statusFilter}
      onTabChange={setStatusFilter}
      onAdd={() => setIsAddDialogOpen(true)}
      addLabel={LABELS.ADD_ORDER}
      contentClassName="flex-1 overflow-auto flex flex-col"
    >
      <OrderListView className="flex-1" orders={sortedOrders} tours={tours} showTourInfo={true} />

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
