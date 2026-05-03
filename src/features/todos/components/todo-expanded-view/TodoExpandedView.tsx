'use client'

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { InputIME } from '@/components/ui/input-ime'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  Plane,
  FileCheck,
  User,
  Tag,
  Copy,
  Trash2,
  CheckCircle2,
  ImagePlus,
  Plus,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { TodoExpandedViewProps } from './types'
import { useTodoExpandedView } from './useTodoExpandedView'
import { NotesSection } from './NotesSection'
import { QuickActionInstanceCard } from './QuickActionsSection'
import { AddReceiptDialog } from '@/features/finance/payments/components/AddReceiptDialog'
import { AddRequestDialog } from '@/features/finance/requests/components/AddRequestDialog'
import { PnrToolContent } from '@/features/todos/components/PnrToolDialog'
import { TourCreateDialog } from '@/features/tours/components/TourCreateDialog'
import { InlineTourCreate } from '@/features/tours/components/InlineTourCreate'

const QuickReceiptLazy = lazy(() =>
  import('../quick-actions/quick-receipt').then(m => ({ default: m.QuickReceipt }))
)
const QuickDisbursementLazy = lazy(() =>
  import('../quick-actions/quick-disbursement').then(m => ({ default: m.QuickDisbursement }))
)

const SUBTASK_INLINE_FORMS = ['開團', '請款作業', '收款確認', '確認航班']
const hasInlineForm = (title: string) => SUBTASK_INLINE_FORMS.includes(title)
import { useAuthStore } from '@/stores/auth-store'
import {
  useEmployeesSlim,
  useToursSlim,
  useOrdersSlim,
  useReceipts,
  usePaymentRequests,
} from '@/data'
import { cn } from '@/lib/utils'
import {
  TODO_STATUS_LABELS,
  TODO_PRIORITY_LABELS,
  TODO_DIALOG_LABELS,
  COMMON_LABELS,
  PRESET_BUSINESS_SUBTASKS,
} from '@/features/todos/constants/labels'

const STATUS_OPTIONS = [
  { value: 'pending', label: TODO_STATUS_LABELS.pending, dot: 'bg-morandi-muted' },
  { value: 'in_progress', label: TODO_STATUS_LABELS.in_progress, dot: 'bg-morandi-gold' },
  { value: 'completed', label: TODO_STATUS_LABELS.completed, dot: 'bg-morandi-green' },
  { value: 'cancelled', label: TODO_STATUS_LABELS.cancelled, dot: 'bg-morandi-red' },
] as const

const PRIORITY_OPTIONS = [
  { value: 5 as const, label: TODO_PRIORITY_LABELS[5], dot: 'bg-morandi-red', text: 'text-morandi-red' },
  { value: 4 as const, label: TODO_PRIORITY_LABELS[4], dot: 'bg-orange-400', text: 'text-orange-600' },
  { value: 3 as const, label: TODO_PRIORITY_LABELS[3], dot: 'bg-morandi-gold', text: 'text-morandi-gold' },
  { value: 2 as const, label: TODO_PRIORITY_LABELS[2], dot: 'bg-sky-400', text: 'text-sky-600' },
  { value: 1 as const, label: TODO_PRIORITY_LABELS[1], dot: 'bg-morandi-muted', text: 'text-morandi-muted' },
]

function formatCurrency(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—'
  return `NT$${n.toLocaleString('zh-TW')}`
}

function getStatusDot(status: string): string {
  return STATUS_OPTIONS.find(s => s.value === status)?.dot || 'bg-morandi-muted'
}

function getStatusLabel(status: string): string {
  return STATUS_OPTIONS.find(s => s.value === status)?.label || status
}

interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  sublabel: string
  onClick?: () => void
  disabled?: boolean
}

function QuickActionButton({ icon, label, sublabel, onClick, disabled }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-border bg-card hover:shadow-sm hover:border-morandi-gold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="w-8 h-8 rounded-full bg-morandi-container/40 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium mt-1 text-morandi-primary">{label}</span>
      <span className="text-[10px] text-morandi-muted">{sublabel}</span>
    </button>
  )
}

