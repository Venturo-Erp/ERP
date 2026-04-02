/**
 * RejectQuoteDialog - 拒絕報價 Dialog
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { TourRequest } from '@/features/tours/hooks/useTourRequests'

interface RejectQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: TourRequest
  onSuccess: () => void
}

export function RejectQuoteDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: RejectQuoteDialogProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleReject = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/tours/${request.tour_id}/requests/${request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '拒絕失敗')
      }

      toast({
        title: '✅ 已標記為不成交',
        description: '報價已歸檔',
      })

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: '操作失敗',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle>❌ 標記為不成交</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">供應商</p>
            <p className="font-medium">{request.supplier_name || 'Local 供應商'}</p>
          </div>

          <div>
            <Label htmlFor="reason">不成交原因（選填）</Label>
            <Textarea
              id="reason"
              placeholder="例如：客人預算不足、改期、取消等"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="bg-morandi-gold/10 border border-morandi-gold/30 rounded-lg p-3 text-sm">
            <p className="text-morandi-primary">
              報價會被標記為「不成交」並歸檔，可在「未成交」區塊查看。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <X className="h-4 w-4 mr-1" />
            )}
            確認不成交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
