import { PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { PaymentRequestCategory, CompanyExpenseType } from '@/stores/types/finance.types'
import { useTranslations } from 'next-intl'

export interface RequestFormData {
  request_category: PaymentRequestCategory // 請款類別（團體/公司）
  tour_id: string // 團體請款使用
  order_id: string // 團體請款使用
  expense_type: CompanyExpenseType | '' // 公司請款使用
  request_date: string
  notes: string
  is_special_billing: boolean
  created_by?: string
  payment_method_id?: string // 付款方式（用於傳票）
}

export interface BatchRequestFormData {
  request_date: string
  notes: string
  is_special_billing: boolean
  created_by?: string
  payment_method_id?: string
}

export interface RequestItem {
  id: string
  custom_request_date: string // 請款日期（每項目獨立、對應 DB payment_request_items.custom_request_date）
  payment_method_id?: string // 付款方式（每項目獨立）
  category: PaymentRequestItem['category']
  supplier_id: string
  supplierName: string | null
  description: string
  unit_price: number
  quantity: number
  confirmation_item_id?: string | null // 關聯的確認單項目 ID
  is_employee?: boolean // 標記此項目對象是員工（存檔時 supplier_id 設空避免 FK 衝突）
  selected_id?: string // Combobox 顯示用的選中 ID（員工或供應商皆存）
  advanced_by?: string // 代墊員工 ID
  advanced_by_name?: string // 代墊員工姓名
  accounting_subject_id?: string | null // 會計科目 ID
  accounting_subject_name?: string | null // 會計科目名稱（顯示用）
}

export const statusLabels: Record<'pending' | 'confirmed' | 'billed', string> = {
  pending: t('requestType.statusPending'),
  confirmed: t('requestType.statusConfirmed'),
  billed: t('requestType.statusBilled'),
}

export const statusColors: Record<'pending' | 'confirmed' | 'billed', string> = {
  pending: 'bg-morandi-gold',
  confirmed: 'bg-status-info',
  billed: 'bg-morandi-green',
}

export const categoryOptions = [
  { value: t('requestType.catAccommodation'), label: t('requestType.catAccommodation') },
  { value: t('requestType.catTransportation'), label: t('requestType.catTransportation') },
  { value: t('requestType.catMeal'), label: t('requestType.catMeal') },
  { value: t('requestType.catTicket'), label: t('requestType.catTicket') },
  { value: t('requestType.catGuide'), label: t('requestType.catGuide') },
  { value: t('requestType.catInsurance'), label: t('requestType.catInsurance') },
  { value: t('requestType.catTourAdvance'), label: t('requestType.catTourAdvance') },
  { value: t('requestType.catTourReturn'), label: t('requestType.catTourReturn') },
  {
    value: t('requestType.catEmployeeAdvance'),
    label: t('requestType.catEmployeeAdvance'),
  },
  { value: 'ESIM', label: 'ESIM' },
  { value: t('requestType.catPeer'), label: t('requestType.catPeer') },
  { value: t('requestType.catOther'), label: t('requestType.catOther') },
] as const
