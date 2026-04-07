'use client'

/**
 * CompanyAssetsTree - 公司資源樹狀展開介面
 *
 * 參考 TourFilesTree，使用 TreeView 組件
 * - 點擊展開/收合資料夾
 * - 支援新增/刪除/重命名資料夾
 * - 支援拖曳移動檔案
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { mutate as globalMutate } from 'swr'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { TreeView, type TreeItem } from '@/features/files/components'
import { useAuthStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Plus, FolderPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { confirm } from '@/lib/ui/alert-dialog'
import { COMPANY_ASSETS_LABELS } from '../constants/labels'

interface CompanyAssetFolder {
  id: string
  name: string
  parent_id: string | null
  icon: string | null
  sort_order: number | null
}

interface CompanyAsset {
  id: string
  name: string
  file_path: string
  mime_type: string | null
  folder_id: string | null
  asset_type: string | null
}

interface CompanyAssetsTreeProps {
  onSelectFile?: (asset: CompanyAsset) => void
  onAddFile?: (folderId: string | null) => void
}

export function CompanyAssetsTree({ onSelectFile, onAddFile }: CompanyAssetsTreeProps) {
  const user = useAuthStore(state => state.user)
  const workspaceId = user?.workspace_id

  const [folders, setFolders] = useState<CompanyAssetFolder[]>([])
  const [assets, setAssets] = useState<CompanyAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<TreeItem[]>([])

  // 新增資料夾 Dialog
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [parentFolderId, setParentFolderId] = useState<string | null>(null)
  const [editingFolder, setEditingFolder] = useState<CompanyAssetFolder | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)

  // 載入資料
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 載入資料夾
      let folderQuery = supabase
        .from('company_asset_folders')
        .select(
          'id, name, parent_id, icon, color, sort_order, workspace_id, created_at, updated_at'
        )
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(500)

      if (workspaceId) {
        folderQuery = folderQuery.eq('workspace_id', workspaceId)
      }

      const { data: folderData, error: folderError } = await folderQuery
      if (folderError) throw folderError
      setFolders(folderData || [])

      // 載入檔案（包含舊資料，不限 workspace）
      const { data: assetData, error: assetError } = await supabase
        .from('company_assets')
        .select('id, name, file_path, mime_type, folder_id, asset_type')
        .order('created_at', { ascending: false })

      if (assetError) throw assetError
      setAssets(assetData || [])
    } catch (err) {
      logger.error(COMPANY_ASSETS_LABELS.載入公司資源失敗, err)
      toast.error(COMPANY_ASSETS_LABELS.載入失敗)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  // 建構樹狀結構
  useEffect(() => {
    const buildTree = () => {
      const treeItems: TreeItem[] = []

      // 建立資料夾 Map
      const folderMap = new Map<string | null, CompanyAssetFolder[]>()
      folders.forEach(f => {
        const parentId = f.parent_id
        if (!folderMap.has(parentId)) {
          folderMap.set(parentId, [])
        }
        folderMap.get(parentId)!.push(f)
      })

      // 建立檔案 Map（按 folder_id 分組）
      const assetMap = new Map<string | null, CompanyAsset[]>()
      assets.forEach(a => {
        const folderId = a.folder_id
        if (!assetMap.has(folderId)) {
          assetMap.set(folderId, [])
        }
        assetMap.get(folderId)!.push(a)
      })

      // 遞迴建構樹
      const buildNode = (parentId: string | null): TreeItem[] => {
        const items: TreeItem[] = []

        // 加入子資料夾
        const subFolders = folderMap.get(parentId) || []
        subFolders.forEach(folder => {
          const childFolders = folderMap.get(folder.id) || []
          const childAssets = assetMap.get(folder.id) || []

          items.push({
            id: `folder-${folder.id}`,
            name: folder.name,
            type: 'folder',
            // 不設 icon，讓 TreeView 用預設的 Folder icon
            childCount: childFolders.length + childAssets.length,
            children: buildNode(folder.id),
            data: { folderId: folder.id, isFolder: true },
          })
        })

        // 加入檔案
        const folderAssets = assetMap.get(parentId) || []
        folderAssets.forEach(asset => {
          items.push({
            id: `file-${asset.id}`,
            name: asset.name,
            type: 'file',
            icon: getFileIcon(asset.asset_type, asset.mime_type),
            data: { assetId: asset.id, asset, isFolder: false },
          })
        })

        return items
      }

      // 從根目錄開始建構
      treeItems.push(...buildNode(null))
      setItems(treeItems)
    }

    buildTree()
  }, [folders, assets])

  // 初始載入
  useEffect(() => {
    loadData()
  }, [loadData])

  // 取得檔案圖示（不用 emoji，用 undefined 讓 TreeView 用預設 icon）
  const getFileIcon = (_assetType: string | null, _mimeType: string | null): undefined => {
    // TreeView 會根據 type='file' 自動用 File icon
    return undefined
  }

  // 處理項目選取
  const handleSelect = useCallback(
    (item: TreeItem) => {
      if (!item.data?.isFolder && item.data?.asset) {
        onSelectFile?.(item.data.asset as CompanyAsset)
      }
    },
    [onSelectFile]
  )

  // 處理雙擊（預覽）
  const handleDoubleClick = useCallback(
    (item: TreeItem) => {
      if (!item.data?.isFolder && item.data?.asset) {
        onSelectFile?.(item.data.asset as CompanyAsset)
      }
    },
    [onSelectFile]
  )

  // 處理拖曳移動
  const handleMove = useCallback(
    async (sourceId: string, targetId: string) => {
      const sourceIsFile = sourceId.startsWith('file-')
      const targetFolderId = targetId.startsWith('folder-') ? targetId.replace('folder-', '') : null

      if (sourceIsFile) {
        const assetId = sourceId.replace('file-', '')
        const { error } = await supabase
          .from('company_assets')
          .update({ folder_id: targetFolderId })
          .eq('id', assetId)

        if (error) {
          toast.error(COMPANY_ASSETS_LABELS.移動失敗)
          return
        }
        toast.success(COMPANY_ASSETS_LABELS.已移動)
        loadData()
      }
    },
    [loadData]
  )

  // 新增資料夾
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast.error(COMPANY_ASSETS_LABELS.請輸入資料夾名稱)
      return
    }
    if (!workspaceId) {
      toast.error(COMPANY_ASSETS_LABELS.無法取得_workspace_請重新整理頁面)
      return
    }
    if (creatingFolder) return // 防止重複點擊

    setCreatingFolder(true)
    try {
      if (editingFolder) {
        // 編輯模式
        const { error } = await supabase
          .from('company_asset_folders')
          .update({ name: newFolderName.trim() })
          .eq('id', editingFolder.id)

        if (error) throw error
        toast.success(COMPANY_ASSETS_LABELS.已更新)
      } else {
        // 新增模式
        const { error } = await supabase.from('company_asset_folders').insert({
          workspace_id: workspaceId,
          name: newFolderName.trim(),
          parent_id: parentFolderId,
        })

        if (error) throw error
        toast.success(COMPANY_ASSETS_LABELS.資料夾已建立)
      }

      setShowFolderDialog(false)
      setNewFolderName('')
      setParentFolderId(null)
      setEditingFolder(null)
      loadData()
    } catch (err) {
      logger.error(COMPANY_ASSETS_LABELS.建立資料夾失敗, err)
      toast.error(COMPANY_ASSETS_LABELS.建立失敗)
    } finally {
      setCreatingFolder(false)
    }
  }, [newFolderName, workspaceId, parentFolderId, editingFolder, loadData, creatingFolder])

  // 刪除資料夾
  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      const confirmed = await confirm(
        COMPANY_ASSETS_LABELS.確定要刪除此資料夾嗎_資料夾內的檔案會移到根目錄,
        {
          title: COMPANY_ASSETS_LABELS.刪除資料夾,
          type: 'warning',
        }
      )
      if (!confirmed) return

      try {
        // 先把資料夾內的檔案移到根目錄
        await supabase.from('company_assets').update({ folder_id: null }).eq('folder_id', folderId)

        // 刪除資料夾
        const { error } = await supabase.from('company_asset_folders').delete().eq('id', folderId)

        if (error) throw error
        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:company_asset_folders'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:company_asset_folders')
        toast.success(COMPANY_ASSETS_LABELS.資料夾已刪除)
        loadData()
      } catch (err) {
        logger.error(COMPANY_ASSETS_LABELS.刪除資料夾失敗, err)
        toast.error(COMPANY_ASSETS_LABELS.刪除失敗)
      }
    },
    [loadData]
  )

  // 右鍵選單處理（簡化版：用長按或選取後顯示按鈕）
  const [selectedItem, setSelectedItem] = useState<TreeItem | null>(null)

  const handleItemSelect = useCallback(
    (item: TreeItem) => {
      setSelectedItem(item)
      handleSelect(item)
    },
    [handleSelect]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具列 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-morandi-container/40 border-b border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setParentFolderId(null)
            setEditingFolder(null)
            setNewFolderName('')
            setShowFolderDialog(true)
          }}
        >
          <FolderPlus className="w-4 h-4 mr-1" />
          {COMPANY_ASSETS_LABELS.新增資料夾}
        </Button>

        {/* 選取資料夾時顯示的操作 */}
        {selectedItem?.data?.isFolder === true && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const folder = folders.find(f => f.id === selectedItem.data?.folderId)
                if (folder) {
                  setEditingFolder(folder)
                  setNewFolderName(folder.name)
                  setShowFolderDialog(true)
                }
              }}
            >
              {COMPANY_ASSETS_LABELS.LABEL_4285}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => handleDeleteFolder(selectedItem.data?.folderId as string)}
            >
              {COMPANY_ASSETS_LABELS.刪除}
            </Button>
          </>
        )}
      </div>

      {/* 樹狀檢視 */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <p>{COMPANY_ASSETS_LABELS.EMPTY_1497}</p>
            <p className="text-sm">{COMPANY_ASSETS_LABELS.ADD_3812}</p>
          </div>
        ) : (
          <TreeView
            items={items}
            onSelect={handleItemSelect}
            onDoubleClick={handleDoubleClick}
            onMove={handleMove}
            draggable
          />
        )}
      </div>

      {/* 新增/編輯資料夾 Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent level={1} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingFolder
                ? COMPANY_ASSETS_LABELS.重命名資料夾
                : COMPANY_ASSETS_LABELS.新增資料夾}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={COMPANY_ASSETS_LABELS.資料夾名稱}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              {COMPANY_ASSETS_LABELS.CANCEL}
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}>
              {creatingFolder
                ? COMPANY_ASSETS_LABELS.處理中
                : editingFolder
                  ? COMPANY_ASSETS_LABELS.儲存
                  : COMPANY_ASSETS_LABELS.建立}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
