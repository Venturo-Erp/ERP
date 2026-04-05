'use client'

import { Circle, CheckCircle, AlertCircle, Clock, User, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TodoCardProps {
  todo: {
    id: string
    title: string
    description?: string | null
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    due_date?: string | null
    tour_code?: string | null
    assigned_to_name?: string | null
  }
  onToggle?: () => void
  onClick?: () => void
  className?: string
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: '緊急', color: 'text-morandi-red', bg: 'bg-morandi-red/10' },
  high: { label: '高', color: 'text-status-warning', bg: 'bg-status-warning/10' },
  medium: { label: '中', color: 'text-morandi-gold', bg: 'bg-morandi-gold/10' },
  low: { label: '低', color: 'text-morandi-secondary', bg: 'bg-morandi-container' },
}

export function TodoCard({ todo, onToggle, onClick, className }: TodoCardProps) {
  const priority = PRIORITY_CONFIG[todo.priority || 'medium'] || PRIORITY_CONFIG.medium
  const isCompleted = todo.status === 'completed'

  const formatDueDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dateStr)
    due.setHours(0, 0, 0, 0)

    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diff < 0) return { text: '已過期', isOverdue: true }
    if (diff === 0) return { text: '今天', isOverdue: false }
    if (diff === 1) return { text: '明天', isOverdue: false }
    return { text: `${due.getMonth() + 1}/${due.getDate()}`, isOverdue: false }
  }

  const dueInfo = formatDueDate(todo.due_date)

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-sm p-4',
        isCompleted && 'opacity-60',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* 勾選按鈕 */}
        <button
          onClick={e => {
            e.stopPropagation()
            onToggle?.()
          }}
          className={cn(
            'mt-0.5 transition-colors',
            isCompleted ? 'text-morandi-green' : 'text-morandi-secondary hover:text-morandi-gold'
          )}
        >
          {isCompleted ? <CheckCircle size={22} /> : <Circle size={22} />}
        </button>

        {/* 內容 */}
        <div className="flex-1 min-w-0">
          {/* 標題 + 優先級 */}
          <div className="flex items-start gap-2 mb-1">
            <span className={cn('font-medium text-morandi-primary', isCompleted && 'line-through')}>
              {todo.title}
            </span>
            {todo.priority === 'urgent' || todo.priority === 'high' ? (
              <span className={cn('text-xs px-1.5 py-0.5 rounded', priority.bg, priority.color)}>
                {priority.label}
              </span>
            ) : null}
          </div>

          {/* 描述 */}
          {todo.description && (
            <p className="text-sm text-morandi-secondary mb-2 line-clamp-2">{todo.description}</p>
          )}

          {/* 標籤：團號、截止日、指派人 */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-morandi-secondary">
            {todo.tour_code && (
              <div className="flex items-center gap-1">
                <MapPin size={12} />
                <span>{todo.tour_code}</span>
              </div>
            )}
            {dueInfo && (
              <div className={cn('flex items-center gap-1', dueInfo.isOverdue && 'text-morandi-red')}>
                {dueInfo.isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                <span>{dueInfo.text}</span>
              </div>
            )}
            {todo.assigned_to_name && (
              <div className="flex items-center gap-1">
                <User size={12} />
                <span>{todo.assigned_to_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
