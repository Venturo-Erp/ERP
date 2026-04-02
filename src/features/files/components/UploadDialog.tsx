'use client'

import { useState, useCallback } from 'react'
import { Upload, X, File, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFileSystemStore } from '@/stores/file-system-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { formatFileSize, FILE_CATEGORY_INFO, type FileCategory } from '@/types/file-system.types'
import { LABELS } from '../constants/labels'

interface UploadDialogProps {
  open: boolean
  onClose: () => void
}

interface PendingFile {
  file: File
  category: FileCategory
  description: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const { currentFolder, uploadFile, uploading } = useFileSystemStore()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
    e.target.value = '' // Reset input
  }

  const addFiles = (files: File[]) => {
    const newPendingFiles: PendingFile[] = files.map(file => ({
      file,
      category: guessCategory(file.name),
      description: '',
      status: 'pending',
      progress: 0,
    }))
    setPendingFiles(prev => [...prev, ...newPendingFiles])
  }

  // 根據檔名猜測分類
  const guessCategory = (filename: string): FileCategory => {
    const lower = filename.toLowerCase()
    if (lower.includes('passport') || lower.includes('護照')) return 'passport'
    if (lower.includes('visa') || lower.includes('簽證')) return 'visa'
    if (lower.includes('contract') || lower.includes('合約')) return 'contract'
    if (lower.includes('quote') || lower.includes('報價')) return 'quote'
    if (lower.includes('itinerary') || lower.includes('行程')) return 'itinerary'
    if (lower.includes('ticket') || lower.includes('機票')) return 'ticket'
    if (lower.includes('voucher') || lower.includes('住宿') || lower.includes('訂房'))
      return 'voucher'
    if (lower.includes('invoice') || lower.includes('發票') || lower.includes('收據'))
      return 'invoice'
    if (lower.includes('insurance') || lower.includes('保險')) return 'insurance'
    if (/\.(jpg|jpeg|png|gif|webp|heic)$/i.test(lower)) return 'photo'
    return 'other'
  }

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const updateFileCategory = (index: number, category: FileCategory) => {
    setPendingFiles(prev => prev.map((f, i) => (i === index ? { ...f, category } : f)))
  }

  const handleUpload = async () => {
    for (let i = 0; i < pendingFiles.length; i++) {
      const pending = pendingFiles[i]
      if (pending.status !== 'pending') continue

      // 更新狀態為上傳中
      setPendingFiles(prev =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading', progress: 0 } : f))
      )

      try {
        await uploadFile(pending.file, {
          folder_id: currentFolder?.id,
          category: pending.category,
          description: pending.description || undefined,
        })

        // 更新狀態為成功
        setPendingFiles(prev =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'success', progress: 100 } : f))
        )
      } catch (error) {
        // 更新狀態為失敗
        setPendingFiles(prev =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : '上傳失敗',
                }
              : f
          )
        )
      }
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setPendingFiles([])
      onClose()
    }
  }

  const allDone =
    pendingFiles.length > 0 &&
    pendingFiles.every(f => f.status === 'success' || f.status === 'error')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl" level={1}>
        <DialogHeader>
          <DialogTitle>{LABELS.uploadFiles}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 拖放區域 */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              'cursor-pointer hover:border-primary/50',
              dragOver && 'border-primary bg-primary/5'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">{LABELS.dragDropHere}</p>
            <p className="text-xs text-muted-foreground mt-1">{LABELS.orClickToSelect}</p>
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 目標資料夾 */}
          {currentFolder && (
            <div className="text-sm text-muted-foreground">
              {LABELS.uploadTo}
              <span className="text-foreground">{currentFolder.name}</span>
            </div>
          )}

          {/* 待上傳檔案列表 */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingFiles.map((pending, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {/* 狀態圖示 */}
                  {pending.status === 'success' ? (
                    <Check className="w-5 h-5 text-morandi-green shrink-0" />
                  ) : pending.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  ) : (
                    <File className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}

                  {/* 檔案資訊 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{pending.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(pending.file.size)}
                    </p>
                    {pending.status === 'uploading' && (
                      <Progress value={pending.progress} className="h-1 mt-1" />
                    )}
                    {pending.error && (
                      <p className="text-xs text-destructive mt-1">{pending.error}</p>
                    )}
                  </div>

                  {/* 分類選擇 */}
                  {pending.status === 'pending' && (
                    <Select
                      value={pending.category}
                      onValueChange={v => updateFileCategory(index, v as FileCategory)}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FILE_CATEGORY_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {info.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* 移除按鈕 */}
                  {pending.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {allDone ? LABELS.close : LABELS.cancel}
            </Button>
            {!allDone && pendingFiles.length > 0 && (
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading
                  ? LABELS.uploading
                  : LABELS.uploadCount(pendingFiles.filter(f => f.status === 'pending').length)}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
