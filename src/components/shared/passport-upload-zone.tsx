'use client'

import { useState, useRef } from 'react'
import { Upload, FileImage, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SHARED_LABELS } from './constants/labels'

interface PassportUploadZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  className?: string
}

export function PassportUploadZone({
  files,
  onFilesChange,
  maxFiles = 10,
  className = '',
}: PassportUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files
    if (newFiles) {
      const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
      const combined = [...files, ...imageFiles].slice(0, maxFiles)
      onFilesChange(combined)
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles) {
      const imageFiles = Array.from(droppedFiles).filter(f => f.type.startsWith('image/'))
      const combined = [...files, ...imageFiles].slice(0, maxFiles)
      onFilesChange(combined)
    }
  }

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className={className}>
      {/* 上傳區域 */}
      <label
        htmlFor="passport-upload"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
            : 'border-border hover:border-primary/50 bg-morandi-background'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload
            className={`w-8 h-8 mb-2 ${isDragging ? 'text-primary' : 'text-morandi-secondary'}`}
          />
          <p className="mb-1 text-sm text-morandi-secondary">
            <span className="font-medium">{SHARED_LABELS.UPLOADING_9146}</span>{' '}
            {SHARED_LABELS.LABEL_5690}
          </p>
          <p className="text-xs text-morandi-secondary/70">支援 JPG, PNG（最多 {maxFiles} 張）</p>
        </div>
        <input
          id="passport-upload"
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
      </label>

      {/* 已選檔案列表 */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-morandi-primary">
            {SHARED_LABELS.SELECT_576} {files.length} 張圖片
          </p>
          <div className="grid grid-cols-2 gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-morandi-background border border-border rounded-lg"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <FileImage size={16} className="text-morandi-secondary flex-shrink-0" />
                  <span className="text-sm text-morandi-primary truncate">{file.name}</span>
                  <span className="text-xs text-morandi-secondary flex-shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  className="ml-2 p-1 h-6 w-6 flex-shrink-0"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
