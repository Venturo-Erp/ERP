/**
 * Venturo ERP 檔案系統 Store
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { dynamicFrom, asInsert } from '@/lib/supabase/typed-client'
import type {
  Folder,
  VenturoFile,
  FileFilter,
  FileViewMode,
  FolderTreeNode,
  FileCategory,
} from '@/types/file-system.types'
import { logger } from '@/lib/utils/logger'
import { mutate } from 'swr'
import { getWorkspaceId } from '@/lib/workspace-context'

// ============================================================================
// Store State
// ============================================================================

interface FileSystemStoreState {
  // 資料夾
  folders: Folder[]
  folderTree: FolderTreeNode[]
  currentFolderId: string | null
  currentFolder: Folder | null
  selectedFolderId: string | null
  loadingFolders: boolean

  // 檔案
  files: VenturoFile[]
  totalFiles: number
  loadingFiles: boolean

  // 選擇
  selectedFileIds: Set<string>
  selectedFile: VenturoFile | null

  // 篩選與顯示
  filter: FileFilter
  viewMode: FileViewMode
  sortBy: 'name' | 'created_at' | 'size' | 'category'
  sortOrder: 'asc' | 'desc'

  // 上傳
  uploading: boolean
  uploadProgress: number
  uploadDialogOpen: boolean

  // 對話框
  createFolderDialogOpen: boolean

  // 錯誤
  error: string | null

  // Actions
  fetchFolders: (tourId?: string) => Promise<void>
  fetchFiles: (folderId?: string) => Promise<void>
  fetchFolderById: (id: string) => Promise<Folder | null>

  // 資料夾操作
  createFolder: (data: {
    name: string
    parentId?: string
    tourId?: string
  }) => Promise<Folder | null>
  renameFolder: (id: string, name: string) => Promise<boolean>
  deleteFolder: (id: string) => Promise<boolean>

  // 檔案操作
  uploadFile: (
    file: File,
    options?: {
      folder_id?: string
      folderId?: string
      tour_id?: string
      tourId?: string
      category?: FileCategory
      description?: string
    }
  ) => Promise<VenturoFile | null>
  uploadFiles: (
    files: File[],
    options?: { folderId?: string; tourId?: string }
  ) => Promise<VenturoFile[]>
  deleteFile: (id: string) => Promise<boolean>
  deleteFiles: (ids: string[]) => Promise<boolean>
  moveFile: (fileId: string, targetFolderId: string | null) => Promise<boolean>
  moveFiles: (fileIds: string[], targetFolderId: string | null) => Promise<boolean>
  renameFile: (id: string, filename: string) => Promise<boolean>
  toggleFileStar: (id: string) => Promise<void>
  updateFileCategory: (id: string, category: FileCategory) => Promise<boolean>

  // 導航
  setCurrentFolder: (folderId: string | null) => void
  navigateToFolder: (folderId: string | null) => Promise<void>
  navigateUp: () => void

  // 選擇
  selectFile: (id: string, multi?: boolean) => void
  selectFiles: (ids: string[]) => void
  toggleFileSelection: (id: string) => void
  clearSelection: () => void
  selectAll: () => void
  selectFolder: (folderId: string | null) => void
  toggleFolderExpanded: (folderId: string) => void

  // 篩選與顯示
  setFilter: (filter: Partial<FileFilter>) => void
  setViewMode: (mode: FileViewMode) => void
  setSort: (sortBy: 'name' | 'created_at' | 'size' | 'category', sortOrder?: 'asc' | 'desc') => void

  // 工具
  buildFolderTree: (folders: Folder[]) => FolderTreeNode[]
  getFolderPath: (folderId: string) => Folder[]

  // 對話框控制
  setUploadDialogOpen: (open: boolean) => void
  setCreateFolderDialogOpen: (open: boolean) => void

  // 下載
  downloadFile: (id: string) => Promise<void>

  // 清理
  reset: () => void
}

// ============================================================================
// 初始狀態
// ============================================================================

const initialState = {
  folders: [],
  folderTree: [],
  currentFolderId: null,
  currentFolder: null,
  selectedFolderId: null,
  loadingFolders: false,

  files: [],
  totalFiles: 0,
  loadingFiles: false,

  selectedFileIds: new Set<string>(),
  selectedFile: null,

  filter: {} as FileFilter,
  viewMode: 'list' as FileViewMode,
  sortBy: 'created_at' as const,
  sortOrder: 'desc' as const,

  uploading: false,
  uploadProgress: 0,
  uploadDialogOpen: false,

  createFolderDialogOpen: false,

  error: null,
}

// ============================================================================
// Store
// ============================================================================

export const useFileSystemStore = create<FileSystemStoreState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // 取得資料夾
      // ========================================================================
      fetchFolders: async (tourId?: string) => {
        set({ loadingFolders: true, error: null })

        try {
          const supabase = createSupabaseBrowserClient()

          const workspaceId = getWorkspaceId()

          let query = supabase
            .from('folders')
            .select('*, tour:tours(id, code, name)')
            .order('sort_order')
            .order('name')

          if (workspaceId) {
            query = query.eq('workspace_id', workspaceId)
          }

          if (tourId) {
            query = query.eq('tour_id', tourId)
          }

          const { data, error } = await query

          if (error) throw error

          const folders = (data || []) as Folder[]
          const folderTree = get().buildFolderTree(folders)

          set({ folders, folderTree, loadingFolders: false })
        } catch (error) {
          logger.error('[FileSystemStore] fetchFolders error:', error)
          set({
            error: error instanceof Error ? error.message : '載入資料夾失敗',
            loadingFolders: false,
          })
        }
      },

      // ========================================================================
      // 取得檔案
      // ========================================================================
      fetchFiles: async (folderId?: string) => {
        const { filter, sortBy, sortOrder } = get()
        set({ loadingFiles: true, error: null })

        try {
          const supabase = createSupabaseBrowserClient()

          const workspaceId = getWorkspaceId()

          let query = supabase
            .from('files')
            .select('*, folder:folders(id, name, path), tour:tours(id, code, name)', {
              count: 'exact',
            })
            .eq('is_deleted', false)

          if (workspaceId) {
            query = query.eq('workspace_id', workspaceId)
          }

          // 資料夾篩選
          if (folderId) {
            query = query.eq('folder_id', folderId)
          } else if (filter.folder_id) {
            query = query.eq('folder_id', filter.folder_id)
          }

          // 其他篩選
          if (filter.tour_id) {
            query = query.eq('tour_id', filter.tour_id)
          }
          if (filter.customer_id) {
            query = query.eq('customer_id', filter.customer_id)
          }
          if (filter.category) {
            if (Array.isArray(filter.category)) {
              query = query.in('category', filter.category)
            } else {
              query = query.eq('category', filter.category)
            }
          }
          if (filter.is_starred !== undefined) {
            query = query.eq('is_starred', filter.is_starred)
          }
          if (filter.search) {
            query = query.or(
              `filename.ilike.%${filter.search}%,description.ilike.%${filter.search}%`
            )
          }

          // 排序
          query = query.order(sortBy, { ascending: sortOrder === 'asc' })

          const { data, error, count } = await query

          if (error) throw error

          set({
            files: (data || []) as VenturoFile[],
            totalFiles: count || 0,
            loadingFiles: false,
          })
        } catch (error) {
          logger.error('[FileSystemStore] fetchFiles error:', error)
          set({
            error: error instanceof Error ? error.message : '載入檔案失敗',
            loadingFiles: false,
          })
        }
      },

      fetchFolderById: async (id: string) => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { data, error } = await supabase
            .from('folders')
            .select('*, tour:tours(id, code, name)')
            .eq('id', id)
            .single()

          if (error) throw error
          return data as Folder
        } catch (error) {
          logger.error('[FileSystemStore] fetchFolderById error:', error)
          return null
        }
      },

      // ========================================================================
      // 資料夾操作
      // ========================================================================
      createFolder: async data => {
        try {
          const supabase = createSupabaseBrowserClient()

          // 計算路徑
          let path = '/' + data.name
          let depth = 0

          if (data.parentId) {
            const parent = get().folders.find(f => f.id === data.parentId)
            if (parent) {
              path = parent.path + '/' + data.name
              depth = parent.depth + 1
            }
          }

          // 取得當前用戶的 workspace
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) throw new Error('未登入')

          // workspace_members 表尚未加入 Supabase 型別定義
          const { data: member } = await dynamicFrom('workspace_members')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single()

          if (!member?.workspace_id) throw new Error('找不到工作區')

          const insertData = {
            workspace_id: member.workspace_id as string,
            name: data.name,
            parent_id: data.parentId || null,
            tour_id: data.tourId || null,
            path,
            depth,
            folder_type: 'custom' as const,
            created_by: user.id,
          }
          const { data: folder, error } = await supabase
            .from('folders')
            .insert(asInsert<'folders'>(insertData))
            .select()
            .single()

          if (error) throw error

          // 重新載入
          await get().fetchFolders(data.tourId)

          return folder as Folder
        } catch (error) {
          logger.error('[FileSystemStore] createFolder error:', error)
          return null
        }
      },

      renameFolder: async (id, name) => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase
            .from('folders')
            .update({ name })
            .eq('id', id)
            .eq('is_system', false) // 系統資料夾不可重命名

          if (error) throw error

          set(state => ({
            folders: state.folders.map(f => (f.id === id ? { ...f, name } : f)),
          }))

          return true
        } catch (error) {
          logger.error('[FileSystemStore] renameFolder error:', error)
          return false
        }
      },

      deleteFolder: async id => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', id)
            .eq('is_system', false) // 系統資料夾不可刪除

          if (error) throw error

          set(state => ({
            folders: state.folders.filter(f => f.id !== id),
            folderTree: get().buildFolderTree(state.folders.filter(f => f.id !== id)),
          }))

          return true
        } catch (error) {
          logger.error('[FileSystemStore] deleteFolder error:', error)
          return false
        }
      },

      // ========================================================================
      // 檔案上傳
      // ========================================================================
      uploadFile: async (file, options) => {
        set({ uploading: true, uploadProgress: 0 })

        try {
          const formData = new FormData()
          formData.append('file', file)

          const folderId = options?.folder_id || options?.folderId
          const tourId = options?.tour_id || options?.tourId

          if (folderId) formData.append('folder_id', folderId)
          if (tourId) formData.append('tour_id', tourId)
          if (options?.category) formData.append('category', options.category)
          if (options?.description) formData.append('description', options.description)

          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || '上傳失敗')
          }

          const result = await response.json()

          set({ uploading: false, uploadProgress: 100 })

          // 重新載入檔案列表
          await get().fetchFiles(folderId || undefined)

          return result.file as VenturoFile
        } catch (error) {
          logger.error('[FileSystemStore] uploadFile error:', error)
          set({
            uploading: false,
            uploadProgress: 0,
            error: error instanceof Error ? error.message : '上傳失敗',
          })
          throw error // 重新拋出讓上傳對話框處理
        }
      },

      uploadFiles: async (files, options) => {
        const results: VenturoFile[] = []

        for (let i = 0; i < files.length; i++) {
          set({ uploadProgress: Math.round((i / files.length) * 100) })
          const result = await get().uploadFile(files[i], options)
          if (result) results.push(result)
        }

        set({ uploadProgress: 100 })
        return results
      },

      // ========================================================================
      // 檔案操作
      // ========================================================================
      deleteFile: async id => {
        try {
          const supabase = createSupabaseBrowserClient()
          // 軟刪除
          const { error } = await supabase
            .from('files')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', id)

          if (error) throw error

          mutate(
            (key: string) => typeof key === 'string' && key.startsWith('entity:files'),
            undefined,
            { revalidate: true }
          )

          set(state => ({
            files: state.files.filter(f => f.id !== id),
            selectedFileIds: new Set([...state.selectedFileIds].filter(fid => fid !== id)),
          }))

          return true
        } catch (error) {
          logger.error('[FileSystemStore] deleteFile error:', error)
          return false
        }
      },

      deleteFiles: async ids => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase
            .from('files')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .in('id', ids)

          if (error) throw error

          mutate(
            (key: string) => typeof key === 'string' && key.startsWith('entity:files'),
            undefined,
            { revalidate: true }
          )

          set(state => ({
            files: state.files.filter(f => !ids.includes(f.id)),
            selectedFileIds: new Set(),
          }))

          return true
        } catch (error) {
          logger.error('[FileSystemStore] deleteFiles error:', error)
          return false
        }
      },

      moveFile: async (fileId, targetFolderId) => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase
            .from('files')
            .update({ folder_id: targetFolderId })
            .eq('id', fileId)

          if (error) throw error

          mutate(
            (key: string) => typeof key === 'string' && key.startsWith('entity:files'),
            undefined,
            { revalidate: true }
          )

          // 從當前列表移除
          set(state => ({
            files: state.files.filter(f => f.id !== fileId),
          }))

          return true
        } catch (error) {
          logger.error('[FileSystemStore] moveFile error:', error)
          return false
        }
      },

      moveFiles: async (fileIds, targetFolderId) => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase
            .from('files')
            .update({ folder_id: targetFolderId })
            .in('id', fileIds)

          if (error) throw error

          mutate(
            (key: string) => typeof key === 'string' && key.startsWith('entity:files'),
            undefined,
            { revalidate: true }
          )

          set(state => ({
            files: state.files.filter(f => !fileIds.includes(f.id)),
            selectedFileIds: new Set(),
          }))

          return true
        } catch (error) {
          logger.error('[FileSystemStore] moveFiles error:', error)
          return false
        }
      },

      renameFile: async (id, filename) => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase.from('files').update({ filename }).eq('id', id)

          if (error) throw error

          mutate(
            (key: string) => typeof key === 'string' && key.startsWith('entity:files'),
            undefined,
            { revalidate: true }
          )

          set(state => ({
            files: state.files.map(f => (f.id === id ? { ...f, filename } : f)),
          }))

          return true
        } catch (error) {
          logger.error('[FileSystemStore] renameFile error:', error)
          return false
        }
      },

      toggleFileStar: async id => {
        const file = get().files.find(f => f.id === id)
        if (!file) return

        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase
            .from('files')
            .update({ is_starred: !file.is_starred })
            .eq('id', id)

          if (error) throw error

          mutate(
            (key: string) => typeof key === 'string' && key.startsWith('entity:files'),
            undefined,
            { revalidate: true }
          )

          set(state => ({
            files: state.files.map(f => (f.id === id ? { ...f, is_starred: !f.is_starred } : f)),
          }))
        } catch (error) {
          logger.error('[FileSystemStore] toggleFileStar error:', error)
        }
      },

      updateFileCategory: async (id, category) => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase.from('files').update({ category }).eq('id', id)

          if (error) throw error

          mutate(
            (key: string) => typeof key === 'string' && key.startsWith('entity:files'),
            undefined,
            { revalidate: true }
          )

          set(state => ({
            files: state.files.map(f => (f.id === id ? { ...f, category } : f)),
          }))

          return true
        } catch (error) {
          logger.error('[FileSystemStore] updateFileCategory error:', error)
          return false
        }
      },

      // ========================================================================
      // 導航
      // ========================================================================
      setCurrentFolder: folderId => {
        const folder = folderId ? get().folders.find(f => f.id === folderId) || null : null
        set({ currentFolderId: folderId, currentFolder: folder })
      },

      navigateToFolder: async folderId => {
        set({ currentFolderId: folderId })

        if (folderId) {
          const folder = await get().fetchFolderById(folderId)
          set({ currentFolder: folder })
        } else {
          set({ currentFolder: null })
        }

        await get().fetchFiles(folderId || undefined)
      },

      navigateUp: () => {
        const { currentFolder } = get()
        if (currentFolder?.parent_id) {
          get().navigateToFolder(currentFolder.parent_id)
        } else {
          get().navigateToFolder(null)
        }
      },

      // ========================================================================
      // 選擇
      // ========================================================================
      selectFile: (id, multi = false) => {
        const file = get().files.find(f => f.id === id) || null
        if (multi) {
          // 多選模式：切換選取
          const { selectedFileIds } = get()
          const newSet = new Set(selectedFileIds)
          if (newSet.has(id)) {
            newSet.delete(id)
          } else {
            newSet.add(id)
          }
          set({ selectedFileIds: newSet, selectedFile: file })
        } else {
          // 單選模式
          set({ selectedFileIds: new Set([id]), selectedFile: file })
        }
      },

      selectFiles: ids => {
        set({ selectedFileIds: new Set(ids), selectedFile: null })
      },

      toggleFileSelection: id => {
        const { selectedFileIds } = get()
        const newSet = new Set(selectedFileIds)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        set({ selectedFileIds: newSet })
      },

      clearSelection: () => {
        set({ selectedFileIds: new Set(), selectedFile: null })
      },

      selectAll: () => {
        const ids = get().files.map(f => f.id)
        set({ selectedFileIds: new Set(ids) })
      },

      selectFolder: folderId => {
        const folder = folderId ? get().folders.find(f => f.id === folderId) || null : null
        set({
          selectedFolderId: folderId,
          currentFolderId: folderId,
          currentFolder: folder,
        })
        get().fetchFiles(folderId || undefined)
      },

      toggleFolderExpanded: folderId => {
        set(state => {
          const updateNode = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
            return nodes.map(node => {
              if (node.id === folderId) {
                return { ...node, expanded: !node.expanded }
              }
              if (node.children.length > 0) {
                return { ...node, children: updateNode(node.children) }
              }
              return node
            })
          }
          return { folderTree: updateNode(state.folderTree) }
        })
      },

      // ========================================================================
      // 篩選與顯示
      // ========================================================================
      setFilter: newFilter => {
        set(state => ({ filter: { ...state.filter, ...newFilter } }))
        get().fetchFiles()
      },

      setViewMode: mode => {
        set({ viewMode: mode })
      },

      setSort: (sortBy, sortOrder) => {
        set(state => ({
          sortBy,
          sortOrder:
            sortOrder || (state.sortBy === sortBy && state.sortOrder === 'asc' ? 'desc' : 'asc'),
        }))
        get().fetchFiles()
      },

      // ========================================================================
      // 工具
      // ========================================================================
      buildFolderTree: folders => {
        const map = new Map<string, FolderTreeNode>()
        const roots: FolderTreeNode[] = []

        // 建立節點 map
        folders.forEach(folder => {
          map.set(folder.id, { ...folder, children: [], file_count: 0 })
        })

        // 建立樹狀結構
        folders.forEach(folder => {
          const node = map.get(folder.id)!
          if (folder.parent_id && map.has(folder.parent_id)) {
            map.get(folder.parent_id)!.children.push(node)
          } else {
            roots.push(node)
          }
        })

        // 排序
        const sortChildren = (nodes: FolderTreeNode[]) => {
          nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
          nodes.forEach(node => sortChildren(node.children))
        }
        sortChildren(roots)

        return roots
      },

      getFolderPath: folderId => {
        const { folders } = get()
        const path: Folder[] = []

        let current = folders.find(f => f.id === folderId)
        while (current) {
          path.unshift(current)
          current = current.parent_id ? folders.find(f => f.id === current!.parent_id) : undefined
        }

        return path
      },

      // ========================================================================
      // 對話框控制
      // ========================================================================
      setUploadDialogOpen: open => {
        set({ uploadDialogOpen: open })
      },

      setCreateFolderDialogOpen: open => {
        set({ createFolderDialogOpen: open })
      },

      // ========================================================================
      // 下載
      // ========================================================================
      downloadFile: async id => {
        try {
          const response = await fetch(`/api/files/${id}/download`)
          if (!response.ok) {
            throw new Error('下載失敗')
          }

          const data = await response.json()

          // 開啟下載連結
          const link = document.createElement('a')
          link.href = data.url
          link.download = data.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } catch (error) {
          logger.error('[FileSystemStore] downloadFile error:', error)
          set({ error: error instanceof Error ? error.message : '下載失敗' })
        }
      },

      // ========================================================================
      // 清理
      // ========================================================================
      reset: () => {
        set(initialState)
      },
    }),
    { name: 'file-system-store' }
  )
)
