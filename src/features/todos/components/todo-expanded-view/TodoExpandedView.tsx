'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  X,
  Calendar,
  User,
  MapPin,
  ShoppingCart,
  CheckSquare,
  Square,
  AlertCircle,
  Eye,
  FileText,
  Receipt as ReceiptIcon,
} from 'lucide-react'
import { TodoExpandedViewProps } from './types'
import { useTodoExpandedView } from './useTodoExpandedView'
import { NotesSection } from './NotesSection'
import { QuickActionsButtons, QuickActionInstanceCard } from './QuickActionsSection'
import { TaskTypeForm } from './TaskTypeForm'
import { useAuthStore } from '@/stores/auth-store'
import { useEmployeesSlim } from '@/data'
import { cn } from '@/lib/utils'
import {
  DIALOG_LABELS,
  COMMON_LABELS,
  PLACEHOLDER_LABELS,
  TODO_STATUS_LABELS,
} from '@/features/todos/constants/labels'

const STATUS_OPTIONS: Array<{
  value: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  label: string
  color: string
}> = [
  { value: 'pending', label: TODO_STATUS_LABELS.pending, color: 'text-morandi-muted' },
  { value: 'in_progress', label: TODO_STATUS_LABELS.in_progress, color: 'text-morandi-gold' },
  { value: 'completed', label: TODO_STATUS_LABELS.completed, color: 'text-morandi-green' },
  { value: 'cancelled', label: TODO_STATUS_LABELS.cancelled, color: 'text-morandi-red' },
]

const PRIORITY_OPTIONS: Array<{
  value: 1 | 2 | 3 | 4 | 5
  label: string
  color: string
}> = [
  { value: 5, label: '緊急', color: 'text-morandi-red' },
  { value: 4, label: '高', color: 'text-orange-600' },
  { value: 3, label: '中', color: 'text-morandi-gold' },
  { value: 2, label: '低', color: 'text-sky-600' },
  { value: 1, label: '很低', color: 'text-morandi-muted' },
]

const RELATED_TYPE_META: Record<string, { icon: typeof MapPin; label: string }> = {
  group: { icon: MapPin, label: '關聯旅遊團' },
  quote: { icon: FileText, label: '關聯報價' },
  order: { icon: ShoppingCart, label: '關聯訂單' },
  invoice: { icon: FileText, label: '關聯請款' },
  receipt: { icon: ReceiptIcon, label: '關聯收款' },
}

