/**
 * 出勤紀錄 Hook
 */

'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getRequiredWorkspaceId } from '@/lib/workspace-context'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { mutate as globalMutate } from 'swr'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'

// ============================================
// 類型定義
// ============================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'early_leave' | 'on_leave'

export interface AttendanceRecord {
  id: string
  workspace_id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  work_hours: number | null
  overtime_hours: number | null
  status: AttendanceStatus | null
  leave_request_id: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  // 關聯資料
  employee_name?: string
}

export interface AttendanceRecordInput {
  employee_id: string
  date: string
  clock_in?: string | null
  clock_out?: string | null
  work_hours?: number | null
  overtime_hours?: number | null
  status?: AttendanceStatus | null
  leave_request_id?: string | null
  notes?: string | null
}

export interface AttendanceSummary {
  total_days: number
  present_days: number
  absent_days: number
  late_days: number
  early_leave_days: number
  on_leave_days: number
  total_work_hours: number
  total_overtime_hours: number
}

// ============================================
// 狀態標籤
// ============================================

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: '正常',
  absent: '缺勤',
  late: '遲到',
  early_leave: '早退',
  on_leave: '請假',
}

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  early_leave: 'bg-orange-100 text-orange-700',
  on_leave: 'bg-blue-100 text-blue-700',
}

// ============================================
// Hook 實作
// ============================================

