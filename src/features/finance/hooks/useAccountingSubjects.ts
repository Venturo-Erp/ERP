'use client'

import { useMemo } from 'react'
import { useAccountingSubjects as useAccountingSubjectsEntity } from '@/data'

interface AccountingSubject {
  id: string
  code: string
  name: string
  type: string
}

/**
 * 取得會計科目清單（用於下拉選擇）
 * 底層使用 SWR entity hook，享有快取和去重
 */
export function useAccountingSubjects(
  filterType?: 'expense' | 'cost' | 'asset' | 'liability' | 'revenue'
) {
  const { items, loading } = useAccountingSubjectsEntity()

  // 根據 filterType 過濾
  const subjects: AccountingSubject[] = useMemo(() => {
    const all = (items || []) as AccountingSubject[]
    if (!filterType) return all
    return all.filter(s => s.type === filterType)
  }, [items, filterType])

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
