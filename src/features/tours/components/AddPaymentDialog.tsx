'use client'

import { ADD_PAYMENT_LABELS } from '../constants/labels'

import React from 'react'
import type { Order } from '@/stores/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'

interface AddPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourOrders: Order[]
  selectedOrderId: string
  onSelectedOrderIdChange: (id: string) => void
  newPayment: {
    amount: number
    description: string
    method: string
    status: '已確認' | '待確認'
  }
  onNewPaymentChange: (payment: {
    amount: number
    description: string
    method: string
    status: '已確認' | '待確認'
  }) => void
  onAddPayment: () => void
}

export const AddPaymentDialog = React.memo(function AddPaymentDialog({
  open,
  onOpenChange,
  tourOrders,
  selectedOrderId,
  onSelectedOrderIdChange,
  newPayment,
  onNewPaymentChange,
  onAddPayment,
}: AddPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ADD_PAYMENT_LABELS.TITLE}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {ADD_PAYMENT_LABELS.RELATED_ORDER}
            </label>
            <Select
              value={selectedOrderId || '__none__'}
              onValueChange={v => onSelectedOrderIdChange(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder={ADD_PAYMENT_LABELS.LABEL_9638} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{ADD_PAYMENT_LABELS.LABEL_9638}</SelectItem>
                {tourOrders.map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number} - {order.contact_person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {ADD_PAYMENT_LABELS.AMOUNT}
            </label>
            <Input
              type="number"
              value={newPayment.amount || ''}
              onChange={e => onNewPaymentChange({ ...newPayment, amount: Number(e.target.value) })}
              placeholder="0"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {ADD_PAYMENT_LABELS.DESCRIPTION}
            </label>
            <Input
              value={newPayment.description}
              onChange={e => onNewPaymentChange({ ...newPayment, description: e.target.value })}
              placeholder={ADD_PAYMENT_LABELS.LABEL_4914}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {ADD_PAYMENT_LABELS.PAYMENT_METHOD}
            </label>
            <Select
              value={newPayment.method}
              onValueChange={value => onNewPaymentChange({ ...newPayment, method: value })}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">{ADD_PAYMENT_LABELS.BANK_TRANSFER}</SelectItem>
                <SelectItem value="credit_card">{ADD_PAYMENT_LABELS.CREDIT_CARD}</SelectItem>
                <SelectItem value="cash">{ADD_PAYMENT_LABELS.CASH}</SelectItem>
                <SelectItem value="check">{ADD_PAYMENT_LABELS.LABEL_6402}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {ADD_PAYMENT_LABELS.CONFIRM_2526}
            </label>
            <Select
              value={newPayment.status}
              onValueChange={value =>
                onNewPaymentChange({ ...newPayment, status: value as '已確認' | '待確認' })
              }
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="已確認">{ADD_PAYMENT_LABELS.CONFIRM_469}</SelectItem>
                <SelectItem value="待確認">{ADD_PAYMENT_LABELS.CONFIRM_7150}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" className="gap-2" onClick={() => onOpenChange(false)}>
              <X size={16} />
              {ADD_PAYMENT_LABELS.CANCEL}
            </Button>
            <Button
              onClick={onAddPayment}
              className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-2"
            >
              <Plus size={16} />
              {ADD_PAYMENT_LABELS.ADD}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
