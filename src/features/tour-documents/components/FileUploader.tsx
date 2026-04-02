'use client'

/**
 * FileUploader - 檔案上傳元件
 * 支援拖曳、多檔案、進度顯示
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatFileSize } from '../services/file-upload.service'

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  className?: string
  disabled?: boolean
}

interface FileWithProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export function FileUploader({
  onUpload,
  accept = '*',
  multiple = true,
  maxSizeMB = 50,
  className,
  disabled,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 處理檔案選擇
  const handleFiles = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      const fileArray = Array.from(selectedFiles)
      const maxBytes = maxSizeMB * 1024 * 1024

      // 驗證檔案大小
      const invalidFiles = fileArray.filter(f => f.size > maxBytes)
      if (invalidFiles.length > 0) {
        alert(`檔案過大：${invalidFiles.map(f => f.name).join(', ')}（最大 ${maxSizeMB}MB）`)
        return
      }

      // 建立 FileWithProgress
      const newFiles: FileWithProgress[] = fileArray.map(file => ({
        file,
        progress: 0,
        status: 'pending',
      }))

      setFiles(prev => [...prev, ...newFiles])

      // 開始上傳
      handleUpload(fileArray)
    },
    [maxSizeMB]
  )

  // 執行上傳
  const handleUpload = async (fileArray: File[]) => {
    try {
      setFiles(prev =>
        prev.map(f => (fileArray.includes(f.file) ? { ...f, status: 'uploading' } : f))
      )

      await onUpload(fileArray)

      setFiles(prev =>
        prev.map(f =>
          fileArray.includes(f.file) ? { ...f, progress: 100, status: 'completed' } : f
        )
      )

      // 2秒後清除已完成的檔案
      setTimeout(() => {
        setFiles(prev => prev.filter(f => !fileArray.includes(f.file)))
      }, 2000)
    } catch (error) {
      setFiles(prev =>
        prev.map(f =>
          fileArray.includes(f.file)
            ? { ...f, status: 'error', error: (error as Error).message }
            : f
        )
      )
    }
  }

  // 移除檔案
  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f.file !== file))
  }

  // 拖曳事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  // 點擊上傳
  const handleClick = () => {
    fileInputRef.current?.click()
  }

  // 取得檔案圖示
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon size={20} className="text-morandi-gold" />
    }
    if (file.type === 'application/pdf') {
      return <FileText size={20} className="text-morandi-red" />
    }
    return <FileIcon size={20} className="text-morandi-secondary" />
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 上傳區域 */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
          isDragging && 'border-morandi-gold bg-morandi-gold/5',
          !isDragging && 'border-morandi-muted hover:border-morandi-gold/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload size={32} className="text-morandi-muted" />
          <div className="text-sm">
            <span className="font-medium text-morandi-primary">點擊上傳</span>
            <span className="text-morandi-secondary"> 或拖曳檔案到此處</span>
          </div>
          <div className="text-xs text-morandi-muted">
            {multiple ? '可選擇多個檔案' : '單一檔案'}
            {maxSizeMB && ` • 最大 ${maxSizeMB}MB`}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* 檔案列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-morandi-container rounded-lg border border-morandi-muted"
            >
              {/* 圖示 */}
              <div className="flex-shrink-0">{getFileIcon(f.file)}</div>

              {/* 檔名和大小 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{f.file.name}</div>
                <div className="text-xs text-morandi-secondary">{formatFileSize(f.file.size)}</div>
              </div>

              {/* 進度條 */}
              {f.status === 'uploading' && (
                <div className="flex-1 max-w-[200px]">
                  <Progress value={f.progress} className="h-1" />
                </div>
              )}

              {/* 狀態 */}
              {f.status === 'completed' && <div className="text-xs text-morandi-green">✓ 完成</div>}

              {f.status === 'error' && (
                <div className="text-xs text-morandi-red" title={f.error}>
                  ✗ 失敗
                </div>
              )}

              {/* 移除按鈕 */}
              {f.status !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    removeFile(f.file)
                  }}
                  className="flex-shrink-0"
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
