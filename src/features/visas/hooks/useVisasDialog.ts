'use client'

import { formatDate } from '@/lib/utils/format-date'

import { useState, useCallback, useMemo } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import type { Visa } from '@/stores/types'

export interface VisaApplicant {
  id: string
  name: string
  country: string
  is_urgent: boolean
  received_date: string // 收件時間
  expected_issue_date: string // 預計下件時間
  fee?: number // 代辦費（可手動修改）
  cost: number
  isAdditional?: boolean // 是否為追加列（同一人的其他簽證）
  parentId?: string // 追加列的父申請人 ID
  // 編輯模式額外欄位
  actual_submission_date?: string // 送件時間
  documents_returned_date?: string // 證件歸還
  pickup_date?: string // 取件時間
  vendor?: string // 送件單位
  notes?: string // 備註
  status?: string // 狀態
}

/**
 * 簽證對話框邏輯 Hook
 * 負責對話框狀態、表單資料、辦理人管理
 */
interface Tour {
  id: string
  code: string
  name: string
  archived?: boolean | null
}

export function useVisasDialog(tours: Tour[]) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVisa, setEditingVisa] = useState<Visa | null>(null) // 編輯模式下的簽證

  // 聯絡人資訊
  const [contact_info, setContactInfo] = useState({
    tour_id: '',
    order_id: '',
    contact_person: '',
    contact_phone: '',
  })

  // 批次辦理人列表
  const [applicants, setApplicants] = useState<VisaApplicant[]>([
    {
      id: '1',
      name: '',
      country: '護照 成人',
      is_urgent: false,
      received_date: '',
      expected_issue_date: '',
      cost: 0,
    },
  ])

  // 團號選項（過濾掉已封存的）
  const tourOptions: ComboboxOption[] = useMemo(() => {
    return tours
      .filter(tour => !tour.archived)
      .map(tour => ({
        value: tour.id,
        label: `${tour.code} - ${tour.name}`,
      }))
  }, [tours])

  // 計算下件時間
  const calculateReceivedDate = useCallback((submissionDate: string, visaType: string): string => {
    if (!submissionDate) return ''

    const date = new Date(submissionDate)
    let days = 21

    if (visaType.includes('ESTA')) {
      days = 3 // 美國 ESTA 通常 72 小時內
    } else if (visaType.includes('台胞證') && visaType.includes('急件')) {
      days = 6
    } else if (visaType.includes('護照') && visaType.includes('急件')) {
      days = 3
    } else if (visaType.includes('台胞證')) {
      days = 14
    } else if (visaType.includes('護照')) {
      days = 21
    }

    date.setDate(date.getDate() + days)
    return formatDate(date)
  }, [])

  // 計算代辦費
  const calculateFee = useCallback((country: string): number => {
    if (country.includes('ESTA')) return 1000 // 美國 ESTA 代辦費
    if (country.includes('兒童')) return 1500
    if (country.includes('首辦')) return 800
    if (country.includes('台胞證') && country.includes('遺失件')) return 2900
    return 1800
  }, [])

  // 新增辦理人
  const addApplicant = useCallback(() => {
    setApplicants(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        country: '護照 成人',
        is_urgent: false,
        received_date: '',
        expected_issue_date: '',
        cost: 0,
      },
    ])
  }, [])

  // 追加同一人的其他簽證（插入在該申請人下方）
  const addApplicantForSame = useCallback(
    (parentId: string, parentName: string) => {
      setApplicants(prev => {
        const parentIndex = prev.findIndex(a => a.id === parentId)
        if (parentIndex === -1) return prev

        const parent = prev[parentIndex]
        const defaultCountry = '護照 成人'
        // 追加列的收件日期 = 父列的預計下件日期（等前一件下來才能送）
        const newReceivedDate = parent.expected_issue_date || ''
        // 根據新的收件日期和簽證類型計算預計下件日期
        const expectedDate = newReceivedDate
          ? calculateReceivedDate(newReceivedDate, defaultCountry)
          : ''

        const newApplicant: VisaApplicant = {
          id: Date.now().toString(),
          name: parentName, // 帶入同一人名字
          country: defaultCountry, // 預設另一種類型
          is_urgent: false,
          received_date: newReceivedDate, // 收件日期 = 父列的下件日期
          expected_issue_date: expectedDate, // 自動計算預計下件日期
          cost: 0,
          isAdditional: true, // 標記為追加列
          parentId: parentId,
        }

        // 插入在該申請人的下一個位置
        const newList = [...prev]
        newList.splice(parentIndex + 1, 0, newApplicant)
        return newList
      })
    },
    [calculateReceivedDate]
  )

  // 移除辦理人
  const removeApplicant = useCallback((id: string) => {
    setApplicants(prev => {
      // 找到要刪除的項目
      const target = prev.find(a => a.id === id)
      if (!target) return prev

      let filteredList: VisaApplicant[]

      if (target.isAdditional) {
        // 如果是追加列，直接刪除
        filteredList = prev.filter(a => a.id !== id)
      } else {
        // 如果是主列，一起刪除它的追加列
        filteredList = prev.filter(a => a.id !== id && a.parentId !== id)
      }

      // 確保至少有一個項目
      if (filteredList.length === 0) {
        // 如果刪除後沒有任何項目，保留一個空的主列
        return [
          {
            id: Date.now().toString(),
            name: '',
            country: '護照 成人',
            is_urgent: false,
            received_date: '',
            expected_issue_date: '',
            cost: 0,
          },
        ]
      }

      // 檢查是否還有主列
      const hasMainApplicant = filteredList.some(a => !a.isAdditional)
      if (!hasMainApplicant) {
        // 如果只剩追加列（沒有主列），將第一個追加列轉為主列
        const firstAdditional = filteredList[0]
        return filteredList.map((a, index) => {
          if (index === 0) {
            // 第一個轉為主列
            return { ...a, isAdditional: false, parentId: undefined }
          }
          // 其他追加列的 parentId 指向新的主列
          return { ...a, parentId: firstAdditional.id }
        })
      }

      return filteredList
    })
  }, [])

  // 更新辦理人資料
  const updateApplicant = useCallback(
    (id: string, field: keyof VisaApplicant, value: unknown) => {
      setApplicants(prev => {
        // 先找到被更新的申請人
        const targetIndex = prev.findIndex(a => a.id === id)
        if (targetIndex === -1) return prev

        const target = prev[targetIndex]
        const updated = { ...target, [field]: value }

        // 如果是收件時間或簽證類型改變，自動計算預計下件時間
        if (field === 'received_date' || field === 'country' || field === 'is_urgent') {
          if (updated.received_date) {
            const visaTypeWithUrgent = updated.is_urgent
              ? `${updated.country} 急件`
              : updated.country
            updated.expected_issue_date = calculateReceivedDate(
              updated.received_date,
              visaTypeWithUrgent
            )
          }
        }

        // 成本是代辦商收的費用，新增時不知道，不自動計算
        // 只有在編輯簽證時才會填入實際成本

        // 更新當前項目
        let newList = prev.map(a => (a.id === id ? updated : a))

        // 找出真正的主列 ID（如果當前是追加列，用 parentId；否則用自己的 id）
        const mainId = target.isAdditional ? target.parentId : id

        // 如果修改的是主列，同步更新所有追加列
        if (!target.isAdditional) {
          // 修改日期或急件時，同步更新追加列的日期
          if (
            field === 'received_date' ||
            field === 'expected_issue_date' ||
            field === 'is_urgent' ||
            field === 'country'
          ) {
            newList = newList.map(a => {
              if (a.parentId !== mainId) return a
              // 追加列的收件日期 = 主列的預計下件日期
              const newReceivedDate = updated.expected_issue_date || ''
              const visaTypeWithUrgent = a.is_urgent ? `${a.country} 急件` : a.country
              const newExpectedDate = newReceivedDate
                ? calculateReceivedDate(newReceivedDate, visaTypeWithUrgent)
                : ''
              return {
                ...a,
                received_date: newReceivedDate,
                expected_issue_date: newExpectedDate,
              }
            })
          }

          // 修改姓名時，同步更新追加列的姓名
          if (field === 'name') {
            newList = newList.map(a => {
              if (a.parentId !== mainId) return a
              return { ...a, name: value as string }
            })
          }
        }

        return newList
      })
    },
    [calculateReceivedDate]
  )

  // 重置表單
  const resetForm = useCallback((defaultTourId?: string) => {
    setEditingVisa(null)
    setContactInfo({
      tour_id: defaultTourId || '',
      order_id: '',
      contact_person: '',
      contact_phone: '',
    })
    setApplicants([
      {
        id: '1',
        name: '',
        country: '護照 成人',
        is_urgent: false,
        received_date: '',
        expected_issue_date: '',
        cost: 0,
      },
    ])
  }, [])

  // 載入簽證進行編輯
  const loadVisaForEdit = useCallback((visa: Visa) => {
    setEditingVisa(visa)
    setContactInfo({
      tour_id: visa.tour_id || '',
      order_id: visa.order_id || '',
      contact_person: visa.contact_person || '',
      contact_phone: visa.contact_phone || '',
    })
    setApplicants([
      {
        id: visa.id,
        name: visa.applicant_name || '',
        country: visa.visa_type || '護照 成人',
        is_urgent: visa.is_urgent || false,
        received_date: visa.received_date || '',
        expected_issue_date: visa.expected_issue_date || '',
        fee: visa.fee || 0,
        cost: visa.cost || 0,
        actual_submission_date: visa.actual_submission_date || '',
        documents_returned_date: visa.documents_returned_date || '',
        pickup_date: visa.pickup_date || '',
        vendor: visa.vendor || '',
        notes: visa.notes || '',
        status: visa.status || 'pending',
      },
    ])
    setIsDialogOpen(true)
  }, [])

  return {
    isDialogOpen,
    setIsDialogOpen,
    editingVisa,
    setEditingVisa,
    contact_info,
    setContactInfo,
    applicants,
    setApplicants,
    tourOptions,
    calculateReceivedDate,
    calculateFee,
    addApplicant,
    addApplicantForSame,
    removeApplicant,
    updateApplicant,
    resetForm,
    loadVisaForEdit,
  }
}
