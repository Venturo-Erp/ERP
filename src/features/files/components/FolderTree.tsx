'use client'

import { useState } from 'react'
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  HardDrive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFileSystemStore } from '@/stores/file-system-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FolderTreeNode } from '@/types/file-system.types'
import { LABELS } from '../constants/labels'

interface FolderNodeProps {
  node: FolderTreeNode
  level?: number
}

function FolderNode({ node, level = 0 }: FolderNodeProps) {
  const { selectedFolderId, selectFolder, toggleFolderExpanded } = useFileSystemStore()
  const [hovering, setHovering] = useState(false)

  const isSelected = selectedFolderId === node.id
  const isExpanded = node.expanded ?? false
  const hasChildren = node.children && node.children.length > 0

  const handleClick = () => {
    selectFolder(node.id)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFolderExpanded(node.id)
  }

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer',
          'hover:bg-accent/50 transition-colors',
          isSelected && 'bg-accent text-accent-foreground'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* 展開/收合按鈕 */}
        <button
          className={cn(
            'w-4 h-4 flex items-center justify-center shrink-0',
            !hasChildren && 'invisible'
          )}
          onClick={handleToggle}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* 資料夾圖示 */}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-morandi-gold shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-morandi-gold shrink-0" />
        )}

        {/* 名稱 */}
        <span className="flex-1 truncate text-sm">{node.name}</span>

        {/* 檔案數量 */}
        {node.file_count > 0 && (
          <span className="text-xs text-muted-foreground">{node.file_count}</span>
        )}

        {/* 更多選項 */}
        {hovering && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-background"
                onClick={e => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>{LABELS.newSubfolder}</DropdownMenuItem>
              <DropdownMenuItem>{LABELS.rename}</DropdownMenuItem>
              {!node.is_system && (
                <DropdownMenuItem className="text-morandi-red">
                  {LABELS.deleteFolder}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 子資料夾 */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <FolderNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FolderTree() {
  const { folderTree, loadingFolders, selectedFolderId, selectFolder, setCreateFolderDialogOpen } =
    useFileSystemStore()

  const handleAllFilesClick = () => {
    selectFolder(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* 標題 */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="font-medium text-sm">{LABELS.fileManager}</h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Add"
          className="h-7 w-7"
          onClick={() => setCreateFolderDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* 資料夾樹 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* 所有檔案 */}
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
              'hover:bg-accent/50 transition-colors',
              selectedFolderId === null && 'bg-accent text-accent-foreground'
            )}
            onClick={handleAllFilesClick}
          >
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{LABELS.allFiles}</span>
          </div>

          {/* 資料夾列表 */}
          {loadingFolders ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {LABELS.loadingEllipsis}
            </div>
          ) : folderTree.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{LABELS.noFolders}</div>
          ) : (
            <div className="mt-2">
              {folderTree.map(node => (
                <FolderNode key={node.id} node={node} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
