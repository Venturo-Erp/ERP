// Shared types for workspace stores

export interface Workspace {
  id: string
  name: string
  code?: string | null
  type?: string | null
  description?: string | null
  icon?: string | null
  is_active: boolean | null
  contract_seal_image_url?: string | null // 合約專用章圖片 URL
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  max_employees?: number | null
  _deleted?: boolean | null
  _needs_sync?: boolean | null
  _synced_at?: string | null
}

export interface Bulletin {
  id: string
  workspace_id: string
  title: string
  content: string
  type: 'announcement' | 'notice' | 'event'
  priority: number
  is_pinned: boolean
  author_id: string
  created_at: string
  updated_at: string
  author?: {
    display_name: string
    english_name: string
  }
}

export interface Channel {
  id: string
  workspace_id: string
  name: string
  description?: string | null
  type: 'public' | 'private' | 'direct' | string | null
  created_by?: string | null
  created_at: string
  is_favorite?: boolean | null
  is_archived?: boolean | null
  archived_at?: string | null
  is_pinned?: boolean | null
  is_announcement?: boolean | null
  group_id?: string | null
  tour_id?: string | null
  order?: number | null
  updated_at?: string | null
  /** DM 頻道專用：對方的 employee ID（從創建者角度）*/
  dm_target_id?: string | null
  _deleted?: boolean | null
  _needs_sync?: boolean | null
  _synced_at?: string | null
}

export interface ChannelGroup {
  id: string
  workspace_id: string
  name: string
  is_collapsed: boolean | null
  order: number | null
  is_system?: boolean | null
  system_type?: string | null
  created_at: string | null
  updated_at?: string | null
  _deleted?: boolean | null
  _needs_sync?: boolean | null
  _synced_at?: string | null
}

export interface MessageAttachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  path: string
  publicUrl: string
  /** 以下欄位保留給舊版資料使用 */
  name?: string
  url?: string
  size?: number
  type?: string
  fileType?: string
}

export interface Message {
  id: string
  channel_id: string
  author_id: string
  content: string
  reactions: Record<string, string[]>
  attachments?: MessageAttachment[]
  created_at: string
  edited_at?: string
  is_pinned?: boolean
  // Slack 風格討論串：回覆訊息指向父訊息
  parent_message_id?: string | null
  // 討論串統計（僅父訊息有值）
  reply_count?: number
  last_reply_at?: string | null
  // 討論串中最後幾位回覆者的頭像（用於顯示）
  reply_users?: string[]
  author?: {
    id: string
    display_name: string
    avatar?: string
  }
  // 訊息額外資料（機器人卡片等）
  metadata?: MessageMetadata | null
  _deleted?: boolean | null
  _needs_sync?: boolean | null
  _synced_at?: string | null
}

/** 訊息元資料型別 - 允許任意 JSON 值 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface MessageMetadata {
  message_type?: string
  tours?: JsonValue
  summary?: JsonValue
  generated_at?: string
  [key: string]: JsonValue | undefined
}

export type RawMessage = Omit<Message, 'attachments' | 'created_at'> & {
  attachments?: unknown
  created_at: string | null
}

export interface PersonalCanvas {
  id: string
  channelId: string
  name: string
  title?: string
  type: string
  order: number
  canvas_number?: number
  created_at?: string
  updated_at?: string
}

export interface DocumentFormatData {
  version: string
  blocks?: unknown[]
  styles?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface RichDocument {
  id: string
  canvas_id: string
  title: string
  content: string
  format_data?: DocumentFormatData
  tags?: string[]
  is_favorite?: boolean
  created_at?: string
  updated_at?: string
}

export interface AdvanceItem {
  id: string
  name: string
  description: string
  amount: number
  advance_person: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  payment_request_id?: string
  processed_by?: string
  processed_at?: string
}

export interface AdvanceList {
  id: string
  channel_id: string
  items: AdvanceItem[]
  created_by: string
  created_at: string
  author?: {
    id: string
    display_name: string
    avatar?: string
  }
}

export interface SharedOrderList {
  id: string
  channel_id: string
  orders: Array<{
    id: string
    order_number: string | null
    contact_person: string
    total_amount: number
    paid_amount: number
    gap: number
    collection_rate: number
    invoice_status?: 'not_invoiced' | 'invoiced'
    receipt_status?: 'not_received' | 'received'
  }>
  created_by: string
  created_at: string
  author?: {
    id: string
    display_name: string
    avatar?: string
  }
}
