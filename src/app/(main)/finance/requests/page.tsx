'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTabPermissions } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'
import dynamic from 'next/dynamic'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { usePayments } from '@/features/payments/hooks/usePayments'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRequestTable } from '@/features/finance/requests/hooks/useRequestTable'
import { PaymentRequest } from '@/stores/types'
import { REQUESTS_PAGE_LABELS } from '../constants/labels'

// Dynamic imports for dialogs (reduce initial bundle)
const AddRequestDialog = dynamic(
  () =>
    import('@/features/finance/requests/components/AddRequestDialog').then(m => m.AddRequestDialog),
  { loading: () => null }
)

type TabValue = 'all' | 'tour' | 'company' | 'salary'

interface TabConfig {
  value: TabValue
  label: string
}

// 薪資判斷：request_type 含「薪資」/「salary」/「bonus」/「獎金」
function isSalary(r: PaymentRequest): boolean {
  const t = (r.request_type || '').toLowerCase()
  return t.includes('薪資') || t.includes('salary')
}

// 公司請款 = 沒綁團 + 不是薪資
function isCompany(r: PaymentRequest): boolean {
  return !r.tour_id && !isSalary(r)
}

// 團體請款 = 有綁團
function isTour(r: PaymentRequest): boolean {
  return !!r.tour_id && !isSalary(r)
}

export default function RequestsPage() {
  const { canRead, loading: permLoading } = useTabPermissions()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { payment_requests, loading, loadPaymentRequests } = usePayments()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  // 讀取 URL 參數（從快速請款按鈕傳入）
  const urlTourId = searchParams.get('tour_id')
  const urlOrderId = searchParams.get('order_id')

  // 載入資料（只執行一次）
  useEffect(() => {
    loadPaymentRequests()
  }, [])

  // 如果有 URL 參數，自動開啟新增對話框
  useEffect(() => {
    if (urlTourId) {
      setIsAddDialogOpen(true)
    }
  }, [urlTourId])

  // 當對話框關閉時，清除 URL 參數
  const handleAddDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open && urlTourId) {
      router.replace('/finance/requests')
    }
  }

  // 根據 capability 顯示 tab
  const canTour = canRead('finance', 'requests')
  const canCompany = canRead('finance', 'requests-company')
  const canSalary = canRead('finance', 'requests-salary')

  const visibleTabs = useMemo<TabConfig[]>(() => {
    const tabs: TabConfig[] = []
    // 至少有一個 capability 才顯示「全部」
    if (canTour || canCompany || canSalary) {
      tabs.push({ value: 'all', label: '全部' })
    }
    if (canTour) tabs.push({ value: 'tour', label: '🧳 團體請款' })
    if (canCompany) tabs.push({ value: 'company', label: '🏢 公司請款' })
    if (canSalary) tabs.push({ value: 'salary', label: '💰 薪資' })
    return tabs
  }, [canTour, canCompany, canSalary])

  const { tableColumns, filteredAndSortedRequests, handleSort } = useRequestTable(payment_requests)

  // Tab filter
  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') {
      // 「全部」= 自己有資格看的合集
      return filteredAndSortedRequests.filter(r => {
        if (canTour && isTour(r)) return true
        if (canCompany && isCompany(r)) return true
        if (canSalary && isSalary(r)) return true
        return false
      })
    }
    if (activeTab === 'tour') return filteredAndSortedRequests.filter(isTour)
    if (activeTab === 'company') return filteredAndSortedRequests.filter(isCompany)
    if (activeTab === 'salary') return filteredAndSortedRequests.filter(isSalary)
    return filteredAndSortedRequests
  }, [filteredAndSortedRequests, activeTab, canTour, canCompany, canSalary])

  // 點擊行打開詳細對話框
  const handleRowClick = (request: PaymentRequest) => {
    setSelectedRequest(request)
  }

  if (permLoading) return <ModuleLoading fullscreen />
  // 沒有任何 capability → 整頁擋
  if (!canTour && !canCompany && !canSalary) return <UnauthorizedPage />

  // 如果當前 tab 沒資格（例如沒人賦予 salary 但 URL 切到了），fallback 到第一個有資格的
  if (!visibleTabs.find(t => t.value === activeTab)) {
    const fallback = visibleTabs[0]?.value || 'all'
    if (fallback !== activeTab) {
      setActiveTab(fallback)
    }
  }

  return (
    <>
      <ListPageLayout
        title={REQUESTS_PAGE_LABELS.MANAGE_3483}
        data={filteredByTab}
        loading={loading}
        columns={tableColumns}
        searchable={false}
        onRowClick={handleRowClick}
        onSort={handleSort}
        headerActions={
          <Button variant="soft-gold" onClick={() => setIsAddDialogOpen(true)}>
            <Plus size={16} />
            {REQUESTS_PAGE_LABELS.ADD_9640}
          </Button>
        }
        beforeTable={
          visibleTabs.length > 1 ? (
            <div className="flex items-center gap-1 border-b border-border mb-4">
              {visibleTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                    activeTab === tab.value
                      ? 'text-morandi-gold border-morandi-gold'
                      : 'text-morandi-secondary border-transparent hover:text-morandi-primary hover:border-morandi-container'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <AddRequestDialog
        open={isAddDialogOpen || !!selectedRequest}
        onOpenChange={open => {
          if (!open) {
            setIsAddDialogOpen(false)
            setSelectedRequest(null)
            handleAddDialogClose(open)
          }
        }}
        defaultTourId={urlTourId || undefined}
        defaultOrderId={urlOrderId || undefined}
        editingRequest={selectedRequest}
      />
    </>
  )
}
