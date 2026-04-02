'use client'

/**
 * FinderView - Mac Finder 風格的檔案瀏覽器
 *
 * 特點：
 * - 巢狀資料夾結構
 * - 拖曳移動檔案/資料夾
 * - 麵包屑導航
 * - 圖示/列表模式切換
 * - 多選支援 (Cmd/Ctrl + Click)
 * - 右鍵選單
 */

import NextImage from 'next/image'
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Folder,
  File,
  ChevronRight,
  Grid3X3,
  List,
  Upload,
  Plus,
  MoreHorizontal,
  Download,
  Trash2,
  Edit2,
  FolderPlus,
  ArrowUpFromLine,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { FILES_LABELS } from '@/features/files/constants/labels'

// ============================================================================
// Types
// ============================================================================

export interface FinderItem {
  id: string
  name: string
  type: 'folder' | 'file'
  icon?: string
  color?: string
  parentId: string | null
  createdAt?: string | null // 允許 null，DB 回傳可能為 null
  updatedAt?: string
  // File specific
  size?: number
  mimeType?: string
  extension?: string
  thumbnailUrl?: string
  // Folder specific
  childCount?: number
  // DB link (for virtual folders like 報價單)
  dbType?: 'quote' | 'quick_quote' | 'itinerary' | 'confirmation' | 'request'
  dbId?: string
  status?: string | null
}

export interface FinderViewProps {
  items: FinderItem[]
  currentPath: FinderItem[] // 麵包屑路徑
  loading?: boolean
  viewMode?: 'grid' | 'list'
  selectedIds?: Set<string>
  onNavigate: (folderId: string | null) => void
  onSelect: (ids: Set<string>) => void
  onOpen: (item: FinderItem) => void
  onMove?: (itemIds: string[], targetFolderId: string | null) => void
  onDelete?: (itemIds: string[]) => void
  onRename?: (itemId: string, newName: string) => void
  onCreateFolder?: (name: string, parentId: string | null) => void
  onUpload?: (files: FileList, folderId: string | null) => void
  onDownload?: (item: FinderItem) => void
  /** 空狀態的新增操作（DB 驅動的資料夾） */
  emptyStateAction?: {
    label: string
    onClick: () => void
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getItemIcon(item: FinderItem): React.ReactNode {
  if (item.type === 'folder') {
    return (
      <div className="w-12 h-12 flex items-center justify-center text-morandi-gold">
        <Folder size={40} fill="currentColor" strokeWidth={1} />
      </div>
    )
  }

  // 根據 mimeType 或 extension 顯示不同圖示
  const ext = item.extension?.toLowerCase()

  if (item.thumbnailUrl) {
    return (
      <div className="relative w-12 h-12 rounded overflow-hidden bg-morandi-container">
        <NextImage src={item.thumbnailUrl} alt="" fill className="object-cover" />
      </div>
    )
  }

  // 檔案類型顏色（保留語義化顏色）
  let colorClass = 'text-morandi-secondary'
  if (ext === 'pdf') colorClass = 'text-morandi-red'
  else if (['doc', 'docx'].includes(ext || '')) colorClass = 'text-status-info'
  else if (['xls', 'xlsx'].includes(ext || '')) colorClass = 'text-morandi-green'
  else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) colorClass = 'text-morandi-red'

  return (
    <div className={cn('w-12 h-12 flex items-center justify-center', colorClass)}>
      <File size={36} strokeWidth={1.5} />
    </div>
  )
}

// ============================================================================
// Components
// ============================================================================

interface FinderItemCardProps {
  item: FinderItem
  selected: boolean
  viewMode: 'grid' | 'list'
  onSelect: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onOpen?: () => void
  onDownload?: () => void
  onRename?: () => void
  onDelete?: () => void
}

function FinderItemCard({
  item,
  selected,
  viewMode,
  onSelect,
  onDoubleClick,
  onDragStart,
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: FinderItemCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    if (item.type === 'folder') {
      e.preventDefault()
      setIsDragOver(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    // Drop handling is done in parent
  }

  if (viewMode === 'grid') {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        className={cn(
          'flex flex-col items-center p-3 rounded-lg cursor-pointer select-none',
          'transition-all duration-100',
          selected ? 'bg-morandi-gold/10' : 'hover:bg-morandi-container/50',
          isDragOver && item.type === 'folder' && 'ring-2 ring-morandi-gold bg-morandi-gold/5'
        )}
      >
        {getItemIcon(item)}
        <span
          className={cn(
            'mt-2 text-sm text-center line-clamp-2 max-w-[100px]',
            selected && 'font-medium'
          )}
        >
          {item.name}
        </span>
        {item.type === 'folder' && item.childCount !== undefined && (
          <span className="text-xs text-muted-foreground">{item.childCount} 項</span>
        )}
      </div>
    )
  }

  // List view
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer select-none group',
        'transition-all duration-100',
        selected ? 'bg-morandi-gold/10' : 'hover:bg-morandi-container/50',
        isDragOver && item.type === 'folder' && 'ring-2 ring-morandi-gold bg-morandi-gold/5'
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        {item.type === 'folder' ? (
          <Folder size={24} className="text-morandi-gold" fill="currentColor" strokeWidth={1} />
        ) : (
          <File size={24} className="text-morandi-secondary" strokeWidth={1.5} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('truncate', selected && 'font-medium')}>{item.name}</div>
      </div>
      {item.type === 'folder' && item.childCount !== undefined && (
        <span className="text-sm text-muted-foreground">{item.childCount} 項</span>
      )}
      {item.type === 'file' && item.size && (
        <span className="text-sm text-muted-foreground">{formatFileSize(item.size)}</span>
      )}
      {item.createdAt && (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: zhTW })}
        </span>
      )}

