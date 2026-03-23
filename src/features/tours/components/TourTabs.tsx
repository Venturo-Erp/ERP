'use client'

/**
 * TourTabs - 團詳情頁籤（共用元件）
 *
 * 提供：
 * 1. TOUR_TABS - 頁籤定義（給 ResponsiveHeader 等使用）
 * 2. TourTabContent - 只渲染內容（不含頁籤列）
 * 3. TourTabs - 完整元件（含頁籤列，給詳細頁面用）
 */

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tour } from '@/stores/types'
import { COMP_TOURS_LABELS } from '../constants/labels'

// Loading placeholder
const TabLoading = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="animate-spin text-muted-foreground" size={24} />
  </div>
)

// 動態載入頁籤內容
const TourOverview = dynamic(
  () => import('@/features/tours/components/tour-overview').then(m => m.TourOverview),
  { loading: () => <TabLoading /> }
)

const TourOrders = dynamic(
  () => import('@/features/tours/components/tour-orders').then(m => m.TourOrders),
  { loading: () => <TabLoading /> }
)

const OrderMembersExpandable = dynamic(
  () =>
    import('@/features/orders/components/OrderMembersExpandable').then(
      m => m.OrderMembersExpandable
    ),
  { loading: () => <TabLoading /> }
)

const TourCheckin = dynamic(
  () => import('@/features/tours/components/tour-checkin').then(m => m.TourCheckin),
  { loading: () => <TabLoading /> }
)

const TourRequirementsTab = dynamic(
  () =>
    import('@/features/tours/components/tour-requirements-tab').then(m => m.TourRequirementsTab),
  { loading: () => <TabLoading /> }
)

const TourFilesManager = dynamic(
  () => import('@/features/tours/components/TourFilesManager').then(m => m.TourFilesManager),
  { loading: () => <TabLoading /> }
)

const TourPayments = dynamic(
  () => import('@/features/tours/components/tour-payments').then(m => m.TourPayments),
  { loading: () => <TabLoading /> }
)

const TourCosts = dynamic(
  () => import('@/features/tours/components/tour-costs').then(m => m.TourCosts),
  { loading: () => <TabLoading /> }
)

const TourQuoteTabV2 = dynamic(
  () => import('@/features/tours/components/tour-quote-tab-v2').then(m => m.TourQuoteTabV2),
  { loading: () => <TabLoading /> }
)

const TourItineraryTab = dynamic(
  () => import('@/features/tours/components/tour-itinerary-tab').then(m => m.TourItineraryTab),
  { loading: () => <TabLoading /> }
)

const TourClosingTab = dynamic(
  () => import('@/features/tours/components/tour-closing-tab').then(m => m.TourClosingTab),
  { loading: () => <TabLoading /> }
)

const TourContractTab = dynamic(
  () => import('@/features/tours/components/tour-contract-tab').then(m => m.TourContractTab),
  { loading: () => <TabLoading /> }
)

const ConfirmationSheet = dynamic(
  () =>
    import('@/features/confirmations/components/ConfirmationSheet').then(m => m.ConfirmationSheet),
  { loading: () => <TabLoading /> }
)

// ============================================================================
// 頁籤定義（共用）
// ============================================================================

export const TOUR_TABS = [
  { value: 'overview', label: COMP_TOURS_LABELS.總覽 },
  { value: 'orders', label: COMP_TOURS_LABELS.訂單 },
  { value: 'members', label: COMP_TOURS_LABELS.團員 },
  { value: 'itinerary', label: COMP_TOURS_LABELS.行程 },
  { value: 'quote', label: COMP_TOURS_LABELS.報價 },
  { value: 'requirements', label: COMP_TOURS_LABELS.需求 },
  { value: 'confirmation-sheet', label: COMP_TOURS_LABELS.團確單 },
  { value: 'contract', label: '合約' },
  { value: 'checkin', label: COMP_TOURS_LABELS.報到 },
  { value: 'files', label: COMP_TOURS_LABELS.檔案 },
  { value: 'closing', label: COMP_TOURS_LABELS.結案 },
] as const

