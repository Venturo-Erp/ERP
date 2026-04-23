'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tour } from '@/types/tour.types'
import { toast } from 'sonner'
import { Unlock, Loader2, AlertTriangle, Eye, EyeOff, X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { TOUR_UNLOCK } from '../constants'

interface TourUnlockDialogProps {
  tour: Tour
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnlocked?: () => void
}

export function TourUnlockDialog({ tour, open, onOpenChange, onUnlocked }: TourUnlockDialogProps) {
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUnlock = async () => {
    if (!password) {
      setError(TOUR_UNLOCK.error_enter_password)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 取得當前 session token
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError(TOUR_UNLOCK.error_login_required)
        setSubmitting(false)
        return
      }

      // 呼叫解鎖 API
      const response = await fetch(`/api/tours/${tour.id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          password,
          reason: reason.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || TOUR_UNLOCK.error_unlock_failed)
        setSubmitting(false)
        return
      }

      toast.success(TOUR_UNLOCK.success_unlocked)
      setPassword('')
      setReason('')
      onOpenChange(false)
      onUnlocked?.()
    } catch (err) {
      logger.error('解鎖錯誤:', err)
      setError(TOUR_UNLOCK.error_generic)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setReason('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Unlock className="h-5 w-5 text-morandi-gold" />
            {TOUR_UNLOCK.title}
          </DialogTitle>
          <DialogDescription>{TOUR_UNLOCK.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 警告訊息 */}
          <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-status-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm text-morandi-primary">
                <p className="font-medium">{tour.name}</p>
                <p className="mt-1">{TOUR_UNLOCK.warning}</p>
              </div>
            </div>
          </div>

          {/* 密碼輸入 */}
          <div className="space-y-2">
            <Label htmlFor="password">{TOUR_UNLOCK.label_password}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                placeholder={TOUR_UNLOCK.password_placeholder}
                className="pr-10"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleUnlock()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 修改原因 */}
          <div className="space-y-2">
            <Label htmlFor="reason">{TOUR_UNLOCK.label_reason}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={TOUR_UNLOCK.reason_placeholder}
              rows={2}
            />
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="text-sm text-status-danger bg-status-danger-bg border border-status-danger rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting} className="gap-1">
            <X size={16} />
            {TOUR_UNLOCK.cancel}
          </Button>
          <Button
            onClick={handleUnlock}
            disabled={submitting || !password}
            className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-1"
          >
            <Check size={16} className={submitting ? 'hidden' : ''} />
            <Loader2 className={submitting ? 'h-4 w-4 animate-spin' : 'hidden'} />
            {TOUR_UNLOCK.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
