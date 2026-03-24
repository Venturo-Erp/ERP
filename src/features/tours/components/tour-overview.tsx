'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tour } from '@/stores/types'
import { useOrdersSlim } from '@/data'
import { useWorkspaceChannels } from '@/stores/workspace-store'
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrencyCell } from '@/components/table-cells'
import { COMP_TOURS_LABELS, TOUR_HEALTH_LABELS } from '../constants/labels'
import { useTourHealth } from '../hooks/useTourHealth'
import { TOUR_OVERVIEW } from '../constants'
import { useTourChannelOperations, TourStoreActions } from './TourChannelOperations'
import { logger } from '@/lib/utils/logger'

interface TourOverviewProps {
  tour: Tour
  orderFilter?: string // 選填：顯示特定訂單的總覽信息
  onEdit?: () => void // 選填：編輯基本資料的回調
  onManageQuote?: () => void // 選填：管理報價單的回調
  onManageItinerary?: () => void // 選填：管理行程表的回調
  onOpenContractDialog?: () => void // 選填：產出合約的回調
  onArchive?: () => void // 選填：封存的回調
}

export const TourOverview = React.memo(function TourOverview({
  tour,
  orderFilter,
  onEdit,
  onManageQuote,
  onManageItinerary,
  onOpenContractDialog,
  onArchive,
}: TourOverviewProps) {
  const router = useRouter()
  const { items: orders } = useOrdersSlim()
  const { channels } = useWorkspaceChannels()

  // 健康度資料
  const healthData = useTourHealth(tour.id)

  // 檢查該團是否已有頻道
  const existingChannel = channels.find((ch: { tour_id?: string | null }) => ch.tour_id === tour.id)

  // Stub actions for channel operations
  const noopActions: TourStoreActions = {
    fetchAll: async () => {
      /* noop */
    },
  }
  const { handleCreateChannel } = useTourChannelOperations({ actions: noopActions })

  const handleChannelClick = async () => {
    if (existingChannel) {
      router.push(`/workspace?channel=${existingChannel.id}`)
    } else {
      logger.log('🔵 [總覽快捷] 建立頻道:', tour.code)
      await handleCreateChannel(tour)
    }
  }

  // 如果有 orderFilter，取得該訂單的資料
  const order = orderFilter ? orders.find(o => o.id === orderFilter) : null

  // 根據是否為訂單視圖，顯示不同的卡片資料
  const overviewCards: Array<{
    title: string
    value?: string
    amount?: number
    icon: typeof DollarSign
    color: string
  }> = order
    ? [
        {
          title: COMP_TOURS_LABELS.訂單金額,
          amount: order.total_amount ?? 0,
          icon: DollarSign,
          color: 'text-morandi-gold',
        },
        {
          title: COMP_TOURS_LABELS.付款狀態,
          value: order.payment_status || '-',
          icon: order.payment_status === 'paid' ? CheckCircle : AlertCircle,
          color:
            order.payment_status === 'paid'
              ? 'text-morandi-green'
              : order.payment_status === 'partial'
                ? 'text-morandi-gold'
                : 'text-morandi-red',
        },
        {
          title: COMP_TOURS_LABELS.已付金額,
          amount: order.paid_amount ?? 0,
          icon: TrendingUp,
          color: 'text-morandi-green',
        },
        {
          title: COMP_TOURS_LABELS.未付金額,
          amount: order.remaining_amount ?? 0,
          icon: TrendingUp,
          color: 'text-morandi-red',
        },
        {
          title: COMP_TOURS_LABELS.訂單人數,
          value: `${order.member_count ?? 0} 人`,
          icon: Users,
          color: 'text-morandi-gold',
        },
        {
          title: COMP_TOURS_LABELS.聯絡人,
          value: order.contact_person || '-',
          icon: Users,
          color: 'text-morandi-primary',
        },
      ]
    : [
        {
          title: COMP_TOURS_LABELS.報價單價格,
          amount: tour.price ?? 0,
          icon: DollarSign,
          color: 'text-morandi-gold',
        },
        {
          title: COMP_TOURS_LABELS.合約狀態,
          value: tour.contract_status || COMP_TOURS_LABELS.未簽約,
          icon: tour.contract_status === 'signed' ? CheckCircle : AlertCircle,
          color: tour.contract_status === 'signed' ? 'text-morandi-green' : 'text-morandi-red',
        },
        {
          title: COMP_TOURS_LABELS.總收入,
          amount: tour.total_revenue ?? 0,
          icon: TrendingUp,
          color: 'text-morandi-green',
        },
        {
          title: COMP_TOURS_LABELS.總支出,
          amount: tour.total_cost ?? 0,
          icon: TrendingUp,
          color: 'text-morandi-red',
        },
        {
          title: COMP_TOURS_LABELS.淨利潤,
          amount: tour.profit ?? 0,
          icon: TrendingUp,
          color: (tour.profit ?? 0) >= 0 ? 'text-morandi-green' : 'text-morandi-red',
        },
        {
          title: COMP_TOURS_LABELS.總訂單數,
          value: `${orders.filter(o => o.tour_id === tour.id).length} 筆`,
          icon: FileText,
          color: 'text-morandi-gold',
        },
      ]

  const getStatusBadge = (status: string | undefined) => {
    const badges: Record<string, string> = {
      提案: 'bg-morandi-gold text-white',
      進行中: 'bg-morandi-green text-white',
      待結案: 'bg-morandi-gold text-white',
      結案: 'bg-morandi-container text-morandi-secondary',
      特殊團: 'bg-morandi-red text-white',
    }
    return badges[status || ''] || 'bg-morandi-container text-morandi-secondary'
  }

  // 健康度項目（移除需求單狀態，團員人數已在標題列顯示）
  const healthItems: Array<{ label: string; data: { status: 'good' | 'warning' | 'error'; message: string } }> = []

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* 標題列：基本資訊 + 狀態 */}
      <div className="px-5 py-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-lg font-semibold text-morandi-primary">{tour.code}</span>
            <div className="flex items-center gap-1.5 text-morandi-secondary">
              <MapPin size={14} />
              <span>{tour.location}</span>
            </div>
            <div className="flex items-center gap-1.5 text-morandi-secondary">
              <Calendar size={14} />
              <span>
                {tour.departure_date} ~ {tour.return_date}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-morandi-secondary">
              <Users size={14} />
              <span>{tour.current_participants ?? 0} 人</span>
            </div>
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                getStatusBadge(tour.status ?? '')
              )}
            >
              {tour.status}
            </span>
          </div>
        </div>
      </div>

      {/* 財務概況 — 橫排緊湊 */}
      <div className="px-5 py-3 border-b border-border/40">
        <div className="flex items-stretch">
          {overviewCards.map((card, index) => (
            <React.Fragment key={index}>
              <div className="flex-1 flex items-center gap-2.5 px-3">
                <div className={cn('shrink-0', card.color)}>
                  <card.icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-morandi-secondary leading-tight">{card.title}</p>
                  {card.amount !== undefined ? (
                    <CurrencyCell
                      amount={card.amount}
                      className="text-sm font-semibold text-morandi-primary"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-morandi-primary truncate">
                      {card.value}
                    </p>
                  )}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 團況健康度 — 兩欄緊湊 */}
      <div className="px-5 py-3">
        {healthData.isLoading ? (
          <div className="text-center py-2 text-sm text-morandi-secondary">
            {TOUR_HEALTH_LABELS.載入中}
          </div>
        ) : healthData.error ? (
          <div className="text-center py-2 text-sm text-morandi-red">{healthData.error}</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {healthItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm">{getHealthStatusEmoji(item.data.status)}</span>
                <span className="text-xs text-morandi-secondary">{item.label}</span>
                <span
                  className={cn(
                    'text-xs font-medium ml-auto',
                    getHealthStatusColor(item.data.status)
                  )}
                >
                  {item.data.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

// 健康度狀態顏色
function getHealthStatusColor(status: 'good' | 'warning' | 'error'): string {
  switch (status) {
    case 'good':
      return 'text-morandi-green'
    case 'warning':
      return 'text-morandi-gold'
    case 'error':
      return 'text-morandi-red'
    default:
      return 'text-morandi-secondary'
  }
}

// 健康度狀態 emoji
function getHealthStatusEmoji(status: 'good' | 'warning' | 'error'): string {
  switch (status) {
    case 'good':
      return '✅'
    case 'warning':
      return '⚠️'
    case 'error':
      return '🔴'
    default:
      return '⚠️'
  }
}