export type TourTabValue = (typeof TOUR_TABS)[number]['value']

// ============================================================================
// TourTabContent - 只渲染內容（不含頁籤列）
// ============================================================================

interface TourTabContentProps {
  tour: Tour
  activeTab: string
  /** 額外 props 傳給 OrderMembersExpandable */
  workspaceId?: string
  forceShowPnr?: boolean
  /** PNR 配對 Dialog 控制 */
  showPnrMatchDialog?: boolean
  onPnrMatchDialogChange?: (show: boolean) => void
  onPnrMatchSuccess?: () => void
  /** 需求單回調 */
  onAddRequest?: () => void
  onOpenRequestDialog?: (data: {
    category: string
    supplierName: string
    items: { serviceDate: string | null; title: string; quantity: number; note?: string }[]
    startDate: string | null
  }) => void
}

export function TourTabContent({
  tour,
  activeTab,
  workspaceId,
  forceShowPnr,
  showPnrMatchDialog,
  onPnrMatchDialogChange,
  onPnrMatchSuccess,
  onAddRequest,
  onOpenRequestDialog,
}: TourTabContentProps) {
  switch (activeTab) {
    case 'members':
      return (
        <OrderMembersExpandable
          key={`members-${tour.id}`}  // 強制重新掛載
          tourId={tour.id}
          workspaceId={workspaceId || ''}
          mode="tour"
          forceShowPnr={forceShowPnr}
          tour={tour}
          showPnrMatchDialog={showPnrMatchDialog}
          onPnrMatchDialogChange={onPnrMatchDialogChange}
          onPnrMatchSuccess={onPnrMatchSuccess}
        />
      )
    case 'orders':
      return <TourOrders tour={tour} />
    case 'confirmation-sheet':
      return <ConfirmationSheet tourId={tour.id} />
    case 'checkin':
      return <TourCheckin tour={tour} />
    case 'requirements':
      return (
        <TourRequirementsTab
          key={`requirements-${tour.id}`}  // 強制重新掛載
          tourId={tour.id}
          quoteId={tour.quote_id}
          tour={tour}
          onOpenRequestDialog={onOpenRequestDialog}
        />
      )
    case 'quote':
      return <TourQuoteTabV2 tour={tour} />
    case 'itinerary':
      return <TourItineraryTab tour={tour} />
    case 'files':
      return <TourFilesManager tourId={tour.id} tourCode={tour.code || ''} />
    case 'overview':
      return (
        <div className="space-y-6">
          <TourOverview tour={tour} />
          <TourPayments tour={tour} showSummary={false} />
          <TourCosts tour={tour} showSummary={false} />
        </div>
      )
    case 'closing':
      return <TourClosingTab tour={tour} />
    case 'contract':
      return <TourContractTab tour={tour} />
    default:
      return <TourOverview tour={tour} />
  }
}

// ============================================================================
// TourTabs - 完整元件（含頁籤列，給詳細頁面用）
// ============================================================================

interface TourTabsProps {
  tour: Tour
  defaultTab?: TourTabValue
  onTabChange?: (tab: TourTabValue) => void
  hiddenTabs?: TourTabValue[]
  onAddRequest?: () => void
}

export function TourTabs({
  tour,
  defaultTab = 'members',
  onTabChange,
  hiddenTabs = [],
  onAddRequest,
}: TourTabsProps) {
  const [activeTab, setActiveTab] = useState<TourTabValue>(defaultTab)

  const handleTabChange = useCallback(
    (tab: TourTabValue) => {
      setActiveTab(tab)
      onTabChange?.(tab)
    },
    [onTabChange]
  )

  const visibleTabs = TOUR_TABS.filter(tab => !hiddenTabs.includes(tab.value))

  return (
    <div className="flex flex-col h-full">
      {/* 頁籤列 */}
      <div className="flex border-b bg-muted/30 overflow-x-auto px-4">
        {visibleTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 內容區 */}
      <div className="flex-1 overflow-auto p-4">
        <TourTabContent tour={tour} activeTab={activeTab} onAddRequest={onAddRequest} />
      </div>
    </div>
  )
}
