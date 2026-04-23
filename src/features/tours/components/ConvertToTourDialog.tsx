'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SimpleDateInput } from '@/components/ui/simple-date-input'
import { X } from 'lucide-react'
import { getTodayString } from '@/lib/utils/format-date'
import { Tour } from '@/stores/types'
import { TOUR_CONVERT } from '../constants'
import { toast } from 'sonner'
import { TourOrderSection } from './tour-form'
import type { OrderFormData } from '@/features/orders/components/add-order-form'

export interface ConvertOrderData {
  contact_person?: string
  sales_person?: string
  assistant?: string
  member_count?: number
  total_amount?: number
}

interface ConvertToTourDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour | null
  onConvert: (
    tour: Tour,
    departure_date: string,
    return_date: string,
    orderData?: ConvertOrderData
  ) => Promise<void>
}

export function ConvertToTourDialog({
  isOpen,
  onClose,
  tour,
  onConvert,
}: ConvertToTourDialogProps) {
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newOrder, setNewOrder] = useState<Partial<OrderFormData>>({
    contact_person: '',
    sales_person: '',
    assistant: '',
    member_count: 1,
    total_amount: 0,
  })

  if (!tour) return null

  const isTemplate = tour.status === 'template'
  const title = isTemplate ? TOUR_CONVERT.title_template : TOUR_CONVERT.title_proposal
  const description = isTemplate
    ? TOUR_CONVERT.description_template
    : TOUR_CONVERT.description_proposal

  const hasOrder = !!newOrder.contact_person?.trim()

  const handleSubmit = async () => {
    if (!departureDate || !returnDate) return
    // 有填聯絡人就需要業務
    if (hasOrder && !newOrder.sales_person?.trim()) return
    try {
      setSubmitting(true)
      const orderData = hasOrder
        ? {
            contact_person: newOrder.contact_person,
            sales_person: newOrder.sales_person,
            assistant: newOrder.assistant,
            member_count: newOrder.member_count,
            total_amount: newOrder.total_amount,
          }
        : undefined
      await onConvert(tour, departureDate, returnDate, orderData)
      toast.success(isTemplate ? TOUR_CONVERT.success_template : TOUR_CONVERT.success_proposal)
      handleClose()
    } catch {
      toast.error(TOUR_CONVERT.error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setDepartureDate('')
    setReturnDate('')
    setNewOrder({
      contact_person: '',
      sales_person: '',
      assistant: '',
      member_count: 1,
      total_amount: 0,
    })
    onClose()
  }

  const submitLabel = submitting
    ? TOUR_CONVERT.confirming
    : hasOrder
      ? '確認開團並建立訂單'
      : TOUR_CONVERT.confirm

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent level={1} className="max-w-4xl w-[90vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 mt-4">
          {/* 左邊：日期 */}
          <div className="flex-1 space-y-4">
            <h3 className="text-base font-medium text-morandi-primary">旅遊團資訊</h3>

            <div className="text-sm text-morandi-primary font-medium">{tour.name}</div>

            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {TOUR_CONVERT.label_departure}
              </label>
              <SimpleDateInput
                value={departureDate}
                onChange={date => {
                  setDepartureDate(date)
                  if (returnDate && returnDate < date) {
                    setReturnDate(date)
                  }
                }}
                min={getTodayString()}
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {TOUR_CONVERT.label_return}
              </label>
              <SimpleDateInput
                value={returnDate}
                onChange={setReturnDate}
                min={departureDate || getTodayString()}
                defaultMonth={departureDate}
                className="mt-1"
                required
              />
            </div>
          </div>

          {/* 分隔線 */}
          <div className="border-l border-border" />

          {/* 右邊：訂單 */}
          <div className="flex-1">
            <TourOrderSection newOrder={newOrder} setNewOrder={setNewOrder} />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={handleClose} disabled={submitting} className="gap-2">
            <X size={16} />
            {TOUR_CONVERT.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !departureDate ||
              !returnDate ||
              (hasOrder && !newOrder.sales_person?.trim())
            }
            className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
          >
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
