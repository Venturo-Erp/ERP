'use client'

import Link from 'next/link'
import { User, Bed, Bus, FileText, CheckCircle, Circle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARDS_LABELS } from './constants/labels'

interface MemberCardProps {
  member: {
    id: string
    chinese_name: string | null
    passport_name?: string | null
    passport_number?: string | null
    gender?: string | null
    checked_in?: boolean
    room_number?: string | null
    vehicle_name?: string | null
    seat_number?: number | null
  }
  tourCode?: string
  tourId?: string
  showActions?: boolean
  onCheckin?: () => void
  className?: string
}

export function MemberCard({
  member,
  tourCode,
  tourId,
  showActions = true,
  onCheckin,
  className,
}: MemberCardProps) {
  const genderIcon = member.gender === 'M' ? '♂' : member.gender === 'F' ? '♀' : ''
  const genderColor =
    member.gender === 'M' ? 'text-status-info' : member.gender === 'F' ? 'text-morandi-red' : ''

  return (
    <div
      className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}
    >
      {/* 主要內容 */}
      <Link href={`/m/members/${member.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          {/* 頭像 */}
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium',
              member.checked_in
                ? 'bg-morandi-green/10 text-morandi-green'
                : 'bg-morandi-container text-morandi-secondary'
            )}
          >
            {member.chinese_name?.[0] || <User size={20} />}
          </div>

          {/* 資訊 */}
          <div className="flex-1 min-w-0">
            {/* 姓名 + 性別 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-morandi-primary">
                {member.chinese_name || '未命名'}
              </span>
              {genderIcon && <span className={cn('text-sm', genderColor)}>{genderIcon}</span>}
              {member.checked_in && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-green/10 text-morandi-green">
                  {CARDS_LABELS.LABEL_3499}
                </span>
              )}
            </div>

            {/* 團號 */}
            {tourCode && <div className="text-sm text-morandi-secondary mb-2">{tourCode}</div>}

            {/* 分房分車資訊 */}
            <div className="flex items-center gap-4 text-sm text-morandi-secondary">
              {member.room_number && (
                <div className="flex items-center gap-1">
                  <Bed size={14} />
                  <span>{member.room_number}</span>
                </div>
              )}
              {member.vehicle_name && (
                <div className="flex items-center gap-1">
                  <Bus size={14} />
                  <span>
                    {member.vehicle_name}
                    {member.seat_number && ` #${member.seat_number}`}
                  </span>
                </div>
              )}
              {!member.room_number && !member.vehicle_name && (
                <span className="text-morandi-muted">{CARDS_LABELS.LABEL_3641}</span>
              )}
            </div>
          </div>

          {/* 箭頭 */}
          <ChevronRight size={20} className="text-morandi-secondary/50 mt-1" />
        </div>
      </Link>

      {/* 快速操作 */}
      {showActions && (
        <div className="flex border-t border-border">
          <Link
            href={`/m/members/${member.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-morandi-secondary
                       hover:bg-morandi-container/50 hover:text-morandi-primary transition-colors
                       border-r border-border"
          >
            <FileText size={16} />
            <span>{CARDS_LABELS.LABEL_6702}</span>
          </Link>
          <button
            onClick={e => {
              e.preventDefault()
              onCheckin?.()
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm transition-colors',
              member.checked_in
                ? 'text-morandi-green bg-morandi-green/10'
                : 'text-morandi-secondary hover:bg-morandi-container/50 hover:text-morandi-primary'
            )}
          >
            {member.checked_in ? (
              <>
                <CheckCircle size={16} />
                <span>{CARDS_LABELS.LABEL_3499}</span>
              </>
            ) : (
              <>
                <Circle size={16} />
                <span>{CARDS_LABELS.LABEL_204}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
