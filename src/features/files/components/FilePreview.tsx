'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  X,
  Download,
  Trash2,
  Star,
  FolderInput,
  ExternalLink,
  Copy,
  Tag,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Calendar,
  HardDrive,
  User,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFileSystemStore } from '@/stores/file-system-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { formatFileSize, getFileIcon, FILE_CATEGORY_INFO } from '@/types/file-system.types'
import { LABELS } from '../constants/labels'

// 檔案圖示對應
const FILE_ICONS: Record<string, React.ElementType> = {
  Image: Image,
  FileText: FileText,
  FileSpreadsheet: FileSpreadsheet,
  File: File,
}

function getIconComponent(iconName: string) {
  return FILE_ICONS[iconName] || File
}

interface FilePreviewProps {
  onBack?: () => void
}

export function FilePreview({ onBack }: FilePreviewProps) {
  const { files, selectedFileIds, toggleFileStar, deleteFile, downloadFile } = useFileSystemStore()

  // 取得選中的檔案
  const selectedFiles = useMemo(() => {
    return files.filter(f => selectedFileIds.has(f.id))
  }, [files, selectedFileIds])

  const file = selectedFiles[0]

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        {LABELS.selectFileToPreview}
      </div>
    )
  }

  // 多選模式
  if (selectedFiles.length > 1) {
    const totalSize = selectedFiles.reduce((sum, f) => sum + (f.size_bytes || 0), 0)

    return (
      <div className="h-full flex flex-col">
        {/* 標題 */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium">{LABELS.selectedFiles(selectedFiles.length)}</span>
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="h-7 w-7 lg:hidden"
              onClick={onBack}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* 批量操作 */}
        <div className="p-3 space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" />
            {LABELS.batchDownload}
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <FolderInput className="w-4 h-4 mr-2" />
            {LABELS.moveTo}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {LABELS.delete}
          </Button>
        </div>

        {/* 統計 */}
        <div className="p-3 border-t border-border text-sm text-muted-foreground">
          <p>{LABELS.totalSize(formatFileSize(totalSize))}</p>
        </div>
      </div>
    )
  }

  // 單一檔案預覽
  const iconName = getFileIcon(file.extension, file.category)
  const IconComponent = getIconComponent(iconName)
  const categoryInfo = FILE_CATEGORY_INFO[file.category]
  const isImage = file.content_type?.startsWith('image/')

  // 圖片預覽 URL
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  useEffect(() => {
    if (!isImage) {
      setImageUrl(null)
      return
    }
    let cancelled = false
    setImageLoading(true)
    fetch(`/api/files/${file.id}/download`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.url) setImageUrl(data.url)
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null)
      })
      .finally(() => {
        if (!cancelled) setImageLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [file.id, isImage])

  const handleDownload = async () => {
    await downloadFile(file.id)
  }

  const handleDelete = async () => {
    if (confirm('確定要刪除此檔案？')) {
      await deleteFile(file.id)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 標題列 */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <span className="flex-1 font-medium text-sm truncate">{file.filename}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Button"
          className="h-7 w-7"
          onClick={() => toggleFileStar(file.id)}
        >
          <Star className={cn('w-4 h-4', file.is_starred && 'fill-morandi-gold text-morandi-gold')} />
        </Button>
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            className="h-7 w-7 lg:hidden"
            onClick={onBack}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {/* 預覽區 */}
        <div className="p-4">
          {isImage ? (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {imageLoading ? (
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <Image className="w-12 h-12 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{LABELS.loading}</span>
                </div>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt={file.filename}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <Image className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center">
              <IconComponent className="w-16 h-16" style={{ color: categoryInfo.color }} />
              <p className="mt-2 text-sm text-muted-foreground">
                {file.extension?.toUpperCase() || LABELS.fileLabel}
              </p>
            </div>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="px-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            {LABELS.download}
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <ExternalLink className="w-4 h-4 mr-1" />
            {LABELS.openInNewTab}
          </Button>
        </div>

        {/* 檔案資訊 */}
        <div className="p-4 space-y-4">
          {/* 分類 */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{LABELS.categoryLabel}</span>
            <Badge
              variant="secondary"
              style={{
                backgroundColor: `${categoryInfo.color}20`,
                color: categoryInfo.color,
              }}
            >
              {categoryInfo.label}
            </Badge>
          </div>

          {/* 大小 */}
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{LABELS.sizeLabel}</span>
            <span className="text-sm">{formatFileSize(file.size_bytes)}</span>
          </div>

          {/* 類型 */}
          <div className="flex items-center gap-2">
            <File className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{LABELS.typeLabel}</span>
            <span className="text-sm">{file.content_type || '-'}</span>
          </div>

          {/* 建立日期 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{LABELS.createdDate}</span>
            <span className="text-sm">{new Date(file.created_at).toLocaleString('zh-TW')}</span>
          </div>

          {/* 下載次數 */}
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{LABELS.downloadCount}</span>
            <span className="text-sm">{file.download_count}</span>
          </div>

          {/* 標籤 */}
          {file.tags && file.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{LABELS.tagsLabel}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {file.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 描述 */}
          {file.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">{LABELS.description}</p>
              <p className="text-sm">{file.description}</p>
            </div>
          )}

          {/* 備註 */}
          {file.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">{LABELS.notes}</p>
              <p className="text-sm">{file.notes}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 底部操作 */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {LABELS.deleteFile}
        </Button>
      </div>
    </div>
  )
}
