import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { CreateTaskInput } from '../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function useCreateTask() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient(supabaseUrl, supabaseKey)

  const createTask = async (input: CreateTaskInput) => {
    try {
      setCreating(true)
      setError(null)

      // 取得當前 workspace_id 和 user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('未登入')

      const workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d' // Venturo workspace

      const { data, error: err } = await supabase
        .from('tasks')
        .insert({
          workspace_id,
          title: input.title,
          description: input.description || null,
          priority: input.priority,
          assignees: input.assignees,
          created_by: user.email || 'system',
        })
        .select()
        .single()

      if (err) throw err
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setCreating(false)
    }
  }

  return {
    createTask,
    creating,
    error,
  }
}
