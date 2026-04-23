/**
 * RBAC 舊版型別定義
 *
 * ⚠️ 權限系統已遷移至 role_tab_permissions + module:tab 格式（workspace_roles 表）
 * 此檔案僅保留 UserRole type 作為向後相容、用於 employees.roles 欄位的型別標註
 * 不再用於權限判斷
 *
 * 2026-04-23 砍除 ROLES const + getRoleConfig（UI 顯示已不再依賴此處）
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
