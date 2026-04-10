'use client'
/**
 * QuickQuotePaymentInfo - 付款資訊區
 */

import React from 'react'
import { MORANDI_COLORS } from '@/lib/print'
import { PAYMENT_INFO_LABELS } from '@/constants/labels'
import { QUICK_QUOTE_LABELS } from './constants/labels'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'

export const QuickQuotePaymentInfo: React.FC = () => {
  const workspaceName = useAuthStore(state => state.user?.workspace_name) || ''
  const ws = useWorkspaceSettings()
  const fullName = ws.legal_name || workspaceName || ''
  const hasBankInfo = !!(ws.bank_name || ws.bank_branch || ws.bank_account)

  return (
    <div
      className="grid grid-cols-2 gap-6 pt-4 text-sm"
      style={{ borderTop: `1px solid ${MORANDI_COLORS.borderLight}` }}
    >
      <div>
        <h4 className="font-semibold mb-2" style={{ color: MORANDI_COLORS.brown }}>
          {QUICK_QUOTE_LABELS.LABEL_5832}
        </h4>
        <div className="space-y-1" style={{ color: MORANDI_COLORS.gray }}>
          {hasBankInfo ? (
            <>
              <div>
                {QUICK_QUOTE_LABELS.LABEL_8910_PREFIX}
                {ws.bank_account_name || fullName}
              </div>
              {ws.bank_name && (
                <div>
                  {PAYMENT_INFO_LABELS.銀行}
                  {ws.bank_name}
                </div>
              )}
              {ws.bank_branch && (
                <div>
                  {PAYMENT_INFO_LABELS.分行}
                  {ws.bank_branch}
                </div>
              )}
              {ws.bank_account && (
                <div>
                  {PAYMENT_INFO_LABELS.帳號}
                  {ws.bank_account}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: MORANDI_COLORS.lightGray, fontStyle: 'italic' }}>
              {PAYMENT_INFO_LABELS.未設定銀行資訊}
            </div>
          )}
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2" style={{ color: MORANDI_COLORS.brown }}>
          {QUICK_QUOTE_LABELS.LABEL_9304}
        </h4>
        <div className="space-y-1" style={{ color: MORANDI_COLORS.gray }}>
          <div>
            {QUICK_QUOTE_LABELS.LABEL_5024_PREFIX}
            {fullName}
          </div>
          <div className="font-semibold" style={{ color: 'var(--status-danger)' }}>
            {QUICK_QUOTE_LABELS.LABEL_2697}
          </div>
          <div className="text-xs mt-2" style={{ color: MORANDI_COLORS.lightGray }}>
            （請於出發日前付清餘額）
          </div>
        </div>
      </div>
    </div>
  )
}
