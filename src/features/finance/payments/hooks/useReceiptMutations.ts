/**
 * Receipt Mutations Hook
 * 收款單新增/更新操作
 */

import { logger } from '@/lib/utils/logger'
import { useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { RECEIPT_MUTATION_LABELS } from '../../constants/labels'
import type { PaymentItem, PaymentFormData } from '../types'
import { RECEIPT_TYPES } from '../types'
import type { Receipt } from '@/types/receipt.types'
import { recalculateReceiptStats } from '../services/receipt-core.service'

/** receipt_type 數字 → payment_method 字串（DB constraint 限定英文） */
const PAYMENT_METHOD_MAP: Record<number, string> = {
  0: 'transfer',
  1: 'cash',
  2: 'card',
  3: 'check',
  4: 'linkpay',
}

/** 將 DB 收款方式名稱轉回 receipt_type 數字（用於舊欄位向下相容） */
function resolveReceiptType(receiptType: unknown): number {
  // 已經是數字就直接回傳
  if (typeof receiptType === 'number' && !isNaN(receiptType)) return receiptType
  // DB 字串名稱 → 對應的數字
  const name = String(receiptType).toLowerCase()
  if (name.includes('現金') || name.includes('cash')) return 1
  if (name.includes('匯款') || name.includes('transfer')) return 0
  if (name.includes('信用卡') || name.includes('刷卡') || name.includes('card')) return 2
  if (name.includes('支票') || name.includes('check')) return 3
  if (name.includes('linkpay') || name.includes('line pay')) return 4
  return 1 // 預設現金（比較常見）
}

export interface LinkPayResult {
  receiptNumber: string
  link: string
}

interface OrderInfo {
  tour_id?: string | null
  customer_id?: string | null
  order_number?: string | null
  tour_name?: string | null
}

interface TourInfo {
  id: string
  code?: string
  name?: string
}

interface CreateReceiptWithItemsParams {
  formData: PaymentFormData
  paymentItems: PaymentItem[]
  orderInfo: OrderInfo | null
  tourInfo: TourInfo | null
  userId: string
  workspaceId: string
}

interface CreateReceiptWithItemsResult {
  success: boolean
  receiptId: string
  receiptNumber: string
  linkPayResults: LinkPayResult[]
  totalAmount: number
  itemCount: number
}

interface UpdateReceiptWithItemsParams {
  receipt: Receipt
  formData: PaymentFormData
  paymentItems: PaymentItem[]
  orderInfo: OrderInfo | null
  userId: string
  workspaceId: string
  onUpdate: (receiptId: string, data: Partial<Receipt>) => Promise<void>
}

interface UpdateReceiptWithItemsResult {
  success: boolean
  itemCount: number
}

export function useReceiptMutations() {
  const { toast } = useToast()

  /**
   * 處理 LinkPay 整合 — 呼叫 API 產生付款連結
   */
  const handleLinkPayIntegration = useCallback(
    async (
      receiptNumber: string,
      item: PaymentItem,
      userId: string,
      tourCode: string
    ): Promise<LinkPayResult | null> => {
      try {
        const response = await fetch('/api/linkpay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receipt_number: receiptNumber,
            user_name: item.receipt_account || '',
            email: item.email || '',
            payment_name: item.payment_name || tourCode,
            create_user: userId,
            amount: item.amount,
            end_date: item.pay_dateline || '',
          }),
        })

        const data: unknown = await response.json()

        // 使用 type guard 確保型別安全
        if (
          typeof data === 'object' &&
          data !== null &&
          'success' in data &&
          (data as { success: boolean }).success &&
          'data' in data &&
          typeof (data as { data: unknown }).data === 'object' &&
          (data as { data: { payment_link?: string } }).data?.payment_link
        ) {
          const paymentLink = (data as { data: { payment_link: string } }).data.payment_link
          return {
            receiptNumber,
            link: paymentLink,
          }
        }
        return null
      } catch (error) {
        logger.error('LinkPay API 錯誤:', error)
        return null
      }
    },
    []
  )

  /**
   * 建立收款單 + 多個收款項目
   */
  const createReceiptWithItems = useCallback(
    async (params: CreateReceiptWithItemsParams): Promise<CreateReceiptWithItemsResult> => {
      const { formData, paymentItems, orderInfo, tourInfo, userId, workspaceId } = params

      const { createReceipt, updateReceipt } = await import('@/data')
      const { generateReceiptNumber } = await import('@/lib/utils/receipt-number-generator')
      const { supabase } = await import('@/lib/supabase/client')

      const tourId = orderInfo?.tour_id || formData.tour_id
      const tourCode = tourInfo?.code || ''

      if (!tourCode) {
        throw new Error(RECEIPT_MUTATION_LABELS.CANNOT_GET_TOUR_CODE)
      }

      // 查詢 payment_methods 取得 ID 對照表
      const { data: paymentMethodsData } = await supabase
        .from('payment_methods')
        .select('id, code, name')
        .eq('workspace_id', workspaceId)
        .eq('type', 'receipt')
        .eq('is_active', true)

      const getPaymentMethodId = (receiptTypeNum: number, itemReceiptType?: unknown): string => {
        if (!paymentMethodsData?.length) return ''
        // 先嘗試用 DB 名稱直接比對
        if (typeof itemReceiptType === 'string') {
          const byName = paymentMethodsData.find(m => m.name === itemReceiptType)
          if (byName) return byName.id
        }
        // 再用 code 對照
        const codeMap: Record<number, string> = {
          0: 'TRANSFER',
          1: 'CASH',
          2: 'CREDIT_CARD',
          3: 'CHECK',
          4: 'LINKPAY',
        }
        const byCode = paymentMethodsData.find(m => m.code === codeMap[receiptTypeNum])
        return byCode?.id || paymentMethodsData[0]?.id || ''
      }

      // 查詢已存在的收款單編號（用於生成編號）
      const { data: existingReceipts } = await supabase
        .from('receipts')
        .select('receipt_number')
        .like('receipt_number', `${tourCode}-R%`)

      // 取得現有收款單（用於計算下一個流水號）
      const filteredReceipts =
        existingReceipts?.filter(r => r.receipt_number?.startsWith(`${tourCode}-R`)) || []

      // 找出目前最大的 R 編號
      const prefix = `${tourCode}-R`
      let maxNumber = 0
      filteredReceipts.forEach(receipt => {
        const code = receipt.receipt_number
        if (code?.startsWith(prefix)) {
          // 取 R 後面的數字部分（忽略舊格式的 -A, -B 後綴）
          const numberPart = code.substring(prefix.length).split('-')[0]
          const num = parseInt(numberPart, 10)
          if (!isNaN(num) && num > maxNumber) maxNumber = num
        }
      })

      // 計算總金額
      const totalAmount = paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0)

      const linkPayResults: LinkPayResult[] = []
      let firstReceiptId: string | null = null

      // 統一處理所有收款項目 — 每個品項獨立流水號
      for (let i = 0; i < paymentItems.length; i++) {
        const item = paymentItems[i]
        const receiptTypeNum = resolveReceiptType(item.receipt_type)
        const paymentMethod = PAYMENT_METHOD_MAP[receiptTypeNum] || 'transfer'
        const paymentMethodId = getPaymentMethodId(receiptTypeNum, item.receipt_type)

        // 每個品項獨立編號：R01, R02, R03...（跨收款單全域遞增）
        const nextNum = (maxNumber + 1 + i).toString().padStart(2, '0')
        const itemReceiptNumber = `${prefix}${nextNum}`

        logger.info('[createReceiptWithItems] Creating receipt...', {
          index: i,
          receiptNumber: itemReceiptNumber,
          receiptType: receiptTypeNum,
          amount: item.amount,
          paymentItemsCount: paymentItems.length,
        })

        const createdReceipt = await createReceipt({
          receipt_number: itemReceiptNumber,
          workspace_id: workspaceId,
          order_id: formData.order_id || null,
          tour_id: tourId || null,
          customer_id: orderInfo?.customer_id || null,
          order_number: orderInfo?.order_number || '',
          tour_name: orderInfo?.tour_name || tourInfo?.name || '',
          payment_date: item.transaction_date || new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          payment_method_id: paymentMethodId,
          receipt_date: item.transaction_date || new Date().toISOString().split('T')[0],
          receipt_type: receiptTypeNum,
          receipt_amount: item.amount,
          amount: item.amount,
          total_amount: item.amount,
          actual_amount: 0,
          status: '0',
          batch_id: paymentItems.length > 1 && firstReceiptId ? firstReceiptId : null,
          receipt_account: item.receipt_account || null,
          email: item.email || null,
          payment_name: item.payment_name || null,
          pay_dateline: item.pay_dateline || null,
          handler_name: item.handler_name || null,
          account_info: item.account_info || null,
          fees: item.fees || null,
          card_last_four: item.card_last_four || null,
          auth_code: item.auth_code || null,
          check_number: item.check_number || null,
          check_bank: item.check_bank || null,
          notes: item.notes || null,
          check_date: null,
          created_by: userId,
          updated_by: userId,
          deleted_at: null,
          link: null,
          linkpay_order_number: null,
        })

        if (!createdReceipt?.id) {
          throw new Error(RECEIPT_MUTATION_LABELS.CREATE_FAILED)
        }

        // 第一筆的 ID 作為 batch_id（多筆時）
        if (i === 0) {
          firstReceiptId = createdReceipt.id
          // 多筆時，第一筆也要設 batch_id（指向自己）
          if (paymentItems.length > 1) {
            await updateReceipt(createdReceipt.id, { batch_id: firstReceiptId })
          }
        }

        // 處理 LinkPay
        if (receiptTypeNum === RECEIPT_TYPES.LINK_PAY) {
          const linkPayResult = await handleLinkPayIntegration(
            itemReceiptNumber,
            item,
            userId,
            tourCode
          )
          if (linkPayResult) {
            linkPayResults.push(linkPayResult)
            await updateReceipt(createdReceipt.id, { link: linkPayResult.link })
          }
        }
      }

      // 3. 重算訂單付款狀態 + 團財務數據 + 刷新快取
      await recalculateReceiptStats(formData.order_id, tourId || null)

      // 4. 自動產生傳票（只為第一筆建立，或之後改成每筆都建）
      if (firstReceiptId) {
        try {
          await fetch('/api/accounting/vouchers/auto-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_type: 'receipt',
              source_id: firstReceiptId,
              workspace_id: workspaceId,
            }),
          })
        } catch (error) {
          logger.error('自動產生收款傳票失敗:', error)
          // 不中斷流程，傳票可手動補建
        }
      }

      return {
        success: true,
        receiptId: firstReceiptId || '',
        receiptNumber: `${prefix}${(maxNumber + 1).toString().padStart(2, '0')}`,
        linkPayResults,
        totalAmount,
        itemCount: paymentItems.length,
      }
    },
    [handleLinkPayIntegration]
  )

  /**
   * 更新收款單
   * ADR-001: 簡化版，只更新主表
   */
  const updateReceiptWithItems = useCallback(
    async (params: UpdateReceiptWithItemsParams): Promise<UpdateReceiptWithItemsResult> => {
      const { receipt, formData, paymentItems, onUpdate } = params

      // 計算總金額
      const totalAmount = paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0)

      // 取第一個項目的收款方式
      const firstItem = paymentItems[0]
      const receiptTypeNum = firstItem ? resolveReceiptType(firstItem.receipt_type) : 0
      const paymentMethod = PAYMENT_METHOD_MAP[receiptTypeNum] || 'transfer'

      // 更新收款單主表
      await onUpdate(receipt.id, {
        tour_id: formData.tour_id || null,
        order_id: formData.order_id || null,
        receipt_amount: totalAmount,
        amount: totalAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        receipt_type: receiptTypeNum,
        receipt_account: firstItem?.receipt_account || null,
        handler_name: firstItem?.handler_name || null,
        account_info: firstItem?.account_info || null,
        fees: firstItem?.fees || null,
        card_last_four: firstItem?.card_last_four || null,
        auth_code: firstItem?.auth_code || null,
        check_number: firstItem?.check_number || null,
        check_bank: firstItem?.check_bank || null,
        email: firstItem?.email || null,
        payment_name: firstItem?.payment_name || null,
        pay_dateline: firstItem?.pay_dateline || null,
        notes: firstItem?.notes || null,
      })

      return {
        success: true,
        itemCount: paymentItems.length,
      }
    },
    []
  )

  return {
    createReceiptWithItems,
    updateReceiptWithItems,
    handleLinkPayIntegration,
  }
}
