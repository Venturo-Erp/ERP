'use client'

import { getTodayString } from '@/lib/utils/format-date'
import { formatMoney } from '@/lib/utils/format-currency'
import { logger } from '@/lib/utils/logger'

import { useState, useEffect, useMemo } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useTravelInvoiceStore, TravelInvoiceItem, BuyerInfo } from '@/stores/travel-invoice-store'
import { useOrdersSlim, useToursSlim, invalidateOrders, invalidateTours } from '@/data'
import type { Order } from '@/types/order.types'
import type { Tour } from '@/types/tour.types'
import { confirm } from '@/lib/ui/alert-dialog'
import { ComboboxOption } from '@/components/ui/combobox'
import { INVOICE_LABELS } from '../constants/labels'

interface UseInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultOrderId?: string
  defaultTourId?: string
  fixedOrder?: Order
  fixedTour?: Tour
}

export function useInvoiceDialog({
  open,
  onOpenChange,
  defaultOrderId,
  defaultTourId,
  fixedOrder,
  fixedTour,
}: UseInvoiceDialogProps) {
  const { toast } = useToast()
  const { issueInvoice, invoices, isLoading, fetchInvoices } = useTravelInvoiceStore()
  const { items: allOrders, loading: ordersLoading } = useOrdersSlim()
  const { items: allTours, loading: toursLoading } = useToursSlim()

  const [dataLoaded, setDataLoaded] = useState(false)
  const [selectedTourId, setSelectedTourId] = useState<string>(defaultTourId || '')
  const [selectedOrderId, setSelectedOrderId] = useState<string>(defaultOrderId || '')
  const [invoiceDate, setInvoiceDate] = useState(getTodayString())
  const [reportStatus, setReportStatus] = useState<'unreported' | 'reported'>('unreported')
  const [customNo, setCustomNo] = useState('')
  const [buyerInfo, setBuyerInfo] = useState<BuyerInfo>({
    buyerName: '',
    buyerUBN: '',
    buyerEmail: '',
    buyerMobile: '',
  })
  const [items, setItems] = useState<TravelInvoiceItem[]>([
    { item_name: '', item_count: 1, item_unit: INVOICE_LABELS.UNIT, item_price: 0, itemAmt: 0 },
  ])
  const [remark, setRemark] = useState('')

  // 計算自訂編號
  const generateCustomNo = (orderId: string, orderNumber: string) => {
    const existingCount = invoices.filter(inv => inv.order_id === orderId).length
    return `${orderNumber}-${existingCount + 1}`
  }

  // 載入資料 (SWR 自動處理 tours/orders，只需手動 fetch invoices)
  useEffect(() => {
    if (open) {
      setDataLoaded(false)
      Promise.all([invalidateTours(), invalidateOrders(), fetchInvoices()])
        .then(() => {
          setDataLoaded(true)
        })
        .catch(err => logger.error('[useInvoiceDialog] loadData', err))
    }
  }, [open, fetchInvoices])

  // 當選擇訂單時，自動帶入資料
  useEffect(() => {
    if (fixedOrder) {
      setBuyerInfo({
        buyerName: fixedOrder.contact_person || '',
        buyerUBN: '',
        buyerEmail: '',
        buyerMobile: fixedOrder.contact_phone || '',
      })
      setCustomNo(generateCustomNo(fixedOrder.id, fixedOrder.order_number || ''))
    } else if (selectedOrderId) {
      const order = allOrders.find(o => o.id === selectedOrderId)
      if (order) {
        setBuyerInfo({
          buyerName: order.contact_person || '',
          buyerUBN: '',
          buyerEmail: '',
          buyerMobile: order.contact_phone || '',
        })
        setCustomNo(generateCustomNo(order.id, order.order_number ?? ''))
      }
    }
  }, [selectedOrderId, fixedOrder, allOrders, invoices])

  // 重置表單
  useEffect(() => {
    if (open) {
      setSelectedTourId(defaultTourId || fixedTour?.id || '')
      setSelectedOrderId(defaultOrderId || fixedOrder?.id || '')
      setInvoiceDate(getTodayString())
      setReportStatus('unreported')
      setRemark('')
      setItems([
        { item_name: '', item_count: 1, item_unit: INVOICE_LABELS.UNIT, item_price: 0, itemAmt: 0 },
      ])

      if (fixedOrder) {
        setBuyerInfo({
          buyerName: fixedOrder.contact_person || '',
          buyerUBN: '',
          buyerEmail: '',
          buyerMobile: fixedOrder.contact_phone || '',
        })
        setCustomNo(generateCustomNo(fixedOrder.id, fixedOrder.order_number || ''))
      } else {
        setBuyerInfo({ buyerName: '', buyerUBN: '', buyerEmail: '', buyerMobile: '' })
        setCustomNo('')
      }
    }
  }, [open, defaultTourId, defaultOrderId, fixedTour, fixedOrder])

  // 篩選該團的訂單
  const tourOrders = useMemo(() => {
    if (fixedTour) return allOrders.filter(o => o.tour_id === fixedTour.id)
    if (selectedTourId) return allOrders.filter(o => o.tour_id === selectedTourId)
    return []
  }, [selectedTourId, fixedTour, allOrders])

  // 取得當前訂單
  const currentOrder = useMemo(() => {
    if (fixedOrder) return fixedOrder
    return allOrders.find(o => o.id === selectedOrderId)
  }, [fixedOrder, selectedOrderId, allOrders])

  // 團選項
  const tourOptions: ComboboxOption[] = useMemo(() => {
    return allTours.map(tour => ({
      value: tour.id,
      label: `${tour.code} - ${tour.name}`,
    }))
  }, [allTours])

  // 訂單選項
  const orderOptions: ComboboxOption[] = useMemo(() => {
    return tourOrders.map(order => ({
      value: order.id,
      label: `${order.order_number} - ${order.contact_person}`,
    }))
  }, [tourOrders])

  // 商品明細操作
  const addItem = () => {
    setItems([
      ...items,
      { item_name: '', item_count: 1, item_unit: INVOICE_LABELS.UNIT, item_price: 0, itemAmt: 0 },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof TravelInvoiceItem, value: unknown) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    if (field === 'item_price' || field === 'item_count') {
      const price = Number(field === 'item_price' ? value : newItems[index].item_price)
      const count = Number(field === 'item_count' ? value : newItems[index].item_count)
      newItems[index].itemAmt = price * count
    }
    setItems(newItems)
  }

  const totalAmount = items.reduce((sum, item) => sum + item.itemAmt, 0)

  // 開立發票
  const handleSubmit = async () => {
    if (!buyerInfo.buyerName) {
      toast({
        title: INVOICE_LABELS.ERROR,
        description: INVOICE_LABELS.ENTER_BUYER_NAME,
        variant: 'destructive',
      })
      return
    }
    if (items.some(item => !item.item_name || item.item_price <= 0)) {
      toast({
        title: INVOICE_LABELS.ERROR,
        description: INVOICE_LABELS.FILL_PRODUCT_INFO,
        variant: 'destructive',
      })
      return
    }

    const orderId = fixedOrder?.id || selectedOrderId
    const tourId = fixedTour?.id || selectedTourId

    // 檢查超開提醒
    if (currentOrder && totalAmount > (currentOrder.paid_amount ?? 0)) {
      const confirmed = await confirm(
        INVOICE_LABELS.AMOUNT_EXCEED_CONFIRM(
          formatMoney(totalAmount),
          formatMoney(currentOrder.paid_amount ?? 0)
        ),
        { title: INVOICE_LABELS.AMOUNT_EXCEED_TITLE, type: 'warning' }
      )
      if (!confirmed) return
    }

    try {
      const result = await issueInvoice({
        invoice_date: invoiceDate,
        total_amount: totalAmount,
        tax_type: 'dutiable',
        buyerInfo,
        items,
        order_id: orderId || undefined,
        tour_id: tourId || undefined,
        created_by: 'current_user',
      })

      // 根據是否預約顯示不同訊息
      const isScheduled = result?.isScheduled
      const message =
        result?.message ||
        (isScheduled ? INVOICE_LABELS.SCHEDULED_MESSAGE(invoiceDate) : INVOICE_LABELS.ISSUE_SUCCESS)
      toast({
        title: isScheduled ? INVOICE_LABELS.SCHEDULE_SUCCESS : INVOICE_LABELS.ISSUE_SUCCESS,
        description: INVOICE_LABELS.PROXY_INVOICE(customNo, message),
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: INVOICE_LABELS.ERROR,
        description: error instanceof Error ? error.message : INVOICE_LABELS.ISSUE_FAILED,
        variant: 'destructive',
      })
    }
  }

  return {
    // State
    dataLoaded,
    selectedTourId,
    selectedOrderId,
    invoiceDate,
    reportStatus,
    customNo,
    buyerInfo,
    items,
    remark,
    totalAmount,
    currentOrder,
    // Options
    tourOptions,
    orderOptions,
    // Loading
    isLoading,
    ordersLoading,
    toursLoading,
    // Setters
    setSelectedTourId,
    setSelectedOrderId,
    setInvoiceDate,
    setReportStatus,
    setCustomNo,
    setBuyerInfo,
    setRemark,
    // Actions
    addItem,
    removeItem,
    updateItem,
    handleSubmit,
  }
}
