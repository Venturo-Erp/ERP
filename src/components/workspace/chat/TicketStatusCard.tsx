'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Plane,
  Users,
  Check,
  AlertTriangle,
  HelpCircle,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { parseLocalDate } from '@/lib/utils/format-date'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

// 類型定義
interface MemberStatus {
  id: string
  name: string | null
  status: 'ticketed' | 'needs_ticketing' | 'no_record' | 'self_arranged'
  pnr: string | null
  ticket_number: string | null
  deadline: string | null
}

interface OrderData {
  order_id: string
  order_code: string
  contact_person: string
  earliest_deadline: string | null
  members: MemberStatus[]
}

export interface TourStats {
  total: number
  ticketed: number
  needs_ticketing: number
  no_record: number
  self_arranged: number
}

export interface TourData {
  tour_id: string
  tour_code: string
  tour_name: string
  departure_date: string
  earliest_deadline: string | null
  stats: TourStats
  orders: OrderData[]
}

interface TicketStatusCardProps {
  tours: TourData[]
  summary: TourStats
  generatedAt?: string
}

// 格式化日期
function formatDateDisplay(dateStr: string | null, formatStr = 'MM/dd'): string {
  if (!dateStr) return '-'
  const date = parseLocalDate(dateStr)
  if (!date) return dateStr
  return format(date, formatStr, { locale: zhTW })
}

