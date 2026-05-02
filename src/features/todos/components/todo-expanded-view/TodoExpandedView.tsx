'use client'

import { formatDate } from '@/lib/utils/format-date'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { InputIME } from '@/components/ui/input-ime'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  Calendar,
  Eye,
  FileText,
  Receipt as ReceiptIcon,
  Plane,
  BookOpen,
  Image as ImageIcon,
  MapPin,
  ShoppingCart,
  Tag,
  Copy,
  CheckSquare,
  Square,
  UserPlus,
} from 'lucide-react'
import { TodoExpandedViewProps } from './types'
import { useTodoExpandedView } from './useTodoExpandedView'
import { NotesSection } from './NotesSection'
import { QuickActionInstanceCard } from './QuickActionsSection'
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

const PRIORITY_LEVELS = [
  { value: 5, label: '緊急', dot: 'bg-morandi-red', text: 'text-morandi-red' },
  { value: 4, label: '高', dot: 'bg-orange-400', text: 'text-orange-600' },
  { value: 3, label: '中', dot: 'bg-morandi-gold', text: 'text-morandi-gold' },
  { value: 2, label: '低', dot: 'bg-sky-400', text: 'text-sky-600' },
  { value: 1, label: '很低', dot: 'bg-morandi-muted', text: 'text-morandi-muted' },
] as const

const RELATED_TYPE_META: Record<string, { icon: typeof MapPin; label: string }> = {
  group: { icon: MapPin, label: '旅遊團' },
  quote: { icon: FileText, label: '報價' },
  order: { icon: ShoppingCart, label: '訂單' },
  invoice: { icon: FileText, label: '請款' },
  receipt: { icon: ReceiptIcon, label: '收款' },
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-morandi-green'
    case 'in_progress':
      return 'bg-morandi-gold'
    case 'cancelled':
      return 'bg-morandi-red'
    default:
      return 'bg-morandi-muted'
  }
}

