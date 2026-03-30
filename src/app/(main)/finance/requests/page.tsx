'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { usePayments } from '@/features/payments/hooks/usePayments'
import { Plus, Loader2, Plane, Building2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useRequestTable } from '@/features/finance/requests/hooks/useRequestTable'
import { PaymentRequest } from '@/stores/types'
import { REQUESTS_PAGE_LABELS } from '../constants/labels'
import { useAuthStore } from '@/stores'

// Dynamic imports for dialogs (reduce initial bundle)
const AddRequestDialog = dynamic(
  () =>
    import('@/features/finance/requests/components/AddRequestDialog').then(m => m.AddRequestDialog),
  { loading: () => null }
)
const RequestDetailDialog = dynamic(
  () =>
    import('@/features/finance/requests/components/RequestDetailDialog').then(
      m => m.RequestDetailDialog
    ),
  {
    loading: () => (
      <Dialog open>
        <DialogContent
          level={1}
          className="bg-transparent border-none shadow-none flex items-center justify-center"
        >
          <VisuallyHidden>
            <DialogTitle>{REQUESTS_PAGE_LABELS.LOADING}</DialogTitle>
          </VisuallyHidden>
          <Loader2 className="animate-spin text-white" size={32} />
        </DialogContent>
      </Dialog>
    ),
  }
)

export default function RequestsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { payment_requests, loading, loadPaymentRequests } = usePayments()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null)
  const [activeTab, setActiveTab] = useState<'tour' | 'company'>('tour')
  const { user } = useAuthStore()

  // 判斷是否為管理員/會計
  // 檢查 roles（舊系統）或 permissions（新系統 workspace_roles.is_admin → '*'）
  const isAccountant = 
    user?.roles?.includes('super_admin') || 
    user?.roles?.includes('admin') || 
    user?.roles?.includes('accountant') || 
    user?.roles?.includes('controller') ||
    user?.permissions?.includes('*') // 新系統：workspace_roles.is_admin = true
  
  // DEBUG: 幫助 William 檢查權限
  useEffect(() => {
    if (user) {
      console.log('🔍 DEBUG - 請款頁面權限檢查:', {
        roles: user.roles,
        permissions: user.permissions,
        isAccountant,
      })
    }
  }, [user, isAccountant])

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
      // 清除 URL 參數，避免重新開啟
      router.replace('/finance/requests')
    }
  }

  // 根據分頁篩選請款單
  const filteredByTab = useMemo(() => {
    if (activeTab === 'company') {
      // 公司支出：request_category = 'company'
      return payment_requests.filter(pr => pr.request_category === 'company')
    } else {
      // 團體請款：有 tour_id 或 request_category != 'company'
      return payment_requests.filter(pr => pr.request_category !== 'company')
    }
  }, [payment_requests, activeTab])

  const { tableColumns, filteredAndSortedRequests, handleSort, handleFilter } =
    useRequestTable(filteredByTab)

  // 點擊行打開詳細對話框
  const handleRowClick = (request: PaymentRequest) => {
    setSelectedRequest(request)
  }

  return (
    <>
      <ListPageLayout
        title={REQUESTS_PAGE_LABELS.MANAGE_3483}
        data={filteredAndSortedRequests}
        loading={loading}
        columns={tableColumns}
        searchable={false}
        onRowClick={handleRowClick}
        onSort={handleSort}
        headerActions={
          <div className="flex items-center gap-4">
            {/* 分頁切換 */}
            <div className="flex items-center bg-morandi-bg rounded-lg p-1">
              <button
                onClick={() => setActiveTab('tour')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'tour'
                    ? 'bg-white text-morandi-primary shadow-sm'
                    : 'text-morandi-secondary hover:text-morandi-primary'
                }`}
              >
                <Plane size={14} />
                團體請款
              </button>
              {isAccountant && (
                <button
                  onClick={() => setActiveTab('company')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'company'
                      ? 'bg-white text-morandi-primary shadow-sm'
                      : 'text-morandi-secondary hover:text-morandi-primary'
                  }`}
                >
                  <Building2 size={14} />
                  公司支出
                </button>
              )}
            </div>
            
            {/* 新增按鈕 */}
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
            >
              <Plus size={16} className="mr-2" />
              {REQUESTS_PAGE_LABELS.ADD_9640}
            </button>
          </div>
        }
      />

      <AddRequestDialog
        open={isAddDialogOpen}
        onOpenChange={handleAddDialogClose}
        defaultTourId={urlTourId || undefined}
        defaultOrderId={urlOrderId || undefined}
      />

      <RequestDetailDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={open => !open && setSelectedRequest(null)}
      />
    </>
  )
}
