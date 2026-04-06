'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Tour } from '@/stores/types'
import { DollarSign, Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTourPayments } from '../hooks/useTourPayments'
import { PaymentSummary } from './PaymentSummary'
import { PaymentRow } from './PaymentRow'
import { AddPaymentDialog } from './AddPaymentDialog'
import { InvoiceDialog } from './InvoiceDialog'
import { COMP_TOURS_LABELS } from '../constants/labels'
import { useReceipts, useOrdersSlim } from '@/data'
import { formatCurrency } from '@/lib/utils/format-currency'
import { supabase } from '@/lib/supabase/client'
import { AddReceiptDialog } from '@/features/finance/payments/components/AddReceiptDialog'
import type { Receipt } from '@/types/receipt.types'

interface TourPaymentsProps {
  tour: Tour
  orderFilter?: string
  triggerAdd?: boolean
  onTriggerAddComplete?: () => void
  showSummary?: boolean
  onChildDialogChange?: (hasOpen: boolean) => void
}

export const TourPayments = React.memo(function TourPayments({
  tour,
  orderFilter,
  triggerAdd,
  onTriggerAddComplete,
  showSummary = true,
  onChildDialogChange,
}: TourPaymentsProps) {
  const {
    // 資料
    tourOrders,
    tourPayments,

    // 統計
    totalConfirmed,
    totalPending,
    totalPayments,
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
  } = useTourPayments({ tour, orderFilter, triggerAdd, onTriggerAddComplete })

  // 注意：已移除 onChildDialogChange 邏輯，改用 Dialog level 系統處理多重遮罩

  return (
    <div className="space-y-4">
      {/* 統計 + 新增按鈕 */}
      {showSummary && (
        <div className="flex items-center justify-between">
          <PaymentSummary
            totalConfirmed={totalConfirmed}
            totalPending={totalPending}
            totalPayments={totalPayments}
            remaining_amount={remaining_amount}
          />
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            <Plus size={14} className="mr-1" />
            {COMP_TOURS_LABELS.ADD_3548}
          </Button>
        </div>
      )}

      {/* 收款總覽 */}
      <ReceiptOverviewTable tour={tour} />

      {/* 新增收款對話框 */}
      <AddPaymentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        tourOrders={tourOrders}
        selectedOrderId={selectedOrderId}
        onSelectedOrderIdChange={setSelectedOrderId}
        newPayment={newPayment}
        onNewPaymentChange={setNewPayment}
        onAddPayment={handleAddPayment}
      />

      {/* 開立代轉發票對話框 */}
      <InvoiceDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        tourOrders={tourOrders}
        invoiceOrderId={invoiceOrderId}
        onInvoiceOrderIdChange={setInvoiceOrderId}
        invoiceDate={invoiceDate}
        onInvoiceDateChange={setInvoiceDate}
        reportStatus={reportStatus}
        onReportStatusChange={setReportStatus}
        invoiceBuyer={invoiceBuyer}
        onInvoiceBuyerChange={setInvoiceBuyer}
        invoiceItems={invoiceItems}
        onAddInvoiceItem={addInvoiceItem}
        onRemoveInvoiceItem={removeInvoiceItem}
        onUpdateInvoiceItem={updateInvoiceItem}
        invoiceRemark={invoiceRemark}
        onInvoiceRemarkChange={setInvoiceRemark}
        invoiceTotal={invoiceTotal}
        isInvoiceLoading={isInvoiceLoading}
        onIssueInvoice={handleIssueInvoice}
      />
    </div>
  )
})

// 收款總覽表格（與結案頁相同版型）
function ReceiptOverviewTable({ tour }: { tour: Tour }) {
  const { items: allReceipts } = useReceipts()
  const { items: allOrders } = useOrdersSlim()
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)

  const [paymentMethodMap, setPaymentMethodMap] = useState<Record<string, string>>({})
  useEffect(() => {
    supabase
      .from('payment_methods')
      .select('id,name')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {}
          for (const pm of data) map[pm.id] = pm.name
          setPaymentMethodMap(map)
        }
      })
  }, [])

  const orderIds = useMemo(
    () => new Set((allOrders ?? []).filter(o => o.tour_id === tour.id).map(o => o.id)),
    [allOrders, tour.id]
  )

  const receipts = useMemo(
    () =>
      (allReceipts ?? [])
        .filter(
          r => !r.deleted_at && (r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id)))
        )
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
    [allReceipts, tour.id, orderIds]
  )

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    transfer: '匯款',
    cash: '現金',
    card: '刷卡',
    check: '支票',
    linkpay: 'LinkPay',
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto bg-card">
      <div className="px-4 py-2 bg-morandi-green/10 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-morandi-green" />
        <span className="text-sm font-medium text-morandi-green">收款總覽 ({receipts.length})</span>
      </div>
      <table className="w-full text-sm table-fixed" style={{ minWidth: 900 }}>
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '9%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-xs text-morandi-secondary">
            <th className="px-4 py-2 text-left font-medium">單號</th>
            <th className="px-4 py-2 text-left font-medium">收款日期</th>
            <th className="px-4 py-2 text-left font-medium">收款方式</th>
            <th className="px-4 py-2 text-left font-medium">收款明細</th>
            <th className="px-4 py-2 text-left font-medium" colSpan={3}>
              備註
            </th>
            <th className="px-4 py-2 text-right font-medium">待核金額</th>
            <th className="px-4 py-2 text-center font-medium">狀態</th>
            <th className="px-4 py-2 text-right font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          {receipts.length > 0 ? (
            receipts.map(r => {
              const receiptStatus =
                r.status === '1'
                  ? { label: '已確認', style: 'bg-morandi-green/20 text-morandi-green' }
                  : { label: '待確認', style: 'bg-morandi-secondary/20 text-morandi-secondary' }
              return (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                >
                  <td className="px-4 py-2 font-medium text-morandi-primary">
                    <button
                      className="text-morandi-gold hover:underline cursor-pointer"
                      onClick={() => {
                        setSelectedReceipt(r as unknown as Receipt)
                        setReceiptDialogOpen(true)
                      }}
                    >
                      {r.receipt_number || '-'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-morandi-secondary">{formatDate(r.receipt_date)}</td>
                  <td className="px-4 py-2 text-morandi-secondary">
                    {(r.payment_method_id && paymentMethodMap[r.payment_method_id]) ||
                      PAYMENT_METHOD_LABELS[r.payment_method || ''] ||
                      r.payment_method ||
                      '-'}
                  </td>
                  <td className="px-4 py-2 text-morandi-secondary">
                    {r.receipt_account || r.payment_name || '-'}
                  </td>
                  <td className="px-4 py-2 text-morandi-secondary" colSpan={3}>
                    {r.notes || '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium">
                    {r.status !== '1'
                      ? formatCurrency(Number(r.actual_amount) || Number(r.receipt_amount) || 0)
                      : formatCurrency(0)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${receiptStatus.style}`}
                    >
                      {receiptStatus.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-green font-medium">
                    {r.status === '1'
                      ? `+${formatCurrency(Number(r.actual_amount) || Number(r.receipt_amount) || 0)}`
                      : ''}
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={10} className="py-12 text-center text-morandi-secondary">
                <DollarSign size={24} className="mx-auto mb-4 opacity-50" />
                <p>尚無收款紀錄</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <AddReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        editingReceipt={selectedReceipt}
      />
    </div>
  )
}
