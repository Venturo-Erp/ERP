'use client'

import React, { useState, lazy, Suspense } from 'react'
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
import { Receipt, FileText, UserPlus, ChevronDown, ChevronUp, X } from 'lucide-react'
import type {
  QuickActionsButtonsProps,
  QuickActionInstanceCardProps,
  QuickActionType,
} from './types'
import type { Todo } from '@/stores/types'
import { alert } from '@/lib/ui/alert-dialog'
import {
  QUICK_ACTION_LABELS,
  LOADING_LABELS,
  SHARE_LABELS,
  COMMON_LABELS,
} from '@/features/todos/constants/labels'

const QuickReceipt = lazy(() =>
  import('../quick-actions/quick-receipt').then(m => ({ default: m.QuickReceipt }))
)
const QuickDisbursement = lazy(() =>
  import('../quick-actions/quick-disbursement').then(m => ({ default: m.QuickDisbursement }))
)

const TYPE_META: Record<QuickActionType, { label: string; icon: typeof Receipt }> = {
  receipt: { label: QUICK_ACTION_LABELS.receipt, icon: Receipt },
  invoice: { label: QUICK_ACTION_LABELS.invoice, icon: FileText },
  share: { label: QUICK_ACTION_LABELS.share, icon: UserPlus },
}

/**
 * 上方三顆按鈕、點下去 onAdd(type) 往下方堆疊一張卡。
 */
export function QuickActionsButtons({ onAdd }: QuickActionsButtonsProps) {
  return (
    <div className="mb-3 bg-card border border-border rounded-xl p-2 shadow-sm">
      <div className="flex gap-2">
        {(Object.keys(TYPE_META) as QuickActionType[]).map(type => {
          const meta = TYPE_META[type]
          const Icon = meta.icon
          return (
            <button
              key={type}
              onClick={() => onAdd(type)}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all flex-1 rounded-lg',
                'bg-transparent text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/20'
              )}
            >
              <Icon size={16} />
              {meta.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 單張快速建立卡（可摺疊、可移除、提交後不關 dialog）。
 */
export function QuickActionInstanceCard({
  instance,
  todo,
  onUpdate,
  onRemove,
}: QuickActionInstanceCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const meta = TYPE_META[instance.type]
  const Icon = meta.icon

  const LoadingFallback = (
    <div className="flex items-center justify-center py-8">
      <div className="text-sm text-morandi-secondary">{LOADING_LABELS.loading}</div>
    </div>
  )

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-morandi-container/20 border-b border-border">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2 text-sm font-medium text-morandi-primary flex-1 text-left"
        >
          <Icon size={14} className="text-morandi-gold" />
          <span>{meta.label}</span>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-morandi-red/10 text-morandi-secondary hover:text-morandi-red"
          title={COMMON_LABELS.remove}
        >
          <X size={14} />
        </button>
      </div>
      {!collapsed && (
        <div className="p-3">
          {instance.type === 'receipt' && (
            <Suspense fallback={LoadingFallback}>
              <QuickReceipt
                onSubmit={() => undefined}
                defaultTourId={todo.tour_id || undefined}
                defaultOrderId={todo.related_items?.find(r => r.type === 'order')?.id || undefined}
              />
            </Suspense>
          )}
          {instance.type === 'invoice' && (
            <Suspense fallback={LoadingFallback}>
              <QuickDisbursement
                onSubmit={() => undefined}
                defaultTourId={todo.tour_id || undefined}
                defaultOrderId={todo.related_items?.find(r => r.type === 'order')?.id || undefined}
              />
            </Suspense>
          )}
          {instance.type === 'share' && <ShareForm todo={todo} onUpdate={onUpdate} />}
        </div>
      )}
    </div>
  )
}

/**
 * 共享表單（從原本 QuickActionContent 抽出來、行為不變）。
 */
function ShareForm({
  todo,
  onUpdate,
}: {
  todo: Todo
  onUpdate: (updates: Partial<Todo>) => void
}) {
  const { items: employees } = useEmployeesSlim()
  const { user: currentUser } = useAuthStore()
  const [shareData, setShareData] = useState({
    targetUserId: '',
    permission: 'view' as 'view' | 'edit',
    message: '',
  })
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (!shareData.targetUserId) {
      void alert(SHARE_LABELS.selectMemberWarning, 'warning')
      return
    }

    setIsSharing(true)
    try {
      const currentVisibility = todo.visibility || []
      const newVisibility = currentVisibility.includes(shareData.targetUserId)
        ? currentVisibility
        : [...currentVisibility, shareData.targetUserId]

      await onUpdate({
        assignee: shareData.permission === 'edit' ? shareData.targetUserId : todo.assignee,
        visibility: newVisibility,
      })

      setShareData({ targetUserId: '', permission: 'view', message: '' })
      await alert(SHARE_LABELS.shareSuccess, 'success')
    } catch {
      void alert(SHARE_LABELS.shareFailed, 'error')
    } finally {
      setIsSharing(false)
    }
  }

  const otherEmployees = employees.filter(emp => emp.id !== currentUser?.id)

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-morandi-primary mb-1">
          {SHARE_LABELS.shareTo}
        </label>
        <Select
          value={shareData.targetUserId}
          onValueChange={v => setShareData(p => ({ ...p, targetUserId: v }))}
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
          onValueChange={(v: 'view' | 'edit') =>
            setShareData(p => ({ ...p, permission: v }))
          }
        >
          <SelectTrigger className="shadow-sm h-9 text-xs">
            <SelectValue />
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
          onChange={e => setShareData(p => ({ ...p, message: e.target.value }))}
        />
      </div>
      <Button
        variant="soft-gold"
        onClick={handleShare}
        disabled={isSharing || !shareData.targetUserId}
        className="w-full shadow-md h-9 text-xs gap-1.5"
      >
        <UserPlus size={14} />
        {isSharing ? SHARE_LABELS.sharing : SHARE_LABELS.shareTask}
      </Button>
    </div>
  )
}
