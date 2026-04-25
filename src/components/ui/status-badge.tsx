/**
 * StatusBadge - 全站統一的狀態 pill 樣式
 *
 * 為什麼：之前各 component 自己手刻 status badge className，導致：
 * - /finance/requests 的「待處理」用 bg-morandi-gold 純金色（立體感重、像按鈕）
 * - TourReceipts 的「待確認」用半透明灰（平面、像標籤）
 * - DisbursementColumns / RequestTable 各自 statusMap
 *
 * 統一規範（soft pill）：
 * - 半透明背景 + 同色字（不要 shadow、不要 gradient、不要 border）
 * - 統一 padding / font / rounded
 * - 顏色語意：tone 名稱表達狀態、不綁特定業務（pending/info/success 等）
 *
 * 用法：
 *   <StatusBadge tone="pending" label="待處理" />
 *   <StatusBadge tone="success" label="已確認" />
 */

import { cn } from '@/lib/utils'

export type StatusTone =
  | 'pending' // 待處理 / 待確認 — 中性灰、不搶眼
  | 'info' // 已確認 / 進行中 — 柔和藍
  | 'success' // 已出帳 / 已付 / 已完成 — 柔和綠
  | 'warning' // 警告 / 過期 — 柔和黃
  | 'danger' // 已取消 / 失敗 — 柔和紅
  | 'neutral' // 預設 / 未分類

const TONE_STYLES: Record<StatusTone, string> = {
  pending: 'bg-morandi-secondary/15 text-morandi-secondary',
  info: 'bg-status-info/15 text-status-info',
  success: 'bg-morandi-green/15 text-morandi-green',
  warning: 'bg-status-warning/15 text-status-warning',
  danger: 'bg-morandi-red/15 text-morandi-red',
  neutral: 'bg-morandi-container text-morandi-primary',
}

interface StatusBadgeProps {
  tone: StatusTone
  label: string
  className?: string
}

export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_STYLES[tone],
        className
      )}
    >
      {label}
    </span>
  )
}
