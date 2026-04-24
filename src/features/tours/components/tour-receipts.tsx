'use client'

/**
 * TourReceipts - 收款總覽表格（與 TourCosts 請款總覽成對）
 *
 * 使用場景：
 * - 旅遊團 詳情頁「總覽」分頁 → 顯示請款 + 收款
 * - 旅遊團 詳情頁「結案」分頁 → 同上
 *
 * 2026-04-24 補回（258d6220c cleanup 把 tour-payments 砍掉後、總覽頁收款明細消失）。
 */

import React, { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { Tour } from '@/stores/types'
import type { Receipt } from '@/types/receipt.types'
import { useReceipts, useOrdersSlim } from '@/data'
import { usePaymentMethodsCached } from '@/data/hooks'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddReceiptDialog } from '@/features/finance/payments/components/AddReceiptDialog'

interface TourReceiptsProps {
  tour: Tour
  /** 選填：只顯示特定訂單相關的收款 */
  orderFilter?: string
}

const PAYMENT_METHOD_FALLBACK_LABELS: Record<string, string> = {
  transfer: '匯款',
  cash: '現金',
  card: '刷卡',
  check: '支票',
  linkpay: 'LinkPay',
}

const STATUS_MAP: Record<string, { label: string; style: string }> = {
  pending: { label: '待確認', style: 'bg-morandi-secondary/20 text-morandi-secondary' },
  confirmed: { label: '已確認', style: 'bg-morandi-green/20 text-morandi-green' },
  cancelled: { label: '已取消', style: 'bg-morandi-red/20 text-morandi-red' },
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
}

export const TourReceipts = React.memo(function TourReceipts({
  tour,
  orderFilter,
}: TourReceiptsProps) {
  const { items: allReceipts } = useReceipts()
  const { items: orders } = useOrdersSlim()
  const { methods: allPaymentMethods } = usePaymentMethodsCached()
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const orderIds = useMemo(
    () => new Set((orders ?? []).filter(o => o.tour_id === tour.id).map(o => o.id)),
    [orders, tour.id]
  )

  const receipts = useMemo(
    () =>
      (allReceipts ?? [])
        .filter(r => !r.deleted_at)
        .filter(r => r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id)))
        .filter(r => !orderFilter || r.order_id === orderFilter)
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
    [allReceipts, tour.id, orderIds, orderFilter]
  )

  const paymentMethodMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const pm of allPaymentMethods) map[pm.id] = pm.name
    return map
  }, [allPaymentMethods])

  const resolveMethodLabel = (r: Receipt) => {
    if (r.payment_method_id && paymentMethodMap[r.payment_method_id]) {
      return paymentMethodMap[r.payment_method_id]
    }
    return PAYMENT_METHOD_FALLBACK_LABELS[r.payment_method] || r.payment_method || '-'
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto bg-card">
      <div className="px-4 py-2 bg-morandi-green/10 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-morandi-green" />
        <span className="text-sm font-medium text-morandi-green">
          收款總覽 ({receipts.length})
        </span>
      </div>
      <table className="w-full text-sm table-fixed" style={{ minWidth: 900 }}>
        <colgroup>
          <col style={{ width: '14%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-xs text-morandi-secondary">
            <th className="px-4 py-2 text-left font-medium">單號</th>
            <th className="px-4 py-2 text-left font-medium">收款日期</th>
            <th className="px-4 py-2 text-left font-medium">收款方式</th>
            <th className="px-4 py-2 text-left font-medium">付款人</th>
            <th className="px-4 py-2 text-left font-medium">備註</th>
            <th className="px-4 py-2 text-center font-medium">狀態</th>
            <th className="px-4 py-2 text-right font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          {receipts.length > 0 ? (
            receipts.map(r => {
              const statusInfo = STATUS_MAP[r.status || ''] ?? {
                label: r.status || '待確認',
                style: 'bg-morandi-secondary/20 text-morandi-secondary',
              }
              const amount = Number(r.actual_amount) || Number(r.receipt_amount) || 0
              return (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                >
                  <td className="px-4 py-2 font-medium text-morandi-primary">
                    <button
                      className="text-morandi-gold hover:underline cursor-pointer"
                      onClick={() => {
                        setSelectedReceipt(r)
                        setDialogOpen(true)
                      }}
                    >
                      {r.receipt_number || '-'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-morandi-secondary">{formatDate(r.receipt_date)}</td>
                  <td className="px-4 py-2 text-morandi-secondary">{resolveMethodLabel(r)}</td>
                  <td className="px-4 py-2 text-morandi-secondary">{r.receipt_account || '-'}</td>
                  <td className="px-4 py-2 text-morandi-secondary">{r.notes || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.style}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-green font-medium">
                    +{formatCurrency(amount)}
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={7} className="py-12 text-center text-morandi-secondary">
                <TrendingUp size={24} className="mx-auto mb-4 opacity-50" />
                <p>尚無收款紀錄</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <AddReceiptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingReceipt={selectedReceipt}
      />
    </div>
  )
})
