'use client'

import React from 'react'
import { Payment } from '@/stores/types'
import type { Order } from '@/stores/types'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, CreditCard, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { COMP_TOURS_LABELS } from '../constants/labels'

interface ReceiptPayment extends Payment {
  method?: string
}

interface PaymentRowProps {
  payment: ReceiptPayment
  relatedOrder?: Order
  onOpenInvoice: (orderId?: string) => void
}

// 狀態標籤映射（英文 -> 中文）
const STATUS_LABELS: Record<string, string> = {
  confirmed: COMP_TOURS_LABELS.已確認,
  pending: COMP_TOURS_LABELS.待確認,
  completed: COMP_TOURS_LABELS.已完成,
}

const getStatusLabel = (status: string) => STATUS_LABELS[status] || status

const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    // 中文狀態
    已確認: 'bg-morandi-green/20 text-morandi-green',
    待確認: 'bg-morandi-gold/20 text-morandi-gold',
    已完成: 'bg-morandi-container text-morandi-primary',
    // 英文狀態（相容）
    confirmed: 'bg-morandi-green/20 text-morandi-green',
    pending: 'bg-morandi-gold/20 text-morandi-gold',
    completed: 'bg-morandi-container text-morandi-primary',
  }
  return badges[status] || 'bg-morandi-container text-morandi-secondary'
}

const getMethodBadge = (method: string) => {
  const badges: Record<string, string> = {
    bank_transfer: 'bg-status-info-bg text-status-info',
    credit_card: 'bg-morandi-container text-morandi-secondary',
    cash: 'bg-status-success-bg text-status-success',
    check: 'bg-status-warning-bg text-status-warning',
  }
  return badges[method] || 'bg-muted text-foreground'
}

const getMethodDisplayName = (method: string) => {
  const names: Record<string, string> = {
    bank_transfer: COMP_TOURS_LABELS.銀行轉帳,
    credit_card: COMP_TOURS_LABELS.信用卡,
    cash: COMP_TOURS_LABELS.現金,
    check: COMP_TOURS_LABELS.支票,
  }
  return names[method] || method
}

const getPaymentTypeIcon = (type: Payment['type']) => {
  if (type === 'receipt') return <TrendingUp size={16} className="text-morandi-green" />
  if (type === 'request') return <TrendingDown size={16} className="text-morandi-red" />
  return <CreditCard size={16} className="text-morandi-gold" />
}

export const PaymentRow = React.memo(function PaymentRow({
  payment,
  relatedOrder,
  onOpenInvoice,
}: PaymentRowProps) {
  return (
    <tr className="border-b border-border/30">
      <td className="py-3 px-4">
        <DateCell date={payment.created_at} showIcon={false} className="text-morandi-primary" />
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center space-x-2">
          {getPaymentTypeIcon(payment.type)}
          <span className="text-morandi-primary">
            {payment.type === 'receipt'
              ? COMP_TOURS_LABELS.收款
              : payment.type === 'request'
                ? COMP_TOURS_LABELS.請款
                : COMP_TOURS_LABELS.出納}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <CurrencyCell
          amount={payment.amount}
          variant={payment.type === 'receipt' ? 'income' : 'expense'}
          showSign
          className="font-medium"
        />
      </td>
      <td className="py-3 px-4 text-morandi-primary">{payment.description}</td>
      <td className="py-3 px-4">
        <span
          className={cn(
            'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
            getMethodBadge(payment.method || '')
          )}
        >
          {getMethodDisplayName(payment.method || '')}
        </span>
      </td>
      <td className="py-3 px-4 text-morandi-primary">
        {relatedOrder ? relatedOrder.order_number : '-'}
      </td>
      <td className="py-3 px-4">
        <span
          className={cn(
            'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
            getStatusBadge(payment.status)
          )}
        >
          {getStatusLabel(payment.status)}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenInvoice(payment.order_id)}
          className="h-8 px-2 text-xs text-primary hover:bg-primary/10"
          title={COMP_TOURS_LABELS.開立代轉發票}
        >
          <FileText size={14} className="mr-1" />
          {COMP_TOURS_LABELS.LABEL_9684}
        </Button>
      </td>
    </tr>
  )
})
