/**
 * 收款管理資料處理 Hook
 */

import { logger } from '@/lib/utils/logger'
import { useMemo } from 'react'
import { useAuthStore } from '@/stores'
import { alert } from '@/lib/ui/alert-dialog'
import {
  useOrdersSlim,
  useTourDictionary,
  useReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  invalidateReceipts,
  useLinkPayLogs,
} from '@/data'
import { recalculateReceiptStats } from '@/features/finance/payments/services/receipt-core.service'
import type { ReceiptItem } from '@/stores'
import { ReceiptType } from '@/types/receipt.types'
import { useTranslations } from 'next-intl'

export function usePaymentData() {
  const t = useTranslations('finance')

  const { items: orders, loading: ordersLoading } = useOrdersSlim()
  const { items: receipts, loading: receiptsLoading } = useReceipts()
  const { items: linkpayLogs } = useLinkPayLogs()

  // 合併 loading 狀態
  const loading = ordersLoading || receiptsLoading
  const { get: getTour } = useTourDictionary()
  const { user } = useAuthStore()
  // 會計模組已停用

  // 過濾可用訂單（未收款或部分收款）
  const availableOrders = useMemo(() => {
    return orders.filter(
      order => order.payment_status === 'unpaid' || order.payment_status === 'partial'
    )
  }, [orders])

  const handleCreateLinkPay = async (receiptNumber: string, item: ReceiptItem) => {
    try {
      const response = await fetch('/api/linkpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_number: receiptNumber,
          user_name: item.receipt_account || '',
          email: item.email || '',
          payment_name: item.payment_name || '',
          create_user: user?.id || '',
          amount: item.amount,
          end_date: item.pay_dateline || '',
        }),
      })

      const data = await response.json()

      if (data.success) {
        void alert(t('paymentData.linkpaySuccess'), 'success')
      } else {
        void alert(`LinkPay 生成失敗: ${data.message}`, 'error')
      }
    } catch (error) {
      logger.error('LinkPay API 錯誤:', error)
      void alert(t('paymentData.linkpayError'), 'error')
    }
  }

  const handleCreateReceipt = async (data: {
    selectedOrderId: string
    paymentItems: ReceiptItem[]
  }) => {
    const { selectedOrderId, paymentItems } = data

    if (!selectedOrderId || paymentItems.length === 0 || !user?.id) {
      throw new Error(t('paymentData.fillCompleteInfo'))
    }

    const selectedOrder = orders.find(order => order.id === selectedOrderId)

    // 取得團號（從訂單關聯的旅遊團）- 使用 Dictionary O(1) 查詢
    const tour = selectedOrder?.tour_id ? getTour(selectedOrder.tour_id) : undefined
    const tourCode = tour?.code || ''
    if (!tourCode) {
      throw new Error(t('paymentData.cannotGetTourCode'))
    }

    // 為每個收款項目建立收款單
    const { supabase } = await import('@/lib/supabase/client')
    for (const item of paymentItems) {
      // 生成收款單號 — 透過 DB RPC、advisory lock 防 race
      const { data: receiptNumber, error: numErr } = await supabase.rpc('generate_receipt_no', {
        p_tour_id: selectedOrder?.tour_id || '',
      })
      if (numErr || !receiptNumber) {
        throw new Error(`生成收款單號失敗：${numErr?.message || 'unknown'}`)
      }

      // 建立收款單
      const receipt = await createReceipt({
        receipt_number: receiptNumber,
        workspace_id: user.workspace_id || '',
        order_id: selectedOrderId,
        tour_id: selectedOrder?.tour_id || null, // 直接關聯團號
        customer_id: selectedOrder?.customer_id || null, // 付款人
        order_number: selectedOrder?.order_number || '',
        tour_name: selectedOrder?.tour_name || '',
        receipt_date: item.transaction_date,
        payment_date: item.transaction_date,
        payment_method:
          ['transfer', 'cash', 'card', 'check', 'linkpay'][item.receipt_type] || 'transfer',
        receipt_type: item.receipt_type,
        receipt_amount: item.amount,
        amount: item.amount,
        actual_amount: 0, // 待會計確認
        status: 'pending', // 待確認
        receipt_account: item.receipt_account || null,
        email: item.email || null,
        payment_name: item.payment_name || null,
        pay_dateline: item.pay_dateline || null,
        handler_name: item.handler_name || null,
        account_info: item.account_info || null,
        fees: item.fees || null,
        card_last_four: item.card_last_four || null,
        auth_code: item.auth_code || null,
        check_number: item.check_number || null,
        check_bank: item.check_bank || null,
        check_date: null, // 支票兌現日期
        link: null, // LinkPay 連結（建立後由 API 填入）
        linkpay_order_number: null, // LinkPay 訂單號
        notes: item.notes || null,
        deleted_at: null,
        created_by: user.id,
        updated_by: user.id,
      })

      // 如果是 LinkPay，呼叫 API 生成付款連結
      if (item.receipt_type === ReceiptType.LINK_PAY) {
        await handleCreateLinkPay(receiptNumber, item)
      }
    }

    // 重算訂單付款狀態 + 團財務數據
    await recalculateReceiptStats(selectedOrderId, selectedOrder?.tour_id || null)

    // 重新載入資料
    await invalidateReceipts()
  }

  // 確認收款（更新實收金額和狀態）
  const handleConfirmReceipt = async (receiptId: string, actualAmount: number) => {
    if (!user?.id) {
      throw new Error(t('paymentData.pleaseLogin'))
    }

    const receipt = receipts.find(r => r.id === receiptId)

    await updateReceipt(receiptId, {
      actual_amount: actualAmount,
      status: 'confirmed',
      updated_by: user.id,
    })

    if (receipt) {
      await recalculateReceiptStats(receipt.order_id, receipt.tour_id || null)
    }

    await invalidateReceipts()
  }

  // 更新收款單（編輯模式使用）
  const handleUpdateReceipt = async (receiptId: string, data: Partial<(typeof receipts)[0]>) => {
    if (!user?.id) {
      throw new Error(t('paymentData.pleaseLogin'))
    }

    await updateReceipt(receiptId, {
      ...data,
      updated_by: user.id,
    })

    // 重新載入資料
    await invalidateReceipts()
  }

  // 刪除收款單
  const handleDeleteReceipt = async (receiptId: string) => {
    if (!user?.id) {
      throw new Error(t('paymentData.pleaseLogin'))
    }

    // 檢查收款單是否已確認
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt?.status === 'confirmed') {
      throw new Error(t('paymentData.confirmedCannotDelete'))
    }

    await deleteReceipt(receiptId)

    // 重算訂單付款狀態 + 團財務數據
    if (receipt) {
      await recalculateReceiptStats(receipt.order_id, receipt.tour_id || null)
    }

    // 重新載入資料
    await invalidateReceipts()
  }

  return {
    receipts,
    orders,
    availableOrders,
    linkpayLogs,
    user,
    loading,
    invalidateReceipts,
    handleCreateReceipt,
    handleConfirmReceipt,
    handleUpdateReceipt,
    handleDeleteReceipt,
  }
}
