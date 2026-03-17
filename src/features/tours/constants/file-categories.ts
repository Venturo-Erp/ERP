/**
 * 團檔案分類常數
 */

import { COMP_TOURS_LABELS } from './labels'

// 檔案分類類型（對應 DB enum）
export type FileCategory =
  | 'quote'
  | 'itinerary'
  | 'confirmation'
  | 'request'
  | 'passport'
  | 'visa'
  | 'ticket'
  | 'voucher'
  | 'insurance'
  | 'other'
  | 'contract'
  | 'invoice'
  | 'photo'
  | 'email_attachment'
  | 'cancellation'

export type DbType = 'quote' | 'quick_quote' | 'itinerary' | 'confirmation' | 'request'

export interface FolderConfig {
  id: string
  name: string
  icon: string
  dbType?: DbType
  category?: FileCategory
  description?: string
}

// 預設的團資料夾結構
export const FILE_FOLDERS: Readonly<FolderConfig[]> = [
  {
    id: 'quote',
    name: COMP_TOURS_LABELS.團體報價單,
    icon: '📋',
    dbType: 'quote',
    description: '正式報價單（給客戶）',
  },
  {
    id: 'quick_quote',
    name: COMP_TOURS_LABELS.快速報價,
    icon: '💰',
    dbType: 'quick_quote',
    description: '快速報價單（內部使用）',
  },
  {
    id: 'itinerary',
    name: COMP_TOURS_LABELS.行程表,
    icon: '🗺️',
    dbType: 'itinerary',
    description: '行程表（詳細行程）',
  },
  {
    id: 'confirmation',
    name: COMP_TOURS_LABELS.確認單,
    icon: '✅',
    dbType: 'confirmation',
    description: '團確單（供應商確認）',
  },
  {
    id: 'contract',
    name: COMP_TOURS_LABELS.合約,
    icon: '📝',
    category: 'contract',
    description: '合約文件',
  },
  {
    id: 'request',
    name: COMP_TOURS_LABELS.需求單,
    icon: '📨',
    dbType: 'request',
    description: '供應商需求單',
  },
  {
    id: 'passport',
    name: COMP_TOURS_LABELS.護照,
    icon: '🛂',
    category: 'passport',
    description: '團員護照掃描',
  },
  {
    id: 'visa',
    name: COMP_TOURS_LABELS.簽證,
    icon: '📄',
    category: 'visa',
    description: '簽證文件',
  },
  {
    id: 'ticket',
    name: COMP_TOURS_LABELS.機票,
    icon: '✈️',
    category: 'ticket',
    description: '機票確認單',
  },
  {
    id: 'voucher',
    name: COMP_TOURS_LABELS.住宿憑證,
    icon: '🏨',
    category: 'voucher',
    description: '飯店憑證',
  },
  {
    id: 'insurance',
    name: COMP_TOURS_LABELS.保險,
    icon: '🛡️',
    category: 'insurance',
    description: '保險單',
  },
  {
    id: 'other',
    name: COMP_TOURS_LABELS.其他,
    icon: '📁',
    category: 'other',
    description: '其他文件',
  },
] as const
