// Shared types for workspace stores
// 內部聊天系統 + widget（advance_lists / shared_order_lists）已於 2026-05-02 整套刪除。
// 這裡只剩 Workspace 本身的 type。

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
