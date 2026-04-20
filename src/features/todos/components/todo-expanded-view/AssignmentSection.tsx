'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FileText, X, UserCheck } from 'lucide-react'
import { AssignmentSectionProps } from './types'
import { useEmployeesSlim } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { DatePicker } from '@/components/ui/date-picker'
import {
  FORM_LABELS,
  COMMON_LABELS,
  PLACEHOLDER_LABELS,
  TOOLTIP_LABELS,
  TODO_STATUS_LABELS,
} from '@/features/todos/constants/labels'

export function AssignmentSection({ todo, onUpdate, readOnly = false }: AssignmentSectionProps) {
  const router = useRouter()
  const { items: employees } = useEmployeesSlim()
  const { user } = useAuthStore()
  const [assigneeName, setAssigneeName] = useState<string>('')

  // 更新指派者名稱
  useEffect(() => {
    if (todo.assignee) {
      // 優先檢查當前登入用戶，再檢查員工列表
      if (user?.id === todo.assignee) {
        setAssigneeName(
          user.display_name ||
            user.chinese_name ||
            user.personal_info?.email ||
            COMMON_LABELS.unknownEmployee
        )
      } else {
        const assignee = employees.find(e => e.id === todo.assignee)
        setAssigneeName(
          assignee?.display_name || assignee?.chinese_name || COMMON_LABELS.unknownEmployee
        )
      }
    } else {
      setAssigneeName('')
    }
  }, [todo.assignee, employees, user])
  const getDeadlineColor = () => {
    if (!todo.deadline) return 'text-morandi-secondary'

    const deadline = new Date(todo.deadline)
    const today = new Date()
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'text-morandi-red' // 逾期
    if (diffDays === 0) return 'text-morandi-gold' // 今天
    if (diffDays <= 3) return 'text-morandi-gold' // 3天內
    return 'text-morandi-secondary' // 充裕
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm">
      <div className="space-y-3">
        {/* 指派給 */}
        {assigneeName && (
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <UserCheck size={18} className="text-morandi-gold" />
            <span className="text-sm text-morandi-secondary min-w-[60px]">
              {FORM_LABELS.assignTo}
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-morandi-gold/10 border border-morandi-gold/30 rounded-lg">
              <span className="text-sm font-medium text-morandi-gold">{assigneeName}</span>
              {!readOnly && (
                <button
                  onClick={() => onUpdate({ assignee: undefined })}
                  className="p-0.5 hover:bg-morandi-red/10 rounded text-morandi-secondary hover:text-morandi-red"
                  title={TOOLTIP_LABELS.removeAssignment}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 期限 + 狀態合併一排 */}
        <div className="flex items-center gap-4">
          {/* 期限 */}
          <div className="flex items-center gap-2">
            {readOnly ? (
              <span className={cn('text-sm font-medium', getDeadlineColor())}>
                {todo.deadline || COMMON_LABELS.notSet}
              </span>
            ) : (
              <>
                <DatePicker
                  value={todo.deadline || ''}
                  onChange={date => onUpdate({ deadline: date })}
                  placeholder={PLACEHOLDER_LABELS.selectDate}
                  className={cn('text-sm font-medium h-9 w-[160px]', getDeadlineColor())}
                />
                {todo.deadline && (
                  <button
                    onClick={() => onUpdate({ deadline: '' })}
                    className="p-1 hover:bg-morandi-red/10 rounded text-morandi-secondary hover:text-morandi-red"
                    title={TOOLTIP_LABELS.clearDeadline}
                  >
                    <X size={14} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* 分隔線 */}
          <div className="h-8 w-px bg-border" />

          {/* 狀態按鈕 */}
          <div className="flex-1 grid grid-cols-4 gap-2">
            <button
              onClick={() => !readOnly && onUpdate({ status: 'pending' })}
              disabled={readOnly}
              className={cn(
                'py-2 text-xs rounded-lg transition-all font-medium text-center',
                todo.status === 'pending'
                  ? 'bg-morandi-muted text-white shadow-md'
                  : 'bg-morandi-container/30 border border-morandi-muted/20 text-morandi-secondary',
                !readOnly &&
                  'hover:bg-morandi-muted/10 hover:border-morandi-muted/40 hover:text-morandi-muted',
                readOnly && 'cursor-default'
              )}
            >
              {TODO_STATUS_LABELS.pending}
            </button>
            <button
              onClick={() => !readOnly && onUpdate({ status: 'in_progress' })}
              disabled={readOnly}
              className={cn(
                'py-2 text-xs rounded-lg transition-all font-medium text-center',
                todo.status === 'in_progress'
                  ? 'bg-morandi-gold text-white shadow-md'
                  : 'bg-morandi-container/30 border border-morandi-gold/20 text-morandi-secondary',
                !readOnly &&
                  'hover:bg-morandi-gold/10 hover:border-morandi-gold/40 hover:text-morandi-gold',
                readOnly && 'cursor-default'
              )}
            >
              {TODO_STATUS_LABELS.in_progress}
            </button>
            <button
              onClick={() => !readOnly && onUpdate({ status: 'completed' })}
              disabled={readOnly}
              className={cn(
                'py-2 text-xs rounded-lg transition-all font-medium text-center',
                todo.status === 'completed'
                  ? 'bg-morandi-green text-white shadow-md'
                  : 'bg-morandi-container/30 border border-morandi-green/20 text-morandi-secondary',
                !readOnly &&
                  'hover:bg-morandi-green/10 hover:border-morandi-green/40 hover:text-morandi-green',
                readOnly && 'cursor-default'
              )}
            >
              {TODO_STATUS_LABELS.completed}
            </button>
            <button
              onClick={() => !readOnly && onUpdate({ status: 'cancelled' })}
              disabled={readOnly}
              className={cn(
                'py-2 text-xs rounded-lg transition-all font-medium text-center',
                todo.status === 'cancelled'
                  ? 'bg-morandi-red text-white shadow-md'
                  : 'bg-morandi-container/30 border border-morandi-red/20 text-morandi-secondary',
                !readOnly &&
                  'hover:bg-morandi-red/10 hover:border-morandi-red/40 hover:text-morandi-red',
                readOnly && 'cursor-default'
              )}
            >
              {TODO_STATUS_LABELS.cancelled}
            </button>
          </div>
        </div>
      </div>

      {todo.related_items && todo.related_items.length > 0 && (
        <div className="pt-3 mt-3 border-t border-border">
          <span className="text-xs font-medium text-morandi-primary flex items-center gap-1.5 mb-2">
            <FileText size={12} className="text-morandi-gold" />
            {COMMON_LABELS.relatedItems}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {todo.related_items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  const basePath = {
                    group: '/tours',
                    quote: '/tours',  // 報價已整合進 /tours/[code] tab、無獨立 /quotes 路由
                    order: '/orders',
                    invoice: '/finance/treasury/disbursement',
                    receipt: '/finance/payments',
                  }[item.type]
                  if (basePath) {
                    router.push(`${basePath}?highlight=${item.id}`)
                  }
                }}
                className="bg-card/60 border border-morandi-gold/20 text-morandi-primary text-xs px-2 py-1 rounded-lg hover:bg-morandi-gold/10 hover:border-morandi-gold/20 transition-all font-medium"
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
