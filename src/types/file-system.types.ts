/**
 * Venturo ERP 檔案管理系統類型定義
 */

// ============================================================================
// 列舉類型
// ============================================================================

export type FolderType = 'root' | 'tour' | 'customer' | 'supplier' | 'template' | 'custom'

export type FileCategory =
  | 'contract' // 合約
  | 'quote' // 報價單
  | 'itinerary' // 行程表
  | 'passport' // 護照
  | 'visa' // 簽證
  | 'ticket' // 機票/車票
  | 'voucher' // 訂房確認/憑證
  | 'invoice' // 發票/收據
  | 'insurance' // 保險
  | 'photo' // 照片
  | 'email_attachment' // 郵件附件
  | 'other' // 其他

export type FileSource = 'upload' | 'email' | 'scan' | 'import'

// ============================================================================
// 資料夾
// ============================================================================

export interface Folder {
  id: string
  workspace_id: string

  name: string
  folder_type: FolderType
  icon: string | null
  color: string | null

  // 樹狀結構
  parent_id: string | null
  path: string
  depth: number

  // 關聯
  tour_id: string | null
  customer_id: string | null
  supplier_id: string | null

  default_category: FileCategory | null
  is_system: boolean
  sort_order: number

  created_at: string
  updated_at: string
  created_by: string | null

  // 關聯資料（join 時載入）
  children?: Folder[]
  files?: VenturoFile[]
  file_count?: number
  tour?: { id: string; code: string; name: string }
}

// ============================================================================
// 檔案
// ============================================================================

export interface VenturoFile {
  id: string
  workspace_id: string
  folder_id: string | null

  filename: string
  original_filename: string
  content_type: string | null
  size_bytes: number | null
  extension: string | null

  storage_path: string
  storage_bucket: string
  thumbnail_path: string | null

  category: FileCategory
  tags: string[]

  // 關聯
  tour_id: string | null
  order_id: string | null
  customer_id: string | null
  supplier_id: string | null
  email_id: string | null

  source: FileSource
  source_email_attachment_id: string | null

  version: number
  previous_version_id: string | null

  is_starred: boolean
  is_archived: boolean
  is_deleted: boolean
  deleted_at: string | null

  download_count: number
  last_accessed_at: string | null

  description: string | null
  notes: string | null

  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null

  // 關聯資料
  folder?: Folder
  tour?: { id: string; code: string; name: string }
  customer?: { id: string; chinese_name: string | null }
}

// ============================================================================
// 資料夾模板
// ============================================================================

export interface TourFolderTemplate {
  id: string
  workspace_id: string | null
  name: string
  icon: string | null
  default_category: FileCategory | null
  sort_order: number
  is_active: boolean
  created_at: string
}

// ============================================================================
// API 請求/回應
// ============================================================================

export interface CreateFolderRequest {
  name: string
  parent_id?: string
  tour_id?: string
  customer_id?: string
  supplier_id?: string
  icon?: string
  color?: string
  default_category?: FileCategory
}

export interface UploadFileRequest {
  file: File
  folder_id?: string
  tour_id?: string
  customer_id?: string
  supplier_id?: string
  category?: FileCategory
  description?: string
  tags?: string[]
}

export interface MoveFileRequest {
  file_id: string
  target_folder_id: string | null
}

export interface CopyFileRequest {
  file_id: string
  target_folder_id: string
  new_filename?: string
}

// ============================================================================
// 篩選與查詢
// ============================================================================

export interface FileFilter {
  folder_id?: string
  tour_id?: string
  customer_id?: string
  supplier_id?: string
  category?: FileCategory | FileCategory[]
  source?: FileSource
  is_starred?: boolean
  is_archived?: boolean
  search?: string
  extension?: string | string[]
  date_from?: string
  date_to?: string
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[]
  file_count: number
  expanded?: boolean
}

// ============================================================================
// UI 狀態
// ============================================================================

export type FileViewMode = 'list' | 'grid' | 'tree'

export interface FileSystemState {
  // 資料夾
  folders: Folder[]
  folderTree: FolderTreeNode[]
  currentFolder: Folder | null
  loadingFolders: boolean

  // 檔案
  files: VenturoFile[]
  totalFiles: number
  loadingFiles: boolean

  // 選擇
  selectedFileIds: Set<string>
  selectedFolderId: string | null

  // 篩選
  filter: FileFilter
  viewMode: FileViewMode

  // 上傳
  uploading: boolean
  uploadProgress: number

  // 錯誤
  error: string | null
}

// ============================================================================
// 分類顯示資訊
// ============================================================================

// Colors use Morandi palette hex values (morandi-gold, status-info, morandi-green, etc.)
// Note: hex colors below match the Morandi palette and are used in inline JS styles (backgroundColor)
// where CSS variables/Tailwind classes are not available.
/**
 * 檔案類別顏色：用 CSS 變數，切換主題時自動變色。
 * 消費端應該用 `style={{ color: info.color }}` 而非 Tailwind 類別。
 */
export const FILE_CATEGORY_INFO: Record<
  FileCategory,
  { label: string; icon: string; color: string }
> = {
  contract: { label: '合約', icon: 'FileSignature', color: 'var(--morandi-gold)' },
  quote: { label: '報價單', icon: 'FileText', color: 'var(--status-info)' },
  itinerary: { label: '行程表', icon: 'Map', color: 'var(--morandi-green)' },
  passport: { label: '護照', icon: 'CreditCard', color: 'var(--morandi-gold)' },
  visa: { label: '簽證', icon: 'Stamp', color: 'var(--morandi-red)' },
  ticket: { label: '機票', icon: 'Plane', color: 'var(--status-info)' },
  voucher: { label: '住宿憑證', icon: 'Building2', color: 'var(--morandi-secondary)' },
  invoice: { label: '發票收據', icon: 'Receipt', color: 'var(--morandi-green)' },
  insurance: { label: '保險', icon: 'Shield', color: 'var(--status-warning)' },
  photo: { label: '照片', icon: 'Image', color: 'var(--cat-pink)' },
  email_attachment: { label: '郵件附件', icon: 'Paperclip', color: 'var(--morandi-secondary)' },
  other: { label: '其他', icon: 'File', color: 'var(--morandi-muted)' },
}

// ============================================================================
// 工具函式
// ============================================================================

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function getFileIcon(extension: string | null, category: FileCategory): string {
  if (!extension) return FILE_CATEGORY_INFO[category].icon

  const ext = extension.toLowerCase()

  // 圖片
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(ext)) {
    return 'Image'
  }
  // PDF
  if (ext === 'pdf') {
    return 'FileText'
  }
  // Word
  if (['doc', 'docx'].includes(ext)) {
    return 'FileText'
  }
  // Excel
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return 'FileSpreadsheet'
  }
  // PowerPoint
  if (['ppt', 'pptx'].includes(ext)) {
    return 'Presentation'
  }
  // 壓縮檔
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'FileArchive'
  }
  // 影片
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return 'Video'
  }
  // 音訊
  if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) {
    return 'Music'
  }

  return FILE_CATEGORY_INFO[category].icon
}
