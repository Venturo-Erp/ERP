'use client'
/**
 * CustomerMatchDialog - 顧客匹配對話框
 * 當輸入姓名或身分證號時，自動搜尋現有顧客
 */

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Search, User, X } from 'lucide-react'
import type { Customer } from '@/types/customer.types'
import type { MatchType } from '../hooks/useCustomerMatch'
import { useTranslations } from 'next-intl'

interface CustomerMatchDialogProps {
  isOpen: boolean
  customers: Customer[]
  matchType: MatchType
  onClose: () => void
  onSelect: (customer: Customer) => void
}

export function CustomerMatchDialog({
  isOpen,
  customers,
  matchType,
  onClose,
  onSelect,
}: CustomerMatchDialogProps) {
  const t = useTranslations('orders')

  const matchTypeLabel =
    matchType === 'name' ? t('common.姓名') : t('common.身分證號')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent nested level={2} className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Search size={20} className="text-morandi-blue" />
            {`找到 ${customers.length} 位符合的顧客（依 ${matchTypeLabel}）`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-2">
            {customers.map(customer => (
              <div
                key={customer.id}
                className="border border-border rounded-lg p-4 hover:bg-morandi-container/20 transition-colors cursor-pointer"
                onClick={() => {
                  onSelect(customer)
                  onClose()
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-morandi-gold/10 flex items-center justify-center">
                    <User size={20} className="text-morandi-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-morandi-primary">{customer.name}</span>
                      {customer.verification_status === 'verified' && (
                        <span className="text-xs px-2 py-0.5 bg-status-success-bg text-status-success rounded">
                          {t('common.label499')}
                        </span>
                      )}
                      {customer.is_vip && (
                        <span className="text-xs px-2 py-0.5 bg-morandi-gold/20 text-morandi-gold rounded">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-morandi-muted">
                      {customer.passport_name && (
                        <div>
                          <span className="text-xs text-morandi-muted">
                            {t('common.label9672')}
                          </span>
                          {customer.passport_name}
                        </div>
                      )}
                      {customer.national_id && (
                        <div>
                          <span className="text-xs text-morandi-muted">
                            {t('common.label2866')}
                          </span>
                          {customer.national_id}
                        </div>
                      )}
                      {customer.passport_number && (
                        <div>
                          <span className="text-xs text-morandi-muted">
                            {t('common.label9593')}
                          </span>
                          {customer.passport_number}
                        </div>
                      )}
                      {customer.birth_date && (
                        <div>
                          <span className="text-xs text-morandi-muted">
                            {t('common.label94')}
                          </span>
                          {customer.birth_date}
                        </div>
                      )}
                      {customer.phone && (
                        <div>
                          <span className="text-xs text-morandi-muted">
                            {t('common.label9704')}
                          </span>
                          {customer.phone}
                        </div>
                      )}
                      {customer.gender && (
                        <div>
                          <span className="text-xs text-morandi-muted">
                            {t('common.label8424')}
                          </span>
                          {customer.gender === 'M'
                            ? t('common.男')
                            : customer.gender === 'F'
                              ? t('common.女')
                              : customer.gender}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end pt-4 border-t">
          <Button variant="outline" className="gap-1" onClick={onClose}>
            <X size={16} />
            {t('common.取消')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
