/**
 * AcceptQuoteDialog - 確認成交 Dialog
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, X, Check } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { TourRequest } from '@/features/tours/hooks/useTourRequests'

interface AcceptQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: TourRequest
  onSuccess: () => void
}

export function AcceptQuoteDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: AcceptQuoteDialogProps) {
  const [selectedTier, setSelectedTier] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const response = request.supplier_response as Record<string, unknown>
  const tierPrices = (response?.tierPrices as Record<string, number>) || {}

  const handleAccept = async () => {
    if (!selectedTier) {
      toast({
        title: '請選擇人數梯次',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/tours/${request.tour_id}/requests/${request.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedTier: Number(selectedTier),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '成交失敗')
      }

      toast({
        title: '✅ 成交成功',
        description: '已自動產生協作確認單',
      })

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: '成交失敗',
        description: (error instanceof Error ? error.message : String(error)),
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
          <DialogTitle>✅ 確認成交</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">供應商</p>
            <p className="font-medium">{request.supplier_name || 'Local 供應商'}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">聯絡人</p>
            <p className="font-medium">
              {String(response?.contact || '')} / {String(response?.phone || '')}
            </p>
          </div>

          <div className="border-t pt-4">
            <Label className="mb-3 block">選擇人數梯次</Label>
            <RadioGroup value={selectedTier} onValueChange={setSelectedTier}>
              {Object.entries(tierPrices).map(([tier, price]) => (
                <div key={tier} className="flex items-center space-x-2 py-2">
                  <RadioGroupItem value={tier} id={`tier-${tier}`} />
                  <Label htmlFor={`tier-${tier}`} className="cursor-pointer flex-1">
                    <span className="font-medium">{tier} 人團</span>
                    <span className="mx-2">•</span>
                    <span className="text-muted-foreground">
                      {Number(price).toLocaleString()} 元/人
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="bg-status-info/10 border border-status-info/30 rounded-lg p-3 text-sm">
            <p className="font-medium text-morandi-primary mb-1">確認後將：</p>
            <ul className="list-disc list-inside text-status-info space-y-1">
              <li>自動產生「協作確認單」</li>
              <li>從行程表抓取所有項目</li>
              <li>供應商可以開始確認細項</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
          <Button onClick={handleAccept} disabled={loading || !selectedTier}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            確認成交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
