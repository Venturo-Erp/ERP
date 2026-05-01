'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createVisa } from '@/data/entities/visas'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Order } from '@/stores/types'
import { useTranslations } from 'next-intl'

interface MemberRow {
  id: string
  chinese_name: string | null
  customer_id: string | null
  passport_number: string | null
}

interface VisaSelection {
  memberId: string
  visaType: string
}

/**
 * 計算簽證代辦費（與 useVisasDialog 邏輯一致）
 */
function calculateFee(visaType: string): number {
  if (visaType.includes('ESTA')) return 1000
  if (visaType.includes(t('exportDialog.visaChild'))) return 1500
  if (visaType.includes(t('exportDialog.visaFirst'))) return 800
  if (
    visaType.includes(t('exportDialog.visaTwPass')) &&
    visaType.includes(t('exportDialog.visaLost'))
  )
    return 2900
  return 1800
}

export function useBatchVisa() {
  const t = useTranslations('orders')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  const loadMembers = useCallback(async (orderId: string) => {
    setIsLoadingMembers(true)
    try {
      const { data, error } = await supabase
        .from('order_members')
        .select('id, chinese_name, customer_id, passport_number')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMembers((data as MemberRow[]) || [])
    } catch (err) {
      logger.error('載入團員失敗', err)
      setMembers([])
    } finally {
      setIsLoadingMembers(false)
    }
  }, [])

  const submitBatchVisa = useCallback(
    async (order: Order, selections: VisaSelection[], membersMap: Map<string, MemberRow>) => {
      if (selections.length === 0) {
        toast.warning(t('batchVisa.toastNoSelection'))
        return false
      }

      setIsSubmitting(true)
      try {
        let createdCount = 0

        for (const sel of selections) {
          const member = membersMap.get(sel.memberId)
          if (!member) continue

          const fee = calculateFee(sel.visaType)

          await createVisa({
            applicant_name: member.chinese_name || '',
            contact_person: order.contact_person || '',
            contact_phone: '',
            visa_type: sel.visaType,
            country: sel.visaType,
            status: 'pending',
            order_id: order.id,
            order_number: order.order_number || '',
            tour_id: order.tour_id || '',
            code: order.code || '',
            fee,
            cost: 0,
          })
          createdCount++
        }

        toast.success(`已建立 ${createdCount} 筆簽證`)
        return true
      } catch (err) {
        logger.error('批次建立簽證失敗', err)
        toast.error(t('batchVisa.toastFail'))
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  return {
    members,
    isLoadingMembers,
    isSubmitting,
    loadMembers,
    submitBatchVisa,
  }
}
