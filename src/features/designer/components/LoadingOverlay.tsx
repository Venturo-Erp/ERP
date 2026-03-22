'use client'

import { COMPANY_NAME } from '@/lib/tenant'

/**
 * LoadingOverlay - 文件載入進度覆蓋層
 *
 * 顯示載入階段和進度，讓用戶知道正在發生什麼
 */

import { Loader2, FileText, Image, Palette, Save, Check } from 'lucide-react'
import type { LoadingStage } from '@/stores/document-store'
import { DESIGNER_LABELS } from './constants/labels'

interface LoadingOverlayProps {
  isLoading: boolean
  stage: LoadingStage
  progress: number
  isSaving?: boolean
  documentName?: string
}

// 階段對應的訊息和圖標
const STAGE_CONFIG: Record<LoadingStage, { message: string; icon: typeof Loader2 }> = {
  idle: { message: '', icon: Check },
  fetching_document: { message: '載入文件資料...', icon: FileText },
  fetching_version: { message: '載入版本內容...', icon: FileText },
  preloading_images: { message: '預載入圖片資源...', icon: Image },
  rendering_canvas: { message: '渲染畫布...', icon: Palette },
  saving: { message: '儲存中...', icon: Save },
  uploading_thumbnail: { message: '上傳縮圖...', icon: Image },
  creating_version: { message: '建立版本...', icon: FileText },
}

export function LoadingOverlay({
  isLoading,
  stage,
  progress,
  isSaving,
  documentName,
}: LoadingOverlayProps) {
  // 不顯示的情況
  if (!isLoading && !isSaving) return null
  if (stage === 'idle' && !isSaving) return null

  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.idle
  const Icon = config.icon

  return (
    // eslint-disable-next-line venturo/no-custom-modal -- Loading overlay, not a dialog
    <div className="fixed inset-0 z-[9500] bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card rounded-xl shadow-lg border border-border p-8 w-[400px] max-w-[90vw]">
        {/* Logo/Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-morandi-gold/10 mb-4">
            <Palette className="w-8 h-8 text-morandi-gold" />
          </div>
          <h2 className="text-xl font-semibold text-morandi-primary">{COMPANY_NAME} Designer</h2>
          {documentName && (
            <p className="text-sm text-morandi-secondary mt-1 truncate">{documentName}</p>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="h-2 bg-morandi-container rounded-full overflow-hidden">
            <div
              className="h-full bg-morandi-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Stage indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-morandi-secondary">
            {stage !== 'idle' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{config.message}</span>
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{DESIGNER_LABELS.SAVING_4983}</span>
              </>
            ) : null}
          </div>

          {/* Progress percentage */}
          <div className="text-center text-xs text-morandi-muted">{progress}%</div>
        </div>

        {/* Loading animation dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-morandi-gold animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>

        {/* Tip */}
        <p className="text-center text-xs text-morandi-muted mt-6">
          {DESIGNER_LABELS.LOADING_3727}
        </p>
      </div>
    </div>
  )
}

/**
 * 儲存提示組件（小型 toast 風格）
 */
export function SavingIndicator({ isSaving }: { isSaving: boolean }) {
  if (!isSaving) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card rounded-lg shadow-lg border border-border px-4 py-2 flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin text-morandi-gold" />
      <span className="text-sm text-morandi-primary">{DESIGNER_LABELS.SAVING_4983}</span>
    </div>
  )
}

/**
 * 未儲存提示組件
 */
export function UnsavedIndicator({ isDirty }: { isDirty: boolean }) {
  if (!isDirty) return null

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-morandi-gold/10 rounded text-xs text-morandi-gold">
      <div className="w-1.5 h-1.5 rounded-full bg-morandi-gold animate-pulse" />
      <span>{DESIGNER_LABELS.SAVING_7127}</span>
    </div>
  )
}
