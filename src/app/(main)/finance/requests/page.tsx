'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
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
  const { can, loading: permLoading } = useCapabilities()
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
  const canTour = can(CAPABILITIES.FINANCE_READ_REQUESTS)
  const canCompany = can(CAPABILITIES.FINANCE_READ_REQUESTS_COMPANY)
  const canSalary = can(CAPABILITIES.FINANCE_READ_REQUESTS_SALARY)

  const visibleTabs = useMemo<TabConfig[]>(() => {
    const tabs: TabConfig[] = []
    // 至少有一個 capability 才顯示「全部」
    if (canTour || canCompany || canSalary) {
      tabs.push({ value: 'all', label: '全部' })
    }
    if (canTour) tabs.push({ value: 'tour', label: '團體請款' })
    if (canCompany) tabs.push({ value: 'company', label: '公司請款' })
    if (canSalary) tabs.push({ value: 'salary', label: '薪資' })
    return tabs
  }, [canTour, canCompany, canSalary])

  const { tableColumns, filteredAndSortedRequests, handleSort } = useRequestTable(payment_requests)

  // Tab filter + 排序：status (pending → confirmed → billed) 為主、同狀態內 |日期 - today| asc
  const filteredByTab = useMemo(() => {
    let list: typeof filteredAndSortedRequests
    if (activeTab === 'all') {
      list = filteredAndSortedRequests.filter(r => {
        if (canTour && isTour(r)) return true
        if (canCompany && isCompany(r)) return true
        if (canSalary && isSalary(r)) return true
        return false
      })
    } else if (activeTab === 'tour') list = filteredAndSortedRequests.filter(isTour)
    else if (activeTab === 'company') list = filteredAndSortedRequests.filter(isCompany)
    else if (activeTab === 'salary') list = filteredAndSortedRequests.filter(isSalary)
    else list = filteredAndSortedRequests

    const today = Date.now()
    const statusOrder: Record<string, number> = { pending: 0, confirmed: 1, billed: 2 }
    return [...list].sort((a, b) => {
      // 1. status 順序：待處理 > 已確認 > 已出帳
      const sa = statusOrder[a.status || 'pending'] ?? 99
      const sb = statusOrder[b.status || 'pending'] ?? 99
      if (sa !== sb) return sa - sb
      // 2. 同狀態內、|日期 - today| asc（越靠近今天越前）
      const da = a.request_date ? Math.abs(new Date(a.request_date).getTime() - today) : Infinity
      const db = b.request_date ? Math.abs(new Date(b.request_date).getTime() - today) : Infinity
      return da - db
    })
  }, [filteredAndSortedRequests, activeTab, canTour, canCompany, canSalary])

  // 點擊行打開詳細對話框
  const handleRowClick = (request: PaymentRequest) => {
    setSelectedRequest(request)
  }

  if (permLoading) return null  // ModuleGuard 已在外層顯示 loading
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
        primaryAction={{
          label: REQUESTS_PAGE_LABELS.ADD_9640,
          icon: Plus,
          onClick: () => setIsAddDialogOpen(true),
        }}
        statusTabs={visibleTabs.length > 1 ? visibleTabs : undefined}
        activeStatusTab={activeTab}
        onStatusTabChange={tab => setActiveTab(tab as TabValue)}
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
