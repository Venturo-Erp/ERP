'use client'
/**
 * MemberActions - 成員操作按鈕
 * 包含：警告、編輯、刪除、設為領隊、家人快速加入按鈕
 */

import React from 'react'
import { AlertTriangle, Pencil, Trash2, Crown, Users } from 'lucide-react'
import type { OrderMember } from '../../types/order-member.types'
import { COMP_ORDERS_LABELS } from '../../constants/labels'
import { useHasFamily } from '@/hooks/useCustomerFamily'

interface MemberActionsProps {
  member: OrderMember
  onEdit: (member: OrderMember, mode: 'verify' | 'edit') => void
  onDelete: (memberId: string) => void
  onSetAsLeader?: (memberId: string) => void
  onAddFamily?: (customerId: string) => void
}

export function MemberActions({
  member,
  onEdit,
  onDelete,
  onSetAsLeader,
  onAddFamily,
}: MemberActionsProps) {
  const isLeader = member.identity === COMP_ORDERS_LABELS.領隊_2
  const { hasFamily, memberCount, isLoading } = useHasFamily(member.customer_id)

  return (
    <td className="border border-morandi-gold/20 px-2 py-1 bg-card">
      <div className="flex items-center gap-1">
        {/* 警告按鈕（待驗證時顯示） */}
        {member.customer_verification_status === 'unverified' && (
          <button
            onClick={e => {
              e.stopPropagation()
              onEdit(member, 'verify')
            }}
            className="text-status-warning hover:text-morandi-gold hover:bg-morandi-gold/10 transition-colors p-1 rounded"
            title={COMP_ORDERS_LABELS.待驗證_點擊驗證}
          >
            <AlertTriangle size={14} />
          </button>
        )}
        {/* 家人快速加入按鈕 */}
        {hasFamily && onAddFamily && (
          <button
            onClick={e => {
              e.stopPropagation()
              onAddFamily(member.customer_id!)
            }}
            className="text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 transition-colors p-1 rounded relative"
            title={`加入家人 (${memberCount - 1} 人)`}
          >
            <Users size={14} />
            {memberCount > 1 && (
              <span className="absolute -top-1 -right-1 bg-morandi-gold text-white text-[8px] rounded-full w-3 h-3 flex items-center justify-center">
                {memberCount - 1}
              </span>
            )}
          </button>
        )}
        {/* 設為/取消領隊按鈕 */}
        {onSetAsLeader && (
          <button
            onClick={e => {
              e.stopPropagation()
              onSetAsLeader(member.id)
            }}
            className={`transition-colors p-1 rounded ${
              isLeader
                ? 'text-morandi-gold bg-morandi-gold/10 hover:bg-morandi-gold/20'
                : 'text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10'
            }`}
            title={isLeader ? '取消領隊' : COMP_ORDERS_LABELS.勾選設為領隊}
          >
            <Crown size={14} />
          </button>
        )}
        {/* 編輯按鈕 */}
        <button
          onClick={e => {
            e.stopPropagation()
            onEdit(member, 'edit')
          }}
          className="text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 transition-colors p-1 rounded"
          title={COMP_ORDERS_LABELS.編輯成員}
        >
          <Pencil size={14} />
        </button>
        {/* 刪除按鈕 */}
        <button
          onClick={e => {
            e.stopPropagation()
            onDelete(member.id)
          }}
          className="text-morandi-secondary hover:text-morandi-red hover:bg-morandi-red/10 transition-colors p-1 rounded"
          title={COMP_ORDERS_LABELS.刪除成員}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </td>
  )
}