// 單一團卡片
function TourCard({ tour }: { tour: TourData }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { stats } = tour

  // 狀態顏色
  const getStatusColor = (status: MemberStatus['status']) => {
    switch (status) {
      case 'ticketed':
        return 'text-morandi-green'
      case 'needs_ticketing':
        return 'text-morandi-gold'
      case 'no_record':
        return 'text-morandi-red'
      case 'self_arranged':
        return 'text-morandi-secondary'
    }
  }

  const getStatusIcon = (status: MemberStatus['status']) => {
    switch (status) {
      case 'ticketed':
        return <Check size={12} />
      case 'needs_ticketing':
        return <AlertTriangle size={12} />
      case 'no_record':
        return <HelpCircle size={12} />
      case 'self_arranged':
        return <Plane size={12} />
    }
  }

  const getStatusLabel = (status: MemberStatus['status']) => {
    switch (status) {
      case 'ticketed':
        return COMP_WORKSPACE_LABELS.已開票
      case 'needs_ticketing':
        return COMP_WORKSPACE_LABELS.待開票
      case 'no_record':
        return COMP_WORKSPACE_LABELS.無紀錄
      case 'self_arranged':
        return COMP_WORKSPACE_LABELS.自理
    }
  }

  // 根據狀態分組成員
  const groupedMembers = {
    ticketed: [] as MemberStatus[],
    needs_ticketing: [] as MemberStatus[],
    no_record: [] as MemberStatus[],
    self_arranged: [] as MemberStatus[],
  }

  tour.orders.forEach(order => {
    order.members.forEach(member => {
      groupedMembers[member.status].push(member)
    })
  })

  return (
    <div className="border border-morandi-container rounded-lg overflow-hidden bg-card">
      {/* 卡片標題 */}
      <div className="px-3 py-2.5 bg-gradient-to-r from-morandi-container/40 to-morandi-container/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane size={16} className="text-morandi-gold" />
            <span className="font-semibold text-morandi-primary">{tour.tour_code}</span>
            <span className="text-sm text-morandi-secondary">{tour.tour_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-morandi-secondary">
            <Calendar size={12} />
            <span>
              {formatDateDisplay(tour.departure_date)}
              {COMP_WORKSPACE_LABELS.DEPARTURE_SUFFIX}
            </span>
          </div>
        </div>

        {/* 統計數據 */}
        <div className="flex items-center gap-3 mt-2 text-sm">
          <div className="flex items-center gap-1">
            <Users size={14} className="text-morandi-secondary" />
            <span className="text-morandi-primary font-medium">
              {stats.total}
              {COMP_WORKSPACE_LABELS.PERSON_SUFFIX}
            </span>
          </div>
          {stats.ticketed > 0 && (
            <div className="flex items-center gap-1 text-morandi-green">
              <Check size={14} />
              <span>{stats.ticketed}</span>
            </div>
          )}
          {stats.needs_ticketing > 0 && (
            <div className="flex items-center gap-1 text-morandi-gold">
              <AlertTriangle size={14} />
              <span>{stats.needs_ticketing}</span>
            </div>
          )}
          {stats.no_record > 0 && (
            <div className="flex items-center gap-1 text-morandi-red">
              <HelpCircle size={14} />
              <span>{stats.no_record}</span>
            </div>
          )}
          {tour.earliest_deadline && (
            <div className="flex items-center gap-1 text-morandi-secondary ml-auto">
              <span className="text-xs">DL:</span>
              <span className="font-medium text-morandi-primary">
                {formatDateDisplay(tour.earliest_deadline)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 展開/收合按鈕 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center justify-center gap-1 text-xs text-morandi-secondary hover:bg-morandi-container/10 transition-colors border-t border-morandi-container/50"
      >
        {isExpanded ? (
          <>
            <ChevronUp size={14} />
            <span>{COMP_WORKSPACE_LABELS.LABEL_5509}</span>
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            <span>{COMP_WORKSPACE_LABELS.LABEL_684}</span>
          </>
        )}
      </button>

      {/* 展開內容 */}
      {isExpanded && (
        <div className="px-3 py-2 border-t border-morandi-container/50 space-y-3">
          {/* 待開票 */}
          {groupedMembers.needs_ticketing.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-morandi-gold mb-1">
                <AlertTriangle size={12} />
                <span>
                  {COMP_WORKSPACE_LABELS.LABEL_8022}
                  {groupedMembers.needs_ticketing.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {groupedMembers.needs_ticketing.map(m => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-morandi-gold/10 text-morandi-gold rounded border border-morandi-gold/30"
                  >
                    {m.name || COMP_WORKSPACE_LABELS.未知}
                    {m.pnr && <span className="text-morandi-gold">({m.pnr})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 無紀錄 */}
          {groupedMembers.no_record.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-morandi-red mb-1">
                <HelpCircle size={12} />
                <span>
                  {COMP_WORKSPACE_LABELS.LABEL_2393}
                  {groupedMembers.no_record.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {groupedMembers.no_record.map(m => (
                  <span
                    key={m.id}
                    className="inline-flex items-center px-2 py-0.5 text-xs bg-morandi-red/10 text-morandi-red rounded border border-morandi-red/30"
                  >
                    {m.name || COMP_WORKSPACE_LABELS.未知}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 已開票 */}
          {groupedMembers.ticketed.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-morandi-green mb-1">
                <Check size={12} />
                <span>
                  {COMP_WORKSPACE_LABELS.LABEL_3751}
                  {groupedMembers.ticketed.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {groupedMembers.ticketed.map(m => (
                  <span
                    key={m.id}
                    className="inline-flex items-center px-2 py-0.5 text-xs bg-morandi-green/10 text-morandi-green rounded border border-morandi-green/30"
                  >
                    {m.name || COMP_WORKSPACE_LABELS.未知}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 機票自理 */}
          {groupedMembers.self_arranged.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-morandi-secondary mb-1">
                <Plane size={12} />
                <span>
                  {COMP_WORKSPACE_LABELS.LABEL_8616}
                  {groupedMembers.self_arranged.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {groupedMembers.self_arranged.map(m => (
                  <span
                    key={m.id}
                    className="inline-flex items-center px-2 py-0.5 text-xs bg-morandi-container text-morandi-secondary rounded border border-border/60"
                  >
                    {m.name || COMP_WORKSPACE_LABELS.未知}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 主組件
export function TicketStatusCard({ tours, summary, generatedAt }: TicketStatusCardProps) {
  if (!tours || tours.length === 0) {
    return (
      <div className="text-sm text-morandi-secondary">{COMP_WORKSPACE_LABELS.PROCESSING_3053}</div>
    )
  }

  return (
    <div className="space-y-2 max-w-md">
      {/* 標題 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">🎫</span>
        <span className="font-medium text-morandi-primary">{COMP_WORKSPACE_LABELS.LABEL_6681}</span>
        {generatedAt && (
          <span className="text-xs text-morandi-secondary">
            {formatDateDisplay(generatedAt, 'MM/dd HH:mm')}
          </span>
        )}
      </div>

      {/* 團卡片列表 */}
      <div className="space-y-2">
        {tours.map(tour => (
          <TourCard key={tour.tour_id} tour={tour} />
        ))}
      </div>

      {/* 總計 */}
      {tours.length > 1 && (
        <div className="flex items-center gap-3 text-xs text-morandi-secondary pt-1 border-t border-morandi-container/30">
          <span>
            {COMP_WORKSPACE_LABELS.LABEL_5332} {tours.length} 個團
          </span>
          {summary.needs_ticketing > 0 && (
            <span className="text-morandi-gold">
              {summary.needs_ticketing} {COMP_WORKSPACE_LABELS.待開票}
            </span>
          )}
          {summary.no_record > 0 && (
            <span className="text-morandi-red">
              {summary.no_record} {COMP_WORKSPACE_LABELS.無紀錄}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
