'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { Inbox, Clock, CheckCircle, AlertCircle, FolderOpen, Send } from 'lucide-react'
import useSWR from 'swr'
import type { Database } from '@/lib/supabase/types'

type TourRequest = Database['public']['Tables']['tour_requests']['Row']

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待處理', color: 'bg-morandi-gold/10 text-morandi-gold' },
  accepted: { label: '已接受', color: 'bg-morandi-green/10 text-morandi-green' },
  rejected: { label: '已拒絕', color: 'bg-morandi-red/10 text-morandi-red' },
  completed: { label: '已完成', color: 'bg-status-info/10 text-status-info' },
}

export default function LocalPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const workspaceId = user?.workspace_id

  // 讀取收到的委託（recipient_workspace_id = 當前 workspace）
  const { data: requests = [], isLoading } = useSWR<TourRequest[]>(
    workspaceId ? `local-requests-${workspaceId}` : null,
    async () => {
      if (!workspaceId) return []
      const { data, error } = await supabase
        .from('tour_requests')
        .select(
          'id, code, tour_id, workspace_id, request_type, status, supplier_name, supplier_id, supplier_contact, items, note, replied_at, accepted_at, confirmed_at, rejected_at, rejection_reason, package_status, recipient_workspace_id, target_workspace_id, assigned_employee_id, assigned_employee_name, created_at, updated_at'
        )
        .or(`recipient_workspace_id.eq.${workspaceId},target_workspace_id.eq.${workspaceId}`)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('[Local] 載入委託失敗:', error)
        return []
      }
      return (data ?? []) as TourRequest[]
    }
  )

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

  // 統計
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const acceptedCount = requests.filter(r => r.status === 'accepted').length

  return (
    <ContentPageLayout
      title="Local 委託管理"
      icon={Inbox}
      breadcrumb={[
        { label: '首頁', href: '/dashboard' },
        { label: 'Local', href: '/local' },
      ]}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="搜尋團號、旅行社..."
      tabs={[
        { value: 'all', label: `全部 (${requests.length})`, icon: Inbox },
        { value: 'pending', label: `待處理 (${pendingCount})`, icon: Clock },
        { value: 'accepted', label: `已接受 (${acceptedCount})`, icon: CheckCircle },
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
            <FolderOpen size={32} className="opacity-40" />
            <span>尚無委託</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredRequests.map(req => {
              const statusInfo = STATUS_MAP[req.status ?? 'pending'] ?? STATUS_MAP.pending
              return (
                <div
                  key={req.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-morandi-gold/5 cursor-pointer transition-colors"
                  onClick={() => router.push(`/local/requests?id=${req.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-morandi-primary truncate">
                        {req.code ?? '—'}
                      </span>
                      <span className="text-xs text-morandi-secondary truncate">
                        {req.supplier_name ?? '—'}
                      </span>
                    </div>
                    <div className="text-xs text-morandi-secondary mt-0.5">
                      {req.request_type}
                      {req.created_at &&
                        ` · ${new Date(req.created_at).toLocaleDateString('zh-TW')}`}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="shrink-0 border-t border-border px-4 py-3 flex gap-3">
        <button
          onClick={() => router.push('/local/requests')}
          className="flex items-center gap-1.5 text-xs text-morandi-gold hover:underline"
        >
          <Send size={14} />
          委託收件匣
        </button>
        <button
          onClick={() => router.push('/local/cases')}
          className="flex items-center gap-1.5 text-xs text-morandi-gold hover:underline"
        >
          <FolderOpen size={14} />
          案件列表
        </button>
      </div>
    </ContentPageLayout>
  )
}
