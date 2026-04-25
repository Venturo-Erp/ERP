/**
 * ArchiveReasonDialog - 旅遊團封存原因對話框
 */

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Archive, Check, X } from 'lucide-react'
import { Tour } from '@/stores/types'
import { cn } from '@/lib/utils'
import { TOUR_ARCHIVE } from '../constants'

// 封存原因選項
export const ARCHIVE_REASONS = [
  {
    value: 'no_deal',
    label: TOUR_ARCHIVE.reason_no_deal,
    description: TOUR_ARCHIVE.reason_no_deal_desc,
  },
  {
    value: 'cancelled',
    label: TOUR_ARCHIVE.reason_cancelled,
    description: TOUR_ARCHIVE.reason_cancelled_desc,
  },
  {
    value: 'test_error',
    label: TOUR_ARCHIVE.reason_test_error,
    description: TOUR_ARCHIVE.reason_test_error_desc,
  },
] as const

export type ArchiveReason = (typeof ARCHIVE_REASONS)[number]['value']

interface ArchiveReasonDialogProps {
  isOpen: boolean
  tour: Tour | null
  onClose: () => void
  onConfirm: (reason: ArchiveReason) => void
}

export function ArchiveReasonDialog({
  isOpen,
  tour,
  onClose,
  onConfirm,
}: ArchiveReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ArchiveReason | null>(null)

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason)
      setSelectedReason(null)
    }
  }

  const handleClose = () => {
    setSelectedReason(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent level={1} className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-morandi-gold">
            <Archive size={20} />
            {TOUR_ARCHIVE.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-morandi-primary">{TOUR_ARCHIVE.confirm_text(tour?.name)}</p>

          <div className="space-y-2">
            <p className="text-sm font-medium text-morandi-primary">{TOUR_ARCHIVE.select_reason}</p>
            <div className="space-y-2">
              {ARCHIVE_REASONS.map(reason => (
                <button
                  key={reason.value}
                  onClick={() => setSelectedReason(reason.value)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-all',
                    selectedReason === reason.value
                      ? 'border-morandi-gold bg-morandi-gold/10'
                      : 'border-morandi-container hover:border-morandi-gold/50 hover:bg-morandi-container/30'
                  )}
                >
                  <div className="font-medium text-morandi-primary">{reason.label}</div>
                  <div className="text-xs text-morandi-secondary">{reason.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-morandi-gold/5 border border-morandi-gold/20 rounded-lg p-3 space-y-2">
            <p className="text-sm text-morandi-secondary">{TOUR_ARCHIVE.after_archive_title}</p>
            <ul className="text-sm text-morandi-secondary space-y-1 ml-4">
              <li>{TOUR_ARCHIVE.after_archive_hidden}</li>
              <li>{TOUR_ARCHIVE.after_archive_unlink}</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} className="gap-2">
            <X size={16} />
            {TOUR_ARCHIVE.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedReason}
            className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors gap-2"
          >
            <Check size={16} />
            {TOUR_ARCHIVE.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
