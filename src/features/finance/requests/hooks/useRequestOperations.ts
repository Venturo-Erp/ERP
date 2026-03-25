import { useCallback } from 'react'
import { usePayments } from '@/features/payments/hooks/usePayments'
import { useWorkspaceId } from '@/lib/workspace-context'
import { RequestFormData, BatchRequestFormData, RequestItem } from '../types'
import { generateCompanyPaymentRequestCode } from '@/stores/utils/code-generator'
import { EXPENSE_TYPE_CONFIG, CompanyExpenseType } from '@/stores/types/finance.types'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'
import { REQUEST_OPERATIONS_LABELS } from '../../constants/labels'
import { logger } from '@/lib/utils/logger'

export function useRequestOperations() {
  const { payment_requests, createPaymentRequest, addPaymentItems, deletePaymentRequest } =
    usePayments()
  const workspaceId = useWorkspaceId()

  // 根據團號生成請款單編號：團號-I01, 團號-I02, ...
  // I = Invoice (請款單)
  const generateRequestCode = useCallback(
    (tourCode: string) => {
      // 找到該團已有的請款單數量
      const existingCount = payment_requests.filter(
        r => r.tour_code === tourCode || r.code?.startsWith(`${tourCode}-I`)
      ).length
      const nextNumber = existingCount + 1
      return `${tourCode}-I${nextNumber.toString().padStart(2, '0')}`
    },
    [payment_requests]
  )

  // Generate request number preview (舊方法，保留向下相容)
  const generateRequestNumber = useCallback(() => {
    const year = new Date().getFullYear()
    const count = payment_requests.length + 1
    return `PR${year}${count.toString().padStart(4, '0')}`
  }, [payment_requests.length])

  // 生成公司請款單編號
  const generateCompanyRequestCode = useCallback(
    (expenseType: CompanyExpenseType, requestDate: string) => {
      return generateCompanyPaymentRequestCode(expenseType, requestDate, payment_requests)
    },
    [payment_requests]
  )

  // Create single request (支援團體請款和公司請款)
  const createRequest = useCallback(
    async (
      formData: RequestFormData,
      items: RequestItem[],
      tourName: string,
      tourCode: string,
      orderNumber?: string,
      createdByName?: string // 請款人姓名
    ) => {
      if (!items || items.length === 0) return null
      if (!workspaceId) throw new Error(REQUEST_OPERATIONS_LABELS.CANNOT_GET_WORKSPACE)

      // 根據請款類別決定編號和類型
      const isCompanyRequest = formData.request_category === 'company'

      if (isCompanyRequest) {
        // 公司請款
        if (!formData.expense_type) {
          throw new Error(REQUEST_OPERATIONS_LABELS.COMPANY_EXPENSE_TYPE_REQUIRED)
        }

        const expenseType = formData.expense_type as CompanyExpenseType
        const requestCode = generateCompanyRequestCode(expenseType, formData.request_date)
        const expenseTypeName = EXPENSE_TYPE_CONFIG[expenseType]?.name || expenseType

        // Create company payment request
        const request = await createPaymentRequest({
          workspace_id: workspaceId,
          code: requestCode,
          request_date: formData.request_date,
          amount: 0,
          status: 'pending',
          notes: formData.notes,
          request_type: expenseTypeName,
          request_category: 'company',
          expense_type: expenseType,
          created_by: formData.created_by || undefined,
          created_by_name: createdByName || undefined,
          is_special_billing: formData.is_special_billing,
          payment_method_id: formData.payment_method_id || null,
        })

        // Batch insert all items — 失敗時刪除剛建的請款單
        try {
          await addPaymentItems(
            request.id,
            items.map((item, i) => ({
              category: item.category,
              supplier_id: item.supplier_id,
              supplier_name: item.supplierName,
              description: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              notes: '',
              sort_order: i + 1,
              tour_request_id: item.tour_request_id || null,
              advanced_by: item.advanced_by || null,
              advanced_by_name: item.advanced_by_name || null,
            }))
          )
        } catch (itemError) {
          logger.error('新增請款項目失敗，回滾請款單:', itemError)
          await deletePaymentRequest(request.id).catch(() => {})
          throw itemError
        }

        return request
      } else {
        // 團體請款
        if (!formData.tour_id) return null

        // 生成請款單編號：團號-I01
        const requestCode = generateRequestCode(tourCode)

        // Create payment request (明確傳入 workspace_id)
        const request = await createPaymentRequest({
          workspace_id: workspaceId,
          tour_id: formData.tour_id,
          code: requestCode,
          tour_code: tourCode, // 保存團號供查詢用
          tour_name: tourName,
          order_id: formData.order_id || undefined,
          order_number: orderNumber,
          request_date: formData.request_date,
          amount: 0,
          status: 'pending',
          notes: formData.notes,
          request_type: REQUEST_OPERATIONS_LABELS.SUPPLIER_EXPENSE,
          request_category: 'tour',
          created_by: formData.created_by || undefined,
          created_by_name: createdByName || undefined,
          is_special_billing: formData.is_special_billing,
          payment_method_id: formData.payment_method_id || null,
        })

        // Batch insert all items — 失敗時刪除剛建的請款單
        try {
          await addPaymentItems(
            request.id,
            items.map((item, i) => ({
              category: item.category,
              supplier_id: item.supplier_id,
              supplier_name: item.supplierName,
              description: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              notes: '',
              sort_order: i + 1,
              tour_request_id: item.tour_request_id || null,
              advanced_by: item.advanced_by || null,
              advanced_by_name: item.advanced_by_name || null,
            }))
          )
        } catch (itemError) {
          logger.error('新增請款項目失敗，回滾請款單:', itemError)
          await deletePaymentRequest(request.id).catch(() => {})
          throw itemError
        }

        // 重算團成本 (already handled inside addItems, but ensure for tour)
        if (formData.tour_id) {
          await recalculateExpenseStats(formData.tour_id)
        }

        return request
      }
    },
    [
      createPaymentRequest,
      addPaymentItems,
      deletePaymentRequest,
      generateRequestCode,
      generateCompanyRequestCode,
      workspaceId,
    ]
  )

  // Create batch requests
  const createBatchRequests = useCallback(
    async (
      formData: BatchRequestFormData,
      items: RequestItem[],
      tourIds: string[],
      tours: Array<{ id: string; code: string; name: string }>
    ) => {
      if (tourIds.length === 0 || items.length === 0) return []
      if (!workspaceId) throw new Error(REQUEST_OPERATIONS_LABELS.CANNOT_GET_WORKSPACE)

      const createdRequests = []

      for (const tourId of tourIds) {
        const selectedTour = tours.find(t => t.id === tourId)
        if (!selectedTour) continue

        // 生成請款單編號：團號-R01
        const requestCode = generateRequestCode(selectedTour.code)

        // Create payment request (明確傳入 workspace_id)
        const request = await createPaymentRequest({
          workspace_id: workspaceId,
          tour_id: tourId,
          code: requestCode,
          tour_code: selectedTour.code, // 保存團號供查詢用
          tour_name: selectedTour.name,
          request_date: formData.request_date,
          amount: 0,
          status: 'pending',
          notes: formData.notes,
          request_type: REQUEST_OPERATIONS_LABELS.SUPPLIER_EXPENSE, // Default value for now
          payment_method_id: formData.payment_method_id || null,
        })

        // Batch insert all items — 失敗時刪除剛建的請款單
        try {
          await addPaymentItems(
            request.id,
            items.map((item, i) => ({
              category: item.category,
              supplier_id: item.supplier_id,
              supplier_name: item.supplierName,
              description: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              notes: '',
              sort_order: i + 1,
              tour_request_id: item.tour_request_id || null,
            }))
          )
        } catch (itemError) {
          logger.error('新增請款項目失敗，回滾請款單:', itemError)
          await deletePaymentRequest(request.id).catch(() => {})
          throw itemError
        }

        createdRequests.push(request)

        // 重算團成本 (already handled inside addItems)
        await recalculateExpenseStats(tourId)
      }

      return createdRequests
    },
    [createPaymentRequest, addPaymentItems, deletePaymentRequest, generateRequestCode, workspaceId]
  )

  return {
    generateRequestNumber,
    generateRequestCode,
    generateCompanyRequestCode,
    createRequest,
    createBatchRequests,
  }
}
