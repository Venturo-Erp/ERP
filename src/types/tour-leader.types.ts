/**
 * 領隊資料類型定義
 * 用於記錄外部合作領隊的資訊（不需要登入系統）
 */

import type { BaseEntity } from './base.types'

// ============================================
// 領隊狀態
// ============================================

export type TourLeaderStatus = 'active' | 'inactive'

// ============================================
// 領隊基本資料
// ============================================

export interface TourLeader extends BaseEntity {
  code?: string | null // 領隊編號（如 TL001）

  // 基本資料
  name: string // 中文姓名
  english_name?: string | null // 英文暱稱
  photo?: string | null // 頭像 URL
  phone?: string | null // 電話（舊欄位，保留相容）
  domestic_phone?: string | null // 國內電話
  overseas_phone?: string | null // 國外電話
  email?: string | null
  address?: string | null

  // 證件資料
  national_id?: string | null // 身分證號
  passport_number?: string | null // 護照號碼
  passport_expiry?: string | null // 護照效期 (DATE)

  // 專業資料
  languages?: string[] | null // 語言能力
  specialties?: string[] | null // 專長地區/路線
  license_number?: string | null // 領隊證號碼

  // 管理欄位
  notes?: string | null // 備註
  status?: TourLeaderStatus // 狀態
  display_order?: number
}

// ============================================
// 表單型別
// ============================================

export interface TourLeaderFormData {
  name: string
  english_name: string
  photo: string
  phone: string
  domestic_phone: string
  overseas_phone: string
  email: string
  address: string
  national_id: string
  passport_number: string
  passport_expiry: string
  languages: string // 逗號分隔的字串，提交時轉為陣列
  specialties: string // 逗號分隔的字串，提交時轉為陣列
  license_number: string
  notes: string
  status: TourLeaderStatus
}

// ============================================
// CRUD 型別
// ============================================

export type CreateTourLeaderData = Omit<TourLeader, 'id' | 'created_at' | 'updated_at'>
export type UpdateTourLeaderData = Partial<CreateTourLeaderData>
