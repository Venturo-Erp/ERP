'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tour, Order } from '@/stores/types'
import { supabase } from '@/lib/supabase/client'
import { SimpleOrderTable } from '@/features/orders/components/simple-order-table'
import { AddReceiptDialog } from '@/features/finance/payments'
import dynamic from 'next/dynamic'

const AddRequestDialog = dynamic(
  () =>
    import('@/features/finance/requests/components/AddRequestDialog').then(m => m.AddRequestDialog),
  { ssr: false }
)

// 訂單列表只需要的欄位（29 欄 → 15 欄）
const ORDER_LIST_SELECT =
  'id, order_number, code, contact_person, sales_person, assistant, tour_id, tour_name, paid_amount, remaining_amount, total_amount, status, member_count, created_at, workspace_id'
import { InvoiceDialog } from '@/features/finance/components/invoice-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AddOrderForm, type OrderFormData } from '@/features/orders/components/add-order-form'
import { OrderEditDialog } from '@/features/orders/components/order-edit-dialog'
import { createOrder } from '@/data'
import { recalculateParticipants } from '@/features/tours/services/tour-stats.service'
import type { Order as OrderType } from '@/types/order.types'
import { logger } from '@/lib/utils/logger'
import { COMP_TOURS_LABELS, TOUR_ORDERS_LABELS } from '../constants/labels'
import { useAuthStore } from '@/stores'
import { useToast } from '@/components/ui/use-toast'

interface TourOrdersProps {
  tour: Tour
  onChildDialogChange?: (hasOpen: boolean) => void
}

export function TourOrders({ tour, onChildDialogChange }: TourOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const currentWorkspace = useAuthStore(state => state.user?.workspace_id)
  const { toast } = useToast()

  // 收款對話框狀態
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null)

  // 請款對話框狀態
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [selectedOrderForRequest, setSelectedOrderForRequest] = useState<Order | null>(null)

  // 編輯對話框狀態
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null)

  // 發票對話框狀態
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null)

  // 注意：已移除 onChildDialogChange 邏輯，改用 Dialog level 系統處理多重遮罩

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(ORDER_LIST_SELECT)
          .eq('tour_id', tour.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders((data || []) as Order[])
      } catch (err) {
        logger.error(COMP_TOURS_LABELS.載入訂單失敗, err)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [tour.id])

  // 處理快速收款
  const handleQuickReceipt = useCallback((order: Order) => {
    setSelectedOrderForReceipt(order)
    setReceiptDialogOpen(true)
  }, [])

  // 處理快速請款
  const handleQuickPaymentRequest = useCallback((order: Order) => {
    setSelectedOrderForRequest(order)
    setRequestDialogOpen(true)
  }, [])

  // 處理編輯訂單
  const handleEdit = useCallback((order: Order) => {
    setSelectedOrderForEdit(order)
    setEditDialogOpen(true)
  }, [])

  // 處理開發票
  const handleQuickInvoice = useCallback((order: Order) => {
    setSelectedOrderForInvoice(order)
    setInvoiceDialogOpen(true)
  }, [])

  // 收款成功後重新載入訂單
  const handleReceiptSuccess = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_LIST_SELECT)
      .eq('tour_id', tour.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    }
  }, [tour.id])

  // 請款成功後的處理
  const handleRequestSuccess = useCallback(() => {
    toast({ title: TOUR_ORDERS_LABELS.請款成功 })
  }, [])

  // 新增訂單
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

        // 重新載入訂單
        const { data, error } = await supabase
          .from('orders')
          .select(ORDER_LIST_SELECT)
          .eq('tour_id', tour.id)
          .order('created_at', { ascending: false })
        if (!error && data) setOrders(data as Order[])

        // 重算團人數
        recalculateParticipants(tour.id).catch(err => {
          logger.error('重算團人數失敗:', err)
        })
      } catch (err) {
        logger.error('新增訂單失敗:', err)
        toast({ title: TOUR_ORDERS_LABELS.新增訂單失敗, variant: 'destructive' })
      }
    },
    [currentWorkspace, orders.length, tour.code, tour.id, tour.name]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-morandi-secondary">{TOUR_ORDERS_LABELS.載入中}</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <SimpleOrderTable
          orders={orders as OrderType[]}
          showTourInfo={false}
          onQuickReceipt={handleQuickReceipt}
          onQuickPaymentRequest={handleQuickPaymentRequest}
          onQuickInvoice={handleQuickInvoice}
          onEdit={handleEdit}
          onAdd={() => setAddDialogOpen(true)}
        />
      </div>

      {/* 收款對話框 */}
      <AddReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        defaultTourId={tour.id}
        defaultOrderId={selectedOrderForReceipt?.id}
        onSuccess={handleReceiptSuccess}
      />

      {/* 請款對話框 */}
      <AddRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        defaultTourId={tour.id}
        defaultOrderId={selectedOrderForRequest?.id}
        onSuccess={handleRequestSuccess}
      />

      {/* 新增訂單對話框 */}
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

      {/* 編輯訂單對話框 */}
      {selectedOrderForEdit && (
        <OrderEditDialog
          open={editDialogOpen}
          onOpenChange={open => {
            setEditDialogOpen(open)
            if (!open) {
              setSelectedOrderForEdit(null)
              handleReceiptSuccess()
            }
          }}
          order={selectedOrderForEdit as OrderType}
        />
      )}

      {/* 發票對話框 */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={open => {
          setInvoiceDialogOpen(open)
          if (!open) handleReceiptSuccess()
        }}
        defaultOrderId={selectedOrderForInvoice?.id}
        defaultTourId={tour.id}
      />
    </>
  )
}
