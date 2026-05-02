'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputIME } from '@/components/ui/input-ime'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  ShoppingCart,
  FileText,
  DollarSign,
  Plane,
  FileCheck,
  User,
  Tag,
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  Plus,
  Eye,
} from 'lucide-react'
import { TodoExpandedViewProps } from './types'
import { useTodoExpandedView } from './useTodoExpandedView'
import { NotesSection } from './NotesSection'
import { QuickActionInstanceCard } from './QuickActionsSection'
import { useAuthStore } from '@/stores/auth-store'
import { useEmployeesSlim } from '@/data'
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

export function TodoExpandedView({ todo, onUpdate, onClose }: TodoExpandedViewProps) {
  const { instances, addInstance, removeInstance } = useTodoExpandedView()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim()
  const [activeTab, setActiveTab] = useState('details')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

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
    onUpdate({
      sub_tasks: [
        ...subTasks,
        {
          id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          done: false,
        },
      ],
    })
  }

  return (
    <Dialog open={!!todo} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className="max-w-4xl w-[90vw] max-h-[90vh] p-0 overflow-hidden flex flex-col"
      >
        {/* Header（永遠固定） */}
        <DialogHeader className="px-6 pt-5 pb-3 flex-shrink-0">
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
                className="text-xl font-semibold text-morandi-primary mt-2 text-left border-0 border-b border-transparent rounded-none px-0 h-auto bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-morandi-gold transition-colors"
              />
            ) : (
              <h2 className="text-xl font-semibold text-morandi-primary mt-2 text-left">
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
              <div className="px-6 flex-shrink-0">
                <TabsList className="bg-card border border-border rounded-md">
                  <TabsTrigger
                    value="details"
                    className="text-sm data-[state=active]:bg-morandi-gold data-[state=active]:text-white"
                  >
                    詳情
                  </TabsTrigger>
                  <TabsTrigger
                    value="subtasks"
                    className="text-sm data-[state=active]:bg-morandi-gold data-[state=active]:text-white"
                  >
                    子任務 ({subTasksTotal})
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="text-sm data-[state=active]:bg-morandi-gold data-[state=active]:text-white"
                  >
                    活動
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 詳情 */}
              <TabsContent value="details" className="mt-0 flex-1 overflow-y-auto px-6 py-4 space-y-5">
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

                {instances.length > 0 && (
                  <div className="space-y-3">
                    {instances.map(instance => (
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

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-4 h-4 text-morandi-gold" />
                    <h4 className="text-sm font-medium text-morandi-primary">關聯 ERP 資料</h4>
                  </div>
                  <div className="bg-card rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-morandi-secondary">旅遊團</span>
                      <span className="text-sm text-morandi-primary">
                        {tourRelated?.title || (
                          <span className="text-morandi-muted">未關聯</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-morandi-secondary">客戶訂單</span>
                      <span className="text-sm text-morandi-primary">
                        {orderRelated?.title || (
                          <span className="text-morandi-muted">未關聯</span>
                        )}
                      </span>
                    </div>

                    <div className="border-t border-morandi-container/40 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-morandi-secondary">報價總額</span>
                        <span className="text-sm font-medium text-morandi-primary">
                          {formatCurrency(undefined)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-morandi-secondary">客戶已付</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-morandi-green" />
                        </div>
                        <span className="text-sm font-medium text-morandi-green">
                          {formatCurrency(undefined)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-morandi-secondary">待付供應商</span>
                          <AlertTriangle className="w-3.5 h-3.5 text-morandi-gold" />
                        </div>
                        <span className="text-sm font-medium text-morandi-gold">
                          {formatCurrency(undefined)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-morandi-secondary">預估毛利</span>
                        <span className="text-sm font-medium text-morandi-primary">
                          {formatCurrency(undefined)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-morandi-muted text-center pt-1">
                      （ERP 即時資料整合 — 開發中）
                    </p>
                  </div>
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
                    {subTasks.map(sub => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
                      >
                        <button
                          onClick={() => handleSubtaskToggle(sub.id)}
                          disabled={!canEdit}
                          className={cn(
                            'w-5 h-5 rounded border flex items-center justify-center transition-colors disabled:cursor-not-allowed',
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-morandi-muted py-4 text-center">尚無子任務</p>
                )}

                {canEdit && (
                  <div className="flex items-center gap-2 mt-4">
                    <Input
                      placeholder="新增子任務..."
                      value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault()
                          handleAddSubtask()
                        }
                      }}
                      className="text-sm bg-card border-border focus-visible:ring-morandi-gold focus-visible:border-morandi-gold"
                    />
                    <Button
                      size="sm"
                      variant="soft-gold"
                      onClick={handleAddSubtask}
                      disabled={!newSubtaskTitle.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
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
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-card">
                <Calendar className="w-4 h-4 text-morandi-secondary flex-shrink-0" />
                <input
                  type="date"
                  value={todo.deadline || ''}
                  onChange={e => canEdit && onUpdate({ deadline: e.target.value || undefined })}
                  disabled={!canEdit}
                  className="text-sm bg-transparent border-0 p-0 focus:outline-none text-morandi-primary flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-morandi-muted mb-1.5 block">負責人</label>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-card">
                <User className="w-4 h-4 text-morandi-secondary flex-shrink-0" />
                <span className="text-sm text-morandi-primary truncate">
                  {assigneeName || '未指派'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-morandi-muted mb-1.5 block">關聯</label>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-card">
                {firstRelated?.type === 'group' ? (
                  <MapPin className="w-4 h-4 text-morandi-gold flex-shrink-0" />
                ) : firstRelated?.type === 'order' ? (
                  <ShoppingCart className="w-4 h-4 text-morandi-gold flex-shrink-0" />
                ) : (
                  <Tag className="w-4 h-4 text-morandi-secondary flex-shrink-0" />
                )}
                <span className="text-sm text-morandi-primary truncate">
                  {firstRelated?.title || '未關聯'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-morandi-muted mb-2 block">業務動作</label>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => canEdit && addInstance('invoice')}
                  disabled={!canEdit}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-status-info hover:bg-morandi-container/30 disabled:opacity-50 transition-colors text-left"
                >
                  <FileText className="w-3.5 h-3.5" />
                  建立請款單
                </button>
                <button
                  onClick={() => canEdit && addInstance('receipt')}
                  disabled={!canEdit}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-green hover:bg-morandi-container/30 disabled:opacity-50 transition-colors text-left"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  確認收款
                </button>
                <button
                  onClick={() => alert('訂票作業敬請期待')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-cat-purple hover:bg-morandi-container/30 transition-colors text-left"
                >
                  <Plane className="w-3.5 h-3.5" />
                  訂票作業
                </button>
                <button
                  onClick={() => alert('行前說明敬請期待')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-gold hover:bg-morandi-container/30 transition-colors text-left"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  行前說明
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-morandi-muted mb-2 block">動作</label>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => canEdit && addInstance('share')}
                  disabled={!canEdit}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-secondary hover:bg-morandi-container/30 disabled:opacity-50 transition-colors text-left"
                >
                  <Tag className="w-3.5 h-3.5" />
                  共享
                </button>
                <button
                  onClick={() => alert('複製敬請期待')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-secondary hover:bg-morandi-container/30 transition-colors text-left"
                >
                  <Copy className="w-3.5 h-3.5" />
                  複製
                </button>
                <button
                  onClick={() => alert('刪除請從卡片 hover 操作')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-morandi-red hover:bg-morandi-red/10 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  刪除
                </button>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}
