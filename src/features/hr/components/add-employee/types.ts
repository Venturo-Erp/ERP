import { type UserRole } from '@/lib/rbac-config'

export interface EmployeeFormData {
  english_name: string
  display_name: string
  chinese_name: string
  pinyin: string
  auth_email: string // 用於建立 Supabase Auth 帳號的 email
  defaultPassword: string
  workspace_id?: string // super_admin 可以選擇 workspace
  role_id?: string // 職務 ID（關聯 workspace_roles 表）
  roles: UserRole[] // 舊的硬編碼角色（保留向後相容）
  personal_info: {
    national_id: string
    birth_date: string
    phone: string[]
    email: string
    address: string
    emergency_contact: {
      name: string
      relationship: string
      phone: string
    }
  }
  job_info: {
    hire_date: string
  }
  salary_info: {
    base_salary: number
    allowances: { name: string; amount: number }[]
    salaryHistory: { date: string; amount: number; reason?: string }[]
  }
}

export interface CreatedEmployeeInfo {
  display_name: string
  employee_number: string
  password: string
  email: string
}

export interface AddEmployeeFormProps {
  onSubmit: () => void
  onCancel: () => void
}
