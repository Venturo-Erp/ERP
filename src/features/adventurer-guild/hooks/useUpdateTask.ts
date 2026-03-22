import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { UpdateTaskInput, Priority, TaskStatus } from '../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function useUpdateTask() {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient(supabaseUrl, supabaseKey)

  const updateTask = async (taskId: string, updates: UpdateTaskInput) => {
    try {
      setUpdating(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

      if (err) throw err
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setUpdating(false)
    }
  }

  // 快捷方法
  const updateProgress = (taskId: string, progress: number) => {
    return updateTask(taskId, { progress })
  }

  const updatePriority = (taskId: string, priority: Priority) => {
    return updateTask(taskId, { priority })
  }

  const updateStatus = (taskId: string, status: TaskStatus) => {
    const updates: UpdateTaskInput = { status }
    if (status === 'completed') {
      // @ts-ignore
      updates.completed_at = new Date().toISOString()
    }
    return updateTask(taskId, updates)
  }

  const updateAssignees = (taskId: string, assignees: string[]) => {
    return updateTask(taskId, { assignees })
  }

  return {
    updateTask,
    updateProgress,
    updatePriority,
    updateStatus,
    updateAssignees,
    updating,
    error,
  }
}
