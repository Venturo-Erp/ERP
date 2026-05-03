'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { X, Check } from 'lucide-react'
import { BATCH_OPERATION_LABELS as L } from '../constants/labels'

interface BatchPickupDialogProps {
  open: boolean
  selectedCount: number
  pickupDate: string
  onPickupDateChange: (date: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function BatchPickupDialog({
  open,
  selectedCount,
  pickupDate,
  onPickupDateChange,
  onConfirm,
  onCancel,
}: BatchPickupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onCancel()}>
      <DialogContent level={1} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{L.pickup_title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-morandi-secondary">
            {L.selected_prefix}{' '}
            <span className="font-semibold text-morandi-primary">{selectedCount}</span>{' '}
            {L.selected_suffix}
          </p>
          <div>
            <label className="text-sm font-medium text-morandi-primary">{L.pickup_date}</label>
            <DatePicker
              value={pickupDate}
              onChange={onPickupDateChange}
              className="mt-1"
              placeholder={L.placeholder_date}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="soft-gold" className="gap-1" onClick={onCancel}>
            <X size={16} />
            {L.btn_cancel}
          </Button>
          <Button onClick={onConfirm} className="bg-morandi-green hover:bg-morandi-green/90 gap-1">
            <Check size={16} />
            {L.btn_confirm_pickup}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface BatchRejectDialogProps {
  open: boolean
  selectedCount: number
  rejectDate: string
  onRejectDateChange: (date: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function BatchRejectDialog({
  open,
  selectedCount,
  rejectDate,
  onRejectDateChange,
  onConfirm,
  onCancel,
}: BatchRejectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onCancel()}>
      <DialogContent level={1} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{L.reject_title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-morandi-secondary">
            {L.selected_prefix}{' '}
            <span className="font-semibold text-morandi-primary">{selectedCount}</span>{' '}
            {L.selected_suffix}
          </p>
          <div>
            <label className="text-sm font-medium text-morandi-primary">{L.reject_date}</label>
            <DatePicker
              value={rejectDate}
              onChange={onRejectDateChange}
              className="mt-1"
              placeholder={L.placeholder_date}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="soft-gold" className="gap-1" onClick={onCancel}>
            <X size={16} />
            {L.btn_cancel}
          </Button>
          <Button onClick={onConfirm} className="bg-morandi-red hover:bg-morandi-red/90 gap-1">
            <Check size={16} />
            {L.btn_confirm_reject}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
