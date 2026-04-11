/**
 * 請假申請 Hook
 */

'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { getRequiredWorkspaceId } from '@/lib/workspace-context'
import { logger } from '@/lib/utils/logger'

// ============================================
// 類型定義
// ============================================

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequest {
  id: string
  workspace_id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  days: number
  reason: string | null
  proof_url: string | null
  status: LeaveRequestStatus
  approved_by: string | null
  approved_at: string | null
  reject_reason: string | null
  created_at: string
  updated_at: string
  // 關聯資料
  employee_name?: string
  leave_type_name?: string
}

export interface LeaveRequestInput {
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  start_time?: string | null
  end_time?: string | null
  days: number
  reason?: string | null
  proof_url?: string | null
}

export interface LeaveBalance {
  id: string
  employee_id: string
  leave_type_id: string
  year: number
  entitled_days: number
  used_days: number
  remaining_days: number
  leave_type_name?: string
  leave_type_code?: string
}

// ============================================
// Hook 實作
// ============================================

export function useLeaveRequests() {
  const user = useAuthStore(state => state.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])

  /**
   * 取得請假申請列表
   */
  const fetchRequests = useCallback(
    async (filters?: {
      status?: LeaveRequestStatus
      employee_id?: string
      start_date?: string
      end_date?: string
    }) => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('leave_requests')
          .select(
            `
          *,
          employee:employees!leave_requests_employee_id_fkey(id, chinese_name, display_name),
          leave_type:leave_types!leave_requests_leave_type_id_fkey(id, name)
        `
          )

          .order('created_at', { ascending: false })

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.employee_id) {
          query = query.eq('employee_id', filters.employee_id)
        }
        if (filters?.start_date) {
          query = query.gte('start_date', filters.start_date)
        }
        if (filters?.end_date) {
          query = query.lte('end_date', filters.end_date)
        }

        const { data, error: queryError } = await query

        if (queryError) throw queryError

        const mappedData: LeaveRequest[] = (data || []).map(item => {
          const employee = item.employee as {
            id: string
            chinese_name: string | null
            display_name: string | null
          } | null
          const leaveType = item.leave_type as { id: string; name: string } | null
          return {
            id: item.id,
            workspace_id: item.workspace_id,
            employee_id: item.employee_id,
            leave_type_id: item.leave_type_id,
            start_date: item.start_date,
            end_date: item.end_date,
            start_time: item.start_time,
            end_time: item.end_time,
            days: item.days,
            reason: item.reason,
            proof_url: item.proof_url,
            status: item.status as LeaveRequestStatus,
            approved_by: item.approved_by,
            approved_at: item.approved_at,
            reject_reason: item.reject_reason,
            created_at: item.created_at || '',
            updated_at: item.updated_at || '',
            employee_name: employee?.display_name || employee?.chinese_name || '未知',
            leave_type_name: leaveType?.name || '未知',
          }
        })

        setRequests(mappedData)
      } catch (err) {
        const message = err instanceof Error ? err.message : '載入請假申請失敗'
        setError(message)
        logger.error('載入請假申請失敗:', err)
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * 新增請假申請
   */
  const createRequest = useCallback(
    async (input: LeaveRequestInput): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        const { error: insertError } = await supabase.from('leave_requests').insert({
          workspace_id: getRequiredWorkspaceId(),
          employee_id: input.employee_id,
          leave_type_id: input.leave_type_id,
          start_date: input.start_date,
          end_date: input.end_date,
          start_time: input.start_time ?? null,
          end_time: input.end_time ?? null,
          days: input.days,
          reason: input.reason ?? null,
          proof_url: input.proof_url ?? null,
          status: 'pending',
        })

        if (insertError) throw insertError

        await fetchRequests()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '新增請假申請失敗'
        setError(message)
        logger.error('新增請假申請失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchRequests]
  )

  /**
   * 審核請假申請
   */
  const approveRequest = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) return false

      setLoading(true)
      setError(null)

      try {
        // 取得請假申請資訊
        const { data: request, error: fetchError } = await supabase
          .from('leave_requests')
          .select(
            'id, employee_id, leave_type_id, start_date, end_date, days, reason, status, approved_by, approved_at, workspace_id, created_at, updated_at'
          )
          .eq('id', id)
          .limit(500)

          .single()

        if (fetchError) throw fetchError
        if (!request) throw new Error('找不到請假申請')

        // 更新為已核准
        const { error: updateError } = await supabase
          .from('leave_requests')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) throw updateError

        // 更新假別餘額
        const year = new Date(request.start_date).getFullYear()
        const { data: balance, error: balanceError } = await supabase
          .from('leave_balances')
          .select(
            'id, employee_id, leave_type_id, year, entitled_days, used_days, remaining_days, carry_over_days, notes, workspace_id, created_at, updated_at'
          )
          .eq('employee_id', request.employee_id)
          .eq('leave_type_id', request.leave_type_id)
          .eq('year', year)
          .single()

        if (!balanceError && balance) {
          const newUsedDays = (balance.used_days || 0) + request.days
          const newRemainingDays = (balance.entitled_days || 0) - newUsedDays

          await supabase
            .from('leave_balances')
            .update({
              used_days: newUsedDays,
              remaining_days: newRemainingDays,
              updated_at: new Date().toISOString(),
            })
            .eq('id', balance.id)
        }

        // 發通知給申請人
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient_id: request.employee_id,
              title: '請假申請已核准',
              message: `${request.start_date} ~ ${request.end_date}，共 ${request.days} 天`,
              module: 'hr',
              type: 'info',
              action_url: '/hr/leave',
            }),
          })
        } catch {}

        await fetchRequests()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '審核請假申請失敗'
        setError(message)
        logger.error('審核請假申請失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user?.id, fetchRequests]
  )

  /**
   * 駁回請假申請
   */
  const rejectRequest = useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      if (!user?.id) return false

      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('leave_requests')
          .update({
            status: 'rejected',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            reject_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) throw updateError

        // 發通知給申請人
        // 先查申請人 ID
        const { data: reqData } = await supabase
          .from('leave_requests')
          .select('employee_id')
          .eq('id', id)
          .single()

        if (reqData?.employee_id) {
          try {
            await fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient_id: reqData.employee_id,
                title: '請假申請已駁回',
                message: reason ? `原因：${reason}` : undefined,
                module: 'hr',
                type: 'info',
                action_url: '/hr/leave',
              }),
            })
          } catch {}
        }

        await fetchRequests()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '駁回請假申請失敗'
        setError(message)
        logger.error('駁回請假申請失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user?.id, fetchRequests]
  )

  /**
   * 取消請假申請
   */
  const cancelRequest = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('leave_requests')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) throw updateError

        await fetchRequests()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '取消請假申請失敗'
        setError(message)
        logger.error('取消請假申請失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchRequests]
  )

  /**
   * 取得員工假別餘額
   */
  const fetchBalances = useCallback(
    async (employeeId: string, year?: number) => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const targetYear = year || new Date().getFullYear()

        const { data, error: queryError } = await supabase
          .from('leave_balances')
          .select(
            `
          *,
          leave_type:leave_types!leave_balances_leave_type_id_fkey(id, name, code)
        `
          )
          .eq('employee_id', employeeId)
          .eq('year', targetYear)

        if (queryError) throw queryError

        const mappedData: LeaveBalance[] = (data || []).map(item => {
          const leaveType = item.leave_type as { id: string; name: string; code: string } | null
          return {
            id: item.id,
            employee_id: item.employee_id,
            leave_type_id: item.leave_type_id,
            year: item.year,
            entitled_days: item.entitled_days || 0,
            used_days: item.used_days || 0,
            remaining_days: item.remaining_days || 0,
            leave_type_name: leaveType?.name || '未知',
            leave_type_code: leaveType?.code || '',
          }
        })

        setBalances(mappedData)
      } catch (err) {
        const message = err instanceof Error ? err.message : '載入假別餘額失敗'
        setError(message)
        logger.error('載入假別餘額失敗:', err)
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * 初始化員工假別餘額
   */
  const initializeBalances = useCallback(
    async (
      employeeId: string,
      year: number,
      leaveTypes: { id: string; days_per_year: number | null }[]
    ): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        const insertData = leaveTypes
          .filter(type => type.days_per_year !== null)
          .map(type => ({
            employee_id: employeeId,
            leave_type_id: type.id,
            year,
            workspace_id: getRequiredWorkspaceId(),
            entitled_days: type.days_per_year!,
            used_days: 0,
            remaining_days: type.days_per_year!,
          }))

        if (insertData.length > 0) {
          const { error: insertError } = await supabase.from('leave_balances').upsert(insertData, {
            onConflict: 'employee_id,leave_type_id,year',
          })

          if (insertError) throw insertError
        }

        await fetchBalances(employeeId, year)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '初始化假別餘額失敗'
        setError(message)
        logger.error('初始化假別餘額失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchBalances]
  )

  return {
    loading,
    error,
    requests,
    balances,
    fetchRequests,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    fetchBalances,
    initializeBalances,
  }
}
