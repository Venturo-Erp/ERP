'use client'

import { useMemo, useState, useCallback } from 'react'
import { Tour, Order } from '@/stores/types'
import { OrderListView } from '@/features/orders/components/OrderListView'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AddOrderForm, type OrderFormData } from '@/features/orders/components/add-order-form'
import { createOrder, invalidateOrders } from '@/data'
import { useOrdersListSlim } from '@/hooks/useListSlim'
import { recalculateParticipants } from '@/features/tours/services/tour-stats.service'
import type { Order as OrderType } from '@/types/order.types'
import { logger } from '@/lib/utils/logger'
import { TOUR_ORDERS_LABELS } from '../constants/labels'
import { useAuthStore } from '@/stores'
import { useToast } from '@/components/ui/use-toast'

interface TourOrdersProps {
  tour: Tour
  onChildDialogChange?: (hasOpen: boolean) => void
}

export function TourOrders({ tour }: TourOrdersProps) {
  const { items: allOrders } = useOrdersListSlim()
  const orders = useMemo(
    () => allOrders.filter(o => o.tour_id === tour.id),
    [allOrders, tour.id]
  )
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const currentWorkspace = useAuthStore(state => state.user?.workspace_id)
  const { toast } = useToast()

  const handleReceiptSuccess = useCallback(() => {
    invalidateOrders()
  }, [])

  const handleRequestSuccess = useCallback(() => {
    toast({ title: TOUR_ORDERS_LABELS.請款成功 })
  }, [toast])

  const handleAddOrder = useCallback(
    async (orderData: OrderFormData) => {
      if (!currentWorkspace) return

      try {
        const nextOrderNumber = orders.length + 1
        const orderNumber = `${tour.code}-O${nextOrderNumber.toString().padStart(2, '0')}`

        await createOrder({
          code: orderNumber,
          order_number: orderNumber,
          tour_id: tour.id,
          tour_name: tour.name,
          contact_person: orderData.contact_person,
          sales_person: orderData.sales_person,
          assistant: orderData.assistant,
          member_count: 0,
          total_amount: 0,
          paid_amount: 0,
          payment_status: 'unpaid',
          remaining_amount: 0,
          status: 'pending',
          customer_id: null,
        } as Omit<Order, 'id' | 'created_at' | 'updated_at'>)

        setAddDialogOpen(false)
        toast({ title: TOUR_ORDERS_LABELS.新增訂單成功 })

        recalculateParticipants(tour.id).catch(err => {
          logger.error('重算團人數失敗:', err)
        })
      } catch (err) {
        logger.error('新增訂單失敗:', err)
        toast({ title: TOUR_ORDERS_LABELS.新增訂單失敗, variant: 'destructive' })
      }
    },
    [currentWorkspace, orders.length, tour.code, tour.id, tour.name, toast]
  )

  return (
    <>
      <div className="flex flex-col h-full">
        <OrderListView
          orders={orders as OrderType[]}
          showTourInfo={false}
          onReceiptSuccess={handleReceiptSuccess}
          onRequestSuccess={handleRequestSuccess}
        />
      </div>

      {/* 新增訂單對話框（此頁專屬） */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent level={2} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{TOUR_ORDERS_LABELS.新增訂單}</DialogTitle>
          </DialogHeader>
          <AddOrderForm
            tourId={tour.id}
            onSubmit={handleAddOrder}
            onCancel={() => setAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
