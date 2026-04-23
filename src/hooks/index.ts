/**
 * Hooks 統一匯出
 * 通用 Hooks 的統一入口
 *
 * 注意：業務邏輯 Hooks 已遷移至 features/ 目錄
 * - useTours → @/features/tours/hooks/useTours
 * - useOrders → @/features/orders/hooks/useOrders
 * - useCustomers → @/features/customers/hooks/useCustomers
 * - usePayments → @/features/payments/hooks/usePayments (deprecated)
 */

// 通用 Hooks
export { useEnterSubmit } from './useEnterSubmit'
export { useCrudOperations } from './useCrudOperations'
export { useDataFiltering } from './useDataFiltering'

// Dialog 生命週期管理 Hooks
export {
  useManagedDialogState,
  useSimpleDialogState,
  type UseManagedDialogStateOptions,
  type UseManagedDialogStateReturn,
} from './useManagedDialogState'

// 統一的 Dialog 狀態管理 Hooks (P2 優化)
export {
  useDialogState,
  useMultiDialogState,
  type UseDialogStateOptions,
  type UseDialogStateReturn,
} from './useDialogState'

// OCR 辨識 Hook
export { useOcrRecognition, type OcrParsedData } from './useOcrRecognition'

// 圖片編輯 - 請使用 '@/components/ui/image-editor' 的 ImageEditor 元件
// (舊的 useImageEditor hook 已於 2025-06-27 移除)

// 導航 Hooks
export {
  useBreadcrumb,
  getPageTitle,
  getParentPath,
  type BreadcrumbItem,
  type UseBreadcrumbOptions,
} from './useBreadcrumb'

// 航班搜尋 Hook
export { useFlightSearch } from './useFlightSearch'
