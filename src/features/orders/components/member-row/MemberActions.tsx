'use client'
/**
 * MemberActions - 成員操作按鈕
 * 包含：警告、編輯、刪除、設為領隊按鈕
 */

import React from 'react'
import { AlertTriangle, Pencil, Trash2, Crown } from 'lucide-react'
import type { OrderMember } from '../../types/order-member.types'
import { COMP_ORDERS_LABELS } from '../../constants/labels'

interface MemberActionsProps {
  member: OrderMember
  onEdit: (member: OrderMember, mode: 'verify' | 'edit') => void
  onDelete: (memberId: string) => void
  onSetAsLeader?: (memberId: string) => void
}

export function MemberActions({
  member,
  onEdit,
  onDelete,
  onSetAsLeader,
}: MemberActionsProps) {
  const isLeader = member.identity === COMP_ORDERS_LABELS.領隊_2

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
