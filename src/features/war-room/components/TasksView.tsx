'use client'

/**
 * 任務視圖 - 使用 EnhancedTable
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { logger } from '@/lib/utils/logger'

type TaskType = 'individual' | 'workflow'

type Task = {
  id: string
  title: string
  description: string | null
  priority: 'P0' | 'P1' | 'P2'
  status: string
  progress: number
  assignees: string[]
  created_at: string
  created_by: string
}

interface TasksViewProps {
  taskType: TaskType
}

const getPriorityColor = (priority: string) => {
  const colors = {
    P0: 'bg-morandi-red/10 text-morandi-red',
    P1: 'bg-morandi-gold/10 text-morandi-gold',
    P2: 'bg-morandi-green/10 text-morandi-green',
  }
  return colors[priority as keyof typeof colors] || colors.P2
}

export const TasksView: React.FC<TasksViewProps> = ({ taskType }) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [taskType])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('tasks')
        .select(
          'id, title, description, status, priority, due_date, assigned_to, category, tour_id, workspace_id, created_at, updated_at'
        )
        .eq('task_type', taskType)
        .neq('status', 'completed')
        .order('priority')
        .order('created_at', { ascending: false })

      if (data) setTasks(data as unknown as Task[])
    } catch (err) {
      logger.error('載入任務失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const columns: TableColumn<Task>[] = [
    {
      key: 'title',
      label: '任務名稱',
      render: (_value: unknown, row: Task) => (
        <div>
          <div className="font-medium text-morandi-primary mb-1">{row.title}</div>
          {row.description && (
            <p className="text-xs text-morandi-secondary truncate">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      label: '優先級',
      width: '100px',
      render: (_value: unknown, row: Task) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(row.priority)}`}>
          {row.priority}
        </span>
      ),
    },
    {
      key: 'progress',
      label: '進度',
      width: '150px',
      align: 'center',
      render: (_value: unknown, row: Task) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-morandi-container rounded-full h-2">
            <div
              className="bg-morandi-gold h-2 rounded-full transition-all"
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <span className="text-xs text-morandi-primary font-medium w-8 text-right">
            {row.progress}%
          </span>
        </div>
      ),
    },
    {
      key: 'assignees',
      label: '負責人',
      width: '200px',
      render: (_value: unknown, row: Task) => (
        <div className="flex flex-wrap gap-1">
          {row.assignees.length > 0 ? (
            row.assignees.map((assignee: string) => (
              <span
                key={assignee}
                className="px-2 py-0.5 bg-morandi-container text-morandi-primary rounded text-xs"
              >
                {assignee}
              </span>
            ))
          ) : (
            <span className="text-xs text-morandi-secondary">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: '創建日期',
      width: '120px',
      render: (_value: unknown, row: Task) => (
        <span className="text-sm text-morandi-secondary">
          {new Date(row.created_at).toLocaleDateString('zh-TW')}
        </span>
      ),
    },
  ]

  return (
    <div className="h-full">
      <EnhancedTable
        columns={columns}
        data={tasks}
        loading={loading}
        emptyMessage={taskType === 'individual' ? '暫無獨立任務' : '暫無工作流任務'}
        hoverable={true}
      />
    </div>
  )
}
