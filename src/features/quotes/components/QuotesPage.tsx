'use client'
/**
 * QuotesPage - 報價單管理（以團為主）
 * 顯示旅遊團列表，點擊開啟報價單管理懸浮視窗
 */

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import { Calculator, FileText, Calendar, MapPin, Users, LayoutList, Archive } from 'lucide-react'
import { DocumentVersionPicker } from '@/components/documents'
import { useToursSlim, useQuotes } from '@/data'
import type { Tour, Quote } from '@/stores/types'
import { cn } from '@/lib/utils'
import { formatDateTW } from '@/lib/utils/format-date'
import { CurrencyCell } from '@/components/table-cells'
import {
  LOCAL_PRICING_DIALOG_LABELS,
  QUOTES_PAGE_LABELS,
  QUOTE_CONFIRMATION_SECTION_LABELS,
} from '../constants/labels'

// 狀態篩選
const STATUS_TABS = [
  { value: 'all', label: QUOTES_PAGE_LABELS.依團顯示, icon: LayoutList },
  { value: 'standalone', label: QUOTES_PAGE_LABELS.獨立報價單, icon: Archive },
]

export const QuotesPage: React.FC = () => {
  const router = useRouter()
  const { items: tours, loading: toursLoading } = useToursSlim()
  const { items: quotes, loading: quotesLoading } = useQuotes()

  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)

  // 計算每個團的報價單數量
  const tourQuoteCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    quotes.forEach(quote => {
      if (quote.tour_id) {
        counts[quote.tour_id] = (counts[quote.tour_id] || 0) + 1
      }
    })
    return counts
  }, [quotes])

  // 獨立報價單（沒有關聯到任何團的報價單）
  const standaloneQuotes = useMemo(() => {
    let result = quotes.filter(quote => !quote.tour_id)

    // 搜尋篩選
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        quote =>
          quote.code?.toLowerCase().includes(term) ||
          quote.name?.toLowerCase().includes(term) ||
          quote.customer_name?.toLowerCase().includes(term)
      )
    }

    // 按建立時間排序（最新的在前）
    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })

    return result
  }, [quotes, searchTerm])

  // 篩選旅遊團（只顯示有報價單的團）
  const filteredTours = useMemo(() => {
    // 只顯示有報價單的團
    let result = tours.filter(tour => tour.id && (tourQuoteCounts[tour.id] || 0) > 0)

    // 搜尋篩選 — name / code / airport_code（不再用已廢棄的 tour.location）
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        tour =>
          tour.code?.toLowerCase().includes(term) ||
          tour.name?.toLowerCase().includes(term) ||
          tour.airport_code?.toLowerCase().includes(term)
      )
    }

    // 按出發日期排序（最近的在前）
    result.sort((a, b) => {
      const dateA = a.departure_date ? new Date(a.departure_date).getTime() : 0
      const dateB = b.departure_date ? new Date(b.departure_date).getTime() : 0
      return dateB - dateA
    })

    return result
  }, [tours, searchTerm, tourQuoteCounts])

  // 旅遊團表格欄位定義
  const tourColumns = [
    {
      key: 'code',
      label: QUOTES_PAGE_LABELS.團號,
      width: '140px',
      render: (_: unknown, row: Tour) => (
        <span className="font-mono text-sm text-morandi-gold font-medium">{row.code}</span>
      ),
    },
    {
      key: 'name',
      label: QUOTES_PAGE_LABELS.團名,
      render: (_: unknown, row: Tour) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-morandi-primary truncate">{row.name || '-'}</span>
        </div>
      ),
    },
    {
      key: 'location',
      label: QUOTES_PAGE_LABELS.目的地,
      width: '120px',
      render: (_: unknown, row: Tour) => (
        <div className="flex items-center gap-1 text-sm text-morandi-secondary">
          <MapPin size={14} />
          <span>{row.location || '-'}</span>
        </div>
      ),
    },
    {
      key: 'departure_date',
      label: QUOTES_PAGE_LABELS.出發日期,
      width: '120px',
      render: (_: unknown, row: Tour) => (
        <div className="flex items-center gap-1 text-sm text-morandi-secondary">
          <Calendar size={14} />
          <span>{formatDateTW(row.departure_date) || '-'}</span>
        </div>
      ),
    },
    {
      key: 'max_participants',
      label: LOCAL_PRICING_DIALOG_LABELS.人數,
      width: '80px',
      render: (_: unknown, row: Tour) => (
        <div className="flex items-center gap-1 text-sm text-morandi-secondary">
          <Users size={14} />
          <span>{row.max_participants || '-'}</span>
        </div>
      ),
    },
    {
      key: 'quote_count',
      label: QUOTES_PAGE_LABELS.報價單,
      width: '100px',
      render: (_: unknown, row: Tour) => {
        const count = tourQuoteCounts[row.id] || 0
        return (
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              count > 0
                ? 'bg-morandi-gold/10 text-morandi-gold'
                : 'bg-morandi-container/50 text-morandi-secondary'
            )}
          >
            <FileText size={12} />
            <span>{count} 份</span>
          </div>
        )
      },
    },
  ]

  // 獨立報價單表格欄位定義
  const standaloneColumns = [
    {
      key: 'code',
      label: QUOTES_PAGE_LABELS.編號,
      width: '120px',
      render: (_: unknown, row: Quote) => (
        <span className="font-mono text-sm text-morandi-gold font-medium">{row.code || '-'}</span>
      ),
    },
    {
      key: 'name',
      label: QUOTES_PAGE_LABELS.報價單名稱,
      render: (_: unknown, row: Quote) => (
        <span className="text-sm text-morandi-primary">{row.name || '-'}</span>
      ),
    },
    {
      key: 'customer_name',
      label: QUOTE_CONFIRMATION_SECTION_LABELS.客戶,
      width: '150px',
      render: (_: unknown, row: Quote) => (
        <span className="text-sm text-morandi-secondary">{row.customer_name || '-'}</span>
      ),
    },
    {
      key: 'group_size',
      label: QUOTES_PAGE_LABELS.人數,
      width: '80px',
      render: (_: unknown, row: Quote) => (
        <div className="flex items-center gap-1 text-sm text-morandi-secondary">
          <Users size={14} />
          <span>{row.group_size || 0}</span>
        </div>
      ),
    },
    {
      key: 'total_amount',
      label: QUOTES_PAGE_LABELS.金額,
      width: '140px',
      render: (_: unknown, row: Quote) => (
        <CurrencyCell
          amount={(row as Quote & { total_amount?: number }).total_amount || row.total_cost || 0}
        />
      ),
    },
    {
      key: 'created_at',
      label: QUOTES_PAGE_LABELS.建立日期,
      width: '120px',
      render: (_: unknown, row: Quote) => (
        <div className="flex items-center gap-1 text-sm text-morandi-secondary">
          <Calendar size={14} />
          <span>{formatDateTW(row.created_at) || '-'}</span>
        </div>
      ),
    },
  ]

  const loading = toursLoading || quotesLoading

  return (
    <ContentPageLayout
      title={QUOTES_PAGE_LABELS.報價單管理}
      icon={Calculator}
      breadcrumb={[
        { label: QUOTES_PAGE_LABELS.首頁, href: '/dashboard' },
        { label: QUOTES_PAGE_LABELS.報價單管理, href: '/quotes' },
      ]}
      tabs={STATUS_TABS}
      activeTab={statusFilter}
      onTabChange={setStatusFilter}
      showSearch
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={QUOTES_PAGE_LABELS.搜尋團號_團名}
      contentClassName="flex-1 overflow-hidden"
    >
      {statusFilter === 'standalone' ? (
        <EnhancedTable
          columns={standaloneColumns}
          data={standaloneQuotes as Quote[]}
          loading={loading}
          emptyMessage={QUOTES_PAGE_LABELS.尚無獨立報價單}
          onRowClick={row => {
            const quote = row as Quote & { quote_type?: string }
            // 根據報價單類型跳轉到不同頁面
            if (quote.quote_type === 'quick') {
              router.push(`/quotes/quick/${quote.id}`)
            } else {
              router.push(`/quotes/${quote.id}`)
            }
          }}
          rowClassName={() => 'cursor-pointer hover:bg-morandi-gold/5'}
        />
      ) : (
        <EnhancedTable
          columns={tourColumns}
          data={filteredTours as Tour[]}
          loading={loading}
          emptyMessage={QUOTES_PAGE_LABELS.尚無報價單資料}
          onRowClick={row => setSelectedTour(row as Tour)}
          rowClassName={() => 'cursor-pointer hover:bg-morandi-gold/5'}
        />
      )}

      {/* 報價單管理懸浮視窗（依團顯示） */}
      {selectedTour && (
        <DocumentVersionPicker
          isOpen={!!selectedTour}
          onClose={() => setSelectedTour(null)}
          tour={selectedTour}
        />
      )}
    </ContentPageLayout>
  )
}
