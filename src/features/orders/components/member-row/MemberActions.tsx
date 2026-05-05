'use client'
/**
 * MemberActions - 成員操作按鈕
 * 包含：警告、編輯、刪除、設為領隊、辦簽證按鈕
 */

import React, { useState } from 'react'
import { AlertTriangle, Pencil, Trash2, Crown, Plane } from 'lucide-react'
import type { OrderMember } from '../../types/order-member.types'
import { COMP_ORDERS_LABELS } from '../../constants/labels'
import { QuickVisaDialog } from '@/features/visas/components/QuickVisaDialog'
import { useWorkspaceFeatures } from '@/lib/permissions/hooks'

interface MemberActionsProps {
  member: OrderMember
  onEdit: (member: OrderMember, mode: 'verify' | 'edit') => void
  onDelete: (memberId: string) => void
  onSetAsLeader?: (memberId: string) => void
  /** 快速辦簽證需要的團與訂單資訊 */
  tourInfo?: { id: string; code: string; name?: string }
  orderInfo?: {
    id: string
    order_number: string
    contact_person?: string | null
    contact_phone?: string | null
  }
}

export function MemberActions({
  member,
  onEdit,
  onDelete,
  onSetAsLeader,
  tourInfo,
  orderInfo,
}: MemberActionsProps) {
  const isLeader = member.identity === COMP_ORDERS_LABELS.領隊_2
  const [visaOpen, setVisaOpen] = useState(false)
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const canOpenVisa = !!tourInfo && !!orderInfo && isFeatureEnabled('visas')

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
            className="inline-flex items-center gap-1 text-status-warning hover:text-morandi-gold hover:bg-morandi-gold/10 transition-colors px-1.5 py-1 rounded text-xs"
            title={COMP_ORDERS_LABELS.待驗證_點擊驗證}
          >
            <AlertTriangle size={14} />
            <span>待驗證</span>
          </button>
        )}
        {/* 設為/取消領隊按鈕 */}
        {onSetAsLeader && (
          <button
            onClick={e => {
              e.stopPropagation()
              onSetAsLeader(member.id)
            }}
            className={`inline-flex items-center gap-1 transition-colors px-1.5 py-1 rounded text-xs ${
              isLeader
                ? 'text-morandi-gold bg-morandi-gold/10 hover:bg-morandi-gold/20'
                : 'text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10'
            }`}
            title={isLeader ? '取消領隊' : COMP_ORDERS_LABELS.勾選設為領隊}
          >
            <Crown size={14} />
            <span>{isLeader ? '取消領隊' : '設為領隊'}</span>
          </button>
        )}
        {/* 辦簽證按鈕 */}
        {canOpenVisa && (
          <button
            onClick={e => {
              e.stopPropagation()
              setVisaOpen(true)
            }}
            className="inline-flex items-center gap-1 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 transition-colors px-1.5 py-1 rounded text-xs"
            title={COMP_ORDERS_LABELS.快速辦簽證}
          >
            <Plane size={14} />
            <span>{COMP_ORDERS_LABELS.辦簽證}</span>
          </button>
        )}
        {/* 編輯按鈕 */}
        <button
          onClick={e => {
            e.stopPropagation()
            onEdit(member, 'edit')
          }}
          className="inline-flex items-center gap-1 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 transition-colors px-1.5 py-1 rounded text-xs"
          title={COMP_ORDERS_LABELS.編輯成員}
        >
          <Pencil size={14} />
          <span>編輯</span>
        </button>
        {/* 刪除按鈕 */}
        <button
          onClick={e => {
            e.stopPropagation()
            onDelete(member.id)
          }}
          className="inline-flex items-center gap-1 text-morandi-secondary hover:text-morandi-red hover:bg-morandi-red/10 transition-colors px-1.5 py-1 rounded text-xs"
          title={COMP_ORDERS_LABELS.刪除成員}
        >
          <Trash2 size={14} />
          <span>刪除</span>
        </button>
      </div>

      {/* 快速辦簽證 Dialog */}
      {canOpenVisa && tourInfo && orderInfo && (
        <QuickVisaDialog
          open={visaOpen}
          onClose={() => setVisaOpen(false)}
          member={{
            id: member.id,
            name: (member as { name?: string }).name,
            chinese_name: (member as { chinese_name?: string | null }).chinese_name,
            english_name: (member as { english_name?: string | null }).english_name,
            customer_id: (member as { customer_id?: string | null }).customer_id,
          }}
          tour={tourInfo}
          order={orderInfo}
        />
      )}
    </td>
  )
}
