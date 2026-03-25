import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

/**
 * 公司收款統計
 */
interface CompanyIncomeStats {
  companyIncome: number // 公司收入（tour_id IS NULL）
  tourIncome: number // 團體收入（tour_id IS NOT NULL）
  totalReceipts: number // 總收款筆數
}

/**
 * 依會計科目統計
 */
interface CompanyIncomeBySubject {
  subject_code: string
  subject_name: string
  subject_type: string
  count: number
  total_amount: number
  min_date: string
  max_date: string
}

/**
 * 依收款方式統計
 */
interface CompanyIncomeByPaymentMethod {
  payment_method_id: string
  payment_method_code: string
  payment_method_name: string
  count: number
  total_amount: number
  min_date: string
  max_date: string
}

/**
 * 公司收款報表 Hook
 * 
 * @param workspaceId - 公司 ID
 * @param startDate - 開始日期 (YYYY-MM-DD)
 * @param endDate - 結束日期 (YYYY-MM-DD)
 * @param subjectIds - 會計科目 ID 篩選（選填）
 */
export function useCompanyIncome(
  workspaceId: string,
  startDate: string,
  endDate: string,
  subjectIds?: string[]
) {
  // 統計查詢
  const { data: stats, error: statsError } = useSWR(
    workspaceId && startDate && endDate
      ? ['company-income-stats', workspaceId, startDate, endDate]
      : null,
    async () => {
      // 查詢公司收入（tour_id IS NULL）
      const { data: companyReceipts, error: companyError } = await supabase
        .from('receipts')
        .select('total_amount')
        .eq('workspace_id', workspaceId)
        .is('tour_id', null)
        .is('deleted_at', null)
        .eq('status', '1') // 已確認
        .gte('receipt_date', startDate)
        .lte('receipt_date', endDate)

      if (companyError) throw companyError

      // 查詢團體收入（tour_id IS NOT NULL）
      const { data: tourReceipts, error: tourError } = await supabase
        .from('receipts')
        .select('total_amount')
        .eq('workspace_id', workspaceId)
        .not('tour_id', 'is', null)
        .is('deleted_at', null)
        .eq('status', '1')
        .gte('receipt_date', startDate)
        .lte('receipt_date', endDate)

      if (tourError) throw tourError

      const companyIncome = companyReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0)
      const tourIncome = tourReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0)

      return {
        companyIncome,
        tourIncome,
        totalReceipts: companyReceipts.length + tourReceipts.length,
      } as CompanyIncomeStats
    }
  )

  // 依會計科目統計
  const { data: bySubject, error: subjectError } = useSWR(
    workspaceId && startDate && endDate
      ? ['company-income-by-subject', workspaceId, startDate, endDate, subjectIds]
      : null,
    async () => {
      let query = supabase
        .from('receipts')
        .select(`
          accounting_subject_id,
          total_amount,
          receipt_date,
          accounting_subjects (code, name, type)
        `)
        .eq('workspace_id', workspaceId)
        .is('tour_id', null) // 只查公司收入
        .is('deleted_at', null)
        .eq('status', '1')
        .gte('receipt_date', startDate)
        .lte('receipt_date', endDate)

      if (subjectIds && subjectIds.length > 0) {
        query = query.in('accounting_subject_id', subjectIds)
      }

      const { data, error } = await query
      if (error) throw error

      // 手動聚合（因為 Supabase 不支援 GROUP BY join）
      const grouped = data.reduce(
        (acc, row) => {
          const key = row.accounting_subject_id
          if (!key || !row.accounting_subjects) return acc

          if (!acc[key]) {
            acc[key] = {
              subject_code: row.accounting_subjects.code,
              subject_name: row.accounting_subjects.name,
              subject_type: row.accounting_subjects.type,
              count: 0,
              total_amount: 0,
              min_date: row.receipt_date,
              max_date: row.receipt_date,
            }
          }
          acc[key].count++
          acc[key].total_amount += row.total_amount || 0
          if (row.receipt_date < acc[key].min_date) acc[key].min_date = row.receipt_date
          if (row.receipt_date > acc[key].max_date) acc[key].max_date = row.receipt_date
          return acc
        },
        {} as Record<string, CompanyIncomeBySubject>
      )

      return Object.values(grouped)
    }
  )

  // 依收款方式統計
  const { data: byPaymentMethod, error: paymentMethodError } = useSWR(
    workspaceId && startDate && endDate
      ? ['company-income-by-payment-method', workspaceId, startDate, endDate]
      : null,
    async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          payment_method_id,
          total_amount,
          receipt_date,
          payment_methods (id, code, name)
        `)
        .eq('workspace_id', workspaceId)
        .is('tour_id', null)
        .is('deleted_at', null)
        .eq('status', '1')
        .not('payment_method_id', 'is', null) // 只查有 payment_method_id 的
        .gte('receipt_date', startDate)
        .lte('receipt_date', endDate)

      if (error) throw error

      // 手動聚合
      const grouped = data.reduce(
        (acc, row) => {
          const key = row.payment_method_id
          if (!key || !row.payment_methods) return acc

          if (!acc[key]) {
            acc[key] = {
              payment_method_id: key,
              payment_method_code: row.payment_methods.code,
              payment_method_name: row.payment_methods.name,
              count: 0,
              total_amount: 0,
              min_date: row.receipt_date,
              max_date: row.receipt_date,
            }
          }
          acc[key].count++
          acc[key].total_amount += row.total_amount || 0
          if (row.receipt_date < acc[key].min_date) acc[key].min_date = row.receipt_date
          if (row.receipt_date > acc[key].max_date) acc[key].max_date = row.receipt_date
          return acc
        },
        {} as Record<string, CompanyIncomeByPaymentMethod>
      )

      return Object.values(grouped)
    }
  )

  return {
    stats,
    bySubject,
    byPaymentMethod,
    isLoading: !stats && !statsError,
    error: statsError || subjectError || paymentMethodError,
  }
}
