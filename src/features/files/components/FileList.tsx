'use client'

import { useMemo } from 'react'
import {
  Upload,
  Grid,
  List,
  Search,
  Filter,
  Star,
  MoreHorizontal,
  Download,
  Trash2,
  FolderInput,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFileSystemStore } from '@/stores/file-system-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatFileSize,
  getFileIcon,
  FILE_CATEGORY_INFO,
  type VenturoFile,
  type FileCategory,
} from '@/types/file-system.types'
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

interface FileItemProps {
  file: VenturoFile
  isSelected: boolean
  viewMode: 'list' | 'grid'
  onSelect: (id: string, multi: boolean) => void
  onToggleStar: (id: string) => void
}

function FileItem({ file, isSelected, viewMode, onSelect, onToggleStar }: FileItemProps) {
  const iconName = getFileIcon(file.extension, file.category)
  const IconComponent = getIconComponent(iconName)
  const categoryInfo = FILE_CATEGORY_INFO[file.category]

  const handleClick = (e: React.MouseEvent) => {
    onSelect(file.id, e.metaKey || e.ctrlKey)
  }

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleStar(file.id)
  }

  if (viewMode === 'grid') {
    return (
      <div
        className={cn(
          'group relative p-3 rounded-lg border cursor-pointer transition-all',
          'hover:border-primary/50 hover:shadow-sm',
          isSelected && 'border-primary bg-primary/5 shadow-sm'
        )}
        onClick={handleClick}
      >
        {/* 勾選框 */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Checkbox checked={isSelected} />
        </div>

        {/* 星號 */}
        <button
          className={cn(
            'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity',
            file.is_starred && 'opacity-100'
          )}
          onClick={handleStarClick}
        >
          <Star
            className={cn(
              'w-4 h-4',
              file.is_starred ? 'fill-morandi-gold text-morandi-gold' : 'text-muted-foreground'
            )}
          />
        </button>

        {/* 圖示 */}
        <div className="flex justify-center py-4">
          <IconComponent className="w-12 h-12" style={{ color: categoryInfo.color }} />
        </div>

        {/* 檔名 */}
        <p className="text-sm font-medium truncate text-center">{file.filename}</p>

        {/* 大小 */}
        <p className="text-xs text-muted-foreground text-center mt-1">
          {formatFileSize(file.size_bytes)}
        </p>
      </div>
    )
  }

  // 列表模式
  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer',
        'hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent'
      )}
      onClick={handleClick}
    >
      {/* 勾選框 */}
      <Checkbox
        checked={isSelected}
        className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100"
      />

      {/* 圖示 */}
      <IconComponent className="w-5 h-5 shrink-0" style={{ color: categoryInfo.color }} />

      {/* 檔名 */}
      <span className="flex-1 truncate text-sm">{file.filename}</span>

      {/* 分類標籤 */}
      <span
        className="text-xs px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: `${categoryInfo.color}20`,
          color: categoryInfo.color,
        }}
      >
        {categoryInfo.label}
      </span>

      {/* 大小 */}
      <span className="text-xs text-muted-foreground w-20 text-right">
        {formatFileSize(file.size_bytes)}
      </span>

      {/* 日期 */}
      <span className="text-xs text-muted-foreground w-24 text-right">
        {new Date(file.created_at).toLocaleDateString('zh-TW')}
      </span>

      {/* 星號 */}
      <button onClick={handleStarClick}>
        <Star
          className={cn(
            'w-4 h-4',
            file.is_starred
              ? 'fill-morandi-gold text-morandi-gold'
              : 'text-muted-foreground opacity-0 group-hover:opacity-100'
          )}
        />
      </button>

      {/* 更多選項 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-background"
            onClick={e => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>
            <Download className="w-4 h-4 mr-2" />
            {LABELS.download}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const newName = prompt(LABELS.rename, file.filename)
              if (newName && newName.trim() && newName !== file.filename) {
                void useFileSystemStore.getState().renameFile(file.id, newName.trim())
              }
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            {LABELS.rename}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FolderInput className="w-4 h-4 mr-2" />
            {LABELS.moveTo}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            {LABELS.deleteFolder}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function FileList() {
  const {
    files,
    loadingFiles,
    currentFolder,
    selectedFileIds,
    viewMode,
    filter,
    setViewMode,
    setFilter,
    selectFile,
    toggleFileStar,
    setUploadDialogOpen,
  } = useFileSystemStore()

  // 麵包屑
  const breadcrumbs = useMemo(() => {
    if (!currentFolder) return []
    const parts = currentFolder.path.split('/').filter(Boolean)
    // 這裡可以根據 path 還原資料夾名稱，目前先簡化
    return [currentFolder.name]
  }, [currentFolder])

  const handleSelectFile = (id: string, multi: boolean) => {
    selectFile(id, multi)
  }

  const handleCategoryFilter = (category: string) => {
    if (category === 'all') {
      setFilter({ ...filter, category: undefined })
    } else {
      setFilter({ ...filter, category: category as FileCategory })
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具列 */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        {/* 麵包屑 */}
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
          <span
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => useFileSystemStore.getState().selectFolder(null)}
          >
            {LABELS.allFiles}
          </span>
          {breadcrumbs.map((name, index) => (
            <span key={index} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{name}</span>
            </span>
          ))}
        </div>

        {/* 搜尋 */}
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={LABELS.searchFiles}
            className="pl-8 h-8 text-sm"
            value={filter.search || ''}
            onChange={e => setFilter({ ...filter, search: e.target.value })}
          />
        </div>

        {/* 分類篩選 */}
        <Select
          value={Array.isArray(filter.category) ? 'all' : filter.category || 'all'}
          onValueChange={handleCategoryFilter}
        >
          <SelectTrigger className="w-28 h-8 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue placeholder={LABELS.category} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{LABELS.categoryAll}</SelectItem>
            {Object.entries(FILE_CATEGORY_INFO).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 視圖切換 */}
        <div className="flex border rounded-md">
          <button
            className={cn(
              'p-1.5 hover:bg-accent transition-colors',
              viewMode === 'list' && 'bg-accent'
            )}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            className={cn(
              'p-1.5 hover:bg-accent transition-colors',
              viewMode === 'grid' && 'bg-accent'
            )}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* 上傳按鈕 */}
        <Button size="sm" className="h-8" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-1" />
          {LABELS.upload}
        </Button>
      </div>

      {/* 檔案列表 */}
      <ScrollArea className="flex-1">
        {loadingFiles ? (
          <div className="py-12 text-center text-muted-foreground">{LABELS.loading}</div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{LABELS.noFilesInFolder}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="w-4 h-4 mr-1" />
              {LABELS.uploadFile}
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {files.map(file => (
              <FileItem
                key={file.id}
                file={file}
                isSelected={selectedFileIds.has(file.id)}
                viewMode="grid"
                onSelect={handleSelectFile}
                onToggleStar={toggleFileStar}
              />
            ))}
          </div>
        ) : (
          <div className="p-2">
            {files.map(file => (
              <FileItem
                key={file.id}
                file={file}
                isSelected={selectedFileIds.has(file.id)}
                viewMode="list"
                onSelect={handleSelectFile}
                onToggleStar={toggleFileStar}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 底部狀態列 */}
      {files.length > 0 && (
        <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {selectedFileIds.size > 0
              ? LABELS.selectedFiles(selectedFileIds.size)
              : LABELS.totalFiles(files.length)}
          </span>
          <span>{formatFileSize(files.reduce((sum, f) => sum + (f.size_bytes || 0), 0))}</span>
        </div>
      )}
    </div>
  )
}
