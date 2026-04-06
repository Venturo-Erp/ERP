'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useMemo, useState, useEffect } from 'react'
import { Tour } from '@/stores/types'
import { useOrdersSlim, useReceipts } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/format-currency'
import { useWorkspaceChannels } from '@/stores/workspace-store'
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMP_TOURS_LABELS } from '../constants/labels'
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
  const { items: allReceipts } = useReceipts()
  const { channels } = useWorkspaceChannels()

  // 收款金額計算
  const orderIds = useMemo(
    () => new Set((orders ?? []).filter(o => o.tour_id === tour.id).map(o => o.id)),
    [orders, tour.id]
  )
  const tourReceipts = useMemo(
    () =>
      (allReceipts ?? []).filter(
        r => !r.deleted_at && (r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id)))
      ),
    [allReceipts, tour.id, orderIds]
  )
  const confirmedIncome = useMemo(
    () =>
      tourReceipts
        .filter(r => r.status === '1')
        .reduce((sum, r) => sum + (Number(r.actual_amount) || Number(r.receipt_amount) || 0), 0),
    [tourReceipts]
  )
  const estimatedIncome = useMemo(
    () =>
      tourReceipts.reduce(
        (sum, r) => sum + (Number(r.actual_amount) || Number(r.receipt_amount) || 0),
        0
      ),
    [tourReceipts]
  )
  // 總支出 = 請款單項目的 local_cost 加總（不管核准狀態）
  // 注意：不用 tour.total_cost，那是報價預估值，不是實際支出
  const [totalExpense, setTotalExpense] = useState(0)
  useEffect(() => {
    if (!tour.id) return
    supabase
      .from('tour_request_items')
      .select('local_cost')
      .eq('tour_id', tour.id)
      .then(({ data }) => {
        const sum = (data || []).reduce((acc, item) => acc + (Number(item.local_cost) || 0), 0)
        setTotalExpense(sum)
      })
  }, [tour.id])
  const confirmedProfit = confirmedIncome - totalExpense
  const estimatedProfit = estimatedIncome - totalExpense


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
          title: '總收入（預估／實收）',
          value: `${formatCurrency(estimatedIncome)} / ${formatCurrency(confirmedIncome)}`,
          icon: TrendingUp,
          color: 'text-morandi-green',
        },
        {
          title: COMP_TOURS_LABELS.總支出,
          amount: totalExpense,
          icon: TrendingUp,
          color: 'text-morandi-red',
        },
        {
          title: '總利潤（預估／實收）',
          value: `${formatCurrency(estimatedProfit)} / ${formatCurrency(confirmedProfit)}`,
          icon: TrendingUp,
          color: confirmedProfit >= 0 ? 'text-morandi-green' : 'text-morandi-red',
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

      {/* 財務概況 — 與結案統一 */}
      <div className="px-5 py-3">
        <div className="flex items-stretch">
          <div className="flex-1 flex items-center gap-2.5 px-3">
            <TrendingUp size={16} className="text-morandi-green shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-morandi-secondary leading-tight">總收入（預估／實收）</p>
              <p className="text-sm font-semibold text-morandi-primary">
                {formatCurrency(estimatedIncome)} / {formatCurrency(confirmedIncome)}
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2.5 px-3">
            <TrendingDown size={16} className="text-morandi-red shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-morandi-secondary leading-tight">總支出</p>
              <p className="text-sm font-semibold text-morandi-primary">
                {formatCurrency(totalExpense)}
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2.5 px-3">
            <DollarSign size={16} className={`shrink-0 ${confirmedProfit >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`} />
            <div className="min-w-0">
              <p className="text-[11px] text-morandi-secondary leading-tight">總利潤（預估／實收）</p>
              <p className="text-sm font-semibold text-morandi-primary">
                {formatCurrency(estimatedProfit)} / {formatCurrency(confirmedProfit)}
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2.5 px-3">
            <FileText size={16} className="text-morandi-gold shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-morandi-secondary leading-tight">總訂單數</p>
              <p className="text-sm font-semibold text-morandi-primary">
                {orders.filter(o => o.tour_id === tour.id).length} 筆
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