export function TodoExpandedView({ todo, onUpdate, onClose, onDelete }: TodoExpandedViewProps) {
  const { instances, addInstance, removeInstance } = useTodoExpandedView()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim()
  const { items: tours } = useToursSlim()
  const { items: orders } = useOrdersSlim()
  const { items: receipts } = useReceipts()
  const { items: paymentRequests } = usePaymentRequests()
  const [activeTab, setActiveTab] = useState('details')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newTagInput, setNewTagInput] = useState('')
  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set())
  const [showShareForm, setShowShareForm] = useState(false)
  const [shareTargetId, setShareTargetId] = useState('')
  const [showTourCreateDialog, setShowTourCreateDialog] = useState(false)

  const toggleExpand = (id: string) => {
    setExpandedSubtaskIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (todo) setActiveTab('details')
  }, [todo?.id])

  if (!todo) return null

  const currentUserId = user?.id
  const isCreator = todo.creator === currentUserId
  const isInVisibility = todo.visibility?.includes(currentUserId || '')
  const canEdit = isCreator || isInVisibility

  const subTasks = todo.sub_tasks || []
  const subTasksDone = subTasks.filter(s => s.done).length
  const subTasksTotal = subTasks.length

  const assignee = employees.find(e => e.id === todo.assignee)
  const assigneeName = assignee?.display_name || assignee?.chinese_name || ''

  const tourRelated = todo.related_items?.find(r => r.type === 'group')
  const orderRelated = todo.related_items?.find(r => r.type === 'order')
  const firstRelated = todo.related_items?.[0]

  const handleSubtaskToggle = (subtaskId: string) => {
    if (!canEdit) return
    onUpdate({
      sub_tasks: subTasks.map(st =>
        st.id === subtaskId ? { ...st, done: !st.done } : st
      ),
    })
  }

  const handleSubtaskDone = (subtaskId: string) => {
    if (!canEdit) return
    onUpdate({
      sub_tasks: subTasks.map(st =>
        st.id === subtaskId ? { ...st, done: true } : st
      ),
    })
    setExpandedSubtaskIds(prev => {
      const next = new Set(prev)
      next.delete(subtaskId)
      return next
    })
  }

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!canEdit) return
    onUpdate({
      sub_tasks: subTasks.filter(st => st.id !== subtaskId),
    })
  }

  const handleAddSubtask = () => {
    if (!canEdit || !newSubtaskTitle.trim()) return
    onUpdate({
      sub_tasks: [
        ...subTasks,
        { id: `st-${Date.now()}`, title: newSubtaskTitle.trim(), done: false },
      ],
    })
    setNewSubtaskTitle('')
  }

  const addPresetSubtask = (title: string) => {
    if (!canEdit) return
    const newId = `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    // 1. 加進子任務 list
    onUpdate({
      sub_tasks: [...subTasks, { id: newId, title, done: false }],
    })
    // 2. 有對應 mini form 的 chip → 切到子任務 tab + 自動展開該 row
    if (hasInlineForm(title)) {
      setExpandedSubtaskIds(prev => new Set(prev).add(newId))
      setActiveTab('subtasks')
    }
    // 開團也走 inline form（已在 SUBTASK_INLINE_FORMS 中）
  }

  /** 開團成功後、把新 tour（含訂單）自動關聯回 todo */
  const handleTourCreated = (tour: {
    id: string
    code: string
    order?: { id: string; order_number: string }
  }) => {
    const newRelatedItems = [
      ...todo.related_items?.filter(r => r.type !== 'group' && r.type !== 'order') || [],
      { type: 'group' as const, id: tour.id, title: tour.code },
    ]
    if (tour.order) {
      newRelatedItems.push({
        type: 'order' as const,
        id: tour.order.id,
        title: tour.order.order_number,
      })
    }
    onUpdate({
      related_items: newRelatedItems,
      tour_id: tour.id,
    })
    setShowTourCreateDialog(false)
  }

  // 旅遊團 Combobox 選項
  const tourOptions: ComboboxOption[] = (tours || []).map(t => ({
    value: t.id,
    label: t.code ? `${t.code}｜${t.name}` : t.name,
  }))

  // 訂單 Combobox 選項（依選中的旅遊團篩選）
  const orderOptions: ComboboxOption[] = (orders || [])
    .filter(o => !tourRelated || o.tour_id === tourRelated.id)
    .map(o => ({
      value: o.id,
      label: o.order_number || o.id,
    }))

  const handleSelectTour = (tourId: string) => {
    if (!canEdit) return
    const others = (todo.related_items || []).filter(r => r.type !== 'group')
    if (!tourId) {
      onUpdate({ related_items: others })
      return
    }
    const tour = tours.find(t => t.id === tourId)
    if (!tour) return
    onUpdate({
      related_items: [
        ...others,
        { type: 'group', id: tour.id, title: tour.code ? `${tour.code}｜${tour.name}` : tour.name },
      ],
      tour_id: tour.id, // 同步寫入 todo.tour_id
    })
  }

  // 標籤
  const tags = todo.tags || []
  const addTag = (raw: string) => {
    const t = raw.trim()
    if (!t || tags.includes(t)) return
    onUpdate({ tags: [...tags, t] })
  }
  const removeTag = (t: string) => {
    onUpdate({ tags: tags.filter(x => x !== t) })
  }

  const handleSelectOrder = (orderId: string) => {
    if (!canEdit) return
    const others = (todo.related_items || []).filter(r => r.type !== 'order')
    if (!orderId) {
      onUpdate({ related_items: others })
      return
    }
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    onUpdate({
      related_items: [
        ...others,
        {
          type: 'order',
          id: order.id,
          title: order.order_number || order.id,
        },
      ],
    })
  }

  return (
    <Dialog open={!!todo} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className="max-w-7xl w-[90vw] max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0"
      >
        {/* Header（永遠固定） */}
        <DialogHeader className="px-6 pt-4 pb-0 flex-shrink-0 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-morandi-secondary">
              <div className={cn('w-2 h-2 rounded-full', getStatusDot(todo.status))} />
              <span>在列表</span>
              <Badge variant="outline" className="text-xs font-normal border-border bg-card">
                {getStatusLabel(todo.status)}
              </Badge>
              <span>中</span>
            </div>
            {!canEdit && (
              <span className="flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold px-2 py-1 rounded text-xs">
                <Eye size={12} />
                {COMMON_LABELS.readOnlyMode}
              </span>
            )}
          </div>
          <DialogTitle asChild>
            {canEdit ? (
              <InputIME
                value={todo.title}
                onChange={value => onUpdate({ title: value })}
                placeholder={TODO_DIALOG_LABELS.description}
                className="text-xl font-semibold text-morandi-primary mt-1.5 text-left border-0 border-b border-transparent rounded-none px-0 py-0 h-auto bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-morandi-gold transition-colors"
              />
            ) : (
              <h2 className="text-xl font-semibold text-morandi-primary mt-1.5 text-left">
                {todo.title}
              </h2>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 兩欄布局：左 = tabs 切換、右 = 永久 sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左半部：tabs + 內容（可切換） */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-6 border-b border-border flex-shrink-0 bg-card relative z-10">
                <TabsList className="bg-transparent rounded-none p-0 h-auto justify-start gap-0">
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-gold data-[state=active]:font-medium data-[state=active]:shadow-none px-4 py-3 text-sm text-morandi-secondary hover:text-morandi-primary -mb-px"
                  >
                    詳情
                  </TabsTrigger>
                  <TabsTrigger
                    value="subtasks"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-gold data-[state=active]:font-medium data-[state=active]:shadow-none px-4 py-3 text-sm text-morandi-secondary hover:text-morandi-primary -mb-px"
                  >
                    子任務 ({subTasksTotal})
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-gold data-[state=active]:font-medium data-[state=active]:shadow-none px-4 py-3 text-sm text-morandi-secondary hover:text-morandi-primary -mb-px"
                  >
                    活動
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 詳情 */}
              <TabsContent value="details" className="mt-0 flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {/* 共享 instance 堆疊（receipt / invoice 已改用獨立 dialog） */}
                {instances.filter(i => i.type === 'share').length > 0 && (
                  <div className="space-y-3">
                    {instances
                      .filter(i => i.type === 'share')
                      .map(instance => (
                        <QuickActionInstanceCard
                          key={instance.id}
                          instance={instance}
                          todo={todo}
                          onUpdate={onUpdate}
                          onRemove={() => removeInstance(instance.id)}
                        />
                      ))}
                  </div>
                )}

                <div className="flex items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-morandi-secondary mb-1 block">{TODO_DIALOG_LABELS.tour}</label>
                    <Combobox
                      value={tourRelated?.id || ''}
                      onChange={handleSelectTour}
                      options={tourOptions}
                      placeholder="選擇旅遊團..."
                      emptyMessage="找不到旅遊團"
                      showClearButton
                      disabled={!canEdit}
                      disablePortal
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-morandi-secondary mb-1 block">{TODO_DIALOG_LABELS.customerOrder}</label>
                    <Combobox
                      value={orderRelated?.id || ''}
                      onChange={handleSelectOrder}
                      options={orderOptions}
                      placeholder={tourRelated ? '選擇訂單...' : '請先選擇旅遊團'}
                      emptyMessage={tourRelated ? '此團無訂單' : '請先選擇旅遊團'}
                      showClearButton
                      disabled={!canEdit || !tourRelated}
                      disablePortal
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-morandi-primary mb-2">描述</h4>
                  <Textarea
                    placeholder="新增描述..."
                    value={todo.description || ''}
                    onChange={e =>
                      canEdit && onUpdate({ description: e.target.value || undefined })
                    }
                    disabled={!canEdit}
                    className="min-h-[80px] text-sm bg-card border-border resize-none focus-visible:ring-morandi-gold focus-visible:border-morandi-gold"
                  />
                </div>

              </TabsContent>

              {/* 子任務 */}
              <TabsContent value="subtasks" className="mt-0 flex-1 overflow-y-auto px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-morandi-primary">
                    子任務 ({subTasksTotal})
                  </h4>
                  {subTasksTotal > 0 && (
                    <span className="text-xs text-morandi-secondary">
                      {TODO_DIALOG_LABELS.subtasksProgress} {subTasksDone}/{subTasksTotal}
                    </span>
                  )}
                </div>

                {subTasksTotal > 0 && (
                  <div className="h-1.5 bg-morandi-container/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-morandi-green rounded-full transition-all"
                      style={{
                        width: `${(subTasksDone / subTasksTotal) * 100}%`,
                      }}
                    />
                  </div>
                )}

                {/* 快速新增業務子任務（chip 按鈕區） */}
                {canEdit && (
                  <div className="bg-card border border-border rounded-lg p-3">
                    <h5 className="text-xs font-medium text-morandi-secondary mb-2">
                      {TODO_DIALOG_LABELS.quickAddSubtasks}
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_BUSINESS_SUBTASKS.map(title => (
                        <button
                          key={title}
                          onClick={() => addPresetSubtask(title)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-morandi-green/30 text-xs text-morandi-green hover:bg-morandi-green/10 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {subTasksTotal > 0 ? (
                  <div className="space-y-2">
                    {subTasks.map(sub => {
                      const isExpanded = expandedSubtaskIds.has(sub.id)
                      const showForm = hasInlineForm(sub.title)
                      return (
                        <div
                          key={sub.id}
                          className="bg-card rounded-lg border border-border overflow-hidden"
                        >
                          <div className="flex items-center gap-3 p-3">
                            <button
                              onClick={() => handleSubtaskToggle(sub.id)}
                              disabled={!canEdit}
                              className={cn(
                                'w-5 h-5 rounded border flex items-center justify-center transition-colors disabled:cursor-not-allowed flex-shrink-0',
                                sub.done
                                  ? 'bg-morandi-green border-morandi-green text-white'
                                  : 'border-border hover:border-morandi-gold'
                              )}
                            >
                              {sub.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                            <span
                              className={cn(
                                'text-sm flex-1',
                                sub.done
                                  ? 'line-through text-morandi-muted'
                                  : 'text-morandi-primary'
                              )}
                            >
                              {sub.title}
                            </span>
                            {showForm && (
                              <button
                                onClick={() => toggleExpand(sub.id)}
                                className="text-morandi-secondary hover:text-morandi-primary p-1 rounded transition-colors"
                                title={isExpanded ? '收合' : '展開操作'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteSubtask(sub.id)}
                                className="text-morandi-muted hover:text-morandi-red p-1 rounded transition-colors"
                                title="刪除子任務"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {isExpanded && showForm && (
                            <div className="border-t border-border p-3 bg-morandi-container/10">
                              {sub.title === '開團' && (
                                <InlineTourCreate
                                  defaultTourName={todo.title}
                                  onCreated={tour => {
                                    handleTourCreated(tour)
                                    handleSubtaskDone(sub.id)
                                  }}
                                  onCancel={() => toggleExpand(sub.id)}
                                />
                              )}
                              {sub.title === '請款作業' && (
                                <Suspense
                                  fallback={
                                    <div className="text-xs text-morandi-muted text-center py-3">
                                      載入請款表單中...
                                    </div>
                                  }
                                >
                                  <QuickDisbursementLazy
                                    onSubmit={() => handleSubtaskDone(sub.id)}
                                    defaultTourId={todo.tour_id || undefined}
                                    defaultOrderId={todo.related_items?.find(r => r.type === 'order')?.id || undefined}
                                  />
                                </Suspense>
                              )}
                              {sub.title === '收款確認' && (
                                <Suspense
                                  fallback={
                                    <div className="text-xs text-morandi-muted text-center py-3">
                                      載入收款表單中...
                                    </div>
                                  }
                                >
                                  <QuickReceiptLazy
                                    onSubmit={() => handleSubtaskDone(sub.id)}
                                    defaultTourId={todo.tour_id || undefined}
                                    defaultOrderId={todo.related_items?.find(r => r.type === 'order')?.id || undefined}
                                  />
                                </Suspense>
                              )}
                              {sub.title === '確認航班' && <PnrToolContent todo={todo} />}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-morandi-muted py-4 text-center">尚無子任務</p>
                )}

                {canEdit && (
                  <div className="relative mt-4">
                    <Input
                      placeholder="新增子任務（按 Enter 送出）..."
                      value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault()
                          handleAddSubtask()
                        }
                      }}
                      className="text-sm bg-card border-border focus-visible:ring-morandi-gold focus-visible:border-morandi-gold pr-9"
                    />
                    {newSubtaskTitle.trim() && (
                      <button
                        onClick={handleAddSubtask}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-morandi-gold hover:bg-morandi-gold/10 transition-colors"
                        title="新增"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* 活動 */}
              <TabsContent value="activity" className="mt-0 flex-1 overflow-y-auto px-6 py-4">
                <NotesSection todo={todo} onUpdate={onUpdate} />
              </TabsContent>
            </Tabs>
          </div>

          {/* 右半部：永久 sidebar、不隨 tab 切換 */}
          <aside className="w-[240px] pl-2 pr-4 py-4 space-y-3 shrink-0 overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-morandi-muted mb-1.5 block">狀態</label>
              <Select
                value={todo.status}
                onValueChange={(v: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
                  if (!canEdit) return
                  onUpdate({ status: v, completed: v === 'completed' })
                }}
                disabled={!canEdit}
              >
                <SelectTrigger className="w-full h-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', getStatusDot(todo.status))} />
                    <span>{getStatusLabel(todo.status)}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', opt.dot)} />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-morandi-muted mb-1.5 block">優先度</label>
              <div className="flex flex-col gap-1">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => canEdit && onUpdate({ priority: opt.value })}
                    disabled={!canEdit}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors disabled:cursor-not-allowed',
                      todo.priority === opt.value
                        ? cn('bg-morandi-gold/10', opt.text)
                        : 'text-morandi-secondary hover:bg-morandi-container/20'
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full', opt.dot)} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-morandi-muted mb-1.5 block">到期日</label>
              <DatePicker
                value={todo.deadline || ''}
                onChange={v => canEdit && onUpdate({ deadline: v || undefined })}
                disabled={!canEdit}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-morandi-muted mb-1.5 block">
                {TODO_DIALOG_LABELS.tags}
              </label>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/20"
                    >
                      {tag}
                      {canEdit && (
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:bg-morandi-red/20 rounded"
                          title="移除"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                !canEdit && (
                  <p className="text-xs text-morandi-muted mb-1.5">
                    {TODO_DIALOG_LABELS.noTags}
                  </p>
                )
              )}
              {canEdit && (
                <Input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && newTagInput.trim()) {
                      e.preventDefault()
                      addTag(newTagInput)
                      setNewTagInput('')
                    }
                  }}
                  placeholder={TODO_DIALOG_LABELS.addTagPlaceholder}
                  className="h-7 text-xs"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-morandi-muted mb-2 block">動作</label>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onClose()}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-secondary hover:bg-morandi-container/30 transition-colors text-left"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  存檔
                </button>
                <button
                  onClick={() => {
                    if (!canEdit) return
                    const isCompleted = todo.status === 'completed'
                    onUpdate({
                      status: isCompleted ? 'pending' : 'completed',
                      completed: !isCompleted,
                    })
                  }}
                  disabled={!canEdit}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left',
                    todo.status === 'completed'
                      ? 'text-morandi-secondary hover:bg-morandi-container/30'
                      : 'text-morandi-green hover:bg-morandi-green/10'
                  )}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  {todo.status === 'completed' ? '重新開啟' : '標記完成'}
                </button>
                <button
                  onClick={async () => {
                    if (!onDelete) return
                    if (!confirm(`確定刪除「${todo.title}」？`)) return
                    await onDelete()
                  }}
                  disabled={!onDelete || !canEdit}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-red hover:bg-morandi-red/10 disabled:opacity-50 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  刪除
                </button>
              </div>
            </div>

            {/* 共享 section — 永遠在 sidebar 最下面 */}
            <div className="pt-3 border-t border-border">
              <button
                onClick={() => canEdit && setShowShareForm(s => !s)}
                disabled={!canEdit}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-gold hover:bg-morandi-container/30 disabled:opacity-50 transition-colors text-left w-full"
              >
                <Tag className="w-3.5 h-3.5" />
                共享給夥伴
                <ChevronDown
                  className={cn(
                    'w-3 h-3 ml-auto transition-transform',
                    showShareForm && 'rotate-180'
                  )}
                />
              </button>
              {showShareForm && canEdit && (() => {
                const otherEmployees = employees.filter(emp => emp.id !== currentUserId && !emp.is_bot)
                const currentVisibility = todo.visibility || []
                const sharedWith = otherEmployees.filter(emp => currentVisibility.includes(emp.id))
                const availableToShare = otherEmployees.filter(emp => !currentVisibility.includes(emp.id))

                return (
                  <div className="mt-2 space-y-2 px-2">
                    {/* 已共享列表 */}
                    {sharedWith.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sharedWith.map(emp => (
                          <span
                            key={emp.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-morandi-green/10 text-morandi-green border border-morandi-green/20"
                          >
                            {emp.display_name || emp.chinese_name || emp.english_name}
                            <button
                              onClick={() => {
                                onUpdate({
                                  visibility: currentVisibility.filter(id => id !== emp.id),
                                })
                              }}
                              className="hover:bg-morandi-red/20 rounded"
                              title="移除共享"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 加入共享 */}
                    {otherEmployees.length === 0 ? (
                      <p className="text-xs text-morandi-muted">
                        您是 workspace 唯一成員、暫無對象可共享
                      </p>
                    ) : availableToShare.length === 0 ? (
                      <p className="text-xs text-morandi-muted">已共享給所有可選成員</p>
                    ) : (
                      <>
                        <Select value={shareTargetId} onValueChange={setShareTargetId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="選擇成員..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableToShare.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.display_name || emp.chinese_name || emp.english_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="soft-gold"
                          size="sm"
                          className="w-full h-8 text-xs"
                          disabled={!shareTargetId}
                          onClick={() => {
                            onUpdate({
                              visibility: [...currentVisibility, shareTargetId],
                            })
                            setShareTargetId('')
                          }}
                        >
                          加入共享
                        </Button>
                      </>
                    )}
                  </div>
                )
              })()}
            </div>
          </aside>
        </div>
      </DialogContent>

      {/* 開團 Dialog（level=2 嵌套、成功後自動關聯回 todo） */}
      <TourCreateDialog
        open={showTourCreateDialog}
        onOpenChange={setShowTourCreateDialog}
        onCreated={handleTourCreated}
        defaultTourName={todo.title}
        level={2}
      />
    </Dialog>
  )
}
