'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Check, X } from 'lucide-react'

export interface AccommodationChange {
  dayNumber: number
  oldHotel: string
  newHotel: string
  hasQuote: boolean // 報價單已有成本
  quotedPrice?: number
  hasRequest: boolean // 需求單已發出
  requestStatus?: string
}

interface AccommodationChangeDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  changes: AccommodationChange[]
}

export function AccommodationChangeDialog({
  open,
  onConfirm,
  onCancel,
  changes,
}: AccommodationChangeDialogProps) {
  const quoteChanges = changes.filter(c => c.hasQuote)
  const requestChanges = changes.filter(c => c.hasRequest)

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onCancel()
      }}
    >
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-morandi-gold">
            <AlertTriangle size={20} />
            住宿變更警示
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p className="text-foreground">偵測到以下住宿變更：</p>

              {changes.map(c => (
                <div key={c.dayNumber} className="bg-muted/50 rounded-md p-2 space-y-1">
                  <div className="font-medium">第 {c.dayNumber} 天</div>
                  <div className="text-muted-foreground line-through text-xs">{c.oldHotel}</div>
                  <div className="text-foreground text-xs">→ {c.newHotel}</div>
                </div>
              ))}

              {quoteChanges.length > 0 && (
                <div className="bg-morandi-gold/10 border border-morandi-gold/30 rounded-md p-2">
                  <p className="font-medium text-morandi-primary">⚠ 報價單影響</p>
                  <p className="text-morandi-gold text-xs mt-1">
                    以下住宿已有報價成本，變更後將清除：
                  </p>
                  <ul className="text-xs text-morandi-gold mt-1 space-y-0.5">
                    {quoteChanges.map(c => (
                      <li key={c.dayNumber}>
                        第 {c.dayNumber} 天 — {c.oldHotel}
                        {c.quotedPrice ? ` ($${c.quotedPrice.toLocaleString()})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {requestChanges.length > 0 && (
                <div className="bg-morandi-red/10 border border-morandi-red/30 rounded-md p-2">
                  <p className="font-medium text-morandi-red">🚨 需求單影響</p>
                  <p className="text-morandi-red text-xs mt-1">
                    以下住宿已發出需求單，變更後需通知供應商取消：
                  </p>
                  <ul className="text-xs text-morandi-red mt-1 space-y-0.5">
                    {requestChanges.map(c => (
                      <li key={c.dayNumber}>
                        第 {c.dayNumber} 天 — {c.oldHotel}（{c.requestStatus || '已發出'}）
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            <Check className="h-4 w-4 mr-1" />
            確認變更
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
