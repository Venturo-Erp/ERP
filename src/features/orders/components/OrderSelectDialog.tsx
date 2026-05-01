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
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('orders')

  const [selectedOrderId, setSelectedOrderId] = useState<string>('')

  // 將 orders 轉換為 Combobox 選項格式
  const orderOptions = orders.map(order => ({
    value: order.id,
    label: order.order_number || t('common.未命名訂單'),
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
          <DialogTitle>{t('common.選擇訂單')}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium text-morandi-primary mb-2 block">
            {t('common.pleaseSelect2473')}
          </label>
          <Combobox
            options={orderOptions}
            value={selectedOrderId}
            onChange={setSelectedOrderId}
            placeholder={t('common.搜尋或選擇訂單')}
            emptyMessage={t('common.找不到符合的訂單')}
            showSearchIcon
            showClearButton
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="gap-2">
            <X size={16} />
            {t('common.取消')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedOrderId}
            className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors gap-2"
          >
            <Check size={16} />
            {t('common.選擇訂單')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
