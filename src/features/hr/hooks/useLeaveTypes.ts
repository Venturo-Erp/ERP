/**
 * 假別類型 Hook
 */

'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getRequiredWorkspaceId } from '@/lib/workspace-context'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'

// ============================================
// 類型定義
// ============================================

export interface LeaveType {
  id: string
  workspace_id: string
  name: string
  code: string
  days_per_year: number | null
  is_paid: boolean | null
  requires_proof: boolean | null
  is_active: boolean | null
  created_at: string | null
}

export interface LeaveTypeInput {
  name: string
  code: string
  days_per_year?: number | null
  is_paid?: boolean
  requires_proof?: boolean
  is_active?: boolean
}

// ============================================
// 預設假別
// ============================================

export const DEFAULT_LEAVE_TYPES: LeaveTypeInput[] = [
  { name: '特休', code: 'ANNUAL', days_per_year: null, is_paid: true, requires_proof: false },
  { name: '病假', code: 'SICK', days_per_year: 30, is_paid: true, requires_proof: true },
  { name: '事假', code: 'PERSONAL', days_per_year: 14, is_paid: false, requires_proof: false },
  { name: '婚假', code: 'MARRIAGE', days_per_year: 8, is_paid: true, requires_proof: true },
  { name: '喪假', code: 'FUNERAL', days_per_year: null, is_paid: true, requires_proof: true },
  { name: '產假', code: 'MATERNITY', days_per_year: 56, is_paid: true, requires_proof: true },
  { name: '陪產假', code: 'PATERNITY', days_per_year: 7, is_paid: true, requires_proof: true },
  { name: '公假', code: 'OFFICIAL', days_per_year: null, is_paid: true, requires_proof: true },
]

// ============================================
// Hook 實作
// ============================================

export function useLeaveTypes() {
  const user = useAuthStore(state => state.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])

  /**
   * 取得所有假別類型
   */
  const fetchLeaveTypes = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('leave_types')
        .select('id, name, code, description, days_per_year, is_paid, is_active, requires_proof, sort_order, workspace_id, created_at, updated_at')
        .limit(500)

        .order('code', { ascending: true })

      if (queryError) throw queryError

      setLeaveTypes(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入假別類型失敗'
      setError(message)
      logger.error('載入假別類型失敗:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * 新增假別類型
   */
  const createLeaveType = useCallback(
    async (input: LeaveTypeInput): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        const { error: insertError } = await supabase.from('leave_types').insert({
          workspace_id: getRequiredWorkspaceId(),
          name: input.name,
          code: input.code,
          days_per_year: input.days_per_year ?? null,
          is_paid: input.is_paid ?? true,
          requires_proof: input.requires_proof ?? false,
          is_active: input.is_active ?? true,
        })

        if (insertError) throw insertError

        await fetchLeaveTypes()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '新增假別類型失敗'
        setError(message)
        logger.error('新增假別類型失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchLeaveTypes]
  )

  /**
   * 更新假別類型
   */
  const updateLeaveType = useCallback(
    async (id: string, input: Partial<LeaveTypeInput>): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('leave_types')
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) throw updateError

        await fetchLeaveTypes()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '更新假別類型失敗'
        setError(message)
        logger.error('更新假別類型失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchLeaveTypes]
  )

  /**
   * 刪除假別類型
   */
  const deleteLeaveType = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        const { error: deleteError } = await supabase.from('leave_types').delete().eq('id', id)

        if (deleteError) throw deleteError

        await fetchLeaveTypes()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '刪除假別類型失敗'
        setError(message)
        logger.error('刪除假別類型失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchLeaveTypes]
  )

  /**
   * 初始化預設假別
   */
  const initializeDefaultTypes = useCallback(async (): Promise<boolean> => {
    if (!user) return false

    setLoading(true)
    setError(null)

    try {
      const insertData = DEFAULT_LEAVE_TYPES.map(type => ({
        workspace_id: getRequiredWorkspaceId(),
        name: type.name,
        code: type.code,
        days_per_year: type.days_per_year ?? null,
        is_paid: type.is_paid ?? true,
        requires_proof: type.requires_proof ?? false,
        is_active: true,
      }))

      const { error: insertError } = await supabase.from('leave_types').insert(insertData)

      if (insertError) throw insertError

      await fetchLeaveTypes()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '初始化假別類型失敗'
      setError(message)
      logger.error('初始化假別類型失敗:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [user, fetchLeaveTypes])

  return {
    loading,
    error,
    leaveTypes,
    fetchLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    initializeDefaultTypes,
  }
}
