'use client'
/**
 * AiGenerateDialog - AI 排行程設定對話框
 */

import { Sparkles, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AI_THEMES, type AccommodationStatus } from './types'
import { AI_GENERATE_DIALOG_LABELS } from './labels'

interface AiGenerateDialogProps {
  isOpen: boolean
  onClose: () => void
  destination: string
  numDays: number
  accommodationStatus: AccommodationStatus
  arrivalTime: string
  departureTime: string
  theme: string
  isGenerating: boolean
  onArrivalTimeChange: (value: string) => void
  onDepartureTimeChange: (value: string) => void
  onThemeChange: (value: string) => void
  onGenerate: () => void
}

export function AiGenerateDialog({
  isOpen,
  onClose,
  destination,
  numDays,
  accommodationStatus,
  arrivalTime,
  departureTime,
  theme,
  isGenerating,
  onArrivalTimeChange,
  onDepartureTimeChange,
  onThemeChange,
  onGenerate,
}: AiGenerateDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={3} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-morandi-gold" />
            AI 排行程
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 基本資訊（唯讀） */}
          <div className="flex items-center gap-4 p-3 bg-morandi-container/30 rounded-lg">
            <div className="flex-1">
              <div className="text-[10px] text-morandi-secondary">
                {AI_GENERATE_DIALOG_LABELS.LABEL_5475}
              </div>
              <div className="text-sm font-medium">
                {destination || AI_GENERATE_DIALOG_LABELS.未設定}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-morandi-secondary">
                {AI_GENERATE_DIALOG_LABELS.LABEL_1983}
              </div>
              <div className="text-sm font-medium">{numDays} 天</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-morandi-secondary">
                {AI_GENERATE_DIALOG_LABELS.LABEL_4587}
              </div>
              <div className="text-sm font-medium text-morandi-green">
                ✓ 已填寫 {accommodationStatus.filledCount}/{accommodationStatus.requiredDays} 天
              </div>
            </div>
          </div>

          {/* 時間設定 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-morandi-primary">
                {AI_GENERATE_DIALOG_LABELS.LABEL_1928}
              </Label>
              <Input
                type="time"
                value={arrivalTime}
                onChange={e => onArrivalTimeChange(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-morandi-primary">
                {AI_GENERATE_DIALOG_LABELS.LABEL_4695}
              </Label>
              <Input
                type="time"
                value={departureTime}
                onChange={e => onDepartureTimeChange(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* 行程風格選擇 */}
          <div className="space-y-2">
            <Label className="text-xs text-morandi-primary">
              {AI_GENERATE_DIALOG_LABELS.LABEL_121}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {AI_THEMES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onThemeChange(t.value)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    theme === t.value
                      ? 'border-morandi-gold bg-morandi-gold/10'
                      : 'border-border hover:border-morandi-gold/50'
                  }`}
                >
                  <div
                    className={`text-xs font-medium ${theme === t.value ? 'text-morandi-gold' : ''}`}
                  >
                    {t.label}
                  </div>
                  <div className="text-[10px] text-morandi-secondary mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 說明 */}
          <p className="text-xs text-morandi-secondary">
            AI 將根據您的住宿地點和選擇的風格，為每一天安排合適的景點和路線
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="gap-1">
            <X size={14} />
            {AI_GENERATE_DIALOG_LABELS.CANCEL}
          </Button>
          <Button variant="soft-gold"
            onClick={onGenerate}
            disabled={isGenerating}
 className="gap-1"
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {AI_GENERATE_DIALOG_LABELS.GENERATING_7316}
              </>
            ) : (
              <>
                <Sparkles size={14} />
                {AI_GENERATE_DIALOG_LABELS.GENERATING_9221}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
