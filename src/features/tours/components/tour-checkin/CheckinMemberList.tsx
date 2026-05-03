'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'

// 報到用的簡化成員類型
export interface CheckinMember {
  id: string
  order_id: string
  chinese_name: string | null
  passport_name: string | null
  checked_in: boolean | null
  checked_in_at: string | null
}
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Search, RefreshCw, Check, X, UserCheck, UserX, Users, Loader2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMP_TOURS_LABELS, CHECKIN_MEMBER_LIST_LABELS } from '../../constants/labels'

type FilterType = 'all' | 'checked_in' | 'not_checked_in'

interface CheckinMemberListProps {
  members: CheckinMember[]
  loading: boolean
  onManualCheckin: (memberId: string) => Promise<void>
  onCancelCheckin: (memberId: string) => Promise<void>
  onRefresh: () => void
}

export function CheckinMemberList({
  members,
  loading,
  onManualCheckin,
  onCancelCheckin,
  onRefresh,
}: CheckinMemberListProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  // 篩選成員
  const filteredMembers = useMemo(() => {
    let result = members

    // 按報到狀態篩選
    if (filter === 'checked_in') {
      result = result.filter(m => m.checked_in)
    } else if (filter === 'not_checked_in') {
      result = result.filter(m => !m.checked_in)
    }

    // 搜尋
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        m =>
          m.chinese_name?.toLowerCase().includes(query) ||
          m.passport_name?.toLowerCase().includes(query)
      )
    }

    return result
  }, [members, filter, searchQuery])

  // 統計
  const stats = {
    total: members.length,
    checkedIn: members.filter(m => m.checked_in).length,
    notCheckedIn: members.filter(m => !m.checked_in).length,
  }

  // 處理報到
  const handleCheckin = async (memberId: string) => {
    setProcessingId(memberId)
    await onManualCheckin(memberId)
    setProcessingId(null)
  }

  // 處理取消報到
  const handleCancelCheckin = async (memberId: string) => {
    setProcessingId(memberId)
    await onCancelCheckin(memberId)
    setProcessingId(null)
  }

  // 格式化報到時間
  const formatCheckinTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* 標題列 */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-morandi-primary flex items-center gap-2">
          <Users size={16} />
          {CHECKIN_MEMBER_LIST_LABELS.報到名單}
        </h3>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="gap-1">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          {CHECKIN_MEMBER_LIST_LABELS.重新整理}
        </Button>
      </div>

      {/* 篩選列 */}
      <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-3">
        {/* 狀態篩選 */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              filter === 'all'
                ? 'bg-morandi-gold text-white'
                : 'bg-morandi-container/50 text-morandi-secondary hover:bg-morandi-container'
            )}
          >
            {CHECKIN_MEMBER_LIST_LABELS.全部(stats.total)}
          </button>
          <button
            onClick={() => setFilter('checked_in')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1',
              filter === 'checked_in'
                ? 'bg-morandi-green text-white'
                : 'bg-morandi-container/50 text-morandi-secondary hover:bg-morandi-container'
            )}
          >
            <UserCheck size={14} />
            {CHECKIN_MEMBER_LIST_LABELS.已報到_過濾器(stats.checkedIn)}
          </button>
          <button
            onClick={() => setFilter('not_checked_in')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1',
              filter === 'not_checked_in'
                ? 'bg-morandi-red text-white'
                : 'bg-morandi-container/50 text-morandi-secondary hover:bg-morandi-container'
            )}
          >
            <UserX size={14} />
            {CHECKIN_MEMBER_LIST_LABELS.未報到_過濾器(stats.notCheckedIn)}
          </button>
        </div>

        {/* 搜尋 */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-muted"
          />
          <Input
            placeholder={COMP_TOURS_LABELS.搜尋團員}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* 成員列表 */}
      <div className="divide-y divide-border max-h-[400px] overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-morandi-muted" size={24} />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-morandi-secondary">
            {searchQuery ? COMP_TOURS_LABELS.找不到符合的團員 : COMP_TOURS_LABELS.目前沒有團員}
          </div>
        ) : (
          filteredMembers.map(member => (
            <div
              key={member.id}
              className={cn(
                'px-4 py-3 flex items-center gap-4 transition-colors',
                member.checked_in ? 'bg-morandi-green/5' : 'hover:bg-morandi-container/30'
              )}
            >
              {/* 狀態圖標 */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  member.checked_in ? 'bg-morandi-green/20' : 'bg-morandi-container'
                )}
              >
                {member.checked_in ? (
                  <Check size={16} className="text-morandi-green" />
                ) : (
                  <X size={16} className="text-morandi-muted" />
                )}
              </div>

              {/* 成員資訊 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-morandi-primary truncate">
                    {member.chinese_name || member.passport_name || COMP_TOURS_LABELS.未知}
                  </span>
                  {member.checked_in && (
                    <StatusBadge
                      tone="success"
                      label={CHECKIN_MEMBER_LIST_LABELS.已報到_狀態標籤}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-morandi-secondary mt-0.5">
                  {member.passport_name && member.chinese_name && (
                    <span>{member.passport_name}</span>
                  )}
                  {member.checked_in && member.checked_in_at && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatCheckinTime(member.checked_in_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex-shrink-0">
                {member.checked_in ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelCheckin(member.id)}
                    disabled={processingId === member.id}
                    className="text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10 gap-1"
                  >
                    {processingId === member.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <X size={14} />
                    )}
                    {CHECKIN_MEMBER_LIST_LABELS.取消}
                  </Button>
                ) : (
                  <Button
                    variant="soft-gold"
                    size="sm"
                    onClick={() => handleCheckin(member.id)}
                    disabled={processingId === member.id}
                    className="gap-1"
                  >
                    {processingId === member.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    {CHECKIN_MEMBER_LIST_LABELS.報到}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