export function TodoExpandedView({ todo, onUpdate, onClose }: TodoExpandedViewProps) {
  const { instances, addInstance, removeInstance } = useTodoExpandedView()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim()

  if (!todo) return null

  const currentUserId = user?.id
  const isCreator = todo.creator === currentUserId
  const isInVisibility = todo.visibility?.includes(currentUserId || '')
  const canEdit = isCreator || isInVisibility

  const subTasksDone = todo.sub_tasks?.filter(s => s.done).length || 0
  const subTasksTotal = todo.sub_tasks?.length || 0

  const assignee = employees.find(e => e.id === todo.assignee)
  const assigneeName = assignee?.display_name || assignee?.chinese_name

  return (
    <Dialog open={!!todo} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className="w-full max-w-[95vw] sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0 gap-0"
      >
        <VisuallyHidden>
          <DialogTitle>{todo.title || DIALOG_LABELS.todoDetails}</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="px-6 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs text-morandi-secondary mb-1">
            <span className={cn('w-2 h-2 rounded-full', getStatusDotColor(todo.status))} />
            在列表
            <strong className="text-morandi-primary font-medium">
              {TODO_STATUS_LABELS[todo.status as keyof typeof TODO_STATUS_LABELS]}
            </strong>
            中
          </div>
          <div className="flex items-center gap-3">
            {canEdit ? (
              <InputIME
                value={todo.title}
                onChange={value => onUpdate({ title: value })}
                className="text-xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent flex-1"
                placeholder={PLACEHOLDER_LABELS.enterTaskTitle}
              />
            ) : (
              <h2 className="text-xl font-bold text-morandi-primary flex-1">{todo.title}</h2>
            )}
            {!canEdit && (
              <span className="flex items-center gap-1 bg-morandi-gold/10 text-morandi-gold px-2 py-1 rounded text-xs flex-shrink-0">
                <Eye size={12} />
                {COMMON_LABELS.readOnlyMode}
              </span>
            )}
          </div>
        </div>

        {/* Body：tabs (left col-span-2) + sidebar (right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-hidden">
          {/* Left：tabs + content */}
          <div className="col-span-1 lg:col-span-2 flex flex-col overflow-hidden">
            <Tabs defaultValue="detail" className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="px-6 justify-start rounded-none border-b border-border bg-transparent h-auto p-0 gap-0">
                <TabsTrigger
                  value="detail"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-primary data-[state=active]:shadow-none px-4 py-2.5"
                >
                  詳情
                </TabsTrigger>
                <TabsTrigger
                  value="subtasks"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-primary data-[state=active]:shadow-none px-4 py-2.5"
                >
                  子任務 {subTasksTotal > 0 && `(${subTasksTotal})`}
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-morandi-gold data-[state=active]:bg-transparent data-[state=active]:text-morandi-primary data-[state=active]:shadow-none px-4 py-2.5"
                >
                  活動
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* 詳情 Tab */}
                <TabsContent value="detail" className="mt-0 space-y-4">
                  {/* 描述 */}
                  <Section title="描述" icon={FileText}>
                    {canEdit ? (
                      <Textarea
                        value={todo.description || ''}
                        onChange={e =>
                          onUpdate({ description: e.target.value || undefined })
                        }
                        placeholder="新增描述..."
                        rows={3}
                        className="text-sm resize-none border-morandi-container/40 focus-visible:ring-morandi-gold focus-visible:border-morandi-gold"
                      />
                    ) : (
                      <div className="text-sm text-morandi-primary whitespace-pre-wrap min-h-[40px]">
                        {todo.description || (
                          <span className="text-morandi-muted">未填寫</span>
                        )}
                      </div>
                    )}
                  </Section>

                  {/* 業務快捷操作 grid */}
                  <Section title="業務快捷操作">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <QuickActionGridButton
                        icon={FileText}
                        label="建立請款單"
                        sublabel="連結 ERP 請款功能"
                        onClick={() => addInstance('invoice')}
                        disabled={!canEdit}
                      />
                      <QuickActionGridButton
                        icon={ReceiptIcon}
                        label="確認收款"
                        sublabel="連結 ERP 收款功能"
                        onClick={() => addInstance('receipt')}
                        disabled={!canEdit}
                      />
                      <QuickActionGridButton
                        icon={Plane}
                        label="訂票作業"
                        sublabel="連結航班訂位系統"
                        onClick={() => alert('訂票作業敬請期待')}
                        disabled={!canEdit}
                      />
                      <QuickActionGridButton
                        icon={BookOpen}
                        label="行前說明"
                        sublabel="產生行前文件"
                        onClick={() => alert('行前說明敬請期待')}
                        disabled={!canEdit}
                      />
                    </div>
                  </Section>

                  {/* 已新增的快捷實例（堆疊、可同時對照） */}
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

                  {/* 關聯 ERP 資料 */}
                  <Section title="關聯 ERP 資料" icon={ShoppingCart}>
                    {todo.related_items && todo.related_items.length > 0 ? (
                      <div className="space-y-2">
                        {todo.related_items.map((item, i) => {
                          const meta = RELATED_TYPE_META[item.type] || {
                            icon: FileText,
                            label: item.type,
                          }
                          const Icon = meta.icon
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg"
                            >
                              <Icon size={14} className="text-morandi-gold flex-shrink-0" />
                              <span className="text-xs text-morandi-secondary flex-shrink-0">
                                {meta.label}
                              </span>
                              <span className="text-sm text-morandi-primary flex-1 truncate">
                                {item.title}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-morandi-muted text-center py-3">
                        尚無關聯資料
                      </p>
                    )}
                  </Section>

                  {/* 封面圖片 placeholder */}
                  <div className="border border-dashed border-border rounded-lg py-8 flex items-center justify-center text-morandi-muted">
                    <div className="flex items-center gap-2 text-sm">
                      <ImageIcon size={18} />
                      封面圖片（敬請期待）
                    </div>
                  </div>
                </TabsContent>

                {/* 子任務 Tab */}
                <TabsContent value="subtasks" className="mt-0 space-y-2">
                  {todo.sub_tasks && todo.sub_tasks.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-morandi-secondary">
                          進度 {subTasksDone}/{subTasksTotal}
                        </span>
                        <div className="flex-1 mx-3 h-1 bg-morandi-container/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-morandi-green rounded-full transition-all"
                            style={{
                              width: `${(subTasksDone / subTasksTotal) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        {todo.sub_tasks.map((subtask, i) => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-morandi-container/20 transition-colors"
                          >
                            <button
                              onClick={() => {
                                if (!canEdit) return
                                const updated = [...(todo.sub_tasks || [])]
                                updated[i] = { ...subtask, done: !subtask.done }
                                onUpdate({ sub_tasks: updated })
                              }}
                              disabled={!canEdit}
                              className="text-morandi-secondary hover:text-morandi-primary transition-colors disabled:cursor-not-allowed"
                            >
                              {subtask.done ? (
                                <CheckSquare size={16} className="text-morandi-green" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                            <span
                              className={cn(
                                'text-sm flex-1',
                                subtask.done
                                  ? 'line-through text-morandi-muted'
                                  : 'text-morandi-primary'
                              )}
                            >
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-morandi-muted text-center py-6">
                      尚無子任務
                    </p>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <CheckSquare size={16} className="text-morandi-secondary flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="新增子任務（按 Enter）..."
                        className="flex-1 text-sm bg-transparent border-0 border-b border-border focus:border-morandi-gold focus:outline-none py-1"
                        onKeyDown={e => {
                          if (
                            e.key === 'Enter' &&
                            !e.nativeEvent.isComposing &&
                            e.currentTarget.value.trim()
                          ) {
                            const newSubtask = {
                              id: `st-${Date.now()}`,
                              title: e.currentTarget.value.trim(),
                              done: false,
                            }
                            onUpdate({
                              sub_tasks: [...(todo.sub_tasks || []), newSubtask],
                            })
                            e.currentTarget.value = ''
                          }
                        }}
                      />
                    </div>
                  )}
                </TabsContent>

                {/* 活動 Tab */}
                <TabsContent value="activity" className="mt-0">
                  <NotesSection todo={todo} onUpdate={onUpdate} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right：sidebar */}
          <aside className="border-l border-border bg-card/40 flex flex-col overflow-y-auto">
            <div className="p-4 space-y-4">
              <SidebarItem label="狀態">
                <Select
                  value={todo.status}
                  onValueChange={(v: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
                    if (!canEdit) return
                    onUpdate({ status: v, completed: v === 'completed' })
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TODO_STATUS_LABELS) as Array<
                      keyof typeof TODO_STATUS_LABELS
                    >).map(s => (
                      <SelectItem key={s} value={s}>
                        {TODO_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarItem>

              <SidebarItem label="優先度">
                <div className="space-y-0.5">
                  {PRIORITY_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => canEdit && onUpdate({ priority: level.value })}
                      disabled={!canEdit}
                      className={cn(
                        'flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-colors disabled:cursor-not-allowed',
                        todo.priority === level.value
                          ? cn('bg-morandi-container/40 font-medium', level.text)
                          : 'text-morandi-secondary hover:bg-morandi-container/20'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', level.dot)} />
                      {level.label}
                    </button>
                  ))}
                </div>
              </SidebarItem>

              <SidebarItem label="到期日">
                <DatePicker
                  value={todo.deadline || ''}
                  onChange={date => canEdit && onUpdate({ deadline: date })}
                  placeholder="選擇日期"
                  className="h-8 text-xs"
                />
              </SidebarItem>

              <SidebarItem label="負責人">
                {assigneeName ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-morandi-container/30 rounded">
                    <span className="w-6 h-6 rounded-full bg-morandi-gold/20 flex items-center justify-center text-[10px] font-medium text-morandi-gold">
                      {assigneeName.slice(0, 1)}
                    </span>
                    <span className="text-xs text-morandi-primary">{assigneeName}</span>
                  </div>
                ) : (
                  <p className="text-xs text-morandi-muted px-2">未指派</p>
                )}
              </SidebarItem>

              {todo.related_items && todo.related_items.length > 0 && (
                <SidebarItem label="關聯">
                  <div className="space-y-1">
                    {todo.related_items.map((item, i) => {
                      const meta = RELATED_TYPE_META[item.type] || { icon: FileText }
                      const Icon = meta.icon
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2 py-1 bg-morandi-container/30 rounded text-xs"
                        >
                          <Icon size={12} className="text-morandi-gold flex-shrink-0" />
                          <span className="text-morandi-primary truncate">{item.title}</span>
                        </div>
                      )
                    })}
                  </div>
                </SidebarItem>
              )}

              <SidebarItem label="動作">
                <div className="space-y-0.5">
                  <button
                    onClick={() => canEdit && addInstance('share')}
                    disabled={!canEdit}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-morandi-primary hover:bg-morandi-container/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus size={12} className="text-morandi-gold" />
                    共享
                  </button>
                  <button
                    onClick={() => alert('標籤敬請期待')}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-morandi-primary hover:bg-morandi-container/30"
                  >
                    <Tag size={12} className="text-morandi-gold" />
                    標籤
                  </button>
                  <button
                    onClick={() => alert('複製敬請期待')}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-morandi-primary hover:bg-morandi-container/30"
                  >
                    <Copy size={12} className="text-morandi-gold" />
                    複製
                  </button>
                </div>
              </SidebarItem>

              {canEdit && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <Button
                    onClick={() => {
                      onUpdate({ status: 'completed', completed: true })
                      onClose()
                    }}
                    variant="soft-gold"
                    className="w-full gap-1.5 h-8 text-xs"
                  >
                    <CheckSquare size={14} />
                    標記完成
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newDeadline = new Date()
                      newDeadline.setDate(newDeadline.getDate() + 7)
                      onUpdate({ deadline: formatDate(newDeadline) })
                    }}
                    className="w-full gap-1.5 h-8 text-xs"
                  >
                    <Calendar size={14} />
                    延期一週
                  </Button>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* TaskTypeForm（如有 task_type、保留既有功能） */}
        {todo.task_type && canEdit && (
          <div className="border-t border-border bg-card/40 px-6 py-3 max-h-[200px] overflow-y-auto">
            <TaskTypeForm
              taskType={todo.task_type}
              todo={todo}
              onUpdate={onUpdate}
              onClose={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title?: string
  icon?: typeof FileText
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      {title && (
        <h4 className="text-xs font-semibold text-morandi-primary mb-3 flex items-center gap-1.5">
          {Icon && <Icon size={14} className="text-morandi-gold" />}
          {title}
        </h4>
      )}
      {children}
    </div>
  )
}

function QuickActionGridButton({
  icon: Icon,
  label,
  sublabel,
  onClick,
  disabled,
}: {
  icon: typeof FileText
  label: string
  sublabel: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:border-morandi-gold/40 hover:bg-morandi-gold/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="p-2 bg-morandi-gold/10 rounded flex-shrink-0">
        <Icon size={16} className="text-morandi-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-morandi-primary">{label}</div>
        <div className="text-[10px] text-morandi-secondary mt-0.5">{sublabel}</div>
      </div>
    </button>
  )
}

function SidebarItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-medium uppercase tracking-wide text-morandi-muted mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  )
}
