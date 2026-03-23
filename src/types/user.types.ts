// ============================
// 使用者相關型別定義
// ============================

// 正確的 User 型別（與 Employee 一致）
export interface User {
  id: string
  employee_number: string
  english_name: string
  display_name: string
  chinese_name: string // 中文姓名（本名）
  // 便捷屬性（向下相容）
  name?: string // display_name 的別名
  email?: string // personal_info.email 的便捷存取
  personal_info: {
    national_id: string
    birth_date: string
    phone: string | string[] // 支援單一電話或多個電話
    email: string
    address: string
    emergency_contact: {
      name: string
      relationship: string
      phone: string
    }
  }
  job_info: {
    position?: string
    supervisor?: string
    hire_date: string
    probation_end_date?: string
  }
  salary_info: {
    base_salary: number
    allowances: {
      type: string
      amount: number
    }[]
    salary_history: {
      effective_date: string
      base_salary: number
      reason: string
    }[]
  }
  permissions: string[]
  roles?: (
    | 'admin'
    | 'employee'
    | 'user'
    | 'tour_leader'
    | 'sales'
    | 'accountant'
    | 'assistant'
    | 'controller'
    | 'super_admin'
  )[] // 附加身份標籤（不影響權限），支援多重身份
  attendance: {
    leave_records: {
      id: string
      type: 'annual' | 'sick' | 'personal' | 'maternity' | 'other'
      start_date: string
      end_date: string
      days: number
      reason?: string
      status: 'pending' | 'approved' | 'rejected'
      approved_by?: string
    }[]
    overtime_records: {
      id: string
      date: string
      hours: number
      reason: string
      approved_by?: string
    }[]
  }
  contracts: {
    id: string
    type: 'employment' | 'probation' | 'renewal'
    start_date: string
    end_date?: string
    file_path?: string
    notes?: string
  }[]
  status: 'active' | 'probation' | 'leave' | 'terminated'
  employee_type?: 'human' | 'bot' // 員工類型：人類或機器人
  avatar?: string
  avatar_url?: string | null // 頭像 URL（DB 標準欄位）
  workspace_id?: string // 所屬工作空間 ID
  workspace_code?: string // 所屬工作空間代碼（TP, TC 等）- 登入時一併取得
  workspace_name?: string // 所屬工作空間名稱
  workspace_type?: 'travel_agency' | 'vehicle_supplier' | 'guide_supplier' | 'transportation' | 'dmc' // 工作空間類型
  selected_workspace_id?: string // Super Admin 選擇的工作空間 ID
  role_id?: string // 角色 ID（用於權限控制）
  role_name?: string // 角色名稱
  pinyin?: string | null // 拼音姓名
  hidden_menu_items?: string[] // 隱藏的選單項目 ID
  preferred_features?: string[] // 個人常用功能列表（用於個人化 Sidebar），例如: ["tours", "orders", "calendar"]

  // 認證相關
  password_hash?: string // 加密後的密碼
  last_password_change?: string // 最後修改密碼時間
  must_change_password?: boolean // 是否需要修改密碼（首次登入）
  failed_login_attempts?: number // 登入失敗次數
  last_failed_login?: string // 最後失敗登入時間

  created_at: string
  updated_at: string
}

// Employee 型別現在是 User 的別名
export type Employee = User
