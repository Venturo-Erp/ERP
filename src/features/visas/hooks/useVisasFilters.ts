'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Visa, VisaStatus } from '@/stores/types'

/**
 * 勾選相容性規則
 * 第一筆勾選的狀態決定可以一起勾選哪些狀態
 */
const SELECTION_COMPATIBILITY: Record<VisaStatus, VisaStatus[]> = {
  pending: ['pending', 'rejected'], // 待送件可勾：待送件、退件
  submitted: ['submitted'], // 已送件可勾：已送件
  collected: ['collected', 'rejected'], // 已取件可勾：已取件、退件
  rejected: ['rejected', 'pending', 'collected'], // 退件可勾：退件、待送件、已取件
  returned: [], // 已歸還：不能勾選
}

/**
 * 按鈕可用性規則
 * 根據已勾選的狀態，決定哪些按鈕可以按
 */
const BUTTON_AVAILABILITY: Record<
  VisaStatus,
  {
    submit: boolean // 送件
    pickup: boolean // 取件
    return: boolean // 歸還
    reject: boolean // 退件
  }
> = {
  pending: { submit: true, pickup: false, return: false, reject: true },
  submitted: { submit: true, pickup: true, return: false, reject: true },
  collected: { submit: true, pickup: false, return: true, reject: true },
  rejected: { submit: true, pickup: true, return: true, reject: false },
  returned: { submit: false, pickup: false, return: false, reject: false },
}

/**
 * 簽證篩選邏輯 Hook
 * 負責狀態篩選和選擇管理
 */
export function useVisasFilters(visas: Visa[]) {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  // 根據 tab 篩選簽證
  const filteredVisas = useMemo(() => {
    return activeTab === 'all' ? visas : visas.filter(v => v.status === activeTab)
  }, [visas, activeTab])

  // 取得第一筆選擇的簽證狀態
  const firstSelectedStatus = useMemo(() => {
    if (selectedRows.length === 0) return null
    const firstVisa = visas.find(v => v.id === selectedRows[0])
    return firstVisa?.status as VisaStatus | null
  }, [selectedRows, visas])

  // 取得所有已選擇簽證的狀態集合
  const selectedStatuses = useMemo(() => {
    const statuses = new Set<VisaStatus>()
    selectedRows.forEach(id => {
      const visa = visas.find(v => v.id === id)
      if (visa?.status) {
        statuses.add(visa.status as VisaStatus)
      }
    })
    return statuses
  }, [selectedRows, visas])

  // 計算按鈕可用性（根據所有已選擇的狀態）
  const buttonAvailability = useMemo(() => {
    if (selectedStatuses.size === 0) {
      return { submit: false, pickup: false, return: false, reject: false }
    }

    // 所有狀態的按鈕可用性交集
    let result = { submit: true, pickup: true, return: true, reject: true }
    selectedStatuses.forEach(status => {
      const availability = BUTTON_AVAILABILITY[status]
      result = {
        submit: result.submit && availability.submit,
        pickup: result.pickup && availability.pickup,
        return: result.return && availability.return,
        reject: result.reject && availability.reject,
      }
    })
    return result
  }, [selectedStatuses])

  // 判斷某個簽證是否可以被勾選
  const canSelectVisa = useCallback(
    (visaId: string): boolean => {
      // 已歸還的不能勾選
      const visa = visas.find(v => v.id === visaId)
      if (!visa || visa.status === 'returned') return false

      // 如果沒有選擇任何項目，可以勾選
      if (!firstSelectedStatus) return true

      // 檢查是否在相容列表中
      const compatibleStatuses = SELECTION_COMPATIBILITY[firstSelectedStatus]
      return compatibleStatuses.includes(visa.status as VisaStatus)
    },
    [visas, firstSelectedStatus]
  )

  // 包裝 setSelectedRows，加入相容性檢查
  const handleSelectionChange = useCallback(
    (newSelection: string[]) => {
      // 如果清空選擇，直接設定
      if (newSelection.length === 0) {
        setSelectedRows([])
        return
      }

      // 如果是第一次選擇，直接設定
      if (selectedRows.length === 0) {
        // 檢查是否為已歸還（不能選）
        const visa = visas.find(v => v.id === newSelection[0])
        if (visa?.status === 'returned') return
        setSelectedRows(newSelection)
        return
      }

      // 過濾掉不相容的選擇
      const validSelection = newSelection.filter(id => canSelectVisa(id))
      setSelectedRows(validSelection)
    },
    [selectedRows, visas, canSelectVisa]
  )

  return {
    activeTab,
    setActiveTab,
    selectedRows,
    setSelectedRows: handleSelectionChange,
    filteredVisas,
    firstSelectedStatus,
    selectedStatuses,
    buttonAvailability,
    canSelectVisa,
  }
}
