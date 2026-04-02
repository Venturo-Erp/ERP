/**
 * PassportConflictDialog - 護照資料衝突提醒
 *
 * 當護照 OCR 辨識後發現其他未出發訂單的同一客戶有不同護照資料時，
 * 提示使用者是否要一併更新。
 */

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import type { ActiveOrderConflict } from '@/lib/utils/sync-passport-image'
import { batchUpdateConflictMembers, PASSPORT_FIELD_LABELS } from '@/lib/utils/sync-passport-image'
import { PASSPORT_CONFLICT_LABELS as L } from '../constants/labels'

interface PassportDataForUpdate {
  passport_number?: string | null
  passport_name?: string | null
  passport_expiry?: string | null
  passport_image_url?: string | null
  birth_date?: string | null
  gender?: string | null
  national_id?: string | null
}

interface PassportConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: ActiveOrderConflict[]
  passportData: PassportDataForUpdate
  onComplete?: () => void
}

export function PassportConflictDialog({
  open,
  onOpenChange,
  conflicts,
  passportData,
  onComplete,
}: PassportConflictDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true)
    try {
      const memberIds = conflicts.map(c => c.memberId)
      const count = await batchUpdateConflictMembers(memberIds, passportData)
      toast.success(L.success.replace('{count}', String(count)))
      onOpenChange(false)
      onComplete?.()
    } catch (error) {
      logger.error(L.fail, error)
      toast.error(L.fail)
    } finally {
      setIsUpdating(false)
    }
  }, [conflicts, passportData, onOpenChange, onComplete])

  const handleSkip = useCallback(() => {
    onOpenChange(false)
    onComplete?.()
  }, [onOpenChange, onComplete])

  if (conflicts.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{L.title}</DialogTitle>
          <DialogDescription>{L.desc}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {conflicts.map(conflict => (
            <div key={conflict.memberId} className="border rounded-lg p-3 space-y-2 text-sm">
              <div className="flex gap-4 text-muted-foreground">
                <span>
                  {L.order}: {conflict.orderCode}
                </span>
                <span>
                  {L.tour}: {conflict.tourName}
                </span>
                <span>
                  {L.member}: {conflict.memberName}
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">{L.field}</th>
                    <th className="text-left py-1">{L.old_value}</th>
                    <th className="text-left py-1">{L.new_value}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(conflict.diffs).map(([field, { oldValue, newValue }]) => (
                    <tr key={field} className="border-b last:border-0">
                      <td className="py-1 font-medium">{PASSPORT_FIELD_LABELS[field] || field}</td>
                      <td className="py-1 text-morandi-red line-through">{oldValue || '-'}</td>
                      <td className="py-1 text-morandi-green font-medium">{newValue || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={isUpdating}>
            {L.skip}
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? L.updating : L.update_all}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
