'use client'
/**
 * OrderSelectDialog - 訂單選擇對話框
 * 團體模式新增成員時選擇訂單
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Check, X } from 'lucide-react'
import { COMP_ORDERS_LABELS } from '../constants/labels'

interface TourOrder {
  id: string
  order_number: string | null
}

interface OrderSelectDialogProps {
  isOpen: boolean
  orders: TourOrder[]
  onClose: () => void
  onSelect: (orderId: string) => void
}

export function OrderSelectDialog({ isOpen, orders, onClose, onSelect }: OrderSelectDialogProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')

  // 將 orders 轉換為 Combobox 選項格式
  const orderOptions = orders.map(order => ({
    value: order.id,
    label: order.order_number || COMP_ORDERS_LABELS.未命名訂單,
    data: order,
  }))

  const handleConfirm = () => {
    if (selectedOrderId) {
      onSelect(selectedOrderId)
      onClose()
      setSelectedOrderId('')
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedOrderId('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        nested
        level={2}
        className="max-w-md"
        onInteractOutside={e => {
          const target = e.target as HTMLElement
          if (
            target.closest('[role="listbox"]') ||
            target.closest('[data-radix-select-viewport]') ||
            target.closest('[cmdk-root]')
          ) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{COMP_ORDERS_LABELS.選擇訂單}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium text-morandi-primary mb-2 block">
            {COMP_ORDERS_LABELS.PLEASE_SELECT_2473}
          </label>
          <Combobox
            options={orderOptions}
            value={selectedOrderId}
            onChange={setSelectedOrderId}
            placeholder={COMP_ORDERS_LABELS.搜尋或選擇訂單}
            emptyMessage={COMP_ORDERS_LABELS.找不到符合的訂單}
            showSearchIcon
            showClearButton
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="gap-2">
            <X size={16} />
            {COMP_ORDERS_LABELS.取消}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedOrderId}
            className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-2"
          >
            <Check size={16} />
            {COMP_ORDERS_LABELS.選擇訂單}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
