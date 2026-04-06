/**
 * RBAC 配置 — 舊版角色定義（僅保留 type 和顯示用途）
 *
 * ⚠️ 權限系統已遷移至 role_tab_permissions + module:tab 格式
 * 此檔案僅保留 UserRole type（多處 import）和 ROLES 定義（HR 頁面顯示標籤顏色）
 * 不再用於權限判斷
 */

/** @deprecated 僅用於向後相容的型別，新系統用 workspace_roles 表 */
export type UserRole =
  | 'admin'
  | 'tour_leader'
  | 'sales'
  | 'accountant'
  | 'assistant'
  | 'controller'
  | 'staff'
  | 'bot'

/** 角色顯示設定（僅用於 UI 標籤和顏色） */
export interface RoleConfig {
  id: UserRole
  label: string
  description: string
  color: string
}

/** 角色顯示設定（僅用於 UI） */
export const ROLES: Record<UserRole, RoleConfig> = {
  admin: {
    id: 'admin',
    label: '管理員',
    description: '擁有所有管理權限',
    color: 'text-morandi-gold bg-morandi-gold/10 border-morandi-gold/20',
  },
  tour_leader: {
    id: 'tour_leader',
    label: '領隊',
    description: '管理自己帶的旅遊團',
    color: 'text-morandi-primary bg-morandi-primary/10 border-morandi-primary/20',
  },
  sales: {
    id: 'sales',
    label: '業務',
    description: '管理報價、客戶和訂單',
    color: 'text-morandi-gold bg-morandi-gold/10 border-morandi-gold/20',
  },
  accountant: {
    id: 'accountant',
    label: '會計',
    description: '管理財務和會計',
    color: 'text-morandi-primary bg-morandi-primary/10 border-morandi-primary/20',
  },
  assistant: {
    id: 'assistant',
    label: '助理',
    description: '協助處理行政工作',
    color: 'text-morandi-secondary bg-morandi-secondary/10 border-morandi-secondary/20',
  },
  controller: {
    id: 'controller',
    label: '團控',
    description: '開團和管理團務',
    color: 'text-morandi-green bg-morandi-green/10 border-morandi-green/20',
  },
  staff: {
    id: 'staff',
    label: '一般員工',
    description: '基本查看權限',
    color: 'text-morandi-secondary bg-muted border-border',
  },
  bot: {
    id: 'bot',
    label: '機器人',
    description: '系統自動化帳號',
    color: 'text-purple-600 bg-purple-100 border-purple-200',
  },
}

/** 取得角色顯示設定 */
export function getRoleConfig(role: UserRole | null): RoleConfig | null {
  if (!role) return null
  return ROLES[role] || null
}
