/**
 * usePaymentStatus - 查詢需求單的付款狀態
 * 
 * 從 tour_request_id 查詢所有關聯的請款項目，加總金額並區分已付/待付
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface PaymentAmounts {
  paidAmount: number      // 已付款金額（有 paid_at）
  pendingAmount: number   // 待付款金額（無 paid_at）
  totalAmount: number     // 總請款金額
}

export function usePaymentStatus(requestId: string | null | undefined) {
  const [amounts, setAmounts] = useState<PaymentAmounts>({
    paidAmount: 0,
    pendingAmount: 0,
    totalAmount: 0,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!requestId) {
      setAmounts({ paidAmount: 0, pendingAmount: 0, totalAmount: 0 })
      return
    }

    async function fetchPaymentAmounts() {
      setLoading(true)
      try {
        // 查詢所有關聯的請款項目
        const { data: items, error } = await supabase
          .from('payment_request_items')
          .select('subtotal, payment_requests!inner(paid_at)')
          .eq('tour_request_id', requestId as string)

        if (error) throw error

        if (!items || items.length === 0) {
          setAmounts({ paidAmount: 0, pendingAmount: 0, totalAmount: 0 })
          return
        }

        // 加總金額，區分已付/待付
        let paidAmount = 0
        let pendingAmount = 0

        items.forEach(item => {
          const amount = item.subtotal || 0
          // @ts-ignore - payment_requests 是 inner join 的結果
          if (item.payment_requests?.paid_at) {
            paidAmount += amount
          } else {
            pendingAmount += amount
          }
        })

        setAmounts({
          paidAmount,
          pendingAmount,
          totalAmount: paidAmount + pendingAmount,
        })
      } catch (err) {
        logger.error('查詢付款狀態失敗:', err)
        setAmounts({ paidAmount: 0, pendingAmount: 0, totalAmount: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentAmounts()
  }, [requestId])

  return { amounts, loading }
}
