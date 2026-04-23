import { WORKSPACES_LABELS } from './constants/labels'
/**
 * Workspace Management Types
 */

// 目前 ERP 只支援旅行社一種類型；未來擴充其他類型時、加在這個 union 即可。
export type WorkspaceType = 'travel_agency'

export interface WorkspaceWithDetails {
  id: string
  name: string
  code: string
  type: string | null
  is_active: boolean | null
  description: string | null
  created_at: string | null
  updated_at: string | null
  employee_number_prefix: string | null
  default_password: string | null
}

export interface CreateWorkspaceData {
  name: string
  code: string
  type: WorkspaceType
  // 第一個管理員資料
  admin_name: string
  admin_employee_number: string
  admin_password: string
}

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  travel_agency: WORKSPACES_LABELS.旅行社,
}
