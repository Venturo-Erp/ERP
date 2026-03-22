'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'

interface AccountingSubject {
  id: string
  code: string
  name: string
  type: string
}

/**
 * 取得會計科目清單（用於下拉選擇）
 */
export function useAccountingSubjects(
  filterType?: 'expense' | 'cost' | 'asset' | 'liability' | 'revenue'
) {
  const [subjects, setSubjects] = useState<AccountingSubject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubjects = async () => {
      let query = supabase.from('accounting_subjects').select('id, code, name, type').order('code')

      if (filterType) {
        query = query.eq('type', filterType)
      }

      const { data, error } = await query

      if (!error && data) {
        setSubjects(data)
      }
      setLoading(false)
    }

    fetchSubjects()
  }, [filterType])

  // 轉換為 Combobox 選項格式
  const options = useMemo(
    () =>
      subjects.map(s => ({
        value: s.id,
        label: `${s.code} ${s.name}`,
        code: s.code,
        name: s.name,
      })),
    [subjects]
  )

  // 成本類科目（5xxx）
  const costOptions = useMemo(
    () =>
      subjects
        .filter(s => s.code.startsWith('5'))
        .map(s => ({
          value: s.id,
          label: `${s.code} ${s.name}`,
          code: s.code,
          name: s.name,
        })),
    [subjects]
  )

  // 費用類科目（6xxx）
  const expenseOptions = useMemo(
    () =>
      subjects
        .filter(s => s.code.startsWith('6'))
        .map(s => ({
          value: s.id,
          label: `${s.code} ${s.name}`,
          code: s.code,
          name: s.name,
        })),
    [subjects]
  )

  return { subjects, options, costOptions, expenseOptions, loading }
}

/**
 * 根據請款類別自動取得預設會計科目
 */
export function getDefaultSubjectByCategory(
  category: string,
  subjects: AccountingSubject[]
): AccountingSubject | undefined {
  const categoryMap: Record<string, string> = {
    住宿: '5102',
    交通: '5101',
    餐食: '5103',
    門票: '5104',
    導遊: '5106',
    保險: '5105',
    同業: '5106',
    其他: '5106',
    出團款: '1104',
    回團款: '1102',
    員工代墊: '5106',
  }

  const code = categoryMap[category]
  if (code) {
    return subjects.find(s => s.code === code)
  }
  return undefined
}
