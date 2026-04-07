'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  FileDown,
  AlertCircle,
  Wallet,
  PieChart,
  List,
  CalendarDays,
  Map,
  Truck,
} from 'lucide-react'
import { DateRangeSelector, type DateRange } from '@/features/finance/reports/components/DateRangeSelector'
import { OverviewTab } from '@/features/finance/reports/components/OverviewTab'
import { DisbursementTab } from '@/features/finance/reports/components/DisbursementTab'
import { IncomeTab } from '@/features/finance/reports/components/IncomeTab'
import { UnclosedToursTab } from '@/features/finance/reports/components/UnclosedToursTab'
import { UnpaidOrdersTab } from '@/features/finance/reports/components/UnpaidOrdersTab'
import { TourPnlTab } from '@/features/finance/reports/components/TourPnlTab'

export type DetailGranularity = 'item' | 'day' | 'tour' | 'supplier'

type TabValue = 'overview' | 'disbursement' | 'income' | 'unclosed' | 'unpaid' | 'pnl'

const NO_DATE_TABS: TabValue[] = ['unclosed', 'unpaid', 'pnl']
const GRANULARITY_TABS: TabValue[] = ['overview']

const GRANULARITY_OPTIONS: { value: DetailGranularity; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'item', label: '按筆', icon: List },
  { value: 'day', label: '按日', icon: CalendarDays },
  { value: 'tour', label: '按團', icon: Map },
  { value: 'supplier', label: '按供應商', icon: Truck },
]

function getDefaultRange(): DateRange {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  return { startDate, endDate }
}

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') as TabValue) || 'overview'

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab)
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange)
  const [detailGranularity, setDetailGranularity] = useState<DetailGranularity>('item')

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as TabValue
      setActiveTab(tab)
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      router.replace(url.pathname + url.search, { scroll: false })
    },
    [router]
  )

  const showDateSelector = !NO_DATE_TABS.includes(activeTab)
  const showGranularity = GRANULARITY_TABS.includes(activeTab)

  const tabs = useMemo(
    () => [
      { value: 'overview', label: '收支總覽', icon: BarChart3 },
      { value: 'disbursement', label: '請款報表', icon: FileDown },
      { value: 'income', label: '收款報表', icon: TrendingUp },
      { value: 'unclosed', label: '未結團', icon: AlertCircle },
      { value: 'unpaid', label: '未收款', icon: Wallet },
      { value: 'pnl', label: '損益表', icon: PieChart },
    ],
    []
  )

  return (
    <ContentPageLayout
      title="財務報表"
      icon={BarChart3}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      {/* 日期區間 + 顆粒度選擇器 */}
      {showDateSelector && (
        <div className="px-4 py-2.5 border-b border-border bg-morandi-background/30 flex items-center gap-3 flex-wrap">
          <DateRangeSelector onChange={setDateRange} />
          {showGranularity && (
            <>
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center bg-morandi-container rounded-lg p-0.5">
                {GRANULARITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDetailGranularity(opt.value)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      detailGranularity === opt.value
                        ? 'bg-white text-morandi-primary shadow-sm'
                        : 'text-morandi-secondary hover:text-morandi-primary'
                    }`}
                  >
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="overview" className="mt-0">
            <OverviewTab dateRange={dateRange} granularity={detailGranularity} />
          </TabsContent>
          <TabsContent value="disbursement" className="mt-0">
            <DisbursementTab dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="income" className="mt-0">
            <IncomeTab dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="unclosed" className="mt-0">
            <UnclosedToursTab />
          </TabsContent>
          <TabsContent value="unpaid" className="mt-0">
            <UnpaidOrdersTab />
          </TabsContent>
          <TabsContent value="pnl" className="mt-0">
            <TourPnlTab />
          </TabsContent>
        </Tabs>
      </div>
    </ContentPageLayout>
  )
}
