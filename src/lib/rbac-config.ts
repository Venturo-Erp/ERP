/**
 * RBAC (Role-Based Access Control) 配置
 *
 * 核心概念：
 * - Role (角色): 描述「你是誰」（職位）
 * - Permission (權限): 描述「你能做什麼」（功能）
 * - 一個員工只有一個主要角色，但可以有多個權限
 */

export type UserRole =
  | 'super_admin' // 超級管理員（跨 workspace）
  | 'admin' // 管理員（workspace 內）
  | 'tour_leader' // 領隊
  | 'sales' // 業務
  | 'accountant' // 會計
  | 'assistant' // 助理
  | 'controller' // 團控
  | 'staff' // 一般員工

export interface RoleConfig {
  id: UserRole
  label: string
  description: string
  color: string
  permissions: string[] // 該角色預設擁有的功能權限
  canManageWorkspace: boolean
  canCrossWorkspace: boolean
}

/**
 * 角色定義與預設權限
 */
export const ROLES: Record<UserRole, RoleConfig> = {
  super_admin: {
    id: 'super_admin',
    label: '超級管理員',
    description: '擁有所有權限，可跨 workspace 管理（僅 Corner 有）',
    color: 'text-morandi-red bg-morandi-red/10 border-morandi-red/20',
    permissions: ['*'], // 所有權限
    canManageWorkspace: true,
    canCrossWorkspace: true, // ✅ 可以跨 workspace
  },

  admin: {
    id: 'admin',
    label: '管理員',
    description: '擁有 workspace 內所有管理權限（所有租戶都有）',
    color: 'text-morandi-gold bg-morandi-gold/10 border-morandi-gold/20',
    permissions: ['*'], // ✅ 所有權限（功能全開）
    canManageWorkspace: true,
    canCrossWorkspace: false, // ❌ 不能跨 workspace
  },

  tour_leader: {
    id: 'tour_leader',
    label: '領隊',
    description: '可管理自己帶的旅遊團和相關訂單',
    color: 'text-morandi-primary bg-morandi-primary/10 border-morandi-primary/20',
    permissions: [
      'tours', // 查看旅遊團（限自己的）
      'orders', // 管理訂單（限自己的團）
      'customers', // 查看客戶資料
      'calendar', // 行事曆
      'workspace', // 工作空間
    ],
    canManageWorkspace: false,
    canCrossWorkspace: false,
  },

  sales: {
    id: 'sales',
    label: '業務',
    description: '可建立報價單、管理客戶和訂單',
    color: 'text-morandi-gold bg-morandi-gold/10 border-morandi-gold/20',
    permissions: [
      'calendar', // 行事曆（預設）
      'workspace', // 工作空間（預設）
      'todos', // 待辦事項（預設）
      'quotes', // 報價管理（預設）
      'itinerary', // 行程管理
      'tours', // 旅遊團管理（預設）
      'orders', // 訂單管理（預設）
      'customers', // 客戶管理（預設）
      'visas', // 簽證管理（預設）
      'accounting', // 記帳管理
      'payments', // 收款管理（預設）
      'requests', // 請款管理（預設）
      'settings', // 系統設定
      'confirmations', // 確認單管理
      'esims', // eSIM 管理
      'design', // 設計管理
    ],
    canManageWorkspace: false,
    canCrossWorkspace: false,
  },

  accountant: {
    id: 'accountant',
    label: '會計',
    description: '可管理財務、付款和會計相關功能',
    color: 'text-morandi-primary bg-morandi-primary/10 border-morandi-primary/20',
    permissions: [
      'calendar', // 行事曆（預設）
      'workspace', // 工作空間（預設）
      'todos', // 待辦事項
      'quotes', // 報價管理（預設）
      'tours', // 旅遊團管理（預設）
      'orders', // 訂單管理（預設）
      'customers', // 客戶管理（預設）
      'visas', // 簽證管理
      'accounting', // 記帳管理
      'payments', // 收款管理（預設）
      'requests', // 請款管理（預設）
      'disbursement', // 出納管理
      'finance_reports', // 財務報表（預設）
      'vouchers', // 會計傳票（預設）
      'database', // 資料管理
      'settings', // 系統設定
      'reports', // 報表管理
    ],
    canManageWorkspace: false,
    canCrossWorkspace: false,
  },

  assistant: {
    id: 'assistant',
    label: '助理',
    description: '可協助處理訂單、客戶和一般行政工作',
    color: 'text-morandi-secondary bg-morandi-secondary/10 border-morandi-secondary/20',
    permissions: [
      'orders', // 訂單管理
      'customers', // 客戶管理
      'tours', // 查看旅遊團
      'calendar', // 行事曆
      'workspace', // 工作空間
      'todos', // 待辦事項
    ],
    canManageWorkspace: false,
    canCrossWorkspace: false,
  },

  controller: {
    id: 'controller',
    label: '團控',
    description: '負責開團、管理旅遊團資訊',
    color: 'text-morandi-green bg-morandi-green/10 border-morandi-green/20',
    permissions: [
      'calendar', // 行事曆
      'workspace', // 工作空間
      'todos', // 待辦事項
      'tours', // 旅遊團管理（核心）
      'itinerary', // 行程管理
      'orders', // 查看訂單
      'customers', // 客戶管理
      'requests', // 需求單管理
      'confirmations', // 確認單管理
      'design', // 設計管理
    ],
    canManageWorkspace: false,
    canCrossWorkspace: false,
  },

  staff: {
    id: 'staff',
    label: '一般員工',
    description: '基本查看權限，可使用個人工作空間',
    color: 'text-morandi-secondary bg-muted border-border',
    permissions: [
      'calendar', // 行事曆
      'workspace', // 工作空間
      'todos', // 待辦事項
    ],
    canManageWorkspace: false,
    canCrossWorkspace: false,
  },
}
/**
 * 取得角色配置
 */
export function getRoleConfig(role: UserRole | null): RoleConfig | null {
  if (!role) return null
  return ROLES[role] || null
}

/**
 * 檢查使用者是否有特定權限
 */
export function hasPermission(
  userRole: UserRole | null,
  userPermissions: string[],
  requiredPermission: string
): boolean {
  if (!userRole) return false

  const roleConfig = getRoleConfig(userRole)
  if (!roleConfig) return false

  // super_admin 和 admin 有 '*' 萬用權限
  if (roleConfig.permissions.includes('*')) return true

  // 檢查角色預設權限
  if (roleConfig.permissions.includes(requiredPermission)) return true

  // 檢查使用者額外權限（可能被管理員單獨賦予）
  if (userPermissions.includes(requiredPermission)) return true

  return false
}

/**
 * 檢查是否可以管理 workspace
 */
export function canManageWorkspace(userRole: UserRole | null): boolean {
  if (!userRole) return false
  const roleConfig = getRoleConfig(userRole)
  return roleConfig?.canManageWorkspace || false
}

/**
 * 檢查是否可以跨 workspace
 */
export function canCrossWorkspace(userRole: UserRole | null): boolean {
  if (!userRole) return false
  const roleConfig = getRoleConfig(userRole)
  return roleConfig?.canCrossWorkspace || false
}

/**
 * 取得所有可用角色列表
 */
export function getAllRoles(): RoleConfig[] {
  return Object.values(ROLES)
}
