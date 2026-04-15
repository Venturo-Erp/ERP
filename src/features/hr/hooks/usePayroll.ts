/**
 * 薪資管理 Hook
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

export type PayrollPeriodStatus = 'draft' | 'processing' | 'confirmed' | 'paid'

export interface PayrollPeriod {
  id: string
  workspace_id: string
  year: number
  month: number
  start_date: string
  end_date: string
  status: PayrollPeriodStatus
  confirmed_by: string | null
  confirmed_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string | null
}

export interface PayrollRecord {
  id: string
  workspace_id: string
  payroll_period_id: string
  employee_id: string
  // 基本資訊
  base_salary: number
  // 加項
  overtime_pay: number
  bonus: number
  allowances: number
  meal_allowance: number
  transportation_allowance: number
  other_additions: number
  // 減項
  unpaid_leave_deduction: number
  late_deduction: number
  other_deductions: number
  // 計算結果
  gross_salary: number
  total_deductions: number
  net_salary: number
  // 出勤統計
  work_days: number
  actual_work_days: number
  overtime_hours: number
  paid_leave_days: number
  unpaid_leave_days: number
  late_count: number
  // 詳細資料（JSON）
  overtime_details: Record<string, unknown> | null
  allowance_details: Record<string, unknown> | null
  deduction_details: Record<string, unknown> | null
  // 備註
  notes: string | null
  created_at: string | null
  updated_at: string | null
  // 關聯資料
  employee_name?: string
}

export interface PayrollRecordInput {
  employee_id: string
  payroll_period_id: string
  base_salary: number
  overtime_pay?: number
  bonus?: number
  allowances?: number
  other_additions?: number
  unpaid_leave_deduction?: number
  other_deductions?: number
  work_days?: number
  actual_work_days?: number
  overtime_hours?: number
  paid_leave_days?: number
  unpaid_leave_days?: number
  notes?: string | null
}

// ============================================
// 狀態標籤
// ============================================

export const PAYROLL_PERIOD_STATUS_LABELS: Record<PayrollPeriodStatus, string> = {
  draft: '草稿',
  processing: '計算中',
  confirmed: '已確認',
  paid: '已發放',
}

export const PAYROLL_PERIOD_STATUS_COLORS: Record<PayrollPeriodStatus, string> = {
  draft: 'bg-morandi-container text-morandi-primary',
  processing: 'bg-status-warning-bg text-status-warning',
  confirmed: 'bg-status-info-bg text-status-info',
  paid: 'bg-morandi-green/15 text-morandi-green',
}

// ============================================
// Hook 實作
// ============================================

export function usePayroll() {
  const user = useAuthStore(state => state.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [records, setRecords] = useState<PayrollRecord[]>([])

  /**
   * 取得薪資期間列表
   */
  const fetchPeriods = useCallback(
    async (year?: number) => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('payroll_periods')
          .select(
            'id, month, year, start_date, end_date, status, confirmed_at, confirmed_by, paid_at, notes, workspace_id, created_at, updated_at'
          )
          .limit(500)

          .order('year', { ascending: false })
          .order('month', { ascending: false })

        if (year) {
          query = query.eq('year', year)
        }

        const { data, error: queryError } = await query.limit(100)

        if (queryError) throw queryError

        setPeriods(
          (data || []).map(item => ({
            ...item,
            status: item.status as PayrollPeriodStatus,
          }))
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : '載入薪資期間失敗'
        setError(message)
        logger.error('載入薪資期間失敗:', err)
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * 建立薪資期間
   */
  const createPeriod = useCallback(
    async (year: number, month: number): Promise<PayrollPeriod | null> => {
      if (!user) return null

      setLoading(true)
      setError(null)

      try {
        // 檢查是否已存在
        const { data: existing } = await supabase
          .from('payroll_periods')
          .select('id')

          .eq('year', year)
          .eq('month', month)
          .single()

        if (existing) {
          setError('該月份薪資期間已存在')
          return null
        }

        // 計算起訖日期
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0) // 該月最後一天

        const { data, error: insertError } = await supabase
          .from('payroll_periods')
          .insert({
            workspace_id: getRequiredWorkspaceId(),
            year,
            month,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'draft',
          })
          .select()
          .single()

        if (insertError) throw insertError

        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:payroll_periods'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:payroll_periods')
        await fetchPeriods()
        return {
          ...data,
          status: data.status as PayrollPeriodStatus,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '建立薪資期間失敗'
        setError(message)
        logger.error('建立薪資期間失敗:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user, fetchPeriods]
  )

  /**
   * 取得薪資紀錄
   */
  const fetchRecords = useCallback(
    async (periodId: string) => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from('payroll_records')
          .select(
            `
          *,
          employee:employees!payroll_records_employee_id_fkey(id, chinese_name, display_name)
        `
          )

          .eq('payroll_period_id', periodId)
          .order('created_at', { ascending: true })

        if (queryError) throw queryError

        const mappedData: PayrollRecord[] = (data || []).map(item => {
          const employee = item.employee as {
            id: string
            chinese_name: string | null
            display_name: string | null
          } | null
          return {
            id: item.id,
            workspace_id: item.workspace_id,
            payroll_period_id: item.payroll_period_id,
            employee_id: item.employee_id,
            base_salary: item.base_salary || 0,
            overtime_pay: item.overtime_pay || 0,
            bonus: item.bonus || 0,
            allowances: item.allowances || 0,
            meal_allowance: item.meal_allowance || 0,
            transportation_allowance: item.transportation_allowance || 0,
            other_additions: item.other_additions || 0,
            unpaid_leave_deduction: item.unpaid_leave_deduction || 0,
            late_deduction: item.late_deduction || 0,
            other_deductions: item.other_deductions || 0,
            gross_salary: item.gross_salary || 0,
            total_deductions: item.total_deductions || 0,
            net_salary: item.net_salary || 0,
            work_days: item.work_days || 0,
            actual_work_days: item.actual_work_days || 0,
            overtime_hours: item.overtime_hours || 0,
            paid_leave_days: item.paid_leave_days || 0,
            unpaid_leave_days: item.unpaid_leave_days || 0,
            late_count: item.late_count || 0,
            overtime_details: item.overtime_details as Record<string, unknown> | null,
            allowance_details: item.allowance_details as Record<string, unknown> | null,
            deduction_details: item.deduction_details as Record<string, unknown> | null,
            notes: item.notes,
            created_at: item.created_at,
            updated_at: item.updated_at,
            employee_name: employee?.display_name || employee?.chinese_name || '未知',
          }
        })

        setRecords(mappedData)
      } catch (err) {
        const message = err instanceof Error ? err.message : '載入薪資紀錄失敗'
        setError(message)
        logger.error('載入薪資紀錄失敗:', err)
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * 計算並建立薪資紀錄
   */
  const calculatePayroll = useCallback(
    async (periodId: string): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        // 取得期間資訊
        const { data: period, error: periodError } = await supabase
          .from('payroll_periods')
          .select(
            'id, month, year, start_date, end_date, status, confirmed_at, confirmed_by, paid_at, notes, workspace_id, created_at, updated_at'
          )
          .eq('id', periodId)
          .single()

        if (periodError) throw periodError
        if (!period) throw new Error('找不到薪資期間')

        // 狀態轉換驗證
        const VALID_PAYROLL_TRANSITIONS: Record<string, string[]> = {
          draft: ['processing', 'confirmed'],
          processing: ['draft'],
          confirmed: ['paid', 'draft'],
          paid: [],
        }

        if (!VALID_PAYROLL_TRANSITIONS[period.status]?.includes('processing')) {
          throw new Error(`無法從「${period.status}」轉為「processing」`)
        }

        // 更新狀態為計算中
        await supabase.from('payroll_periods').update({ status: 'processing' }).eq('id', periodId)

        // 取得所有在職員工
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id, chinese_name, display_name, salary_info, monthly_salary')

          .in('status', ['active', 'probation'])

        if (empError) throw empError

        // 取得出勤紀錄
        const { data: attendanceRecords, error: attError } = await supabase
          .from('attendance_records')
          .select(
            'id, employee_id, date, clock_in, clock_out, status, overtime_hours, work_hours, notes, workspace_id, created_at, updated_at'
          )
          .limit(500)

          .gte('date', period.start_date)
          .lte('date', period.end_date)

        if (attError) throw attError

        // 取得請假紀錄
        const { data: leaveRequests, error: leaveError } = await supabase
          .from('leave_requests')
          .select(
            `
          *,
          leave_type:leave_types!leave_requests_leave_type_id_fkey(id, is_paid)
        `
          )

          .eq('status', 'approved')
          .gte('start_date', period.start_date)
          .lte('end_date', period.end_date)

        if (leaveError) throw leaveError

        // 計算工作天數（不含週末）
        const workDays = countWorkDays(period.start_date, period.end_date)
        const wsId = getRequiredWorkspaceId()

        // 讀取租戶扣款設定
        const { data: deductionTypes } = await supabase
          .from('payroll_deduction_types' as never)
          .select('*')
          .eq('workspace_id', wsId)
          .in('status', ['active', 'probation'])
          .order('sort_order')

        // 讀取租戶津貼設定
        const { data: allowanceTypes } = await supabase
          .from('payroll_allowance_types' as never)
          .select('*')
          .eq('workspace_id', wsId)
          .in('status', ['active', 'probation'])
          .order('sort_order')

        // 讀取員工薪資設定
        const { data: empConfigs } = await supabase
          .from('employee_payroll_config' as never)
          .select('*')

        const empConfigMap = new Map(
          (empConfigs || []).map((c: Record<string, unknown>) => [c.employee_id as string, c])
        )

        // 刪除現有薪資紀錄
        await supabase.from('payroll_records').delete().eq('payroll_period_id', periodId)

        // 為每位員工計算薪資
        const payrollRecords = []
        for (const emp of employees || []) {
          const salaryInfo = emp.salary_info as {
            base_salary?: number
            bonus?: number
            allowances?: number
          } | null
          // 優先用 monthly_salary（主欄位），fallback 到 salary_info.base_salary（舊欄位）
          const baseSalary =
            ((emp as Record<string, unknown>).monthly_salary as number) ||
            salaryInfo?.base_salary ||
            0
          const empConfig = empConfigMap.get(emp.id) as
            | {
                insured_salary?: number
                health_dependents?: number
              }
            | undefined

          // 計算出勤
          const empAttendance = (attendanceRecords || []).filter(a => a.employee_id === emp.id)
          const actualWorkDays = empAttendance.filter(
            a => a.status === 'present' || a.status === 'late'
          ).length
          const overtimeHours = empAttendance.reduce((sum, a) => sum + (a.overtime_hours || 0), 0)
          const lateCount = empAttendance.filter(a => a.status === 'late').length

          // 計算請假
          const empLeaves = (leaveRequests || []).filter(l => l.employee_id === emp.id)
          let paidLeaveDays = 0
          let unpaidLeaveDays = 0
          for (const leave of empLeaves) {
            const leaveType = leave.leave_type as { id: string; is_paid: boolean | null } | null
            if (leaveType?.is_paid !== false) {
              paidLeaveDays += leave.days
            } else {
              unpaidLeaveDays += leave.days
            }
          }

          // 計算加班費（依台灣勞基法分段計算）
          const hourlyRate = baseSalary / 30 / 8
          const overtimePay = calculateOvertimePay(hourlyRate, overtimeHours)

          // 計算無薪假扣款
          const dailyRate = baseSalary / 30
          const unpaidLeaveDeduction = Math.round(dailyRate * unpaidLeaveDays)

          // 加項 — 從津貼設定計算
          const bonus = salaryInfo?.bonus || 0
          let mealAllowance = 0
          let transportAllowance = 0
          let totalAllowances = 0
          const allowanceDetails: Record<string, number> = {}

          for (const at of (allowanceTypes || []) as {
            code: string
            name: string
            default_amount: number
          }[]) {
            const amount = at.default_amount || 0
            if (amount > 0) {
              allowanceDetails[at.name] = amount
              totalAllowances += amount
              if (at.code === 'meal') mealAllowance = amount
              if (at.code === 'transport') transportAllowance = amount
            }
          }

          // 減項 — 從扣款設定計算（勞保/健保/勞退等）
          let statutory_deductions = 0
          const deductionDetails: Record<string, number> = {}
          const insuredSalary = empConfig?.insured_salary || baseSalary

          for (const dt of (deductionTypes || []) as {
            code: string
            name: string
            calc_method: string
            calc_config: Record<string, unknown>
            is_employer_paid: boolean
          }[]) {
            if (dt.is_employer_paid) continue // 雇主負擔不從員工薪資扣

            let amount = 0
            if (dt.calc_method === 'fixed') {
              amount = Number(dt.calc_config?.amount) || 0
            } else if (dt.calc_method === 'percentage') {
              const rate = Number(dt.calc_config?.rate) || 0
              const employeeShare = Number(dt.calc_config?.employee_share) || 1
              amount = Math.round(insuredSalary * rate * employeeShare)
            }

            if (amount > 0) {
              deductionDetails[dt.name] = amount
              statutory_deductions += amount
            }
          }

          // 總額計算
          const totalDeductions = unpaidLeaveDeduction + statutory_deductions
          const grossSalary = baseSalary + overtimePay + bonus + totalAllowances
          const netSalary = grossSalary - totalDeductions

          payrollRecords.push({
            workspace_id: wsId,
            payroll_period_id: periodId,
            employee_id: emp.id,
            base_salary: baseSalary,
            overtime_pay: overtimePay,
            bonus,
            allowances: totalAllowances,
            meal_allowance: mealAllowance,
            transportation_allowance: transportAllowance,
            other_additions: 0,
            unpaid_leave_deduction: unpaidLeaveDeduction,
            late_deduction: 0,
            other_deductions: statutory_deductions,
            gross_salary: grossSalary,
            total_deductions: totalDeductions,
            net_salary: netSalary,
            work_days: workDays,
            actual_work_days: actualWorkDays,
            overtime_hours: overtimeHours,
            paid_leave_days: paidLeaveDays,
            unpaid_leave_days: unpaidLeaveDays,
            late_count: lateCount,
            allowance_details: allowanceDetails,
            deduction_details: deductionDetails,
          })
        }

        // 批量新增薪資紀錄
        if (payrollRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('payroll_records')
            .insert(payrollRecords)

          if (insertError) throw insertError
        }

        // 更新狀態為草稿（計算完成）
        await supabase.from('payroll_periods').update({ status: 'draft' }).eq('id', periodId)

        globalMutate(
          (key: string) =>
            typeof key === 'string' &&
            (key.startsWith('entity:payroll_periods') || key.startsWith('entity:payroll_records')),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:payroll_periods')
        invalidate_cache_pattern('entity:payroll_records')
        await fetchPeriods()
        await fetchRecords(periodId)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '計算薪資失敗'
        setError(message)
        logger.error('計算薪資失敗:', err)

        // 錯誤時回復狀態
        await supabase.from('payroll_periods').update({ status: 'draft' }).eq('id', periodId)

        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchPeriods, fetchRecords]
  )

  /**
   * 更新薪資紀錄
   */
  const updateRecord = useCallback(
    async (id: string, input: Partial<PayrollRecordInput>): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        // 重新計算總額
        const { data: existing, error: fetchError } = await supabase
          .from('payroll_records')
          .select(
            'id, payroll_period_id, employee_id, base_salary, overtime_hours, overtime_pay, bonus, allowances, other_additions, total_deductions, other_deductions, unpaid_leave_deduction, unpaid_leave_days, paid_leave_days, late_count, late_deduction, meal_allowance, transportation_allowance, net_salary, gross_salary, actual_work_days, work_days, overtime_details, allowance_details, deduction_details, notes, workspace_id, created_at, updated_at'
          )
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError

        const baseSalary = input.base_salary ?? existing.base_salary ?? 0
        const overtimePay = input.overtime_pay ?? existing.overtime_pay ?? 0
        const bonus = input.bonus ?? existing.bonus ?? 0
        const allowances = input.allowances ?? existing.allowances ?? 0
        const otherAdditions = input.other_additions ?? existing.other_additions ?? 0
        const unpaidLeaveDeduction =
          input.unpaid_leave_deduction ?? existing.unpaid_leave_deduction ?? 0
        const otherDeductions = input.other_deductions ?? existing.other_deductions ?? 0

        const grossSalary = baseSalary + overtimePay + bonus + allowances + otherAdditions
        const totalDeductions = unpaidLeaveDeduction + otherDeductions
        const netSalary = grossSalary - totalDeductions

        const { error: updateError } = await supabase
          .from('payroll_records')
          .update({
            ...input,
            gross_salary: grossSalary,
            total_deductions: totalDeductions,
            net_salary: netSalary,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) throw updateError

        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:payroll_records'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:payroll_records')
        await fetchRecords(existing.payroll_period_id)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '更新薪資紀錄失敗'
        setError(message)
        logger.error('更新薪資紀錄失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchRecords]
  )

  /**
   * 確認薪資期間
   */
  const confirmPeriod = useCallback(
    async (periodId: string): Promise<boolean> => {
      if (!user?.id) return false

      setLoading(true)
      setError(null)

      try {
        // 狀態轉換驗證
        const { data: period, error: fetchError } = await supabase
          .from('payroll_periods')
          .select('status')
          .eq('id', periodId)
          .single()

        if (fetchError || !period) throw new Error('找不到薪資期間')

        const VALID_PAYROLL_TRANSITIONS: Record<string, string[]> = {
          draft: ['processing', 'confirmed'],
          processing: ['draft'],
          confirmed: ['paid', 'draft'],
          paid: [],
        }

        if (!VALID_PAYROLL_TRANSITIONS[period.status]?.includes('confirmed')) {
          throw new Error(`無法從「${period.status}」轉為「confirmed」`)
        }

        const { error: updateError } = await supabase
          .from('payroll_periods')
          .update({
            status: 'confirmed',
            confirmed_by: user.id,
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', periodId)

        if (updateError) throw updateError

        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:payroll_periods'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:payroll_periods')
        await fetchPeriods()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '確認薪資期間失敗'
        setError(message)
        logger.error('確認薪資期間失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user?.id, fetchPeriods]
  )

  /**
   * 標記為已發放
   */
  const markAsPaid = useCallback(
    async (periodId: string): Promise<boolean> => {
      if (!user) return false

      setLoading(true)
      setError(null)

      try {
        // 狀態轉換驗證
        const { data: period, error: fetchError } = await supabase
          .from('payroll_periods')
          .select('status')
          .eq('id', periodId)
          .single()

        if (fetchError || !period) throw new Error('找不到薪資期間')

        const VALID_PAYROLL_TRANSITIONS: Record<string, string[]> = {
          draft: ['processing', 'confirmed'],
          processing: ['draft'],
          confirmed: ['paid', 'draft'],
          paid: [],
        }

        if (!VALID_PAYROLL_TRANSITIONS[period.status]?.includes('paid')) {
          throw new Error(`無法從「${period.status}」轉為「paid」`)
        }

        const { error: updateError } = await supabase
          .from('payroll_periods')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', periodId)

        if (updateError) throw updateError

        globalMutate(
          (key: string) => typeof key === 'string' && key.startsWith('entity:payroll_periods'),
          undefined,
          { revalidate: true }
        )
        invalidate_cache_pattern('entity:payroll_periods')
        await fetchPeriods()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : '更新發放狀態失敗'
        setError(message)
        logger.error('更新發放狀態失敗:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [user, fetchPeriods]
  )

  /**
   * 計算薪資統計
   */
  const calculateSummary = useCallback((records: PayrollRecord[]) => {
    return {
      totalEmployees: records.length,
      totalGrossSalary: records.reduce((sum, r) => sum + r.gross_salary, 0),
      totalNetSalary: records.reduce((sum, r) => sum + r.net_salary, 0),
      totalOvertimePay: records.reduce((sum, r) => sum + r.overtime_pay, 0),
      totalDeductions: records.reduce((sum, r) => sum + r.total_deductions, 0),
    }
  }, [])

  return {
    loading,
    error,
    periods,
    records,
    fetchPeriods,
    createPeriod,
    fetchRecords,
    calculatePayroll,
    updateRecord,
    confirmPeriod,
    markAsPaid,
    calculateSummary,
  }
}

// ============================================
// 工具函式
// ============================================

/**
 * 計算加班費（依台灣勞基法分段計算）
 *
 * 台灣勞基法規定：
 * - 前 2 小時：1.34 倍（時薪 × 4/3）
 * - 第 3-4 小時：1.67 倍（時薪 × 5/3）
 * - 超過 4 小時或休息日：2 倍
 *
 * @param hourlyRate 時薪
 * @param overtimeHours 加班時數
 * @returns 加班費總額
 */
function calculateOvertimePay(hourlyRate: number, overtimeHours: number): number {
  if (overtimeHours <= 0) return 0

  let totalPay = 0

  // 前 2 小時：1.34 倍
  const tier1Hours = Math.min(overtimeHours, 2)
  totalPay += hourlyRate * 1.34 * tier1Hours

  // 第 3-4 小時：1.67 倍
  if (overtimeHours > 2) {
    const tier2Hours = Math.min(overtimeHours - 2, 2)
    totalPay += hourlyRate * 1.67 * tier2Hours
  }

  // 超過 4 小時：2 倍
  if (overtimeHours > 4) {
    const tier3Hours = overtimeHours - 4
    totalPay += hourlyRate * 2.0 * tier3Hours
  }

  return Math.round(totalPay)
}

/**
 * 計算工作天數（不含週末）
 */
function countWorkDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let count = 0

  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}
