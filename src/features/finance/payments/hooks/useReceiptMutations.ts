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

/** 收款方式對應 payment_method 字串 */
const PAYMENT_METHOD_MAP: Record<number, string> = {
  0: 'transfer',
  1: 'cash',
  2: 'card',
  3: 'check',
  4: 'linkpay',
}

/** 將 DB 收款方式名稱轉回 receipt_type 數字（用於存入資料庫） */
function resolveReceiptType(receiptType: unknown): number {
  // 已經是數字就直接回傳
  if (typeof receiptType === 'number' && !isNaN(receiptType)) return receiptType
  // DB 字串名稱 → 對應的數字
  const name = String(receiptType).toLowerCase()
  if (name.includes('匯款') || name.includes('transfer')) return 0
  if (name.includes('現金') || name.includes('cash')) return 1
  if (name.includes('信用卡') || name.includes('刷卡') || name.includes('card')) return 2
  if (name.includes('支票') || name.includes('check')) return 3
  if (name.includes('linkpay') || name.includes('line pay')) return 4
  return 0 // 預設匯款
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
        const codeMap: Record<number, string> = { 0: 'TRANSFER', 1: 'CASH', 2: 'CREDIT_CARD', 3: 'CHECK', 4: 'LINKPAY' }
        const byCode = paymentMethodsData.find(m => m.code === codeMap[receiptTypeNum])
        return byCode?.id || paymentMethodsData[0]?.id || ''
      }

      // 查詢已存在的收款單編號（用於生成編號）
      const { data: existingReceipts } = await supabase
        .from('receipts')
        .select('receipt_number')
        .like('receipt_number', `${tourCode}-R%`)

      // 生成收款單號
      const receiptNumber = generateReceiptNumber(
        tourCode,
        existingReceipts?.filter(r => r.receipt_number?.startsWith(`${tourCode}-R`)) || []
      )

      // 計算總金額
      const totalAmount = paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0)

      // 1. 建立收款單主表
      const firstItemReceiptType = resolveReceiptType(paymentItems[0]?.receipt_type)
      const firstPaymentMethod = PAYMENT_METHOD_MAP[firstItemReceiptType] || 'transfer'
      const firstPaymentMethodId = getPaymentMethodId(firstItemReceiptType, paymentItems[0]?.receipt_type)
      logger.info('[createReceiptWithItems] Step 1: Creating receipt...', { tourCode, receiptNumber, totalAmount, firstPaymentMethodId })
      const createdReceipt = await createReceipt({
        receipt_number: receiptNumber,
        workspace_id: workspaceId,
        order_id: formData.order_id || null,
        tour_id: tourId || null,
        customer_id: orderInfo?.customer_id || null,
        order_number: orderInfo?.order_number || '',
        tour_name: orderInfo?.tour_name || tourInfo?.name || '',
        payment_date: paymentItems[0]?.transaction_date || new Date().toISOString().split('T')[0],
        payment_method: firstPaymentMethod,
        payment_method_id: firstPaymentMethodId,
        receipt_date: paymentItems[0]?.transaction_date || new Date().toISOString().split('T')[0],
        receipt_type: firstItemReceiptType,
        receipt_amount: totalAmount,
        amount: totalAmount,
        total_amount: totalAmount,
        actual_amount: 0,
        status: '0',
        receipt_account: null,
        email: null,
        payment_name: null,
        pay_dateline: null,
        handler_name: null,
        account_info: null,
        fees: null,
        card_last_four: null,
        auth_code: null,
        check_number: null,
        check_bank: null,
        notes: null,
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
      logger.info('[createReceiptWithItems] Step 1 OK, receiptId:', createdReceipt.id)

      // 2. 多付款方式 → 建立額外的 receipts（共用 batch_id）
      // ADR-001: 不再用 receipt_items，改建多張 receipts
      const linkPayResults: LinkPayResult[] = []
      const batchId = paymentItems.length > 1 ? createdReceipt.id : null // 用第一張的 id 當 batch_id

      // 第一張已建立，處理 LinkPay
      if (firstItemReceiptType === RECEIPT_TYPES.LINK_PAY) {
        const linkPayResult = await handleLinkPayIntegration(
          receiptNumber,
          paymentItems[0],
          userId,
          tourCode
        )
        if (linkPayResult) {
          linkPayResults.push(linkPayResult)
          await updateReceipt(createdReceipt.id, { link: linkPayResult.link })
        }
      }

      // 如果有多筆，更新第一張的 batch_id 並建立其餘的
      if (paymentItems.length > 1) {
        await updateReceipt(createdReceipt.id, { batch_id: batchId })

        for (let i = 1; i < paymentItems.length; i++) {
          const item = paymentItems[i]
          const receiptTypeNum = resolveReceiptType(item.receipt_type)
          const paymentMethod = PAYMENT_METHOD_MAP[receiptTypeNum] || 'transfer'
          const itemPaymentMethodId = getPaymentMethodId(receiptTypeNum, item.receipt_type)
          const itemReceiptNumber = `${receiptNumber}-${String.fromCharCode(65 + i)}` // -A, -B, -C...

          logger.info('[createReceiptWithItems] Creating additional receipt...', { i, receiptTypeNum, amount: item.amount })

          const additionalReceipt = await createReceipt({
            receipt_number: itemReceiptNumber,
            workspace_id: workspaceId,
            order_id: formData.order_id || null,
            tour_id: tourId || null,
            customer_id: orderInfo?.customer_id || null,
            order_number: orderInfo?.order_number || '',
            tour_name: orderInfo?.tour_name || tourInfo?.name || '',
            payment_date: item.transaction_date || new Date().toISOString().split('T')[0],
            payment_method: paymentMethod,
            payment_method_id: itemPaymentMethodId,
            receipt_date: item.transaction_date || new Date().toISOString().split('T')[0],
            receipt_type: receiptTypeNum,
            receipt_amount: item.amount,
            amount: item.amount,
            total_amount: item.amount,
            actual_amount: 0,
            status: '0',
            batch_id: batchId,
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

          // 如果是 LinkPay
          if (receiptTypeNum === RECEIPT_TYPES.LINK_PAY && additionalReceipt?.id) {
            const linkPayResult = await handleLinkPayIntegration(
              itemReceiptNumber,
              item,
              userId,
              tourCode
            )
            if (linkPayResult) {
              linkPayResults.push(linkPayResult)
              await updateReceipt(additionalReceipt.id, { link: linkPayResult.link })
            }
          }
        }
      }

      // 3. 重算訂單付款狀態 + 團財務數據 + 刷新快取
      await recalculateReceiptStats(formData.order_id, tourId || null)

      // 4. 自動產生傳票
      try {
        await fetch('/api/accounting/vouchers/auto-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_type: 'receipt',
            source_id: createdReceipt.id,
            workspace_id: workspaceId,
          }),
        })
      } catch (error) {
        console.error('自動產生收款傳票失敗:', error)
        // 不中斷流程，傳票可手動補建
      }

      return {
        success: true,
        receiptId: createdReceipt.id,
        receiptNumber,
        linkPayResults,
        totalAmount,
        itemCount: paymentItems.length,
      }
    },
    [handleLinkPayIntegration]
  )

  /**
   * 更新收款單 + 管理收款項目
   * @deprecated 待遷移到多張 receipts 架構（ADR-001）
   */
  const updateReceiptWithItems = useCallback(
    async (params: UpdateReceiptWithItemsParams): Promise<UpdateReceiptWithItemsResult> => {
      const { receipt, formData, paymentItems, orderInfo, userId, workspaceId, onUpdate } = params

      const { createReceiptItem, updateReceiptItem, deleteReceiptItem } = await import('@/data/entities/receipt-items')
      const { supabase } = await import('@/lib/supabase/client')

      // 計算總金額
      const totalAmount = paymentItems.reduce((sum, item) => sum + (item.amount || 0), 0)

      // 1. 更新收款單主表
      await onUpdate(receipt.id, {
        tour_id: formData.tour_id || null,
        order_id: formData.order_id || null,
        receipt_amount: totalAmount,
        amount: totalAmount,
        total_amount: totalAmount,
      })

      // 2. 取得現有的 receipt_items
      const { data: existingItems } = await supabase
        .from('receipt_items')
        .select('id')
        .eq('receipt_id', receipt.id)
        .is('deleted_at', null)

      const existingItemIds = new Set(existingItems?.map(i => i.id) || [])

      // 3. 處理每個項目
      for (const item of paymentItems) {
        const receiptTypeNum = resolveReceiptType(item.receipt_type)
        const paymentMethod = PAYMENT_METHOD_MAP[receiptTypeNum] || 'transfer'
        const itemData = {
          tour_id: formData.tour_id || null,
          order_id: formData.order_id || null,
          customer_id: orderInfo?.customer_id || null,
          amount: item.amount,
          payment_method: paymentMethod,
          receipt_type: receiptTypeNum,
          receipt_account: item.receipt_account || null,
          handler_name: item.handler_name || null,
          account_info: item.account_info || null,
          fees: item.fees || null,
          card_last_four: item.card_last_four || null,
          auth_code: item.auth_code || null,
          check_number: item.check_number || null,
          check_bank: item.check_bank || null,
          email: item.email || null,
          payment_name: item.payment_name || null,
          pay_dateline: item.pay_dateline || null,
          notes: item.notes || null,
          updated_by: userId,
        }

        if (item.id && existingItemIds.has(item.id)) {
          // 更新現有項目
          await updateReceiptItem(item.id, itemData)
          existingItemIds.delete(item.id)
        } else {
          // 新增項目
          await createReceiptItem({
            receipt_id: receipt.id,
            workspace_id: workspaceId,
            ...itemData,
            actual_amount: 0,
            status: '0',
            created_by: userId,
            deleted_at: null,
            link: null,
            linkpay_order_number: null,
            check_date: null,
          })
        }
      }

      // 4. 刪除被移除的項目
      for (const itemId of existingItemIds) {
        await deleteReceiptItem(itemId)
      }

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