export function useAttendanceRecords() {
  const user = useAuthStore(state => state.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])

  /**
   * 取得出勤紀錄列表
   */
  const fetchRecords = useCallback(
    async (filters?: {
      employee_id?: string
      start_date?: string
      end_date?: string
      status?: AttendanceStatus
    }) => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('attendance_records')
          .select(
            `
          *,
          employee:employees!attendance_records_employee_id_fkey(id, chinese_name, display_name)
        `
          )

          .order('date', { ascending: false })

        if (filters?.employee_id) {
          query = query.eq('employee_id', filters.employee_id)
        }
        if (filters?.start_date) {
          query = query.gte('date', filters.start_date)
        }
        if (filters?.end_date) {
          query = query.lte('date', filters.end_date)
        }
        if (filters?.status) {
          query = query.eq('status', filters.status)
        }

        const { data, error: queryError } = await query

        if (queryError) throw queryError

        const mappedData: AttendanceRecord[] = (data || []).map(item => {
          const employee = item.employee as {
            id: string
            chinese_name: string | null
            display_name: string | null
          } | null
          return {
            id: item.id,
            workspace_id: item.workspace_id,
            employee_id: item.employee_id,
            date: item.date,
            clock_in: item.clock_in,
            clock_out: item.clock_out,
            work_hours: item.work_hours,
            overtime_hours: item.overtime_hours,
            status: item.status as AttendanceStatus | null,
            leave_request_id: item.leave_request_id,
            notes: item.notes,
            created_at: item.created_at,
            updated_at: item.updated_at,
            employee_name: employee?.display_name || employee?.chinese_name || '未知',
          }
        })

        setRecords(mappedData)
      } catch (err) {
        const message = err instanceof Error ? err.message : '載入出勤紀錄失敗'
        setError(message)
        logger.error('載入出勤紀錄失敗:', err)
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * 新增出勤紀錄
   */
  const createRecord = useCallback(
    async (input: AttendanceRecordInput): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        // 計算工時
        let workHours = input.work_hours
        if (!workHours && input.clock_in && input.clock_out) {
          const clockIn = new Date(`1970-01-01T${input.clock_in}`)
          const clockOut = new Date(`1970-01-01T${input.clock_out}`)
          workHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        }

        // 判斷狀態（讀取租戶設定的上班時間）
        let status = input.status
        if (!status && input.clock_in) {
          let expectedStart = '09:00'
          try {
            const { data: settings } = await supabase
              .from('workspace_attendance_settings' as never)
              .select('work_start_time')
              .eq('workspace_id', getRequiredWorkspaceId())
              .single()
            if (settings && (settings as { work_start_time?: string }).work_start_time) {
              expectedStart = (settings as { work_start_time: string }).work_start_time.slice(0, 5)
            }
          } catch {}
          status = input.clock_in > expectedStart ? 'late' : 'present'
        }

        const { error: insertError } = await supabase.from('attendance_records').insert({
          workspace_id: getRequiredWorkspaceId(),
          employee_id: input.employee_id,
          date: input.date,
          clock_in: input.clock_in ?? null,
          clock_out: input.clock_out ?? null,
          work_hours: workHours ?? null,
          overtime_hours: input.overtime_hours ?? null,
          status: status ?? undefined,
          leave_request_id: input.leave_request_id ?? null,
          notes: input.notes ?? null,
        })

        if (insertError) throw insertError

        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:attendance_records'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:attendance_records')
        await fetchRecords()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '新增出勤紀錄失敗'
        setError(message)
        logger.error('新增出勤紀錄失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchRecords]
  )

  /**
   * 更新出勤紀錄
   */
  const updateRecord = useCallback(
    async (id: string, input: Partial<AttendanceRecordInput>): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        // 計算工時
        let workHours = input.work_hours
        if (input.clock_in !== undefined && input.clock_out !== undefined) {
          if (input.clock_in && input.clock_out) {
            const clockIn = new Date(`1970-01-01T${input.clock_in}`)
            const clockOut = new Date(`1970-01-01T${input.clock_out}`)
            workHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
          }
        }

        const updateData: Record<string, unknown> = {
          ...input,
          updated_at: new Date().toISOString(),
        }
        if (workHours !== undefined) {
          updateData.work_hours = workHours
        }

        const { error: updateError } = await supabase
          .from('attendance_records')
          .update(updateData)
          .eq('id', id)

        if (updateError) throw updateError

        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:attendance_records'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:attendance_records')
        await fetchRecords()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '更新出勤紀錄失敗'
        setError(message)
        logger.error('更新出勤紀錄失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchRecords]
  )

  /**
   * 刪除出勤紀錄
   */
  const deleteRecord = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        const { error: deleteError } = await supabase
          .from('attendance_records')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError

        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:attendance_records'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:attendance_records')
        await fetchRecords()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '刪除出勤紀錄失敗'
        setError(message)
        logger.error('刪除出勤紀錄失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchRecords]
  )

  /**
   * 計算出勤統計
   */
  const calculateSummary = useCallback(
    (records: AttendanceRecord[], employeeId?: string): AttendanceSummary => {
      const filteredRecords = employeeId
        ? records.filter(r => r.employee_id === employeeId)
        : records

      return {
        total_days: filteredRecords.length,
        present_days: filteredRecords.filter(r => r.status === 'present').length,
        absent_days: filteredRecords.filter(r => r.status === 'absent').length,
        late_days: filteredRecords.filter(r => r.status === 'late').length,
        early_leave_days: filteredRecords.filter(r => r.status === 'early_leave').length,
        on_leave_days: filteredRecords.filter(r => r.status === 'on_leave').length,
        total_work_hours: filteredRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0),
        total_overtime_hours: filteredRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
      }
    },
    []
  )

  /**
   * 打卡
   */
  const clockIn = useCallback(
    async (employeeId: string): Promise<boolean> => {
      if (!user) return false

      const today = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toTimeString().slice(0, 5)

      // 檢查今天是否已有紀錄
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')

        .eq('employee_id', employeeId)
        .eq('date', today)
        .single()

      if (existing) {
        setError('今天已經打過上班卡了')
        return false
      }

      return createRecord({
        employee_id: employeeId,
        date: today,
        clock_in: currentTime,
      })
    },
    [user, createRecord]
  )

  /**
   * 打卡下班
   */
  const clockOut = useCallback(
    async (employeeId: string): Promise<boolean> => {
      if (!user) return false

      const today = new Date().toISOString().split('T')[0]
      const currentTime = new Date().toTimeString().slice(0, 5)

      // 取得今天的紀錄
      const { data: existing, error: fetchError } = await supabase
        .from('attendance_records')
        .select('id, clock_in')

        .eq('employee_id', employeeId)
        .eq('date', today)
        .single()

      if (fetchError || !existing) {
        setError('今天尚未打上班卡')
        return false
      }

      if (!existing.clock_in) {
        setError('今天尚未打上班卡')
        return false
      }

      // 計算工時
      const clockIn = new Date(`1970-01-01T${existing.clock_in}`)
      const clockOut = new Date(`1970-01-01T${currentTime}`)
      const workHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)

      // 判斷加班（假設標準工時 8 小時）
      const overtimeHours = Math.max(0, workHours - 8)

      return updateRecord(existing.id, {
        clock_out: currentTime,
        work_hours: workHours,
        overtime_hours: overtimeHours,
      })
    },
    [user, updateRecord]
  )

  return {
    loading,
    error,
    records,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    calculateSummary,
    clockIn,
    clockOut,
  }
}