      {/* 操作選單 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted">
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onOpen && (
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                onOpen()
              }}
            >
              {item.type === 'folder' ? '開啟' : '檢視'}
            </DropdownMenuItem>
          )}
          {onDownload && (
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                onDownload()
              }}
            >
              <Download size={14} className="mr-2" />
              {FILES_LABELS.DOWNLOAD}
            </DropdownMenuItem>
          )}
          {(onRename || onDelete) && <DropdownMenuSeparator />}
          {onRename && (
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                onRename()
              }}
            >
              <Edit2 size={14} className="mr-2" />
              {FILES_LABELS.LABEL_725}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={e => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 size={14} className="mr-2" />
              {FILES_LABELS.DELETE}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function FinderView({
  items,
  currentPath,
  loading,
  viewMode = 'list',
  selectedIds = new Set(),
  onNavigate,
  onSelect,
  onOpen,
  onMove,
  onDelete,
  onRename,
  onCreateFolder,
  onUpload,
  onDownload,
  emptyStateAction,
}: FinderViewProps) {
  const [internalViewMode, setInternalViewMode] = useState(viewMode)
  const [draggedIds, setDraggedIds] = useState<string[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null

  // 多選邏輯
  const handleSelect = useCallback(
    (item: FinderItem, e: React.MouseEvent) => {
      const newSelection = new Set(selectedIds)

      if (e.metaKey || e.ctrlKey) {
        // Toggle selection
        if (newSelection.has(item.id)) {
          newSelection.delete(item.id)
        } else {
          newSelection.add(item.id)
        }
      } else if (e.shiftKey && selectedIds.size > 0) {
        // Range selection
        const lastSelectedId = Array.from(selectedIds).pop()
        const lastIndex = items.findIndex(i => i.id === lastSelectedId)
        const currentIndex = items.findIndex(i => i.id === item.id)
        const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)]
        for (let i = start; i <= end; i++) {
          newSelection.add(items[i].id)
        }
      } else {
        // Single selection
        newSelection.clear()
        newSelection.add(item.id)
      }

      onSelect(newSelection)
    },
    [selectedIds, items, onSelect]
  )

  // 雙擊開啟
  const handleOpen = useCallback(
    (item: FinderItem) => {
      if (item.type === 'folder') {
        onNavigate(item.id)
      } else {
        onOpen(item)
      }
    },
    [onNavigate, onOpen]
  )

  // 拖曳開始
  const handleDragStart = useCallback(
    (item: FinderItem, e: React.DragEvent) => {
      // 如果拖曳的項目不在選擇中，只拖曳該項目
      const ids = selectedIds.has(item.id) ? Array.from(selectedIds) : [item.id]

      setDraggedIds(ids)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', JSON.stringify(ids))
    },
    [selectedIds]
  )

  // 拖曳到資料夾
  const handleDropOnFolder = useCallback(
    (targetFolderId: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (onMove && draggedIds.length > 0) {
        // 不能移動到自己裡面
        if (!draggedIds.includes(targetFolderId)) {
          onMove(draggedIds, targetFolderId)
        }
      }
      setDraggedIds([])
    },
    [draggedIds, onMove]
  )

  // 拖曳到空白處（移到當前資料夾根目錄）
  const handleDropOnEmpty = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingOver(false)

      // 外部檔案拖曳
      if (e.dataTransfer.files.length > 0 && onUpload) {
        onUpload(e.dataTransfer.files, currentFolderId)
        return
      }
    },
    [currentFolderId, onUpload]
  )

  // 檔案上傳
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && onUpload) {
        onUpload(e.target.files, currentFolderId)
      }
    },
    [currentFolderId, onUpload]
  )

  // 排序：資料夾在前，檔案在後，各自按名稱排序
  const sortedItems = [...items].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }
    return a.name.localeCompare(b.name, 'zh-TW')
  })

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        {/* 麵包屑 */}
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => onNavigate(null)} className="hover:text-primary font-medium">
            {FILES_LABELS.LABEL_6285}
          </button>
          {currentPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-muted-foreground" />
              <button
                onClick={() => onNavigate(folder.id)}
                className={cn(
                  'hover:text-primary',
                  index === currentPath.length - 1 && 'font-medium'
                )}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>

        {/* 工具列 */}
        <div className="flex items-center gap-2">
          {/* 新增 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus size={14} />
                {FILES_LABELS.ADD}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCreateFolder && (
                <DropdownMenuItem onClick={() => onCreateFolder('新資料夾', currentFolderId)}>
                  <FolderPlus size={14} className="mr-2" />
                  {FILES_LABELS.ADD_7926}
                </DropdownMenuItem>
              )}
              {onUpload && (
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} className="mr-2" />
                  {FILES_LABELS.UPLOADING_209}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 顯示模式切換 */}
          <div className="flex items-center border rounded-md">
            <button
              onClick={() => setInternalViewMode('grid')}
              className={cn(
                'p-1.5 rounded-l',
                internalViewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setInternalViewMode('list')}
              className={cn(
                'p-1.5 rounded-r',
                internalViewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 內容區 */}
      <div
        className={cn('flex-1 overflow-auto p-4', isDraggingOver && 'bg-morandi-gold/5')}
        onDragOver={e => {
          e.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDropOnEmpty}
        onClick={() => onSelect(new Set())} // 點空白處取消選擇
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Folder size={48} className="mb-3 opacity-50" />
            <p>{FILES_LABELS.EMPTY_351}</p>
            <div className="flex gap-2 mt-4">
              {emptyStateAction && (
                <Button variant="default" size="sm" onClick={emptyStateAction.onClick}>
                  <Plus size={14} className="mr-2" />
                  {emptyStateAction.label}
                </Button>
              )}
              {onUpload && !emptyStateAction && (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} className="mr-2" />
                  {FILES_LABELS.UPLOADING_209}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              internalViewMode === 'grid'
                ? 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2'
                : 'flex flex-col gap-1'
            )}
          >
            {sortedItems.map(item => (
              <FinderItemCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                viewMode={internalViewMode}
                onSelect={e => {
                  e.stopPropagation()
                  handleSelect(item, e)
                }}
                onDoubleClick={() => handleOpen(item)}
                onDragStart={e => handleDragStart(item, e)}
                onOpen={() => handleOpen(item)}
                onDownload={item.type === 'file' ? () => onDownload?.(item) : undefined}
                onRename={
                  onRename
                    ? () => {
                        const newName = prompt('重新命名', item.name)
                        if (newName && newName !== item.name) {
                          onRename(item.id, newName)
                        }
                      }
                    : undefined
                }
                onDelete={onDelete ? () => onDelete([item.id]) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 選擇狀態列 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/50">
          <span className="text-sm text-muted-foreground">已選擇 {selectedIds.size} 項</span>
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => onDelete(Array.from(selectedIds))}
              >
                <Trash2 size={14} className="mr-1" />
                {FILES_LABELS.DELETE}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
