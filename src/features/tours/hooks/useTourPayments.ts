'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { logger } from '@/lib/utils/logger'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Tour, Payment } from '@/stores/types'
import { useOrdersSlim, useReceipts, createReceipt, invalidateReceipts } from '@/data'
import type { Receipt, ReceiptType } from '@/types/receipt.types'
import { useToast } from '@/components/ui/use-toast'
import { useTravelInvoiceStore, TravelInvoiceItem, BuyerInfo } from '@/stores/travel-invoice-store'
import { confirm } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { TOUR_PAYMENTS_LABELS } from '../constants/labels'

interface ReceiptPayment extends Payment {
  method?: string
}

interface UseTourPaymentsProps {
  tour: Tour
  orderFilter?: string
  triggerAdd?: boolean
  onTriggerAddComplete?: () => void
}

export function useTourPayments({
  tour,
  orderFilter,
  triggerAdd,
  onTriggerAddComplete,
}: UseTourPaymentsProps) {
  const { items: orders } = useOrdersSlim()
  const { items: receipts } = useReceipts()
  const { issueInvoice, isLoading: isInvoiceLoading } = useTravelInvoiceStore()
  const { toast } = useToast()

  // 新增收款 Dialog 狀態
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [newPayment, setNewPayment] = useState<{
    amount: number
    description: string
    method: string
    status: typeof TOUR_PAYMENTS_LABELS.CONFIRMED | typeof TOUR_PAYMENTS_LABELS.PENDING
  }>({
    amount: 0,
    description: '',
    method: 'bank_transfer',
    status: TOUR_PAYMENTS_LABELS.CONFIRMED,
  })

  // 代轉發票 Dialog 狀態
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [invoiceOrderId, setInvoiceOrderId] = useState<string>('')
  const [invoiceDate, setInvoiceDate] = useState(getTodayString())
  const [reportStatus, setReportStatus] = useState<'unreported' | 'reported'>('unreported')
  const [invoiceBuyer, setInvoiceBuyer] = useState<BuyerInfo>({
    buyerName: '',
    buyerUBN: '',
    buyerEmail: '',
    buyerMobile: '',
  })
  const [invoiceItems, setInvoiceItems] = useState<TravelInvoiceItem[]>([
    { item_name: '', item_count: 1, item_unit: '式', item_price: 0, itemAmt: 0 },
  ])
  const [invoiceRemark, setInvoiceRemark] = useState('')

  // 監聽外部觸發新增
  useEffect(() => {
    if (triggerAdd) {
      setIsAddDialogOpen(true)
      onTriggerAddComplete?.()
    }
  }, [triggerAdd, onTriggerAddComplete])

  // 獲取屬於這個旅遊團的所有訂單
  const tourOrders = useMemo(() => {
    return orders.filter(order => {
      if (orderFilter) {
        return order.id === orderFilter
      }
      return order.tour_id === tour.id
    })
  }, [orders, orderFilter, tour.id])

  // 從 receipts store 獲取這個團的收款記錄
  const tourPayments = useMemo(() => {
    const tourOrderIds = new Set(tourOrders.map(o => o.id))

    return receipts
      .filter(receipt => {
        // 排除已刪除的收款單
        if (receipt.deleted_at) return false

        if (orderFilter) {
          return receipt.order_id === orderFilter
        }
        // 包含: 訂單屬於此團 OR 收款單直接關聯此團
        return (
          (receipt.order_id && tourOrderIds.has(receipt.order_id)) || receipt.tour_id === tour.id
        )
      })
      .map(receipt => ({
        id: receipt.id,
        type: 'receipt' as const,
        tour_id: tour.id,
        order_id: receipt.order_id || undefined,
        amount: receipt.actual_amount,
        description: receipt.notes || '',
        status: receipt.status === '1' ? 'confirmed' : 'pending',
        method:
          ['bank_transfer', 'cash', 'credit_card', 'check', 'linkpay'][receipt.receipt_type] ||
          'bank_transfer',
        created_at: receipt.created_at,
      })) as ReceiptPayment[]
  }, [receipts, tourOrders, tour.id, orderFilter])

  // 統計數據計算
  const confirmedPayments = useMemo(
    () => tourPayments.filter(p => p.status === 'confirmed'),
    [tourPayments]
  )
  const pendingPayments = useMemo(
    () => tourPayments.filter(p => p.status === 'pending'),
    [tourPayments]
  )
  const totalConfirmed = useMemo(
    () => confirmedPayments.reduce((sum, p) => sum + p.amount, 0),
    [confirmedPayments]
  )
  const totalPending = useMemo(
    () => pendingPayments.reduce((sum, p) => sum + p.amount, 0),
    [pendingPayments]
  )
  const totalPayments = useMemo(() => totalConfirmed + totalPending, [totalConfirmed, totalPending])
  const totalOrderAmount = useMemo(
    () => tourOrders.reduce((sum, order) => sum + (order.total_amount ?? 0), 0),
    [tourOrders]
  )
  const remaining_amount = useMemo(
    () => Math.max(0, totalOrderAmount - totalConfirmed),
    [totalOrderAmount, totalConfirmed]
  )

  // 更新 tour 的財務欄位
  const updateTourFinancials = useCallback(async () => {
    try {
      // 取得該團所有訂單 ID
      const { data: tourOrdersData } = await supabase
        .from('orders')
        .select('id')
        .eq('tour_id', tour.id)

      const orderIds = (tourOrdersData || []).map(o => o.id)

      // 計算總收款（已確認的收據）
      // 包含：訂單關聯的收款 OR 直接關聯 tour 的收款
      // 注意：必須過濾已刪除的收款單
      let receiptsQuery = supabase
        .from('receipts')
        .select('actual_amount, receipt_amount, status')
        .is('deleted_at', null) // 過濾已刪除的收款單

      if (orderIds.length > 0) {
        // 查詢：order_id 在訂單中 OR tour_id 直接等於此團
        receiptsQuery = receiptsQuery.or(
          `order_id.in.(${orderIds.join(',')}),tour_id.eq.${tour.id}`
        )
      } else {
        // 沒有訂單時，只查詢直接關聯 tour 的收款
        receiptsQuery = receiptsQuery.eq('tour_id', tour.id)
      }

      const { data: receiptsData } = await receiptsQuery

      const totalRevenue = (receiptsData || [])
        .filter(r => Number(r.status) === 1) // 已確認
        .reduce((sum, r) => sum + (r.actual_amount || 0), 0)

      // 取得當前成本
      const { data: currentTour } = await supabase
        .from('tours')
        .select('total_cost')
        .eq('id', tour.id)
        .single()

      const totalCost = currentTour?.total_cost || 0
      const profit = totalRevenue - totalCost

      // 更新 tour
      await supabase
        .from('tours')
        .update({
          total_revenue: totalRevenue,
          profit: profit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tour.id)

      // 刷新 SWR 快取讓 UI 更新
      await mutate(`tour-${tour.id}`)
      await mutate('tours')

      logger.log('Tour 財務數據已更新:', { total_revenue: totalRevenue, profit })
    } catch (error) {
      logger.error('更新 Tour 財務數據失敗:', error)
    }
  }, [tour.id])

  // 新增收款
  const addPayment = async (data: {
    type?: string
    tour_id: string
    order_id?: string
    amount: number
    description: string
    method: string
    status: string
  }) => {
    try {
      const order = data.order_id ? orders.find(o => o.id === data.order_id) : undefined

      const receiptTypeMap: Record<string, ReceiptType> = {
        bank_transfer: 0,
        cash: 1,
        credit_card: 2,
        check: 3,
      }

      const receiptData: Partial<Receipt> = {
        order_id: data.order_id || null,
        tour_id: tour.id, // 設定 tour_id 以便計算總收入
        order_number: order?.order_number || null,
        tour_name: tour.name || null,
        receipt_date: new Date().toISOString(),
        receipt_type: receiptTypeMap[data.method] || 0,
        receipt_amount: data.amount,
        actual_amount: data.amount,
        status: data.status === TOUR_PAYMENTS_LABELS.CONFIRMED ? '1' : '0',
        notes: data.description,
        receipt_account: order?.contact_person || null,
      }

      await createReceipt(receiptData as Receipt)
      await invalidateReceipts()

      // 同步更新 tour 的財務數據
      await updateTourFinancials()

      toast({
        title: TOUR_PAYMENTS_LABELS.SUCCESS,
        description: TOUR_PAYMENTS_LABELS.RECEIPT_CREATED,
      })
    } catch (error) {
      logger.error(
        TOUR_PAYMENTS_LABELS.CREATE_RECEIPT_FAILED,
        error instanceof Error ? error.message : String(error)
      )
      toast({
        title: TOUR_PAYMENTS_LABELS.ERROR,
        description: TOUR_PAYMENTS_LABELS.CREATE_RECEIPT_FAILED,
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleAddPayment = () => {
    if (!newPayment.amount || !newPayment.description) return

    addPayment({
      type: 'receipt',
      tour_id: tour.id,
      order_id: selectedOrderId || undefined,
      ...newPayment,
    })

    setNewPayment({
      amount: 0,
      description: '',
      method: 'bank_transfer',
      status: TOUR_PAYMENTS_LABELS.CONFIRMED,
    })
    setSelectedOrderId('')
    setIsAddDialogOpen(false)
  }

  // 發票相關函數
  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { item_name: '', item_count: 1, item_unit: '式', item_price: 0, itemAmt: 0 },
    ])
  }

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index))
    }
  }

  const updateInvoiceItem = (index: number, field: keyof TravelInvoiceItem, value: unknown) => {
    const newItems = [...invoiceItems]
    newItems[index] = { ...newItems[index], [field]: value }
    if (field === 'item_price' || field === 'item_count') {
      const price = Number(field === 'item_price' ? value : newItems[index].item_price)
      const count = Number(field === 'item_count' ? value : newItems[index].item_count)
      newItems[index].itemAmt = price * count
    }
    setInvoiceItems(newItems)
  }

  const invoiceTotal = useMemo(
    () => invoiceItems.reduce((sum, item) => sum + item.itemAmt, 0),
    [invoiceItems]
  )

  const openInvoiceDialog = (orderId?: string) => {
    if (orderId) {
      const order = tourOrders.find(o => o.id === orderId)
      if (order) {
        setInvoiceBuyer({
          buyerName: order.contact_person || '',
          buyerUBN: '',
          buyerEmail: '',
          buyerMobile: order.contact_phone || '',
        })
        setInvoiceOrderId(orderId)
      }
    } else {
      setInvoiceOrderId('')
    }
    setIsInvoiceDialogOpen(true)
  }

  const handleIssueInvoice = async () => {
    if (!invoiceBuyer.buyerName) {
      toast({
        title: TOUR_PAYMENTS_LABELS.ERROR,
        description: TOUR_PAYMENTS_LABELS.ENTER_BUYER_NAME,
        variant: 'destructive',
      })
      return
    }
    if (invoiceItems.some(item => !item.item_name || item.item_price <= 0)) {
      toast({
        title: TOUR_PAYMENTS_LABELS.ERROR,
        description: TOUR_PAYMENTS_LABELS.FILL_PRODUCT_INFO,
        variant: 'destructive',
      })
      return
    }

    if (invoiceOrderId) {
      const order = tourOrders.find(o => o.id === invoiceOrderId)
      if (order && invoiceTotal > (order.paid_amount ?? 0)) {
        const confirmed = await confirm(
          TOUR_PAYMENTS_LABELS.AMOUNT_EXCEED_CONFIRM(
            invoiceTotal.toLocaleString(),
            (order.paid_amount ?? 0).toLocaleString()
          ),
          { title: TOUR_PAYMENTS_LABELS.AMOUNT_EXCEED_TITLE, type: 'warning' }
        )
        if (!confirmed) return
      }
    }

    try {
      await issueInvoice({
        invoice_date: invoiceDate,
        total_amount: invoiceTotal,
        tax_type: 'dutiable',
        buyerInfo: invoiceBuyer,
        items: invoiceItems,
        order_id: invoiceOrderId || undefined,
        tour_id: tour.id,
      })
      toast({
        title: TOUR_PAYMENTS_LABELS.SUCCESS,
        description: TOUR_PAYMENTS_LABELS.INVOICE_SUCCESS,
      })
      setIsInvoiceDialogOpen(false)
      setInvoiceBuyer({ buyerName: '', buyerUBN: '', buyerEmail: '', buyerMobile: '' })
      setInvoiceItems([
        { item_name: '', item_count: 1, item_unit: '式', item_price: 0, itemAmt: 0 },
      ])
      setInvoiceRemark('')
    } catch (error) {
      toast({
        title: TOUR_PAYMENTS_LABELS.ERROR,
        description: error instanceof Error ? error.message : TOUR_PAYMENTS_LABELS.INVOICE_FAILED,
        variant: 'destructive',
      })
    }
  }

  return {
    // 資料
    tourOrders,
    tourPayments,

    // 統計
    confirmedPayments,
    pendingPayments,
    totalConfirmed,
    totalPending,
    totalPayments,
    totalOrderAmount,
    remaining_amount,

    // 新增收款對話框狀態
    isAddDialogOpen,
    setIsAddDialogOpen,
    selectedOrderId,
    setSelectedOrderId,
    newPayment,
    setNewPayment,
    handleAddPayment,

    // 發票對話框狀態
    isInvoiceDialogOpen,
    setIsInvoiceDialogOpen,
    invoiceOrderId,
    setInvoiceOrderId,
    invoiceDate,
    setInvoiceDate,
    reportStatus,
    setReportStatus,
    invoiceBuyer,
    setInvoiceBuyer,
    invoiceItems,
    setInvoiceItems,
    invoiceRemark,
    setInvoiceRemark,
    invoiceTotal,
    isInvoiceLoading,

    // 發票相關函數
    addInvoiceItem,
    removeInvoiceItem,
    updateInvoiceItem,
    openInvoiceDialog,
    handleIssueInvoice,
  }
}
