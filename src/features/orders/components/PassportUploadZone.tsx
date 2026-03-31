'use client'
/**
 * PassportUploadZone - 護照上傳區域組件
 * 從 AddMemberDialog 拆分出來
 *
 * 功能：
 * - 檔案拖放上傳
 * - 檔案預覽
 * - 圖片增強（銳利化）
 * - 批次辨識按鈕
 */

import React, { useState, useCallback } from 'react'
import { Upload, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProcessedFile } from '../types/order-member.types'
import { PassportImageEnhancer } from './PassportImageEnhancer'
import { COMP_ORDERS_LABELS } from '../constants/labels'

interface PassportUploadZoneProps {
  processedFiles: ProcessedFile[]
  isUploading: boolean
  isDragging: boolean
  isProcessing: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => void
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void
  onRemoveFile: (index: number) => void
  onBatchUpload: () => void
  /** 可選：更新檔案預覽（用於圖片增強後） */
  onUpdateFilePreview?: (index: number, newPreview: string) => void
}

export function PassportUploadZone({
  processedFiles,
  isUploading,
  isDragging,
  isProcessing,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  onBatchUpload,
  onUpdateFilePreview,
}: PassportUploadZoneProps) {
  // 圖片增強狀態
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [showEnhancer, setShowEnhancer] = useState(false)

  // 開啟圖片增強
  const handleOpenEnhancer = useCallback(
    (index: number) => {
      const file = processedFiles[index]
      if (file && !file.isPdf) {
        setEnhancingIndex(index)
        setShowEnhancer(true)
      }
    },
    [processedFiles]
  )

  // 儲存增強後的圖片
  const handleSaveEnhanced = useCallback(
    (enhancedSrc: string) => {
      if (enhancingIndex !== null && onUpdateFilePreview) {
        onUpdateFilePreview(enhancingIndex, enhancedSrc)
      }
      setShowEnhancer(false)
      setEnhancingIndex(null)
    },
    [enhancingIndex, onUpdateFilePreview]
  )

  return (
    <>
      {/* 圖片增強 Dialog */}
      {enhancingIndex !== null && processedFiles[enhancingIndex] && (
        <PassportImageEnhancer
          open={showEnhancer}
          onOpenChange={setShowEnhancer}
          imageSrc={processedFiles[enhancingIndex].preview}
          onSave={handleSaveEnhanced}
        />
      )}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-morandi-primary">
          {COMP_ORDERS_LABELS.護照批次辨識OCR}
        </h4>
        <p className="text-xs text-morandi-muted">{COMP_ORDERS_LABELS.上傳護照照片系統自動辨識}</p>
        <p className="text-xs text-morandi-gold">{COMP_ORDERS_LABELS.圖片模糊增強提示}</p>

        {/* 拖放區域 */}
        <label
          className={`
          flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragging ? 'border-morandi-blue bg-morandi-blue/5' : 'border-border hover:border-morandi-blue/50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={onFileChange}
            className="hidden"
            disabled={isProcessing}
          />
          <Upload size={24} className="text-morandi-muted mb-2" />
          <span className="text-sm text-morandi-muted">
            {isProcessing
              ? COMP_ORDERS_LABELS.處理中
              : COMP_ORDERS_LABELS.拖放或點擊選擇護照照片_PDF}
          </span>
          <span className="text-xs text-morandi-muted mt-1">{COMP_ORDERS_LABELS.支援格式提示}</span>
        </label>

        {/* 已選擇的檔案預覽 */}
        {processedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-morandi-secondary">
                {COMP_ORDERS_LABELS.已選擇檔案.replace('{count}', processedFiles.length.toString())}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => processedFiles.forEach((_, i) => onRemoveFile(i))}
                className="text-morandi-muted hover:text-status-danger"
              >
                {COMP_ORDERS_LABELS.清空全部}
              </Button>
            </div>

            {/* 辨識按鈕移到照片上方 */}
            <Button
              onClick={onBatchUpload}
              disabled={isUploading || processedFiles.length === 0}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {COMP_ORDERS_LABELS.辨識中}
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  {COMP_ORDERS_LABELS.開始辨識並建立成員.replace(
                    '{count}',
                    processedFiles.length.toString()
                  )}
                </>
              )}
            </Button>

            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {processedFiles.map((pf, index) => (
                <div key={index} className="relative group">
                  <img
                    src={pf.preview}
                    alt={pf.originalName}
                    className="w-full h-16 object-cover rounded border border-border cursor-pointer hover:border-morandi-gold transition-colors"
                    onClick={() => !pf.isPdf && handleOpenEnhancer(index)}
                    title={
                      pf.isPdf
                        ? COMP_ORDERS_LABELS.PDF_不支援增強
                        : COMP_ORDERS_LABELS.點擊進行圖片增強
                    }
                  />
                  {/* 刪除按鈕 */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onRemoveFile(index)
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-status-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                  {/* 增強按鈕（非 PDF） - 始終顯示以提高可發現性 */}
                  {!pf.isPdf && onUpdateFilePreview && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleOpenEnhancer(index)
                      }}
                      className="absolute -top-1 -left-1 w-5 h-5 bg-morandi-gold text-white rounded-full flex items-center justify-center shadow-sm hover:bg-morandi-gold-hover transition-colors"
                      title={COMP_ORDERS_LABELS.圖片增強_銳利化}
                    >
                      <Sparkles size={10} />
                    </button>
                  )}
                  {pf.isPdf && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">
                      {COMP_ORDERS_LABELS.PDF標籤}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
