/**
 * Quote 狀態定義與對照
 * 用於統一前端顯示與資料庫欄位
 */

import type { Quote } from '@/stores/types'

type QuoteStatus = Quote['status']

/**
 * 報價單狀態對照
 * 注意：此檔案與 status-config.ts 和 status-maps.ts 保持同步
 */
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: '草稿',
  proposed: '開團',
  revised: '修改中',
  待出發: '待出發',
  approved: '已核准',
  converted: '已轉單',
  rejected: '已拒絕',
}

// 報價單狀態顏色（與 status-config.ts 保持一致）
const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-morandi-secondary text-white',
  proposed: 'bg-morandi-gold text-white',
  revised: 'bg-status-info text-white',
  待出發: 'bg-status-info text-white',
  approved: 'bg-morandi-green text-white',
  converted: 'bg-morandi-primary text-white',
  rejected: 'bg-morandi-red text-white',
}

// 狀態篩選選項
const QUOTE_STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'proposed', label: '開團' },
  { value: 'revised', label: '修改中' },
  { value: '待出發', label: '待出發' },
  { value: 'approved', label: '已核准' },
  { value: 'converted', label: '已轉單' },
  { value: 'rejected', label: '已拒絕' },
  { value: 'billed', label: '已請款' },
]
