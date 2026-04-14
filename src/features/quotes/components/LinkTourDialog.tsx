'use client'
/**
 * LinkTourDialog - 報價單成交時選擇關聯旅遊團
 * 可選擇：新建旅遊團 / 關聯現有旅遊團
 */

import React, { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Link, Loader2, MapPin, Calendar, Plane } from 'lucide-react'
import { useToursSlim, invalidateTours } from '@/data'
import type { Tour } from '@/stores/types'
import { useTourDisplayResolver } from '@/features/tours/utils/tour-display'
import { LINK_TOUR_DIALOG_LABELS } from '../constants/labels'

interface LinkTourDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateNew: () => void
  onLinkExisting: (tour: Tour) => void
}

type DialogStep = 'select' | 'tour-list'

export function LinkTourDialog({
  isOpen,
  onClose,
  onCreateNew,
  onLinkExisting,
}: LinkTourDialogProps) {
  const [step, setStep] = useState<DialogStep>('select')
  const { items: tours, loading: loadingTours } = useToursSlim()
  const resolveTourDisplay = useTourDisplayResolver()

  // SWR 自動處理資料載入，在需要時手動刷新
  useEffect(() => {
    if (isOpen) {
      invalidateTours()
    }
  }, [isOpen])

  // 重置狀態
  useEffect(() => {
    if (!isOpen) {
      setStep('select')
    }
  }, [isOpen])

  // 過濾可用的旅遊團（尚未關聯報價單的）
  const availableTours = useMemo(() => {
    return tours
      .filter(t => !t.quote_id && t.status !== LINK_TOUR_DIALOG_LABELS.取消)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  }, [tours])

  const handleCreateNew = () => {
    onCreateNew()
    onClose()
  }

  const handleLinkExisting = (tour: Tour) => {
    onLinkExisting(tour)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-lg">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>{LINK_TOUR_DIALOG_LABELS.LABEL_2010}</DialogTitle>
              <DialogDescription>{LINK_TOUR_DIALOG_LABELS.PLEASE_SELECT_1147}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {/* 新建旅遊團 */}
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-[var(--morandi-gold)]/30 bg-[var(--morandi-gold)]/5 hover:bg-[var(--morandi-gold)]/10 hover:border-[var(--morandi-gold)]/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--morandi-gold)]/20 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-[var(--morandi-gold)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--morandi-primary)]">
                    {LINK_TOUR_DIALOG_LABELS.LABEL_8984}
                  </div>
                  <div className="text-sm text-[var(--morandi-secondary)]">
                    {LINK_TOUR_DIALOG_LABELS.LABEL_6874}
                  </div>
                </div>
              </button>

              {/* 關聯現有旅遊團 */}
              <button
                onClick={() => setStep('tour-list')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted hover:border-border transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-status-info-bg flex items-center justify-center shrink-0">
                  <Link className="w-5 h-5 text-status-info" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--morandi-text)] flex items-center gap-2">
                    {LINK_TOUR_DIALOG_LABELS.LABEL_8435}
                    {availableTours.length > 0 && (
                      <span className="text-xs bg-status-info-bg text-status-info px-1.5 py-0.5 rounded">
                        {availableTours.length}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--morandi-secondary)]">
                    {LINK_TOUR_DIALOG_LABELS.SELECT_2369}
                  </div>
                </div>
              </button>
            </div>
          </>
        ) : step === 'tour-list' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  onClick={() => setStep('select')}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Plane className="w-4 h-4" />
                </button>
                {LINK_TOUR_DIALOG_LABELS.SELECT_448}
              </DialogTitle>
              <DialogDescription>{LINK_TOUR_DIALOG_LABELS.SELECT_4490}</DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              {loadingTours ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--morandi-secondary)]" />
                  <span className="ml-2 text-sm text-[var(--morandi-secondary)]">
                    {LINK_TOUR_DIALOG_LABELS.LOADING_6912}
                  </span>
                </div>
              ) : availableTours.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {availableTours.map(tour => (
                    <button
                      key={tour.id}
                      onClick={() => handleLinkExisting(tour as Tour)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted hover:border-morandi-gold transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded bg-[var(--morandi-gold)]/20 flex items-center justify-center shrink-0">
                        <Plane className="w-4 h-4 text-[var(--morandi-gold)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[var(--morandi-gold)]">
                            {tour.code}
                          </span>
                          <span className="font-medium text-[var(--morandi-text)] truncate">
                            {tour.name || LINK_TOUR_DIALOG_LABELS.未命名旅遊團}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--morandi-secondary)] mt-1">
                          {(() => {
                            const display = resolveTourDisplay(tour).displayString
                            return display ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {display}
                              </span>
                            ) : null
                          })()}
                          {tour.departure_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {tour.departure_date}
                            </span>
                          )}
                          {tour.status && (
                            <span className="px-1.5 py-0.5 rounded bg-muted text-morandi-secondary">
                              {tour.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Plane className="w-10 h-10 text-[var(--morandi-secondary)]/30 mx-auto mb-3" />
                  <p className="text-sm text-[var(--morandi-secondary)]">
                    {LINK_TOUR_DIALOG_LABELS.NOT_FOUND_3707}
                  </p>
                  <p className="text-xs text-[var(--morandi-secondary)]/70 mt-1">
                    {LINK_TOUR_DIALOG_LABELS.PLEASE_SELECT_8035}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-start mt-4">
              <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
                ← 返回
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
