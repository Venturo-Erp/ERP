'use client'

import { useState, useMemo } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { alert as showAlert } from '@/lib/ui/alert-dialog'
import { Inbox, Clock, CheckCircle, Package, Calendar, Building2 } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import type { Database } from '@/lib/supabase/types'

type TourRequest = Database['public']['Tables']['tour_requests']['Row']

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: '待處理', color: 'bg-amber-100 text-amber-700' },
  accepted: { label: '已接受', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒絕', color: 'bg-red-100 text-red-700' },
  completed: { label: '已完成', color: 'bg-blue-100 text-blue-700' },
}

export default function LocalRequestsPage() {
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<TourRequest | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const swrKey = workspaceId ? `local-inbox-${workspaceId}` : null

  const { data: requests = [], isLoading } = useSWR<TourRequest[]>(swrKey, async () => {
    if (!workspaceId) return []
    const { data, error } = await supabase
      .from('tour_requests')
      .select('*')
      .or(`recipient_workspace_id.eq.${workspaceId},target_workspace_id.eq.${workspaceId}`)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[Local Inbox] 載入失敗:', error)
      return []
    }
    return (data ?? []) as TourRequest[]
  })

  const filteredRequests = useMemo(() => {
    let filtered = requests
    if (activeTab !== 'all') {
      filtered = filtered.filter(r => r.status === activeTab)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        r => r.code?.toLowerCase().includes(q) || r.supplier_name?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [requests, activeTab, searchQuery])

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const acceptedCount = requests.filter(r => r.status === 'accepted').length

  const handleAcceptRequest = async (request: TourRequest) => {
    try {
      const { error } = await supabase
        .from('tour_requests')
        .update({
          status: 'accepted',
          response_status: 'accepted',
        })
        .eq('id', request.id)

      if (error) throw error

      void showAlert('已接受委託', 'success')
      setIsDetailOpen(false)
      setSelectedRequest(null)
      void mutate(swrKey)
    } catch (error) {
      logger.error('[Local] 接受委託失敗:', error)
      void showAlert('接受委託失敗', 'error')
    }
  }

  const handleRejectRequest = async (request: TourRequest) => {
    try {
      const { error } = await supabase
        .from('tour_requests')
        .update({
          status: 'rejected',
          response_status: 'rejected',
        })
        .eq('id', request.id)

      if (error) throw error

      void showAlert('已拒絕委託', 'success')
      setIsDetailOpen(false)
      setSelectedRequest(null)
      void mutate(swrKey)
    } catch (error) {
      logger.error('[Local] 拒絕委託失敗:', error)
      void showAlert('拒絕委託失敗', 'error')
    }
  }

  const openDetail = (request: TourRequest) => {
    setSelectedRequest(request)
    setIsDetailOpen(true)
  }

  return (
    <ContentPageLayout
      title="委託收件匣"
      icon={Inbox}
      breadcrumb={[
        { label: '首頁', href: '/dashboard' },
        { label: 'Local', href: '/local' },
        { label: '委託收件匣', href: '/local/requests' },
      ]}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="搜尋團號、名稱..."
      tabs={[
        { value: 'pending', label: `待處理 (${pendingCount})`, icon: Clock },
        { value: 'accepted', label: `已接受 (${acceptedCount})`, icon: CheckCircle },
        { value: 'all', label: `全部 (${requests.length})`, icon: Inbox },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-morandi-secondary">
            載入中...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-morandi-secondary gap-2">
            <Inbox size={32} className="opacity-40" />
            <span>沒有{activeTab === 'pending' ? '待處理的' : ''}委託</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredRequests.map(req => {
              const badge = STATUS_BADGE[req.status ?? 'pending'] ?? STATUS_BADGE.pending
              return (
                <div
                  key={req.id}
                  className="px-4 py-3 hover:bg-morandi-gold/5 cursor-pointer transition-colors"
                  onClick={() => openDetail(req)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-morandi-primary">
                        {req.code ?? '—'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-xs text-morandi-secondary">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString('zh-TW') : ''}
                    </span>
                  </div>
                  <div className="text-sm text-morandi-primary">{req.supplier_name ?? '—'}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-morandi-secondary">
                    <span className="flex items-center gap-1">
                      <Package size={12} />
                      {req.request_type}
                    </span>
                    {req.sent_at && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(req.sent_at).toLocaleDateString('zh-TW')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 委託詳情 Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent level={1} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>委託詳情</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-morandi-secondary">編號</span>
                  <p className="font-medium">{selectedRequest.code ?? '—'}</p>
                </div>
                <div>
                  <span className="text-morandi-secondary">供應商</span>
                  <p className="font-medium">{selectedRequest.supplier_name ?? '—'}</p>
                </div>
                <div>
                  <span className="text-morandi-secondary">類別</span>
                  <p className="font-medium">{selectedRequest.request_type}</p>
                </div>
                <div>
                  <span className="text-morandi-secondary">建立日期</span>
                  <p className="font-medium">
                    {selectedRequest.created_at
                      ? new Date(selectedRequest.created_at).toLocaleDateString('zh-TW')
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-morandi-secondary">發送日期</span>
                  <p className="font-medium">
                    {selectedRequest.sent_at
                      ? new Date(selectedRequest.sent_at).toLocaleDateString('zh-TW')
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-morandi-secondary">發送方式</span>
                  <p className="font-medium">{selectedRequest.sent_via ?? '—'}</p>
                </div>
              </div>

              {selectedRequest.note && (
                <div className="text-sm">
                  <span className="text-morandi-secondary">備註</span>
                  <p className="mt-1 text-morandi-primary">{selectedRequest.note}</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleAcceptRequest(selectedRequest)}
                    className="flex-1 py-2 bg-morandi-green text-white rounded-md text-sm hover:opacity-90 transition-opacity"
                  >
                    接受委託
                  </button>
                  <button
                    onClick={() => handleRejectRequest(selectedRequest)}
                    className="flex-1 py-2 bg-morandi-red text-white rounded-md text-sm hover:opacity-90 transition-opacity"
                  >
                    拒絕
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
