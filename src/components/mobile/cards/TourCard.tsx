'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { MapPin, Users, Calendar, Plane, ChevronRight, Bed, Bus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateCompact } from '@/lib/utils/format-date'
import { CARDS_LABELS } from './constants/labels'

interface TourCardProps {
  tour: {
    id: string
    code: string
    destination: string
    departure_date: string | null
    return_date?: string | null
    total_people?: number
    status?: string
    duration_nights?: number
  }
  showActions?: boolean
  children?: ReactNode
  className?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  開團: { label: '開團', color: 'text-morandi-gold', bg: 'bg-morandi-gold/10' },
  待出發: { label: '待出發', color: 'text-morandi-green', bg: 'bg-morandi-green/10' },
  已結團: { label: '已結團', color: 'text-morandi-secondary', bg: 'bg-morandi-container' },
  取消: { label: '取消', color: 'text-morandi-red', bg: 'bg-morandi-red/10' },
}

export function TourCard({ tour, showActions = true, children, className }: TourCardProps) {
  const status = STATUS_CONFIG[tour.status || '開團'] || STATUS_CONFIG['開團']

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const date = new Date(dateStr)
    date.setHours(0, 0, 0, 0)
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const daysUntil = getDaysUntil(tour.departure_date)

  return (
    <div
      className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}
    >
      {/* 主要內容 */}
      <Link href={`/m/tours/${tour.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          {/* 左側：團資訊 */}
          <div className="flex-1 min-w-0">
            {/* 團號 + 狀態 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-morandi-primary">{tour.code}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', status.bg, status.color)}>
                {status.label}
              </span>
            </div>

            {/* 目的地 */}
            <div className="flex items-center gap-1.5 text-morandi-secondary mb-2">
              <MapPin size={14} />
              <span className="text-sm">
                {tour.destination}
                {tour.duration_nights && ` ${tour.duration_nights}晚`}
              </span>
            </div>

            {/* 日期 + 人數 */}
            <div className="flex items-center gap-4 text-sm text-morandi-secondary">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>
                  {formatDateCompact(tour.departure_date)}
                  {tour.return_date && ` - ${formatDateCompact(tour.return_date)}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{tour.total_people || 0}人</span>
              </div>
            </div>
          </div>

          {/* 右側：倒數 + 箭頭 */}
          <div className="flex flex-col items-end">
            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
              <div className="mb-2">
                {daysUntil === 0 ? (
                  <span className="text-xs font-bold text-white bg-morandi-green/100 px-2 py-1 rounded-full">
                    {CARDS_LABELS.LABEL_5500}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-status-warning bg-status-warning/10 px-2 py-1 rounded-full">
                    {daysUntil}天後
                  </span>
                )}
              </div>
            )}
            <ChevronRight size={20} className="text-morandi-secondary/50" />
          </div>
        </div>
      </Link>

      {/* 快速操作按鈕 */}
      {showActions && (
        <div className="flex border-t border-border">
          <Link
            href={`/m/tours/${tour.id}/rooms`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-morandi-secondary
                       hover:bg-morandi-container/50 hover:text-morandi-primary transition-colors
                       border-r border-border"
          >
            <Bed size={16} />
            <span>{CARDS_LABELS.LABEL_9712}</span>
          </Link>
          <Link
            href={`/m/tours/${tour.id}/vehicles`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-morandi-secondary
                       hover:bg-morandi-container/50 hover:text-morandi-primary transition-colors
                       border-r border-border"
          >
            <Bus size={16} />
            <span>{CARDS_LABELS.LABEL_3590}</span>
          </Link>
          <Link
            href={`/m/tours/${tour.id}/members`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-morandi-secondary
                       hover:bg-morandi-container/50 hover:text-morandi-primary transition-colors"
          >
            <Users size={16} />
            <span>{CARDS_LABELS.LABEL_8172}</span>
          </Link>
        </div>
      )}

      {/* 自訂內容 */}
      {children}
    </div>
  )
}
