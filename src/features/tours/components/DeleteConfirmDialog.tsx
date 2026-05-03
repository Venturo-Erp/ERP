import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Trash2, X } from 'lucide-react'
import { Tour } from '@/stores/types'
import { TOUR_DELETE } from '../constants'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  tour: Tour | null
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmDialog({
  isOpen,
  tour,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-morandi-red">
            <AlertCircle size={20} />
            {TOUR_DELETE.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-morandi-primary">{TOUR_DELETE.confirm_text(tour?.name)}</p>
          <div className="bg-morandi-red/5 border border-morandi-red/20 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-morandi-red">{TOUR_DELETE.impact_title}</p>
            <ul className="text-sm text-morandi-secondary space-y-1 ml-4">
              <li>{TOUR_DELETE.impact_orders}</li>
              <li>{TOUR_DELETE.impact_payments}</li>
              <li>{TOUR_DELETE.impact_quotes}</li>
            </ul>
            <p className="text-xs text-morandi-red font-medium mt-2">{TOUR_DELETE.warning}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="soft-gold" onClick={onClose} className="gap-2">
            <X size={16} />
            {TOUR_DELETE.cancel}
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-morandi-red hover:bg-morandi-red/90 text-white gap-2"
          >
            <Trash2 size={16} />
            {TOUR_DELETE.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
