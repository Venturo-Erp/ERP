/**
 * form-classes — 統一的表單樣式常數
 *
 * 用途：讓所有手寫 form / button / error box 的 className 都走同一套變數，
 * 主題切換 (morandi / iron / airtable) 時才會全站同步變色。
 *
 * 使用原則：
 * - 優先用 shadcn `<Button>` / `<Input>` / `<Dialog>` 元件
 * - 只有在無法用 shadcn（例如公開頁 / PDF 列印 / email 樣板）時才 import 這些常數
 * - 禁止再寫 `bg-blue-600`, `focus:ring-amber-500`, `text-red-500` 這類 Tailwind 色碼
 */

import { cn } from '@/lib/utils'

// ============================================================
// Input — 一般文字輸入框
// ============================================================
export const INPUT_BASE =
  'w-full px-4 py-2.5 border border-border rounded-lg bg-card text-morandi-primary ' +
  'placeholder:text-morandi-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-morandi-gold focus:border-morandi-gold ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

// 小尺寸（表格 inline edit 用）
export const INPUT_SM =
  'w-full px-3 py-1.5 text-sm border border-border rounded-md bg-card text-morandi-primary ' +
  'placeholder:text-morandi-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-morandi-gold focus:border-morandi-gold'

// Textarea
export const TEXTAREA_BASE = INPUT_BASE + ' resize-none'

// ============================================================
// Button — 手寫按鈕使用（優先用 shadcn `<Button>`）
// ============================================================
// 主色 CTA
export const BUTTON_PRIMARY =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ' +
  'bg-morandi-gold text-white hover:bg-morandi-gold-hover ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

// 大尺寸（對外公開頁的主 CTA）
export const BUTTON_PRIMARY_LG =
  'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-base font-semibold ' +
  'bg-morandi-gold text-white hover:bg-morandi-gold-hover ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

// 次要按鈕（outline）
export const BUTTON_SECONDARY =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ' +
  'border border-border bg-card text-morandi-primary hover:bg-morandi-container/50 ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

// 危險按鈕
export const BUTTON_DANGER =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ' +
  'bg-morandi-red text-white hover:bg-morandi-red/90 ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

// 幽靈按鈕（只有文字）
export const BUTTON_GHOST =
  'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ' +
  'text-morandi-secondary hover:bg-morandi-container/50 hover:text-morandi-primary ' +
  'transition-colors'

// ============================================================
// Label — 表單欄位標籤
// ============================================================
export const LABEL_BASE = 'block text-sm font-medium text-morandi-primary mb-1.5'

// 必填星號 span
export const REQUIRED_MARK = 'text-morandi-red ml-0.5'

// ============================================================
// 狀態框（提示訊息、錯誤、成功）
// ============================================================
export const ALERT_SUCCESS =
  'rounded-lg border border-morandi-green/30 bg-morandi-green/10 ' +
  'px-4 py-3 text-sm text-morandi-green'

export const ALERT_ERROR =
  'rounded-lg border border-morandi-red/30 bg-morandi-red/10 ' +
  'px-4 py-3 text-sm text-morandi-red'

export const ALERT_WARNING =
  'rounded-lg border border-status-warning/30 bg-status-warning-bg ' +
  'px-4 py-3 text-sm text-status-warning'

export const ALERT_INFO =
  'rounded-lg border border-status-info/30 bg-status-info-bg ' +
  'px-4 py-3 text-sm text-status-info'

// ============================================================
// Card — 內容卡片
// ============================================================
export const CARD_BASE =
  'rounded-xl border border-border/60 bg-card shadow-sm'

// 大卡片（section container）
export const CARD_SECTION =
  'rounded-2xl border border-border/60 bg-card shadow-sm p-6'

// ============================================================
// Helper — 讓呼叫端可以 append 自訂 className
// ============================================================
export function mergeClass(...classes: (string | undefined | false | null)[]) {
  return cn(...classes)
}
