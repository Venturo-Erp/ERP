'use client'

import { LABELS } from './constants/labels'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTodos } from '@/hooks/useTodos'
import { useEmployeesSlim } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { alertError } from '@/lib/ui/alert-dialog'
import { useRequireAuthSync } from '@/hooks/useRequireAuth'
import {
  CheckCircle,
  Clock,
  ChevronDown,
  X,
  Star,
  Receipt,
  FileText,
  Users,
  DollarSign,
  UserPlus,
  AlertCircle,
  Trash2,
  Edit2,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import { DateCell } from '@/components/table-cells'
import { TodoExpandedView } from '@/features/todos/components/todo-expanded-view'
import { StarRating } from '@/components/ui/star-rating'
import { Todo } from '@/stores/types'
import { ConfirmDialog } from '@/components/dialog/confirm-dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { TodoCard } from '@/features/todos/components/todo-card'
import { DatePicker } from '@/components/ui/date-picker'

export const dynamic = 'force-dynamic'

const statusFilters = [
  { value: 'active', label: LABELS.STATUS_ACTIVE },
  { value: 'pending', label: LABELS.STATUS_PENDING },
  { value: 'in_progress', label: LABELS.STATUS_IN_PROGRESS },
  { value: 'completed', label: LABELS.STATUS_COMPLETED },
]

export default function TodosPage() {
  // ✅ 使用純雲端 SWR hook（不再使用 IndexedDB）
  const {
    todos,
    create: addTodo,
    update: updateTodo,
    delete: deleteTodo,
    isLoading: isTodosLoading,
  } = useTodos()
  const { user } = useAuthStore() // 取得當前登入用戶
  const searchParams = useSearchParams()
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('active')
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // 防止重複提交
  const [quickAddValue, setQuickAddValue] = useState('') // 快速新增輸入框的值
  const { confirm, confirmDialogProps } = useConfirmDialog()

  // 處理從其他頁面跳轉來的情況
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId) {
      setExpandedTodo(expandId)
    }
  }, [searchParams])

  // 篩選待辦 - 使用 useMemo 優化
  const filteredTodos = useMemo(() => {
    if (!todos || !Array.isArray(todos)) return []
    const currentUserId = user?.id

    return todos.filter(todo => {
      // ✅ 可見性篩選 - 只顯示當前用戶相關的待辦 或 公開待辦
      // 如果使用者尚未登入，暫時顯示所有待辦（等登入後再過濾）
      if (currentUserId) {
        const isCreator =
          (todo.creator || (todo as unknown as Record<string, unknown>).created_by_legacy) ===
          currentUserId
        const isAssignee = todo.assignee === currentUserId
        const inVisibility = todo.visibility?.includes(currentUserId)
        const isPublic = todo.is_public === true

        // 建立者一定能看到自己的待辦（不受 visibility 限制）
        if (isCreator) {
          // 繼續執行後續篩選（狀態、搜尋等）
        } else if (isPublic) {
          // 公開的待辦所有人都能看到（繼續執行後續篩選）
        } else if (!isAssignee && !inVisibility) {
          // 不是建立者，也不是被指派者，也不在可見清單中，也不是公開 → 過濾掉
          return false
        }
      }
      // 如果 currentUserId 為空（尚未登入），不做可見性過濾，繼續執行後續篩選

      // 狀態篩選
      if (statusFilter === 'active') {
        // 「未完成」= 待辦 + 進行中
        if (todo.status !== 'pending' && todo.status !== 'in_progress') return false
      } else if (statusFilter !== 'all') {
        // 其他狀態直接比對
        if (todo.status !== statusFilter) return false
      }

      // 搜尋篩選
      if (searchTerm && !todo.title.toLowerCase().includes(searchTerm.toLowerCase())) return false

      return true
    })
  }, [todos, statusFilter, searchTerm, user?.id])

  // 狀態標籤 - 使用 useCallback 優化
  const getStatusLabel = useCallback((status: Todo['status']) => {
    const statusMap = {
      pending: LABELS.STATUS_PENDING,
      in_progress: LABELS.STATUS_IN_PROGRESS,
      completed: LABELS.STATUS_DONE,
      cancelled: LABELS.STATUS_CANCELLED,
    }
    return statusMap[status]
  }, [])

  // 狀態顏色 - 使用 useCallback 優化
  const getStatusColor = useCallback((status: Todo['status']) => {
    const colorMap = {
      pending: 'text-morandi-muted',
      in_progress: 'text-morandi-gold',
      completed: 'text-morandi-green',
      cancelled: 'text-morandi-red',
    }
    return colorMap[status]
  }, [])

  // 截止日期顏色 - 使用 useCallback 優化
  const getDeadlineColor = useCallback((deadline?: string) => {
    if (!deadline) return 'text-morandi-secondary'

    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'text-morandi-red' // 逾期
    if (diffDays === 0) return 'text-morandi-gold' // 今天
    if (diffDays <= 3) return 'text-morandi-gold/70' // 3天內
    return 'text-morandi-secondary' // 充裕
  }, [])

  const columns = [
    {
      key: 'title',
      label: LABELS.COL_TITLE,
      sortable: true,
      render: (value: unknown, todo: Todo) => {
        // 計算未讀留言數
        const unreadCount = (todo.notes || []).filter(
          note => note.author_id !== user?.id && !note.read_by?.includes(user?.id || '')
        ).length

        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-morandi-primary">{String(value)}</span>
              {/* 未讀留言紅點 */}
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] bg-status-danger text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
                  {unreadCount}
                </span>
              )}
              {/* 公開標記 */}
              {todo.is_public && (
                <span className="text-[10px] bg-status-info-bg text-status-info px-1.5 py-0.5 rounded">
                  {LABELS.LABEL_7239}
                </span>
              )}
            </div>
            {todo.related_items && todo.related_items.length > 0 && (
              <div className="flex gap-1 mt-1">
                {todo.related_items.map((item, index) => (
                  <button
                    key={index}
                    onClick={e => {
                      e.stopPropagation()
                      const basePath = {
                        group: '/tours',
                        quote: '/quotes',
                        order: '/orders',
                        invoice: '/finance/treasury/disbursement',
                        receipt: '/finance/payments',
                      }[item.type]
                      if (basePath) {
                        router.push(`${basePath}?highlight=${item.id}`)
                      }
                    }}
                    className="text-xs bg-morandi-gold/20 text-morandi-primary px-2 py-0.5 rounded hover:bg-morandi-gold/30 transition-colors"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'priority',
      label: LABELS.COL_PRIORITY,
      sortable: true,
      width: '120px',
      render: (value: unknown, todo: Todo) => (
        <div onClick={e => e.stopPropagation()}>
          <StarRating
            value={todo.priority}
            onChange={newPriority =>
              updateTodo(todo.id, { priority: newPriority as 1 | 2 | 3 | 4 | 5 })
            }
            size="sm"
          />
        </div>
      ),
    },
    {
      key: 'status',
      label: LABELS.COL_STATUS,
      sortable: true,
      width: '100px',
      render: (value: unknown) => (
        <span className={cn('text-sm font-medium', getStatusColor(value as Todo['status']))}>
          {getStatusLabel(value as Todo['status'])}
        </span>
      ),
    },
    {
      key: 'deadline',
      label: LABELS.COL_DEADLINE,
      sortable: true,
      width: '180px',
      render: (value: unknown) => (
        <div className={cn(getDeadlineColor(value ? String(value) : undefined))}>
          <DateCell date={value ? String(value) : null} fallback={LABELS.NOT_SET} showIcon />
        </div>
      ),
    },
  ]

  // 根據優先級取得列樣式
  const getPriorityRowClass = useCallback((todo: Todo) => {
    // 如果已完成，降低所有特效
    const opacity = todo.status === 'completed' ? 'opacity-60' : ''

    switch (todo.priority) {
      case 5:
        return cn(
          'bg-gradient-to-r from-status-danger-bg via-rose-50/60 to-status-danger-bg',
          'hover:from-status-danger-bg hover:via-rose-100/70 hover:to-status-danger-bg',
          'shadow-sm shadow-status-danger-bg',
          opacity
        )
      case 4:
        return cn(
          'bg-gradient-to-r from-status-warning-bg via-status-warning-bg/50 to-status-warning-bg',
          'hover:from-status-warning-bg hover:via-status-warning-bg/60 hover:to-status-warning-bg',
          opacity
        )
      case 3:
        return cn(
          'bg-gradient-to-r from-status-warning-bg/60 via-status-warning-bg/40 to-status-warning-bg/60',
          'hover:from-status-warning-bg/70 hover:via-status-warning-bg/50 hover:to-status-warning-bg/70',
          opacity
        )
      case 2:
        return cn(
          'bg-gradient-to-r from-status-info-bg via-sky-50/30 to-status-info-bg',
          'hover:from-status-info-bg hover:via-sky-100/40 hover:to-status-info-bg',
          opacity
        )
      case 1:
      default:
        return cn(opacity)
    }
  }, [])

  const handleRowClick = useCallback((todo: Todo) => {
    setExpandedTodo(todo.id)
  }, [])

  const handleDeleteTodo = useCallback(
    async (todo: Todo, e?: React.MouseEvent) => {
      if (e) e.stopPropagation()

      const confirmed = await confirm({
        type: 'danger',
        title: LABELS.DELETE_TODO_TITLE,
        message: `${LABELS.DELETE_CONFIRM_PREFIX}${todo.title}${LABELS.DELETE_CONFIRM_SUFFIX}`,
        details: [LABELS.DELETE_IRREVERSIBLE],
        confirmLabel: LABELS.CONFIRM_DELETE,
        cancelLabel: LABELS.CANCEL,
      })

      if (!confirmed) {
        return
      }

      try {
        deleteTodo(todo.id)
        // 如果正在顯示該待辦的詳細檢視，關閉它
        if (expandedTodo === todo.id) {
          setExpandedTodo(null)
        }
      } catch (err) {
        logger.error('刪除待辦事項失敗:', err)
        await alertError(LABELS.DELETE_FAILED)
      }
    },
    [deleteTodo, expandedTodo, confirm]
  )

  const handleAddTodo = useCallback(
    async (formData: {
      title: string
      priority: 1 | 2 | 3 | 4 | 5
      deadline: string
      assignee: string
      enabled_quick_actions: ('receipt' | 'invoice' | 'group' | 'quote' | 'assign')[]
      is_public: boolean
    }) => {
      const auth = useRequireAuthSync()

      if (!auth.isAuthenticated) {
        auth.showLoginRequired()
        return
      }

      try {
        // 計算 visibility - 包含建立者和被指派者
        const visibilityList = [auth.user!.id]
        if (formData.assignee && formData.assignee !== auth.user!.id) {
          visibilityList.push(formData.assignee)
        }

        const newTodoData = {
          title: formData.title,
          priority: formData.priority,
          deadline: formData.deadline || undefined,
          status: 'pending' as const,
          completed: false,
          creator: auth.user!.id,
          assignee: formData.assignee || undefined,
          visibility: visibilityList,
          is_public: formData.is_public,
          related_items: [] as Todo['related_items'],
          sub_tasks: [] as Todo['sub_tasks'],
          notes: [] as Todo['notes'],
          enabled_quick_actions: (formData.enabled_quick_actions || [
            'receipt',
            'quote',
          ]) as Todo['enabled_quick_actions'],
        }

        await addTodo(newTodoData)
        setIsAddDialogOpen(false)
        logger.log('✅ 待辦事項新增成功:', formData.title)
      } catch (error) {
        logger.error('新增待辦事項失敗:', error)
        await alertError(LABELS.ADD_FAILED)
      }
    },
    [addTodo]
  )

  return (
    <ContentPageLayout
      title={LABELS.LABEL_9553}
      showSearch={true}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={LABELS.SEARCH_PLACEHOLDER}
      onAdd={() => setIsAddDialogOpen(true)}
      addLabel={LABELS.ADD_TASK}
      headerActions={
        <Input
          placeholder={LABELS.ADD_25}
          className="w-64"
          value={quickAddValue}
          onChange={e => setQuickAddValue(e.target.value)}
          onKeyDown={async e => {
            // 使用原生事件檢查輸入法狀態，避免 React 狀態更新時序問題
            if (
              e.key === 'Enter' &&
              quickAddValue.trim() &&
              !isSubmitting &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault()
              const auth = useRequireAuthSync()
              if (!auth.isAuthenticated) {
                auth.showLoginRequired()
                return
              }
              const title = quickAddValue.trim()
              setIsSubmitting(true)

              const newTodoData = {
                title,
                priority: 1 as const,
                status: 'pending' as const,
                completed: false,
                creator: auth.user!.id,
                assignee: undefined,
                visibility: [auth.user!.id],
                related_items: [] as Todo['related_items'],
                sub_tasks: [] as Todo['sub_tasks'],
                notes: [] as Todo['notes'],
                enabled_quick_actions: ['receipt', 'quote'] as Todo['enabled_quick_actions'],
              }

              try {
                await addTodo(newTodoData)
                setQuickAddValue('') // ✅ 修正：成功後才清空輸入框
                logger.log('✅ 待辦事項新增成功:', title)
              } catch (error) {
                logger.error('快速新增失敗:', error)
                await alertError(LABELS.ADD_FAILED)
              } finally {
                setIsSubmitting(false)
              }
            }
          }}
        />
      }
      headerChildren={
        /* 狀態篩選 */
        <div className="flex gap-2">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                statusFilter === filter.value
                  ? 'bg-morandi-gold text-white'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/30'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      }
    >
      {/* 待辦事項列表 */}
      <div className="h-full overflow-hidden">
        <EnhancedTable
          columns={columns as unknown as Parameters<typeof EnhancedTable>[0]['columns']}
          data={filteredTodos as unknown as Parameters<typeof EnhancedTable>[0]['data']}
          onRowClick={
            handleRowClick as unknown as Parameters<typeof EnhancedTable>[0]['onRowClick']
          }
          striped
          rowClassName={
            getPriorityRowClass as unknown as Parameters<typeof EnhancedTable>[0]['rowClassName']
          }
          actions={
            ((todo: Todo) => (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation()
                    const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
                    updateTodo(todo.id, {
                      status: newStatus,
                      completed: newStatus === 'completed',
                    })
                  }}
                  className={cn(
                    'h-7 px-2 gap-1 text-xs whitespace-nowrap',
                    todo.status === 'completed'
                      ? 'text-status-success hover:text-status-success hover:bg-status-success-bg'
                      : 'text-morandi-secondary hover:text-status-success hover:bg-status-success-bg'
                  )}
                >
                  <CheckCircle size={14} />
                  {todo.status === 'completed' ? '取消' : '完成'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation()
                    setExpandedTodo(todo.id)
                  }}
                  className="h-7 px-2 gap-1 text-xs hover:bg-morandi-gold/10 whitespace-nowrap"
                >
                  <Edit2 size={14} />
                  編輯
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => handleDeleteTodo(todo, e)}
                  className="h-7 px-2 gap-1 text-xs text-morandi-red hover:bg-morandi-red/10 whitespace-nowrap"
                >
                  <Trash2 size={14} />
                  刪除
                </Button>
              </div>
            )) as unknown as Parameters<typeof EnhancedTable>[0]['actions']
          }
          searchableFields={['title']}
          searchTerm={searchTerm}
          showFilters={false}
          initialPageSize={15}
        />
      </div>

      {/* 展開的待辦事項視圖 */}
      {expandedTodo &&
        (() => {
          const todo = todos.find(t => t.id === expandedTodo)
          if (!todo) return null
          return (
            <TodoExpandedView
              todo={todo}
              onUpdate={updates => updateTodo(expandedTodo, updates)}
              onClose={() => setExpandedTodo(null)}
            />
          )
        })()}

      {/* 新增待辦事項對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{LABELS.ADD_TODO}</DialogTitle>
            <DialogDescription>{LABELS.ADD_TODO_DESC}</DialogDescription>
          </DialogHeader>
          <AddTodoForm onSubmit={handleAddTodo} onCancel={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog {...confirmDialogProps} />
    </ContentPageLayout>
  )
}

// 新增待辦事項表單組件
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
    is_public: boolean
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
    is_public: false,
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

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.is_public}
            onCheckedChange={checked => setFormData({ ...formData, is_public: checked as boolean })}
          />
          <span className="text-sm font-medium text-morandi-primary">
            {LABELS.PUBLIC_TO_COMPANY}
          </span>
        </label>
        <p className="text-xs text-morandi-secondary mt-1 ml-6">{LABELS.EDIT_8913}</p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          className="flex-1 bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
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
