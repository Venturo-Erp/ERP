import React from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { ArrowRight, RefreshCw, X } from 'lucide-react'
import { SYNC_TO_ITINERARY_DIALOG_LABELS } from '../constants/labels'

export interface MealDiff {
  day: number
  type: 'lunch' | 'dinner'
  typeLabel: string
  oldValue: string
  newValue: string
}

interface SyncToItineraryDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  diffs: MealDiff[]
  itineraryTitle?: string
}

export const SyncToItineraryDialog: React.FC<SyncToItineraryDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  diffs,
  itineraryTitle,
}) => {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={onClose}
      title={SYNC_TO_ITINERARY_DIALOG_LABELS.同步餐飲到行程表}
      onSubmit={handleConfirm}
      onCancel={onClose}
      submitDisabled={diffs.length === 0}
      maxWidth="lg"
      footer={
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="soft-gold" onClick={onClose} className="gap-2">
            <X size={16} />
            {SYNC_TO_ITINERARY_DIALOG_LABELS.取消}
          </Button>
          <Button variant="soft-gold"
            type="submit"
            disabled={diffs.length === 0}
 className="gap-2"
          >
            <RefreshCw size={16} />
            {SYNC_TO_ITINERARY_DIALOG_LABELS.確認同步}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {itineraryTitle && (
          <p className="text-sm text-morandi-secondary">
            {SYNC_TO_ITINERARY_DIALOG_LABELS.將同步到行程表}
            <span className="font-medium text-morandi-primary">{itineraryTitle}</span>
          </p>
        )}

        {diffs.length === 0 ? (
          <div className="text-center py-8 text-morandi-secondary">
            {SYNC_TO_ITINERARY_DIALOG_LABELS.沒有需要同步的變更}
          </div>
        ) : (
          <>
            <p className="text-sm text-morandi-secondary">
              {SYNC_TO_ITINERARY_DIALOG_LABELS.以下餐飲將會更新.replace(
                '{count}',
                diffs.length.toString()
              )}
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-morandi-container/40">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-morandi-primary">
                      {SYNC_TO_ITINERARY_DIALOG_LABELS.天數}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-morandi-primary">
                      {SYNC_TO_ITINERARY_DIALOG_LABELS.餐別}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-morandi-primary">
                      {SYNC_TO_ITINERARY_DIALOG_LABELS.原本}
                    </th>
                    <th className="text-center py-2 px-3 font-medium text-morandi-primary w-10"></th>
                    <th className="text-left py-2 px-3 font-medium text-morandi-primary">
                      {SYNC_TO_ITINERARY_DIALOG_LABELS.更新後}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((diff, index) => (
                    <tr key={index} className="border-t border-border/50">
                      <td className="py-2 px-3 text-morandi-primary">Day {diff.day}</td>
                      <td className="py-2 px-3 text-morandi-primary">{diff.typeLabel}</td>
                      <td className="py-2 px-3 text-morandi-secondary">
                        {diff.oldValue || (
                          <span className="text-morandi-muted">
                            {SYNC_TO_ITINERARY_DIALOG_LABELS.空}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <ArrowRight size={14} className="text-morandi-gold inline" />
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            diff.newValue === SYNC_TO_ITINERARY_DIALOG_LABELS.自理
                              ? 'text-status-warning font-medium'
                              : 'text-morandi-green font-medium'
                          }
                        >
                          {diff.newValue || (
                            <span className="text-morandi-muted">
                              {SYNC_TO_ITINERARY_DIALOG_LABELS.空}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </FormDialog>
  )
}
