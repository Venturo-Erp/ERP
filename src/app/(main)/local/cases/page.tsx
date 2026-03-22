'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { FolderOpen, Clock, CheckCircle, Inbox, Calendar, Package } from 'lucide-react'
import useSWR from 'swr'
import type { Database } from '@/lib/supabase/types'

type TourRequest = Database['public']['Tables']['tour_requests']['Row']

export default function LocalCasesPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id
  const [activeTab, setActiveTab] = useState('accepted')
  const [searchQuery, setSearchQuery] = useState('')

  // 只讀已接受的委託作為「案件」
  const { data: cases = [], isLoading } = useSWR<TourRequest[]>(
    workspaceId ? `local-cases-${workspaceId}` : null,
    async () => {
      if (!workspaceId) return []
      const { data, error } = await supabase
        .from('tour_requests')
        .select('*')
        .or(`recipient_workspace_id.eq.${workspaceId},target_workspace_id.eq.${workspaceId}`)
        .in('status', ['accepted', 'completed'])
        .order('service_date', { ascending: true })

      if (error) {
        logger.error('[Local Cases] 載入失敗:', error)
        return []
      }
      return (data ?? []) as TourRequest[]
    }
  )

  const filteredCases = useMemo(() => {
    let filtered = cases
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
  }, [cases, activeTab, searchQuery])

  const acceptedCount = cases.filter(r => r.status === 'accepted').length
  const completedCount = cases.filter(r => r.status === 'completed').length

  return (
    <ContentPageLayout
      title="案件列表"
      icon={FolderOpen}
      breadcrumb={[
        { label: '首頁', href: '/dashboard' },
        { label: 'Local', href: '/local' },
        { label: '案件列表', href: '/local/cases' },
      ]}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="搜尋案件..."
      tabs={[
        { value: 'accepted', label: `進行中 (${acceptedCount})`, icon: Clock },
        { value: 'completed', label: `已完成 (${completedCount})`, icon: CheckCircle },
        { value: 'all', label: `全部 (${cases.length})`, icon: FolderOpen },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-morandi-secondary">
            載入中...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-morandi-secondary gap-2">
            <Inbox size={32} className="opacity-40" />
            <span>尚無案件</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCases.map(c => {
              const isCompleted = c.status === 'completed'
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-morandi-gold/5 cursor-pointer transition-colors"
                  onClick={() => router.push(`/local/cases/${c.id}`)}
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isCompleted ? 'bg-morandi-green' : 'bg-amber-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-morandi-primary truncate">
                        {c.code ?? '—'}
                      </span>
                      <span className="text-xs text-morandi-secondary">
                        {c.supplier_name ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-morandi-secondary">
                      <span className="flex items-center gap-1">
                        <Package size={12} />
                        {c.request_type}
                      </span>
                      {c.created_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(c.created_at).toLocaleDateString('zh-TW')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isCompleted ? '已完成' : '進行中'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ContentPageLayout>
  )
}
