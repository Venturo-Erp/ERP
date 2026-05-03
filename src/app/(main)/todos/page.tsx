'use client'

import { LABELS } from './constants/labels'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useTodos } from '@/hooks/useTodos'
import { useEmployeesSlim } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { alertError } from '@/lib/ui/alert-dialog'
import {
  X,
  Plus,
  GripVertical,
  Calendar,
  MapPin,
  MoreHorizontal,
  Trash2,
  Pencil,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { TodoExpandedView } from '@/features/todos/components/todo-expanded-view'
import { StarRating } from '@/components/ui/star-rating'
import { Todo } from '@/stores/types'
import { ConfirmDialog } from '@/components/dialog/confirm-dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { DatePicker } from '@/components/ui/date-picker'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'

export const dynamic = 'force-dynamic'

interface TodoColumn {
  id: string
  workspace_id: string
  name: string
  color: string
  sort_order: number
  is_system: boolean
  mapped_status: string | null
}

// 欄位顏色對應（全部走設計變數，跟主題切換）
const COLOR_MAP: Record<string, { border: string; text: string }> = {
  gray: { border: 'border-morandi-muted', text: 'text-morandi-secondary' },
  gold: { border: 'border-morandi-gold', text: 'text-morandi-gold' },
  green: { border: 'border-morandi-green', text: 'text-morandi-green' },
  red: { border: 'border-morandi-red', text: 'text-morandi-red' },
  blue: { border: 'border-status-info', text: 'text-status-info' },
  purple: { border: 'border-cat-purple/30', text: 'text-cat-purple' },
  orange: { border: 'border-cat-orange/30', text: 'text-cat-orange' },
  pink: { border: 'border-cat-pink/30', text: 'text-cat-pink' },
  indigo: { border: 'border-cat-indigo/30', text: 'text-cat-indigo' },
}

export default function TodosPage() {
  const { todos, create: addTodo, update: updateTodo, delete: removeTodo } = useTodos()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim()
  const searchParams = useSearchParams()
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<number | 'all'>('all')
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null)
  const [quickAddValue, setQuickAddValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { confirm, confirmDialogProps } = useConfirmDialog()

  // 看板欄位
  const [columns, setColumns] = useState<TodoColumn[]>([])
  const [columnsLoading, setColumnsLoading] = useState(true)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  // 載入欄位
  const loadColumns = useCallback(async () => {
    try {
      const res = await fetch('/api/todo-columns')
      if (res.ok) {
        const data = await res.json()
        setColumns(data || [])
      }
    } catch (err) {
      logger.error('載入欄位失敗:', err)
    } finally {
      setColumnsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadColumns()
  }, [loadColumns])

  // 處理跳轉
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId) setExpandedTodo(expandId)
  }, [searchParams])

  // 員工名稱
  const getEmployeeName = useCallback(
    (id?: string) => {
      if (!id) return null
      const emp = employees?.find(e => e.id === id)
      return emp?.chinese_name || emp?.display_name || null
    },
    [employees]
  )

  // 篩選後的 todos
  const visibleTodos = useMemo(() => {
    if (!todos || !Array.isArray(todos)) return []
    const currentUserId = user?.id

    return todos.filter(todo => {
      if (currentUserId) {
        const isCreator = (todo.creator || todo.created_by) === currentUserId
        const isAssignee = todo.assignee === currentUserId
        const inVisibility = todo.visibility?.includes(currentUserId)
        if (!isCreator && !isAssignee && !inVisibility) return false
      }
      if (searchTerm && !todo.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false
      if (memberFilter !== 'all' && todo.assignee !== memberFilter) return false
      return true
    })
  }, [todos, searchTerm, priorityFilter, memberFilter, user?.id])

  // 按 column_id 分組
  const todosByColumn = useMemo(() => {
    const map: Record<string, Todo[]> = {}
    columns.forEach(col => {
      map[col.id] = []
    })

    // 找預設欄位（沒有 column_id 的 todo 會放這裡）
    const defaultCol = columns.find(c => c.mapped_status === 'pending') || columns[0]

    visibleTodos.forEach(todo => {
      const colId = todo.column_id || defaultCol?.id
      if (colId && map[colId]) {
        map[colId].push(todo)
      }
    })

    // 按優先級排序
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (b.priority || 1) - (a.priority || 1))
    })

    return map
  }, [visibleTodos, columns])

  // 拖曳結束
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination, source, type } = result
      if (!destination) return

      // 拖曳欄位順序
      if (type === 'column') {
        if (destination.index === source.index) return
        const reordered = Array.from(columns)
        const [moved] = reordered.splice(source.index, 1)
        reordered.splice(destination.index, 0, moved)
        // 更新 sort_order
        const withOrder = reordered.map((col, idx) => ({ ...col, sort_order: idx + 1 }))
        setColumns(withOrder)
        fetch('/api/todo-columns', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reorder: withOrder.map(c => ({ id: c.id, sort_order: c.sort_order })),
          }),
        }).catch(err => logger.error('欄位排序失敗:', err))
        return
      }

      // 拖曳卡片
      const newColumnId = destination.droppableId
      const todo = todos?.find(t => t.id === draggableId)
      if (!todo || todo.column_id === newColumnId) return

      // 對應到 status（系統欄位才設 status）
      const targetColumn = columns.find(c => c.id === newColumnId)
      const updates: Partial<Todo> = { column_id: newColumnId }
      if (targetColumn?.mapped_status) {
        updates.status = targetColumn.mapped_status as Todo['status']
        updates.completed = targetColumn.mapped_status === 'completed'
      }

      updateTodo(draggableId, updates)
    },
    [columns, todos, updateTodo]
  )

  // 快速新增卡片
  const handleQuickAdd = useCallback(
    async (columnId: string) => {
      if (!quickAddValue.trim() || isSubmitting) return

      // 直接從 store 取最新 user，避免 hydration timing 或 closure stale
      const currentUser = useAuthStore.getState().user
      if (!currentUser?.id) {
        await alertError('請先登入')
        return
      }

      const column = columns.find(c => c.id === columnId)
      const status = (column?.mapped_status || 'pending') as Todo['status']

      setIsSubmitting(true)
      try {
        await addTodo({
          title: quickAddValue.trim(),
          priority: 1,
          status,
          completed: status === 'completed',
          column_id: columnId,
          creator: currentUser.id,
          assignee: currentUser.id, // 建立者預設為負責人
          visibility: [currentUser.id],
          related_items: [],
          sub_tasks: [],
          notes: [],
          enabled_quick_actions: ['receipt', 'quote'],
        })
        setQuickAddValue('')
        setQuickAddColumn(null)
      } catch (error) {
        logger.error('快速新增失敗:', error)
        await alertError(LABELS.ADD_FAILED)
      } finally {
        setIsSubmitting(false)
      }
    },
    [quickAddValue, isSubmitting, addTodo, columns]
  )

  // 新增欄位
  const handleAddColumn = useCallback(async () => {
    if (!newColumnName.trim()) return
    try {
      const res = await fetch('/api/todo-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColumnName.trim(), color: 'gray' }),
      })
      if (res.ok) {
        const col = await res.json()
        setColumns(prev => [...prev, col])
        setNewColumnName('')
        setIsAddingColumn(false)
      }
    } catch (err) {
      logger.error('新增欄位失敗:', err)
    }
  }, [newColumnName])

  // 重命名欄位
  const handleRenameColumn = useCallback(async (columnId: string, name: string) => {
    if (!name.trim()) {
      setEditingColumnId(null)
      return
    }
    try {
      await fetch('/api/todo-columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: columnId, name: name.trim() }),
      })
      setColumns(prev => prev.map(c => (c.id === columnId ? { ...c, name: name.trim() } : c)))
    } catch (err) {
      logger.error('重命名失敗:', err)
    } finally {
      setEditingColumnId(null)
    }
  }, [])

  // 刪除欄位
  const handleDeleteColumn = useCallback(
    async (column: TodoColumn) => {
      const itemCount = todosByColumn[column.id]?.length || 0
      const confirmed = await confirm({
        type: 'danger',
        title: `刪除欄位「${column.name}」`,
        message:
          itemCount > 0
            ? `此欄位內有 ${itemCount} 張卡片，刪除後卡片會移到第一欄`
            : '確定要刪除這個欄位嗎？',
        confirmLabel: '刪除',
        cancelLabel: '取消',
      })
      if (!confirmed) return

      try {
        const res = await fetch(`/api/todo-columns?id=${column.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const err = await res.json()
          await alertError(err.error || '刪除失敗')
          return
        }
        // 卡片移到第一欄
        const firstCol = columns.find(c => c.id !== column.id)
        if (firstCol && itemCount > 0) {
          const items = todosByColumn[column.id] || []
          for (const todo of items) {
            await updateTodo(todo.id, { column_id: firstCol.id })
          }
        }
        setColumns(prev => prev.filter(c => c.id !== column.id))
      } catch (err) {
        logger.error('刪除欄位失敗:', err)
      }
    },
    [columns, todosByColumn, updateTodo, confirm]
  )

  // 新增待辦（完整 Dialog）
  const handleAddTodo = useCallback(
    async (formData: {
      title: string
      priority: 1 | 2 | 3 | 4 | 5
      deadline: string
      assignee: string
      enabled_quick_actions: ('receipt' | 'invoice' | 'group' | 'quote' | 'assign')[]
    }) => {
      const currentUser = useAuthStore.getState().user
      if (!currentUser?.id) {
        await alertError('請先登入')
        return
      }

      try {
        const visibilityList = [currentUser.id]
        if (formData.assignee && formData.assignee !== currentUser.id) {
          visibilityList.push(formData.assignee)
        }

        const firstCol = columns.find(c => c.mapped_status === 'pending') || columns[0]

        await addTodo({
          title: formData.title,
          priority: formData.priority,
          deadline: formData.deadline || undefined,
          status: 'pending',
          completed: false,
          column_id: firstCol?.id,
          creator: currentUser.id,
          assignee: formData.assignee || currentUser.id, // 沒填指派人就預設為建立者
          visibility: visibilityList,
          related_items: [],
          sub_tasks: [],
          notes: [],
          enabled_quick_actions: formData.enabled_quick_actions || ['receipt', 'quote'],
        })
        setIsAddDialogOpen(false)
      } catch (error) {
        logger.error('新增失敗:', error)
        await alertError(LABELS.ADD_FAILED)
      }
    },
    [addTodo, columns]
  )

  // 截止日期
  const getDeadlineInfo = useCallback((deadline?: string) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const formatted = date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })

    if (diffDays < 0)
      return { text: `逾期 ${Math.abs(diffDays)} 天`, color: 'text-morandi-red bg-morandi-red/10' }
    if (diffDays === 0) return { text: '今天', color: 'text-morandi-gold bg-morandi-gold/10' }
    if (diffDays <= 3)
      return { text: `${diffDays} 天後`, color: 'text-morandi-gold/80 bg-morandi-gold/5' }
    return { text: formatted, color: 'text-morandi-secondary bg-morandi-container/50' }
  }, [])

  // 點擊卡片（穩定 callback 避免 TodoCardMemo 重渲染）
  const handleCardClick = useCallback((id: string) => {
    setExpandedTodo(id)
  }, [])

  // 切換優先級
  const handleChangePriority = useCallback(
    async (todo: Todo, priority: number) => {
      if (priority === todo.priority) return
      await updateTodo(todo.id, { priority: priority as 1 | 2 | 3 | 4 | 5 })
    },
    [updateTodo]
  )

  // 切換完成狀態
  const handleToggleComplete = useCallback(
    async (todo: Todo) => {
      const nowCompleted = !todo.completed
      // 切換時把 status 也同步到對應欄位
      const targetStatus: Todo['status'] = nowCompleted ? 'completed' : 'pending'
      const targetColumn = columns.find(c => c.mapped_status === targetStatus) || columns[0]
      await updateTodo(todo.id, {
        completed: nowCompleted,
        status: targetStatus,
        column_id: targetColumn?.id,
      })
    },
    [updateTodo, columns]
  )

  // 刪除卡片
  const handleDeleteTodo = useCallback(
    async (todo: Todo) => {
      const confirmed = window.confirm(`確定刪除「${todo.title}」？`)
      if (!confirmed) return
      try {
        await removeTodo(todo.id)
      } catch (err) {
        logger.error('刪除失敗:', err)
        await alertError('刪除失敗')
      }
    },
    [removeTodo]
  )

  // 優先級左側邊框
  const getPriorityBorder = useCallback((priority: number) => {
    switch (priority) {
      case 5:
        return 'border-l-morandi-red'
      case 4:
        return 'border-l-orange-400'
      case 3:
        return 'border-l-morandi-gold'
      case 2:
        return 'border-l-sky-400'
      default:
        return 'border-l-morandi-muted'
    }
  }, [])

  return (
    <ContentPageLayout
      title={LABELS.LABEL_9553}
      showSearch
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={LABELS.SEARCH_PLACEHOLDER}
      badge={
        <span className="text-xs font-normal text-morandi-secondary bg-morandi-container/60 px-2 py-0.5 rounded-full">
          {visibleTodos.length} / {todos?.length || 0}
        </span>
      }
      headerActions={
        <div className="flex items-center gap-2">
          <Select
            value={String(priorityFilter)}
            onValueChange={v =>
              setPriorityFilter(v === 'all' ? 'all' : (Number(v) as 1 | 2 | 3 | 4 | 5))
            }
          >
            <SelectTrigger className="h-9 w-[120px] text-xs">
              <SelectValue placeholder="優先度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部優先度</SelectItem>
              <SelectItem value="5">★★★★★ 緊急</SelectItem>
              <SelectItem value="4">★★★★ 高</SelectItem>
              <SelectItem value="3">★★★ 中</SelectItem>
              <SelectItem value="2">★★ 低</SelectItem>
              <SelectItem value="1">★ 很低</SelectItem>
            </SelectContent>
          </Select>
          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger className="h-9 w-[120px] text-xs">
              <SelectValue placeholder="負責人" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部負責人</SelectItem>
              {employees?.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.display_name || emp.chinese_name || emp.english_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(priorityFilter !== 'all' || memberFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-morandi-secondary"
              onClick={() => {
                setPriorityFilter('all')
                setMemberFilter('all')
              }}
            >
              清除篩選
            </Button>
          )}
        </div>
      }
      primaryAction={{
        label: LABELS.ADD_TASK,
        icon: Plus,
        onClick: () => setIsAddDialogOpen(true),
      }}
      className="h-full flex flex-col -m-4 lg:-m-6"
      contentClassName="flex-1 overflow-hidden"
    >
      {/* 看板 */}
      <div className="h-full flex flex-col">
        {columnsLoading ? (
          <div className="flex-1 flex items-center justify-center text-morandi-muted">
            載入中...
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" type="column" direction="horizontal">
              {provided => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-4"
                >
                  <div className="flex gap-3 h-full min-w-max items-start">
                    {columns.map((column, index) => {
                      const items = todosByColumn[column.id] || []
                      const colorClass = COLOR_MAP[column.color] || COLOR_MAP.gray

                      return (
                        <Draggable key={column.id} draggableId={column.id} index={index}>
                          {provided => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex flex-col w-[300px] flex-shrink-0 max-h-full bg-morandi-container/40 rounded-xl border border-border/40 shadow-sm"
                            >
                              {/* 欄位標題 */}
                              <div
                                {...provided.dragHandleProps}
                                className={cn(
                                  'flex items-center justify-between px-3 py-3 cursor-grab border-b-2 rounded-t-xl',
                                  colorClass.border
                                )}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {editingColumnId === column.id ? (
                                    <Input
                                      autoFocus
                                      value={editingColumnName}
                                      onChange={e => setEditingColumnName(e.target.value)}
                                      onBlur={() =>
                                        handleRenameColumn(column.id, editingColumnName)
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter')
                                          handleRenameColumn(column.id, editingColumnName)
                                        if (e.key === 'Escape') setEditingColumnId(null)
                                      }}
                                      onClick={e => e.stopPropagation()}
                                      className="h-7 text-sm"
                                    />
                                  ) : (
                                    <span
                                      className="text-sm font-semibold text-morandi-primary truncate"
                                      onDoubleClick={() => {
                                        setEditingColumnId(column.id)
                                        setEditingColumnName(column.name)
                                      }}
                                    >
                                      {column.name}
                                    </span>
                                  )}
                                  <span className="text-xs text-morandi-muted bg-morandi-container/60 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    {items.length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      setQuickAddColumn(column.id)
                                      setQuickAddValue('')
                                    }}
                                    className="p-1 rounded hover:bg-morandi-container/50 text-morandi-secondary hover:text-morandi-primary transition-colors"
                                    title="新增卡片"
                                  >
                                    <Plus size={16} />
                                  </button>
                                  {!column.is_system && (
                                    <>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation()
                                          setEditingColumnId(column.id)
                                          setEditingColumnName(column.name)
                                        }}
                                        className="p-1 rounded hover:bg-morandi-container/50 text-morandi-secondary hover:text-morandi-primary transition-colors"
                                        title="重命名"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleDeleteColumn(column)
                                        }}
                                        className="p-1 rounded hover:bg-morandi-red/10 text-morandi-secondary hover:text-morandi-red transition-colors"
                                        title="刪除欄位"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* 快速新增 */}
                              {quickAddColumn === column.id && (
                                <div className="mx-2 mt-2 bg-card rounded-lg border border-border shadow-sm p-3">
                                  <Input
                                    autoFocus
                                    placeholder="輸入任務標題..."
                                    value={quickAddValue}
                                    onChange={e => setQuickAddValue(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                        e.preventDefault()
                                        handleQuickAdd(column.id)
                                      }
                                      if (e.key === 'Escape') setQuickAddColumn(null)
                                    }}
                                    className="h-8 text-sm mb-2"
                                  />
                                  <div className="flex gap-2">
                                    <Button variant="soft-gold"
                                      size="sm"
 className="h-7 text-xs"
                                      onClick={() => handleQuickAdd(column.id)}
                                      disabled={!quickAddValue.trim() || isSubmitting}
                                    >
                                      新增
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() => setQuickAddColumn(null)}
                                    >
                                      取消
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* 卡片列表 */}
                              <Droppable droppableId={column.id} type="card">
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={cn(
                                      'flex-1 overflow-y-auto space-y-2 p-2 transition-colors min-h-[80px]',
                                      snapshot.isDraggingOver && 'bg-morandi-gold/10'
                                    )}
                                  >
                                    {items.map((todo, index) => (
                                      <TodoCardMemo
                                        key={todo.id}
                                        todo={todo}
                                        index={index}
                                        assigneeName={getEmployeeName(todo.assignee)}
                                        currentUserId={user?.id}
                                        onClick={handleCardClick}
                                        onToggleComplete={handleToggleComplete}
                                        onDelete={handleDeleteTodo}
                                        onChangePriority={handleChangePriority}
                                      />
                                    ))}
                                    {provided.placeholder}
                                    {items.length === 0 && !snapshot.isDraggingOver && (
                                      <div className="text-center py-8 text-sm text-morandi-muted/60">
                                        拖曳卡片到這裡
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}

                    {/* 新增欄位 */}
                    <div className="w-[320px] flex-shrink-0">
                      {isAddingColumn ? (
                        <div className="bg-morandi-container/30 rounded-lg p-3">
                          <Input
                            autoFocus
                            placeholder="欄位名稱..."
                            value={newColumnName}
                            onChange={e => setNewColumnName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                e.preventDefault()
                                handleAddColumn()
                              }
                              if (e.key === 'Escape') {
                                setIsAddingColumn(false)
                                setNewColumnName('')
                              }
                            }}
                            className="h-8 text-sm mb-2"
                          />
                          <div className="flex gap-2">
                            <Button variant="soft-gold"
                              size="sm"
 className="h-7 text-xs"
                              onClick={handleAddColumn}
                              disabled={!newColumnName.trim()}
                            >
                              新增欄位
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => {
                                setIsAddingColumn(false)
                                setNewColumnName('')
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingColumn(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-morandi-container/20 hover:bg-morandi-container/40 text-morandi-secondary hover:text-morandi-primary transition-colors text-sm font-medium border-2 border-dashed border-border/50"
                        >
                          <Plus size={16} />
                          新增欄位
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* 展開卡片 */}
      {expandedTodo &&
        (() => {
          const todo = todos?.find(t => t.id === expandedTodo)
          if (!todo) return null
          return (
            <TodoExpandedView
              todo={todo}
              onUpdate={updates => updateTodo(expandedTodo, updates)}
              onClose={() => setExpandedTodo(null)}
              onDelete={() => {
                setExpandedTodo(null)
                handleDeleteTodo(todo)
              }}
            />
          )
        })()}

      {/* 新增 Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{LABELS.ADD_TODO}</DialogTitle>
            <DialogDescription>{LABELS.ADD_TODO_DESC}</DialogDescription>
          </DialogHeader>
          <AddTodoForm onSubmit={handleAddTodo} onCancel={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmDialogProps} />
    </ContentPageLayout>
  )
}

// 新增待辦表單
function AddTodoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    title: string
    priority: 1 | 2 | 3 | 4 | 5
    deadline: string
    assignee: string
    enabled_quick_actions: ('receipt' | 'invoice' | 'group' | 'quote' | 'assign')[]
  }) => void
  onCancel: () => void
}) {
  const { items: users, loading: isLoadingUsers } = useEmployeesSlim()
  const [formData, setFormData] = useState({
    title: '',
    priority: 3 as 1 | 2 | 3 | 4 | 5,
    deadline: '',
    assignee: '',
    enabled_quick_actions: ['receipt', 'quote'] as (
      | 'receipt'
      | 'invoice'
      | 'group'
      | 'quote'
      | 'assign'
    )[],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert(LABELS.ENTER_TITLE)
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {LABELS.TASK_TITLE}
        </label>
        <Input
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder={LABELS.LABEL_3467}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {LABELS.URGENCY}
        </label>
        <StarRating
          value={formData.priority}
          onChange={value => setFormData({ ...formData, priority: value as 1 | 2 | 3 | 4 | 5 })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {LABELS.DEADLINE}
        </label>
        <DatePicker
          value={formData.deadline}
          onChange={date => setFormData({ ...formData, deadline: date })}
          placeholder={LABELS.SELECT_5234}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">
          {LABELS.LABEL_7694}
        </label>
        <Select
          value={formData.assignee || '__none__'}
          onValueChange={value =>
            setFormData({ ...formData, assignee: value === '__none__' ? '' : value })
          }
          disabled={isLoadingUsers}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={isLoadingUsers ? LABELS.LOADING_EMPLOYEES : LABELS.NO_ASSIGN}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{LABELS.NO_ASSIGN}</SelectItem>
            {users &&
              users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.display_name} ({user.employee_number})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="soft-gold"
          type="submit"
 className="flex-1 gap-2"
        >
          <Plus size={16} />
          {LABELS.LABEL_1974}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
          <X size={16} />
          {LABELS.CANCEL}
        </Button>
      </div>
    </form>
  )
}

// ============================================
// 看板卡片（memo 化 — 避免拖曳時全部重渲染）
// ============================================

interface TodoCardMemoProps {
  todo: Todo
  index: number
  assigneeName: string | null
  currentUserId: string | undefined
  onClick: (id: string) => void
  onToggleComplete: (todo: Todo) => void
  onDelete: (todo: Todo) => void
  onChangePriority: (todo: Todo, priority: number) => void
}

/**
 * 5 級 priority 中文 label
 */
const PRIORITY_LABELS: Record<number, string> = {
  1: '很低',
  2: '低',
  3: '中',
  4: '高',
  5: '緊急',
}

/**
 * 卡片頂端 priority bar 顏色（5 級）
 */
function getPriorityBarClass(priority: number): string {
  switch (priority) {
    case 5:
      return 'bg-morandi-red'
    case 4:
      return 'bg-orange-400'
    case 3:
      return 'bg-morandi-gold'
    case 2:
      return 'bg-sky-400'
    default:
      return 'bg-morandi-muted'
  }
}

/**
 * 卡片內 priority 文字 badge 樣式（5 級）
 */
function getPriorityBadgeClass(priority: number): string {
  switch (priority) {
    case 5:
      return 'bg-morandi-red/10 text-morandi-red border border-morandi-red/20'
    case 4:
      return 'bg-orange-50 text-orange-600 border border-orange-100'
    case 3:
      return 'bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/20'
    case 2:
      return 'bg-sky-50 text-sky-600 border border-sky-100'
    default:
      return 'bg-morandi-muted/10 text-morandi-muted border border-morandi-muted/20'
  }
}

function getDeadlineBadge(deadline?: string) {
  if (!deadline) return null
  const date = new Date(deadline)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  if (diffDays < 0)
    return { text: `逾期 ${Math.abs(diffDays)} 天`, color: 'text-morandi-red bg-morandi-red/10' }
  if (diffDays === 0) return { text: '今天', color: 'text-morandi-gold bg-morandi-gold/10' }
  if (diffDays <= 3)
    return { text: `${diffDays} 天後`, color: 'text-morandi-gold/80 bg-morandi-gold/5' }
  return { text: formatted, color: 'text-morandi-secondary bg-morandi-container/50' }
}

const TodoCardMemo = React.memo(
  function TodoCardMemo({
    todo,
    index,
    assigneeName,
    currentUserId,
    onClick,
    onToggleComplete,
    onDelete,
    onChangePriority,
  }: TodoCardMemoProps) {
    const deadlineInfo = getDeadlineBadge(todo.deadline)
    const subTasksDone = todo.sub_tasks?.filter(s => s.done).length || 0
    const subTasksTotal = todo.sub_tasks?.length || 0
    const unreadNotes = (todo.notes || []).filter(
      n => n.author_id !== currentUserId && !n.read_by?.includes(currentUserId || '')
    ).length

    return (
      <Draggable draggableId={todo.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onClick(todo.id)}
            className={cn(
              'group relative cursor-pointer transition-all rounded-md',
              'bg-card/60 border border-border/40 hover:bg-card hover:border-morandi-gold/40 hover:shadow-sm',
              snapshot.isDragging && 'bg-card shadow-xl ring-2 ring-morandi-gold rotate-[1deg]',
              todo.status === 'completed' && 'opacity-60'
            )}
          >
            <div className="p-2.5 relative">
              {/* Hover actions */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onToggleComplete(todo)
                  }}
                  title={todo.completed ? '標為未完成' : '標為完成'}
                  className="p-1 rounded bg-card/80 border border-border hover:bg-morandi-green/10 hover:border-morandi-green hover:text-morandi-green text-morandi-secondary transition-colors"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(todo)
                  }}
                  title="刪除"
                  className="p-1 rounded bg-card/80 border border-border hover:bg-morandi-red/10 hover:border-morandi-red hover:text-morandi-red text-morandi-secondary transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="flex items-start gap-2 pr-14">
                <p
                  className={cn(
                    'flex-1 text-sm font-medium text-morandi-primary leading-snug',
                    todo.status === 'completed' && 'line-through'
                  )}
                >
                  {todo.title}
                </p>
                {unreadNotes > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-morandi-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadNotes}
                  </span>
                )}
              </div>

              {todo.description && (
                <p className="text-xs text-morandi-secondary mt-1.5 line-clamp-2 leading-relaxed">
                  {todo.description}
                </p>
              )}

              {/* Tags row：priority 文字 badge + 關聯 +N（demo 風格） */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span
                  className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded',
                    getPriorityBadgeClass(todo.priority || 1)
                  )}
                >
                  {PRIORITY_LABELS[todo.priority || 1]}
                </span>

                {todo.related_items && todo.related_items.length > 0 && (
                  <>
                    <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-morandi-gold/20 bg-morandi-gold/5 text-morandi-primary max-w-[150px]">
                      <MapPin size={10} className="text-morandi-gold flex-shrink-0" />
                      <span className="truncate">{todo.related_items[0].title}</span>
                    </span>
                    {todo.related_items.length > 1 && (
                      <span
                        className="text-[10px] bg-morandi-container/50 text-morandi-secondary px-1.5 py-0.5 rounded flex-shrink-0"
                        title={todo.related_items
                          .slice(1)
                          .map(i => i.title)
                          .join('、')}
                      >
                        +{todo.related_items.length - 1}
                      </span>
                    )}
                  </>
                )}
              </div>

              {subTasksTotal > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 bg-morandi-container/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-morandi-green rounded-full"
                      style={{ width: `${(subTasksDone / subTasksTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-morandi-muted">
                    {subTasksDone}/{subTasksTotal}
                  </span>
                </div>
              )}

              {/* Footer：avatar 左、截止日右（demo 風格） */}
              <div className="flex items-center justify-between mt-2.5">
                {assigneeName ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-morandi-gold/20 flex items-center justify-center text-[10px] font-medium text-morandi-gold">
                      {assigneeName.slice(0, 1)}
                    </div>
                    <span className="text-[11px] text-morandi-secondary">{assigneeName}</span>
                  </div>
                ) : (
                  <div />
                )}

                {deadlineInfo && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[11px]',
                      deadlineInfo.color
                    )}
                  >
                    <Calendar size={10} />
                    {deadlineInfo.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    )
  },
  (prev, next) => {
    // 精準比對：只有以下欄位變化才重渲染
    return (
      prev.todo.id === next.todo.id &&
      prev.todo.title === next.todo.title &&
      prev.todo.description === next.todo.description &&
      prev.todo.status === next.todo.status &&
      prev.todo.priority === next.todo.priority &&
      prev.todo.deadline === next.todo.deadline &&
      prev.todo.column_id === next.todo.column_id &&
      prev.todo.sub_tasks === next.todo.sub_tasks &&
      prev.todo.notes === next.todo.notes &&
      prev.todo.related_items === next.todo.related_items &&
      prev.index === next.index &&
      prev.assigneeName === next.assigneeName &&
      prev.currentUserId === next.currentUserId
    )
  }
)
