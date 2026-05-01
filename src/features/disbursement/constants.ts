import { DISBURSEMENT_LABELS } from './constants/labels'
/**
 * Disbursement 模組常數定義
 * 注意：與 status-config.ts 保持同步
 * 出納單狀態流程：pending（待確認）→ confirmed（已確認）→ paid（已付款）
 */

// 出納單狀態標籤
export const DISBURSEMENT_STATUS_LABELS = {
  pending: DISBURSEMENT_LABELS.待確認,
  confirmed: DISBURSEMENT_LABELS.已確認,
  paid: DISBURSEMENT_LABELS.已付款,
} as const

// 出納單狀態顏色
const DISBURSEMENT_STATUS_COLORS = {
  pending: 'bg-morandi-gold',
  confirmed: 'bg-morandi-green',
  paid: 'bg-morandi-primary',
} as const

// 出納單狀態設定（合併 label + color）
export const DISBURSEMENT_STATUS = {
  pending: { label: DISBURSEMENT_LABELS.待出帳, color: 'bg-morandi-gold' },
  confirmed: { label: DISBURSEMENT_LABELS.已確認, color: 'bg-status-info' },
  paid: { label: DISBURSEMENT_LABELS.已出帳, color: 'bg-morandi-green' },
} as const

// 請款單狀態標籤（Payment Request）
export const PAYMENT_REQUEST_STATUS_LABELS = {
  pending: DISBURSEMENT_LABELS.待處理,
  confirmed: DISBURSEMENT_LABELS.已確認,
  billed: DISBURSEMENT_LABELS.已出帳,
} as const

// 請款單狀態顏色（@deprecated - 改用 StatusBadge tone）
const PAYMENT_REQUEST_STATUS_COLORS = {
  pending: 'bg-morandi-gold',
  confirmed: 'bg-status-info',
  billed: 'bg-morandi-green',
} as const

// 請款單狀態 → StatusBadge tone（統一樣式）
export const PAYMENT_REQUEST_STATUS_TONES = {
  pending: 'pending',
  confirmed: 'info',
  billed: 'success',
} as const

// 出納單狀態 → StatusBadge tone
export const DISBURSEMENT_STATUS_TONES = {
  pending: 'pending',
  confirmed: 'info',
  paid: 'success',
} as const
