/**
 * 企業客戶型別定義
 */

export interface Company {
  id: string
  workspace_id: string

  // 基本資訊
  company_name: string
  tax_id: string | null // 統一編號
  phone: string | null
  email: string | null
  website: string | null

  // 發票資訊
  invoice_title: string | null // 發票抬頭
  invoice_address: string | null
  invoice_email: string | null

  // 付款資訊
  payment_terms: number // 付款期限（天）
  payment_method: 'transfer' | 'cash' | 'check' | 'credit_card'
  credit_limit: number // 信用額度

  // 銀行資訊
  bank_name: string | null
  bank_account: string | null
  bank_branch: string | null

  // 地址資訊
  registered_address: string | null // 登記地址
  mailing_address: string | null // 通訊地址

  // VIP 等級
  vip_level: number // 0: 普通, 1-5: VIP等級

  // 備註
  notes: string | null

  // 系統欄位
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface CompanyContact {
  id: string
  workspace_id: string
  company_id: string | null

  // 聯絡人資訊
  name: string
  english_name: string | null
  title: string | null // 職稱
  department: string | null // 部門
  phone: string | null
  mobile: string | null
  email: string | null
  line_id: string | null

  // 主要聯絡人標記
  is_primary: boolean
  is_active: boolean

  // 備註
  notes: string | null

  // 系統欄位
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// 建立/更新資料的輸入型別
export type CreateCompanyData = Omit<
  Company,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'is_active'
> & {
  payment_terms?: number
  payment_method?: 'transfer' | 'cash' | 'check' | 'credit_card'
  credit_limit?: number
  vip_level?: number
}

export type UpdateCompanyData = Partial<CreateCompanyData>

export type CreateCompanyContactData = Omit<
  CompanyContact,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'is_active'
> & {
  is_primary?: boolean
}

export type UpdateCompanyContactData = Partial<CreateCompanyContactData>

// 付款方式標籤
export const PAYMENT_METHOD_LABELS: Record<Company['payment_method'], string> = {
  transfer: '匯款',
  cash: '現金',
  check: '支票',
  credit_card: '信用卡',
}

// VIP 等級標籤
export const VIP_LEVEL_LABELS: Record<number, string> = {
  0: '普通客戶',
  1: 'VIP 1',
  2: 'VIP 2',
  3: 'VIP 3',
  4: 'VIP 4',
  5: 'VIP 5',
}

// 付款期限選項
export const PAYMENT_TERMS_OPTIONS = [
  { value: 0, label: '即付' },
  { value: 7, label: '7 天' },
  { value: 15, label: '15 天' },
  { value: 30, label: '30 天' },
  { value: 45, label: '45 天' },
  { value: 60, label: '60 天' },
  { value: 90, label: '90 天' },
]
