/**
 * 功能限制設定
 *
 * 只有 TP（角落台北）和 TC（角落台中）有完整功能
 * 其他公司有限制的功能
 */

// 擁有完整功能的公司代碼
const FULL_FEATURE_WORKSPACES = ['TP', 'TC', 'CORNER', 'CORNERTC']

/**
 * 檢查 workspace 是否擁有完整功能
 */
function hasFullFeatures(workspaceCode: string | undefined | null): boolean {
  if (!workspaceCode) return false
  return FULL_FEATURE_WORKSPACES.includes(workspaceCode.toUpperCase())
}

/**
 * 受限功能清單
 * - timebox: 箱型時間管理
 * - linkpay: LinkPay 付款
 * - accounting: 會計系統
 * - itinerary_editor: 行程編輯器（其他公司只有簡易列印）
 * - esim: eSIM 網卡管理
 */
export type RestrictedFeature =
  | 'timebox'
  | 'linkpay'
  | 'accounting'
  | 'itinerary_editor'
  | 'esim'

/**
 * 檢查特定功能是否可用
 */
export function isFeatureAvailable(
  feature: RestrictedFeature,
  workspaceCode: string | undefined | null
): boolean {
  // TP/TC 有完整功能
  if (hasFullFeatures(workspaceCode)) {
    return true
  }

  // 其他公司不可用的功能
  const restrictedFeatures: RestrictedFeature[] = [
    'timebox',
    'linkpay',
    'accounting',
    'itinerary_editor',
    'esim',
  ]

  return !restrictedFeatures.includes(feature)
}

/**
 * 可用的付款方式
 */
function getAvailablePaymentMethods(workspaceCode: string | undefined | null): string[] {
  const baseMethods = ['現金', '匯款', '刷卡', '支票']

  if (hasFullFeatures(workspaceCode)) {
    return [...baseMethods, 'LinkPay']
  }

  return baseMethods
}
