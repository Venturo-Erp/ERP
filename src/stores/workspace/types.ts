// Shared types for workspace stores
// 內部聊天系統（Channel / ChannelGroup / Message / MessageAttachment / RawMessage / PersonalCanvas）
// 已於 2026-05-02 整套刪除、相關 type 一併拿掉。

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
