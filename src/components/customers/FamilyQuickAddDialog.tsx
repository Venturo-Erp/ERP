/**
 * 家庭快速加入對話框
 * 用於從團員名單快速加入家人
 */

'use client'

import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle2, AlertCircle } from 'lucide-react'
import { useCustomerFamily } from '@/hooks/useCustomerFamily'
import type { Customer } from '@/stores/types'
import { CUSTOMERS_LABELS } from './constants/labels'

interface FamilyQuickAddDialogProps {
  /** 觸發的客戶 ID */
  customerId: string
  /** 已在名單中的客戶 ID（不顯示） */
  existingCustomerIds: string[]
  /** 是否打開 */
  open: boolean
  /** 關閉回調 */
  onClose: () => void
  /** 加入成員回調 */
  onAddMembers: (customers: Customer[]) => void
}

export function FamilyQuickAddDialog({
  customerId,
  existingCustomerIds,
  open,
  onClose,
  onAddMembers,
}: FamilyQuickAddDialogProps) {
  const { data: family, isLoading } = useCustomerFamily(customerId)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 可加入的成員（排除已在名單的）
  const availableMembers = useMemo(() => {
    if (!family) return []
    return family.members.filter(
      (m: { customer: Customer | null }) =>
        m.customer && !existingCustomerIds.includes(m.customer.id)
    )
  }, [family, existingCustomerIds])

  // 已在名單的成員
  const existingMembers = useMemo(() => {
    if (!family) return []
    return family.members.filter(
      (m: { customer: Customer | null }) =>
        m.customer && existingCustomerIds.includes(m.customer.id)
    )
  }, [family, existingCustomerIds])

  // 切換選擇
  const toggleMember = (memberId: string) => {
    setSelectedIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    )
  }

  // 全選
  const selectAll = () => {
    setSelectedIds(availableMembers.map((m: { customer: Customer }) => m.customer.id))
  }

  // 清除選擇
  const clearSelection = () => {
    setSelectedIds([])
  }

  // 確認加入
  const handleConfirm = () => {
    const customersToAdd = availableMembers
      .filter(
        (m: { customer: Customer | null }) => m.customer && selectedIds.includes(m.customer.id)
      )
      .map((m: { customer: Customer }) => m.customer)

    onAddMembers(customersToAdd)
    setSelectedIds([])
    onClose()
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent level={1}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {CUSTOMERS_LABELS.LOADING_3991}
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            {CUSTOMERS_LABELS.LOADING_6991}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!family || availableMembers.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent level={1}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {CUSTOMERS_LABELS.NOT_FOUND_563}
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            {!family && '此客戶不屬於任何家庭群組'}
            {family && availableMembers.length === 0 && '所有家人都已在名單中'}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              {CUSTOMERS_LABELS.CLOSE}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {family.group.name} - 家庭成員
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 操作按鈕 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">可加入 {availableMembers.length} 人</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={selectedIds.length === availableMembers.length}
              >
                {CUSTOMERS_LABELS.LABEL_7782}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={selectedIds.length === 0}
              >
                {CUSTOMERS_LABELS.CLEAR}
              </Button>
            </div>
          </div>

          {/* 成員列表 */}
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {/* 可加入的成員 */}
              {availableMembers.map(
                (member: { id: string; customer: Customer; role: string | null }) => {
                  const customer = member.customer
                  const isSelected = selectedIds.includes(customer.id)
                  const missingInfo = !customer.passport_number || !customer.birth_date

                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(customer.id)}
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(customer.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{customer.name}</span>
                          {member.role === 'leader' && (
                            <Badge variant="secondary" className="text-xs">
                              {CUSTOMERS_LABELS.LABEL_6239}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                          {customer.passport_number && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{CUSTOMERS_LABELS.LABEL_9194}</span>
                              <span>{customer.passport_number}</span>
                            </div>
                          )}
                          {customer.birth_date && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{CUSTOMERS_LABELS.LABEL_3937}</span>
                              <span>{customer.birth_date}</span>
                            </div>
                          )}
                          {missingInfo && (
                            <div className="flex items-center gap-1 text-morandi-gold">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-xs">{CUSTOMERS_LABELS.LABEL_2476}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }
              )}

              {/* 已在名單的成員 */}
              {existingMembers.length > 0 && (
                <>
                  <div className="pt-4 pb-2 text-sm font-medium text-muted-foreground">
                    {CUSTOMERS_LABELS.LABEL_4017}
                  </div>
                  {existingMembers.map((member: { id: string; customer: Customer }) => {
                    const customer = member.customer
                    return (
                      <div
                        key={member.id}
                        className="flex items-start gap-3 rounded-lg border p-3 bg-muted/50 opacity-60"
                      >
                        <CheckCircle2 className="h-5 w-5 text-morandi-green mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {customer.passport_number && (
                              <div>
                                {CUSTOMERS_LABELS.LABEL_9194}
                                {customer.passport_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </ScrollArea>

          {/* 底部按鈕 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {CUSTOMERS_LABELS.CANCEL}
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
              加入已選 ({selectedIds.length} 人)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
