'use client'

import { logger } from '@/lib/utils/logger'
import React, { useEffect, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useEmployeesSlim } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { Receipt, FileText, Plane, UserPlus } from 'lucide-react'
import { QuickActionsSectionProps, QuickActionContentProps, QuickActionTabConfig } from './types'
import { alert } from '@/lib/ui/alert-dialog'
import {
  QUICK_ACTION_LABELS,
  LOADING_LABELS,
  SHARE_LABELS,
} from '@/features/todos/constants/labels'
// 使用懶加載避免打包問題
const QuickReceipt = lazy(() =>
  import('../quick-actions/quick-receipt').then(m => ({ default: m.QuickReceipt }))
)
const QuickDisbursement = lazy(() =>
  import('../quick-actions/quick-disbursement').then(m => ({ default: m.QuickDisbursement }))
)
// PNR 快速動作已移除（2026-04-22、跟 PNR 進階系統一起砍）
const quickActionTabs: QuickActionTabConfig[] = [
  { key: 'receipt' as const, label: QUICK_ACTION_LABELS.receipt, icon: Receipt },
  { key: 'invoice' as const, label: QUICK_ACTION_LABELS.invoice, icon: FileText },
  { key: 'share' as const, label: QUICK_ACTION_LABELS.share, icon: UserPlus },
]

export function QuickActionsSection({ activeTab, onTabChange }: QuickActionsSectionProps) {
  return (
    <div className="mb-4 bg-card border border-border rounded-xl p-2 shadow-sm">
      <div className="flex gap-2">
        {quickActionTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all flex-1 rounded-lg',
                activeTab === tab.key
                  ? 'bg-morandi-container/30 text-morandi-primary'
                  : 'bg-transparent text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/10'
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function QuickActionContent({
  activeTab,
  todo,
  onUpdate,
  onClose,
}: QuickActionContentProps) {
  const { items: employees } = useEmployeesSlim()
  const { user: currentUser } = useAuthStore()
  const [shareData, setShareData] = React.useState({
    targetUserId: '',
    permission: 'view' as 'view' | 'edit',
    message: '',
  })
  const [isSharing, setIsSharing] = React.useState(false)

  // 收款功能的資料載入狀態
  const [isLoadingReceipt, setIsLoadingReceipt] = React.useState(false)

  // 共享待辦的處理函數
  const handleShareTodo = React.useCallback(async () => {
    if (!shareData.targetUserId) {
      void alert(SHARE_LABELS.selectMemberWarning, 'warning')
      return
    }

    setIsSharing(true)
    try {
      // 更新 assignee 和 visibility
      const currentVisibility = todo.visibility || []
      const newVisibility = currentVisibility.includes(shareData.targetUserId)
        ? currentVisibility
        : [...currentVisibility, shareData.targetUserId]

      if (onUpdate) {
        await onUpdate({
          assignee: shareData.permission === 'edit' ? shareData.targetUserId : todo.assignee,
          visibility: newVisibility,
        })
      }

      // 重置表單
      setShareData({ targetUserId: '', permission: 'view', message: '' })
      await alert(SHARE_LABELS.shareSuccess, 'success')
      onClose?.()
    } catch (error) {
      void alert(SHARE_LABELS.shareFailed, 'error')
    } finally {
      setIsSharing(false)
    }
  }, [shareData, todo, onUpdate])

  // 只在收款分頁時載入團體和訂單資料
  useEffect(() => {
    const loadReceiptData = async () => {
      if (activeTab === 'receipt') {
        setIsLoadingReceipt(true)
        try {
          const { invalidateTours, invalidateOrders } = await import('@/data')

          // SWR 快取失效，確保資料已載入
          await Promise.all([invalidateTours(), invalidateOrders()])
        } catch (error) {
          logger.error('載入收款資料失敗:', error)
        } finally {
          setIsLoadingReceipt(false)
        }
      }
    }

    loadReceiptData()
  }, [activeTab])

  // 過濾掉自己
  const otherEmployees = employees.filter(emp => emp.id !== currentUser?.id)

  // 加載中的元件
  const LoadingFallback = (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm text-morandi-secondary">{LOADING_LABELS.loading}</div>
    </div>
  )

  switch (activeTab) {
    case 'receipt':
      if (isLoadingReceipt) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-morandi-secondary">
              {LOADING_LABELS.loadingReceiptData}
            </div>
          </div>
        )
      }
      return (
        <Suspense fallback={LoadingFallback}>
          <QuickReceipt onSubmit={onClose} />
        </Suspense>
      )

    case 'invoice':
      return (
        <Suspense fallback={LoadingFallback}>
          <QuickDisbursement onSubmit={onClose} />
        </Suspense>
      )

    case 'share':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-morandi-container/20">
            <div className="p-1.5 bg-morandi-gold/10 rounded-lg">
              <UserPlus size={16} className="text-morandi-gold" />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-morandi-primary">
                {SHARE_LABELS.shareTask}
              </h5>
              <p className="text-xs text-morandi-secondary">{SHARE_LABELS.shareDescription}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {SHARE_LABELS.shareTo}
              </label>
              <Select
                value={shareData.targetUserId}
                onValueChange={value => setShareData(prev => ({ ...prev, targetUserId: value }))}
              >
                <SelectTrigger className="shadow-sm h-9 text-xs">
                  <SelectValue placeholder={SHARE_LABELS.selectMember} />
                </SelectTrigger>
                <SelectContent>
                  {otherEmployees.length > 0 ? (
                    otherEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.display_name || emp.english_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {SHARE_LABELS.noOtherEmployees}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {SHARE_LABELS.permission}
              </label>
              <Select
                value={shareData.permission}
                onValueChange={(value: 'view' | 'edit') =>
                  setShareData(prev => ({ ...prev, permission: value }))
                }
              >
                <SelectTrigger className="shadow-sm h-9 text-xs">
                  <SelectValue placeholder={SHARE_LABELS.selectPermission} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">{SHARE_LABELS.viewOnly}</SelectItem>
                  <SelectItem value="edit">{SHARE_LABELS.canEdit}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {SHARE_LABELS.messageOptional}
              </label>
              <Textarea
                placeholder={SHARE_LABELS.messageToMember}
                rows={2}
                className="shadow-sm text-xs"
                value={shareData.message}
                onChange={e => setShareData(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleShareTodo}
              disabled={isSharing || !shareData.targetUserId}
              className="w-full bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors shadow-md h-9 text-xs gap-1.5"
            >
              <UserPlus size={14} />
              {isSharing ? SHARE_LABELS.sharing : SHARE_LABELS.shareTask}
            </Button>
          </div>
        </div>
      )

    default:
      return null
  }
}
