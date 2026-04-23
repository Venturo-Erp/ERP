/**
 * 顧客管理頁面專用類型定義
 */

import type { Customer, UpdateCustomerData } from '@/types/customer.types'

// 新增顧客表單資料
export interface NewCustomerFormData {
  name: string
  email: string
  phone: string
  address: string
  passport_number: string
  passport_name: string
  passport_expiry: string
  national_id: string
  birth_date: string
}

// 驗證表單資料
export interface VerifyFormData extends Partial<UpdateCustomerData> {
  name?: string
  nickname?: string
  passport_name?: string
  passport_number?: string
  passport_expiry?: string
  national_id?: string
  birth_date?: string
  gender?: string
  dietary_restrictions?: string
}

// 圖片編輯狀態
export interface ImageEditorState {
  zoom: number
  position: { x: number; y: number }
  rotation: number
  flipH: boolean
  isCropMode: boolean
  cropRect: { x: number; y: number; width: number; height: number }
  croppedImageUrl: string | null
}

// 對話框 Props
export interface AddCustomerDialogProps {
  isOpen: boolean
  onClose: () => void
  onAddCustomer: (data: NewCustomerFormData) => Promise<void>
  customers: Customer[]
}

export interface CustomerVerifyDialogProps {
  isOpen: boolean
  customer: Customer | null
  formData: VerifyFormData
  isSaving: boolean
  onClose: () => void
  onFormDataChange: (data: VerifyFormData) => void
  onSave: () => Promise<void>
  onUpdateCustomer: (id: string, data: Partial<UpdateCustomerData>) => Promise<void>
}

// 初始狀態
export const INITIAL_NEW_CUSTOMER: NewCustomerFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  passport_number: '',
  passport_name: '',
  passport_expiry: '',
  national_id: '',
  birth_date: '',
}

export const INITIAL_IMAGE_EDITOR_STATE: ImageEditorState = {
  zoom: 1,
  position: { x: 0, y: 0 },
  rotation: 0,
  flipH: false,
  isCropMode: false,
  cropRect: { x: 0, y: 0, width: 0, height: 0 },
  croppedImageUrl: null,
}
