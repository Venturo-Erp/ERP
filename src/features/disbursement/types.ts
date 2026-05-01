/**
 * Disbursement 模組型別定義
 */

import { DisbursementOrder, PaymentRequest } from '@/stores/types'

export type { DisbursementOrder, PaymentRequest }

type DisbursementTab = 'pending' | 'current' | 'all'

interface DisbursementPageState {
  activeTab: DisbursementTab
  selectedRequests: string[]
  selectedRequestsForNew: string[]
  searchTerm: string
  dialogSearchTerm: string
  isAddDialogOpen: boolean
}
