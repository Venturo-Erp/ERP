'use client'
/**
 * AddMemberDialog - 新增成員對話框
 * 從 OrderMembersExpandable.tsx 拆分出來
 *
 * 整合 PassportUploadZone 以支援圖片增強功能
 */

import React from 'react'
import { Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PassportUploadZone } from './PassportUploadZone'
import type { ProcessedFile } from '../types/order-member.types'
import type { PendingConfirmation } from '../hooks/usePassportUpload'
import { useTranslations } from 'next-intl'

interface AddMemberDialogProps {
  isOpen: boolean
  memberCount: number | ''
  processedFiles: ProcessedFile[]
  isUploading: boolean
  isDragging: boolean
  isProcessing: boolean
  onClose: () => void
  onConfirm: () => void
  onCountChange: (count: number | '') => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => void
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void
  onRemoveFile: (index: number) => void
  onBatchUpload: () => void
  /** 可選：更新檔案預覽（用於圖片增強後） */
  onUpdateFilePreview?: (index: number, newPreview: string) => void
  /** 重複確認 */
  pendingConfirmations?: PendingConfirmation[]
  onConfirmUpdate?: (index: number) => void
  onRejectUpdate?: (index: number) => void
  onConfirmAllUpdates?: () => void
  onRejectAllUpdates?: () => void
}

export function AddMemberDialog({
  isOpen,
  memberCount,
  processedFiles,
  isUploading,
  isDragging,
  isProcessing,
  onClose,
  onConfirm,
  onCountChange,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  onBatchUpload,
  onUpdateFilePreview,
  pendingConfirmations,
  onConfirmUpdate,
  onRejectUpdate,
  onConfirmAllUpdates,
  onRejectAllUpdates,
}: AddMemberDialogProps) {
  const t = useTranslations('orders')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent nested level={2} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('common.新增成員')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 手動新增 */}
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-sm font-medium text-morandi-primary">
              {t('common.手動新增空白成員')}
            </h4>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="relative w-20">
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={memberCount}
                    onChange={e => {
                      const val = e.target.value
                      onCountChange(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="pr-6 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                    placeholder={t('common.人數')}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = typeof memberCount === 'number' ? memberCount : 0
                        onCountChange(Math.min(50, cur + 1))
                      }}
                      className="h-3.5 w-4 flex items-center justify-center text-morandi-secondary hover:text-morandi-primary"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = typeof memberCount === 'number' ? memberCount : 1
                        onCountChange(Math.max(1, cur - 1))
                      }}
                      className="h-3.5 w-4 flex items-center justify-center text-morandi-secondary hover:text-morandi-primary"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
                <Button onClick={onConfirm} disabled={!memberCount || memberCount < 1} size="sm">
                  <Plus size={16} className="mr-1" />
                  {t('common.新增')}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 護照批次上傳（使用共用組件，支援圖片增強） */}
          <PassportUploadZone
            processedFiles={processedFiles}
            isUploading={isUploading}
            isDragging={isDragging}
            isProcessing={isProcessing}
            onFileChange={onFileChange}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onRemoveFile={onRemoveFile}
            onBatchUpload={onBatchUpload}
            onUpdateFilePreview={onUpdateFilePreview}
          />

          {/* 重複成員確認區 */}
          {pendingConfirmations && pendingConfirmations.length > 0 && (
            <div className="space-y-2 p-3 border border-morandi-gold/30 rounded-lg bg-morandi-gold/5">
              <div className="text-sm font-medium text-morandi-gold">
                發現 {pendingConfirmations.length} 筆重複資料，需要確認：
              </div>
              {pendingConfirmations.map((item, i) => (
                <div
                  key={`${item.matchedMember.id}-${item.matchType}`}
                  className="flex items-center justify-between gap-2 p-2 bg-card rounded border"
                >
                  <div className="text-sm flex-1 min-w-0">
                    <span className="font-medium">
                      {item.customer.name || item.matchedMember.chinese_name}
                    </span>
                    <span className="text-muted-foreground ml-1">— {item.confirmMessage}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => onRejectUpdate?.(i)}>
                      跳過
                    </Button>
                    <Button size="sm" onClick={() => onConfirmUpdate?.(i)}>
                      更新
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={onRejectAllUpdates}>
                  全部跳過
                </Button>
                <Button size="sm" onClick={onConfirmAllUpdates}>
                  全部更新
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
