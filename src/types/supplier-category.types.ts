/**
 * 供應商類別型別定義
 */

import type { BaseEntity } from './base.types'

export interface SupplierCategory extends BaseEntity {
  name: string // 類別名稱
  icon?: string | null // emoji 或圖示
  color?: string | null // 顏色代碼
  display_order?: number // 顯示順序
  is_active?: boolean // 是否啟用
}

// CRUD 型別
export type CreateSupplierCategoryData = Omit<SupplierCategory, keyof BaseEntity>
export type UpdateSupplierCategoryData = Partial<CreateSupplierCategoryData>