export function TodoExpandedView({ todo, onUpdate, onClose }: TodoExpandedViewProps) {
  const { instances, addInstance, removeInstance } = useTodoExpandedView()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  if (!todo) return null

  const currentUserId = user?.id
  const isCreator = todo.creator === currentUserId
  const isInVisibility = todo.visibility?.includes(currentUserId || '')
  const canEdit = isCreator || isInVisibility

  const isOverdue = todo.deadline ? new Date(todo.deadline) < new Date() : false
  const subTasks = todo.sub_tasks || []
  const subTasksDone = subTasks.filter(s => s.done).length
  const subTasksTotal = subTasks.length

  const assignee = employees.find(e => e.id === todo.assignee)
  const assigneeName = assignee?.display_name || assignee?.chinese_name || ''

  const handleSubtaskToggle = (subtaskId: string) => {
    if (!canEdit) return
    const updated = subTasks.map(st =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    )
    onUpdate({ sub_tasks: updated })
  }

  const handleAddSubtask = () => {
    if (!canEdit || !newSubtaskTitle.trim()) return
    const newSubtask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      done: false,
    }
    onUpdate({ sub_tasks: [...subTasks, newSubtask] })
    setNewSubtaskTitle('')
  }

  return (
    <Dialog open={!!todo} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card border border-border p-0"
      >
        <VisuallyHidden>
          <DialogTitle>{todo.title || DIALOG_LABELS.todoDetails}</DialogTitle>
        </VisuallyHidden>

        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-morandi-secondary">
              {DIALOG_LABELS.todoDetails}
            </span>
            {!canEdit && (
              <span className="flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold px-2 py-1 rounded text-xs">
                <Eye size={12} />
                {COMMON_LABELS.readOnlyMode}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          {/* 標題 */}
          <Input
            value={todo.title}
            onChange={e => canEdit && onUpdate({ title: e.target.value })}
            disabled={!canEdit}
            placeholder={PLACEHOLDER_LABELS.enterTaskTitle}
            className="text-base font-semibold border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-morandi-gold bg-transparent"
          />

          {/* 狀態 + 優先度 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-morandi-secondary">狀態</span>
              <Select
                value={todo.status}
                onValueChange={(v: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
                  if (!canEdit) return
                  onUpdate({ status: v, completed: v === 'completed' })
                }}
                disabled={!canEdit}
              >
                <SelectTrigger className="h-8 text-xs w-auto min-w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-morandi-secondary">優先度</span>
              <Select
                value={String(todo.priority)}
                onValueChange={v => canEdit && onUpdate({ priority: Number(v) as 1 | 2 | 3 | 4 | 5 })}
                disabled={!canEdit}
              >
                <SelectTrigger className="h-8 text-xs w-auto min-w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meta grid：到期日 + 負責人 + 關聯 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-card border border-border">
              <Calendar
                className={cn('w-4 h-4', isOverdue ? 'text-morandi-red' : 'text-morandi-secondary')}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-morandi-secondary">到期日</p>
                <input
                  type="date"
                  value={todo.deadline || ''}
                  onChange={e => canEdit && onUpdate({ deadline: e.target.value || undefined })}
                  disabled={!canEdit}
                  className={cn(
                    'text-xs bg-transparent border-0 p-0 focus:outline-none w-full',
                    isOverdue ? 'text-morandi-red' : 'text-morandi-primary'
                  )}
                />
              </div>
              {isOverdue && (
                <AlertCircle className="w-3.5 h-3.5 text-morandi-red flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-md bg-card border border-border">
              <User className="w-4 h-4 text-morandi-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-morandi-secondary">負責人</p>
                <p className="text-xs text-morandi-primary truncate">
                  {assigneeName || <span className="text-morandi-muted">未指派</span>}
                </p>
              </div>
            </div>

            {todo.related_items && todo.related_items.length > 0 && (
              <>
                {todo.related_items.slice(0, 4).map((item, i) => {
                  const meta = RELATED_TYPE_META[item.type] || { icon: FileText, label: '關聯' }
                  const Icon = meta.icon
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 rounded-md bg-card border border-border col-span-2"
                    >
                      <Icon className="w-4 h-4 text-morandi-gold flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-morandi-secondary">{meta.label}</p>
                        <p className="text-xs text-morandi-primary truncate">{item.title}</p>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* 描述 */}
          <div>
            <label className="text-xs font-medium text-morandi-secondary mb-1.5 block">
              {COMMON_LABELS.description}
            </label>
            <Textarea
              value={todo.description || ''}
              onChange={e => canEdit && onUpdate({ description: e.target.value || undefined })}
              disabled={!canEdit}
              placeholder="新增描述..."
              className="text-sm min-h-[80px] resize-none border-border bg-card focus-visible:ring-morandi-gold focus-visible:border-morandi-gold"
            />
          </div>

          {/* 子任務 */}
          {subTasksTotal > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-morandi-secondary">子任務</label>
                <span className="text-[10px] text-morandi-secondary">
                  {subTasksDone}/{subTasksTotal}
                </span>
              </div>
              <div className="space-y-1">
                {subTasks.map(subtask => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-morandi-container/20 transition-colors"
                  >
                    <button
                      onClick={() => handleSubtaskToggle(subtask.id)}
                      disabled={!canEdit}
                      className="text-morandi-secondary hover:text-morandi-primary transition-colors disabled:cursor-not-allowed"
                    >
                      {subtask.done ? (
                        <CheckSquare className="w-4 h-4 text-morandi-green" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        'text-sm flex-1',
                        subtask.done ? 'line-through text-morandi-muted' : 'text-morandi-primary'
                      )}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 新增子任務 */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-morandi-secondary flex-shrink-0" />
              <input
                type="text"
                placeholder="新增子任務..."
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
                className="flex-1 text-sm bg-transparent border-0 border-b border-border focus:border-morandi-gold focus:outline-none py-1"
              />
            </div>
          )}

          {/* 業務快捷操作（venturo 既有功能、不在 demo 內、保留） */}
          {canEdit && !todo.task_type && (
            <div>
              <QuickActionsButtons onAdd={addInstance} />
              {instances.length > 0 && (
                <div className="space-y-3 mt-3">
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
            </div>
          )}

          {/* TaskTypeForm（如有 task_type、保留既有功能） */}
          {canEdit && todo.task_type && (
            <div className="bg-card border border-border rounded-xl p-4">
              <TaskTypeForm
                taskType={todo.task_type}
                todo={todo}
                onUpdate={onUpdate}
                onClose={onClose}
              />
            </div>
          )}

          {/* 活動紀錄（venturo 的 notes 留言區） */}
          <NotesSection todo={todo} onUpdate={onUpdate} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
