'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Tour, Order, User } from '@/stores/types'

interface VisaApplicant {
  id: string
  name: string
  country: string
  is_urgent: boolean
  received_date: string
  expected_issue_date: string
  fee?: number
  cost: number
  isAdditional?: boolean
  parentId?: string
}

interface ContactInfo {
  tour_id: string
  order_id: string
  contact_person: string
  contact_phone: string
}

/**
 * 簽證建立邏輯 Hook
 * 負責批次建立簽證、訂單和成員
 */
export function useVisaCreate(
  tours: Tour[],
  orders: Order[],
  user: User | null,
  canManageVisas: boolean,
  calculateFee: (country: string) => number,
  addVisa: (data: Record<string, unknown>) => Promise<void>,
  addOrder: (data: Record<string, unknown>) => Promise<Order>,
  onCustomerMatch: (peopleToCheck: Array<{ name: string; phone: string }>) => Promise<void>
) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddVisa = async (
    contact_info: ContactInfo,
    applicants: VisaApplicant[],
    resetForm: () => void,
    closeDialog: () => void
  ) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const hasApplicant = applicants.some(a => a.name)
      if (!canManageVisas || !hasApplicant || !user) return

      let selectedTour

      // 如果沒選團號，自動建立 ad-hoc 簽證團（出發日=今天）
      if (!contact_info.tour_id) {
        const { tourService } = await import('@/features/tours/services/tour.service')
        const firstApplicantName = applicants.find(a => a.name)?.name
        selectedTour = await tourService.createAdHocTour('visa', firstApplicantName)
        toast.success(`已建立簽證團：${selectedTour.code}`)
      } else {
        selectedTour = tours.find(t => t.id === contact_info.tour_id)
        if (!selectedTour) return
      }

      // 取得或建立訂單
      const totalFee = applicants.reduce((sum, a) => sum + calculateFee(a.country), 0)
      let targetOrder

      if (contact_info.order_id && contact_info.order_id !== '__create_new__') {
        targetOrder = orders.find(o => o.id === contact_info.order_id)
        if (!targetOrder) return
      } else {
        // 查詢該團最大的訂單編號
        const { data: lastOrder } = await supabase
          .from('orders')
          .select('order_number')
          .eq('tour_id', selectedTour.id)
          .order('order_number', { ascending: false })
          .limit(1)
          .single()

        let nextNum = 1
        if (lastOrder?.order_number) {
          const match = lastOrder.order_number.match(/-O(\d+)$/)
          if (match) {
            nextNum = parseInt(match[1], 10) + 1
          }
        }
        const nextNumber = nextNum.toString().padStart(2, '0')
        const order_number = `${selectedTour.code}-O${nextNumber}`

        targetOrder = await addOrder({
          order_number,
          tour_id: selectedTour.id,
          code: order_number,
          tour_name: selectedTour.name,
          contact_person: contact_info.contact_person || applicants.find(a => a.name)?.name || '',
          sales_person: user.display_name || '系統',
          assistant: user.display_name || '系統',
          member_count: applicants.filter(a => a.name).length,
          total_amount: totalFee,
          paid_amount: 0,
          remaining_amount: totalFee,
          payment_status: 'unpaid' as const,
        })

        if (contact_info.order_id === '__create_new__') {
          toast.success(`已建立訂單：${order_number}`)
        }
      }

      if (!targetOrder) {
        logger.error('訂單建立失敗')
        return
      }

      // 批次建立簽證
      const applicantMap = new Map<
        string,
        {
          visaTypes: string[]
          totalFee: number
          totalCost: number
        }
      >()

      for (const applicant of applicants) {
        if (!applicant.name) continue
        const fee = applicant.fee ?? calculateFee(applicant.country)

        const existing = applicantMap.get(applicant.name)
        if (existing) {
          existing.visaTypes.push(applicant.country)
          existing.totalFee += fee
          existing.totalCost += applicant.cost
        } else {
          applicantMap.set(applicant.name, {
            visaTypes: [applicant.country],
            totalFee: fee,
            totalCost: applicant.cost,
          })
        }
      }

      // 建立所有簽證
      for (const applicant of applicants) {
        if (!applicant.name) continue

        const fee = applicant.fee ?? calculateFee(applicant.country)

        await addVisa({
          applicant_name: applicant.name,
          contact_person: contact_info.contact_person || '',
          contact_phone: contact_info.contact_phone || '',
          visa_type: applicant.country,
          country: applicant.country,
          received_date: applicant.received_date || undefined,
          expected_issue_date: applicant.expected_issue_date || undefined,
          fee,
          cost: applicant.cost,
          status: 'pending',
          order_id: targetOrder.id,
          order_number: targetOrder.order_number || '',
          tour_id: selectedTour.id,
          code: selectedTour.code,
          created_by: user.id,
          note: '',
        })
      }

      // 建立成員
      for (const [name, data] of applicantMap) {
        const remarks = data.visaTypes.join('、')

        try {
          const { error } = await supabase.from('order_members').insert({
            order_id: targetOrder.id,
            chinese_name: name,
            member_type: 'adult',
            remarks,
            workspace_id: user.workspace_id,
          })

          if (error) throw error
          logger.log(`✅ 成員建立成功: ${name}`)
        } catch (memberError) {
          logger.error(`❌ 成員建立失敗: ${name}`, memberError)
        }
      }

      // 收集所有需要比對的人
      const peopleToCheck: Array<{ name: string; phone: string }> = []
      if (contact_info.contact_person) {
        peopleToCheck.push({
          name: contact_info.contact_person,
          phone: contact_info.contact_phone || '',
        })
      }
      applicants.forEach(a => {
        if (a.name && !peopleToCheck.some(p => p.name === a.name)) {
          peopleToCheck.push({ name: a.name, phone: '' })
        }
      })

      // 重置表單
      resetForm()
      closeDialog()

      // 開啟旅客比對視窗
      if (peopleToCheck.length > 0) {
        await onCustomerMatch(peopleToCheck)
      }
    } catch (error) {
      logger.error('批次新增簽證失敗', error)
      toast.error('新增簽證失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    isSubmitting,
    handleAddVisa,
  }
}
