'use client'

/**
 * TourFilesManager - 團檔案管理介面
 *
 * 設計：
 * - 左側：資料夾列表（簡潔樹狀）
 * - 右側：檔案列表 + 上傳按鈕
 * - Morandi 色彩設計
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Upload, File as FileIcon, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/features/tour-documents/components/FileUploader'
import { FILE_FOLDERS, type FileCategory, type DbType } from '../constants/file-categories'
import type { FolderConfig } from '../constants/file-categories'
import { COMP_TOURS_LABELS } from '../constants/labels'
import { cn } from '@/lib/utils'

interface TourFilesManagerProps {
  tourId: string
  tourCode: string
}

interface FileItem {
  id: string
  name: string
  size?: number
  mimeType?: string
  createdAt: string
  url?: string
  dbType?: DbType
  dbId?: string
}

interface FolderWithCount extends FolderConfig {
  count: number
}

export function TourFilesManager({ tourId, tourCode }: TourFilesManagerProps) {
  const router = useRouter()
  const [folders, setFolders] = useState<FolderWithCount[]>([])
  const [selectedFolder, setSelectedFolder] = useState<FolderWithCount | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filesLoading, setFilesLoading] = useState(false)
  const [showUploader, setShowUploader] = useState(false)

  // 載入資料夾列表（含數量）
  const loadFolders = useCallback(async () => {
    setLoading(true)
    try {
      const foldersWithCount: FolderWithCount[] = []

      for (const folder of FILE_FOLDERS) {
        let count = 0

        if (folder.dbType === 'quote') {
          const { count: c } = await supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .eq('tour_id', tourId)
            .or('quote_type.is.null,quote_type.neq.quick')
          count = c || 0
        } else if (folder.dbType === 'quick_quote') {
          const { count: c } = await supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .eq('tour_id', tourId)
            .eq('quote_type', 'quick')
          count = c || 0
        } else if (folder.dbType === 'itinerary') {
          const { count: c } = await supabase
            .from('itineraries')
            .select('id', { count: 'exact', head: true })
            .eq('tour_id', tourId)
          count = c || 0
        } else if (folder.dbType === 'confirmation') {
          const { count: c } = await supabase
            .from('tour_confirmation_sheets')
            .select('id', { count: 'exact', head: true })
            .eq('tour_id', tourId)
          count = c || 0
        } else if (folder.dbType === 'request') {
          const { count: c } = await supabase
            .from('tour_requests')
            .select('id', { count: 'exact', head: true })
            .eq('tour_id', tourId)
          count = c || 0
        } else if (folder.category) {
          const { count: c } = await supabase
            .from('files')
            .select('id', { count: 'exact', head: true })
            .eq('tour_id', tourId)
            .eq('category', folder.category)
          count = c || 0
        }

        foldersWithCount.push({ ...folder, count })
      }

      setFolders(foldersWithCount)

      // 預設選擇保險資料夾（最常用）
      const insuranceFolder = foldersWithCount.find(f => f.id === 'insurance')
      if (insuranceFolder) {
        setSelectedFolder(insuranceFolder)
      }
    } catch (err) {
      logger.error('載入資料夾失敗', err)
      toast.error(COMP_TOURS_LABELS.載入失敗)
    } finally {
      setLoading(false)
    }
  }, [tourId])

  // 載入檔案列表
  const loadFiles = useCallback(
    async (folder: FolderWithCount) => {
      setFilesLoading(true)
      console.log('[TourFilesManager] loadFiles', {
        folderId: folder.id,
        category: folder.category,
        tourId,
      })
      try {
        const fileItems: FileItem[] = []

        if (folder.dbType) {
          // DB 記錄（報價單/行程表/需求單等）
          let data: any[] = []

          switch (folder.dbType) {
            case 'quote':
              const { data: quotes } = await supabase
                .from('quotes')
                .select('id, code, name, created_at')
                .eq('tour_id', tourId)
                .or('quote_type.is.null,quote_type.eq.standard')
                .order('created_at', { ascending: false })
              data = quotes || []
              for (const q of data) {
                fileItems.push({
                  id: q.id,
                  name: q.name || q.code || COMP_TOURS_LABELS.未命名報價單,
                  createdAt: q.created_at,
                  dbType: 'quote',
                  dbId: q.id,
                })
              }
              break

            case 'quick_quote':
              const { data: quickQuotes } = await supabase
                .from('quotes')
                .select('id, code, name, created_at')
                .eq('tour_id', tourId)
                .eq('quote_type', 'quick')
                .order('created_at', { ascending: false })
              data = quickQuotes || []
              for (const q of data) {
                fileItems.push({
                  id: q.id,
                  name: q.name || q.code || COMP_TOURS_LABELS.未命名快速報價,
                  createdAt: q.created_at,
                  dbType: 'quick_quote',
                  dbId: q.id,
                })
              }
              break

            case 'itinerary':
              const { data: itineraries } = await supabase
                .from('itineraries')
                .select('id, title, code, created_at')
                .eq('tour_id', tourId)
                .order('created_at', { ascending: false })
              data = itineraries || []
              for (const i of data) {
                fileItems.push({
                  id: i.id,
                  name: i.title || i.code || COMP_TOURS_LABELS.未命名行程表,
                  createdAt: i.created_at,
                  dbType: 'itinerary',
                  dbId: i.id,
                })
              }
              break

            case 'request':
              const { data: requests } = await supabase
                .from('tour_requests')
                .select('id, code, supplier_name, request_type, created_at')
                .eq('tour_id', tourId)
                .order('created_at', { ascending: false })
              data = requests || []
              for (const r of data) {
                fileItems.push({
                  id: r.id,
                  name: `${r.request_type || COMP_TOURS_LABELS.需求} - ${r.supplier_name || r.code}`,
                  createdAt: r.created_at,
                  dbType: 'request',
                  dbId: r.id,
                })
              }
              break
          }
        } else if (folder.category) {
          // 實體檔案
          const { data } = await supabase
            .from('files')
            .select('id, filename, storage_path, content_type, size_bytes, created_at')
            .eq('tour_id', tourId)
            .eq('category', folder.category)
            .order('created_at', { ascending: false })

          if (data) {
            for (const f of data) {
              const { data: urlData } = supabase.storage
                .from(f.storage_path.startsWith('tour-documents') ? 'documents' : 'public')
                .getPublicUrl(f.storage_path)
              fileItems.push({
                id: f.id,
                name: f.filename,
                size: f.size_bytes || undefined,
                mimeType: f.content_type || undefined,
                createdAt: f.created_at,
                url: urlData.publicUrl,
              })
            }
          }
        }

        setFiles(fileItems)
      } catch (err) {
        logger.error('載入檔案失敗', err)
        toast.error(COMP_TOURS_LABELS.載入失敗)
      } finally {
        setFilesLoading(false)
      }
    },
    [tourId]
  )

  // 處理檔案上傳
  const handleUpload = async (uploadedFiles: File[]) => {
    if (!selectedFolder || !selectedFolder.category) {
      toast.error('請選擇檔案分類')
      return
    }

    try {
      // 先查 workspace_id
      const { data: tourData } = await supabase
        .from('tours')
        .select('workspace_id')
        .eq('id', tourId)
        .single()

      if (!tourData?.workspace_id) {
        throw new Error('無法取得 workspace_id')
      }

      for (const file of uploadedFiles) {
        const timestamp = Date.now()
        const storagePath = `tour-documents/${tourCode}/${selectedFolder.id}/${timestamp}_${file.name}`

        // 上傳到 Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file)

        if (uploadError) throw uploadError

        // 建立 files 記錄
        const { error: dbError } = await supabase.from('files').insert({
          workspace_id: tourData.workspace_id,
          tour_id: tourId,
          category: selectedFolder.category,
          filename: file.name,
          original_filename: file.name,
          storage_path: storagePath,
          storage_bucket: 'documents',
          content_type: file.type,
          size_bytes: file.size,
          is_starred: false,
          is_archived: false,
          is_deleted: false,
        })

        if (dbError) throw dbError
      }

      toast.success(`✅ 已上傳 ${uploadedFiles.length} 個檔案`)
      setShowUploader(false)
      await loadFolders()
      if (selectedFolder) await loadFiles(selectedFolder)
    } catch (err) {
      logger.error('上傳失敗', err)
      toast.error('上傳失敗：' + (err as Error).message)
    }
  }

  // 處理檔案點擊
  const handleFileClick = (file: FileItem) => {
    if (file.dbType && file.dbId) {
      switch (file.dbType) {
        case 'quote':
          router.push(`/quotes/${file.dbId}`)
          break
        case 'quick_quote':
          router.push(`/quotes/quick/${file.dbId}`)
          break
        case 'itinerary':
          router.push(`/itinerary/block-editor?itinerary_id=${file.dbId}`)
          break
        case 'request':
          toast.info(COMP_TOURS_LABELS.需求單功能開發中)
          break
      }
    } else if (file.url) {
      window.open(file.url, '_blank')
    }
  }

  // 初始載入
  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  // 選擇資料夾時載入檔案
  useEffect(() => {
    if (selectedFolder) {
      loadFiles(selectedFolder)
    }
  }, [selectedFolder, loadFiles])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* 左側：資料夾列表 */}
      <div className="w-64 flex-shrink-0 border border-morandi-muted rounded-lg bg-morandi-container p-2 overflow-y-auto">
        <div className="space-y-1">
          {folders.map(folder => {
            const Icon = folder.Icon
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  selectedFolder?.id === folder.id
                    ? 'bg-morandi-gold text-white'
                    : 'hover:bg-morandi-gold/10 text-morandi-primary'
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left truncate">{folder.name}</span>
                {folder.count > 0 && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      selectedFolder?.id === folder.id
                        ? 'bg-white/20 text-white'
                        : 'bg-morandi-gold/10 text-morandi-gold'
                    )}
                  >
                    {folder.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 右側：檔案列表 */}
      <div className="flex-1 flex flex-col border border-morandi-muted rounded-lg bg-white">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-morandi-muted">
          <div>
            <div className="flex items-center gap-2">
              {selectedFolder && <selectedFolder.Icon size={20} className="text-morandi-gold" />}
              <h3 className="text-lg font-medium text-morandi-primary">{selectedFolder?.name}</h3>
            </div>
            {selectedFolder?.description && (
              <p className="text-sm text-morandi-secondary mt-0.5">{selectedFolder.description}</p>
            )}
          </div>

          {selectedFolder?.category && (
            <Button onClick={() => setShowUploader(!showUploader)} size="sm" className="gap-2">
              <Upload size={16} />
              上傳檔案
            </Button>
          )}
        </div>

        {/* 上傳區域 */}
        {showUploader && selectedFolder?.category && (
          <div className="p-4 border-b border-morandi-muted bg-morandi-container/30">
            <FileUploader onUpload={handleUpload} maxSizeMB={50} />
          </div>
        )}

        {/* 檔案列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filesLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-morandi-gold" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-morandi-muted">
              <FileIcon size={48} className="mb-2 opacity-20" />
              <p className="text-sm">此資料夾尚無檔案</p>
              {selectedFolder?.category && (
                <p className="text-xs mt-1">點擊上方「上傳檔案」按鈕開始上傳</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {files.map(file => (
                <button
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-morandi-muted hover:border-morandi-gold hover:bg-morandi-gold/5 transition-colors text-left"
                >
                  <FileIcon size={20} className="text-morandi-gold flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-morandi-primary truncate">{file.name}</p>
                    <p className="text-xs text-morandi-secondary">
                      {new Date(file.createdAt).toLocaleDateString('zh-TW')}
                      {file.size && ` • ${(file.size / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                  {file.url && <Eye size={16} className="text-morandi-secondary flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
