/**
 * 旅遊團檔案管理系統 Types
 * Linear 風格的檔案管理
 */

// ============================================================
// 需求單（Tour Request）
// ============================================================

export interface TourRequest {
  id: string
  workspace_id: string
  tour_id: string
  
  // 來源追蹤
  source_type?: 'itinerary_item' | 'quote' | 'manual'
  source_id?: string
  
  // 基本資訊
  code?: string
  request_type: '訂房' | '訂車' | '訂餐' | '訂機票' | '訂門票' | string
  
  // 供應商
  supplier_id?: string
  supplier_name?: string
  supplier_contact?: string
  
  // 指派同事（內部任務）
  assigned_employee_id?: string
  assigned_employee_name?: string
  
  // 需求項目
  items: RequestItem[]
  
  // 狀態
  status: RequestStatus
  hidden?: boolean
  
  // 發送記錄
  sent_at?: string
  sent_via?: SentVia
  sent_to?: string
  
  // 回覆記錄
  replied_at?: string
  replied_by?: string
  
  // 確認記錄
  confirmed_at?: string
  confirmed_by?: string
  
  // 結案記錄
  closed_at?: string
  closed_by?: string
  close_note?: string
  
  // 備註
  note?: string
  
  // 審計
  created_at: string
  created_by?: string
  updated_at: string
  updated_by?: string
}

export interface RequestItem {
  service_date?: string | null
  title: string
  quantity: number
  note?: string
  unit_price?: number
  total_price?: number
}

export type RequestStatus = '草稿' | '已發送' | '已回覆' | '已確認' | '結案' | '取消'
export type SentVia = 'Line' | 'Email' | '傳真' | 'WhatsApp' | string

// ============================================================
// 需求單文件（Request Document）
// ============================================================

export interface RequestDocument {
  id: string
  workspace_id: string
  request_id: string
  
  // 文件基本資訊
  document_type: DocumentType
  version: string  // 'v1.0', 'v2.0'
  
  // 🆕 關聯和類型
  parent_document_id?: string  // 關聯到哪個需求單版本（供應商回覆時使用）
  reply_type: 'sent' | 'received'  // sent=我方發送, received=供應商回覆
  
  // 檔案資訊
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  
  // 狀態
  status: DocumentStatus
  
  // 發送記錄
  sent_at?: string
  sent_via?: SentVia
  sent_to?: string
  
  // 接收記錄
  received_at?: string
  received_from?: string
  
  // 描述
  title?: string
  description?: string
  note?: string
  
  // 審計
  created_at: string
  created_by?: string
  updated_at: string
}

export type DocumentType = '需求單' | '供應商回覆' | '修改單' | '最終確認' | '其他'
export type DocumentStatus = '草稿' | '已發送' | '已收到' | '已確認'
export type ReplyType = 'sent' | 'received'

// ============================================================
// 旅遊團檔案（Tour File）
// ============================================================

export interface TourFile {
  id: string
  workspace_id: string
  tour_id: string
  
  // 分類
  category: FileCategory
  
  // 可選關聯
  related_request_id?: string
  related_item_id?: string
  
  // 檔案資訊
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  
  // 描述
  title?: string
  description?: string
  tags?: string[]
  note?: string
  
  // 審計
  created_at: string
  created_by?: string
  updated_at: string
}

export type FileCategory =
  | 'passport'      // 護照
  | 'visa'          // 簽證
  | 'contract'      // 合約
  | 'insurance'     // 保險
  | 'logo'          // Logo
  | 'bid_doc'       // 標案文件
  | 'photo'         // 照片
  | 'other'         // 其他

// ============================================================
// UI 專用 Types
// ============================================================

/**
 * 需求單詳細資訊（包含文件）
 */
export interface TourRequestDetail extends TourRequest {
  documents?: RequestDocument[]
  related_files?: TourFile[]
}

/**
 * 活動記錄項目
 */
export interface ActivityItem {
  id: string
  timestamp: string
  type: 'created' | 'sent' | 'received' | 'confirmed' | 'closed' | 'file_uploaded'
  user_name?: string
  description: string
  metadata?: Record<string, unknown>
}

/**
 * 檔案上傳進度
 */
export interface UploadProgress {
  file_name: string
  progress: number  // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

// ============================================================
// API 相關 Types
// ============================================================

export interface CreateTourRequestInput {
  tour_id: string
  request_type: string
  supplier_name?: string
  items: RequestItem[]
  note?: string
}

export interface UpdateTourRequestInput {
  status?: RequestStatus
  supplier_name?: string
  items?: RequestItem[]
  note?: string
  sent_at?: string
  sent_via?: SentVia
}

export interface CreateRequestDocumentInput {
  request_id: string
  document_type: DocumentType
  version: string
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  note?: string
}

export interface UploadTourFileInput {
  tour_id: string
  category: FileCategory
  file: File
  title?: string
  description?: string
  tags?: string[]
  related_request_id?: string
}
