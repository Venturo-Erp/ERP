'use client'

import React, { useCallback, useState } from 'react'
import { TourFormShell } from './TourFormShell'
import { useTourOperations } from '../hooks/useTourOperations'
import { createTour, updateTour, deleteTour } from '@/data/entities/tours'
import { useAuthStore } from '@/stores/auth-store'
import type { NewTourData } from '../types'
import type { OrderFormData } from '@/features/orders/components/add-order-form'
import type { DialogLevel } from '@/components/ui/dialog'

interface TourCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 建立成功 callback、給 todo dialog 等嵌套場景拿到新 tour 用 */
  onCreated?: (tour: { id: string; code: string; order?: { id: string; order_number: string } }) => void
  /** Dialog 巢狀層級（嵌進 level=1 dialog 時設 2） */
  level?: DialogLevel
  /** 預填 tour 名稱（從 todo title 帶入） */
  defaultTourName?: string
}

const EMPTY_TOUR: NewTourData = {
  name: '',
  countryCode: '',
  cityCode: '',
  departure_date: '',
  return_date: '',
  price: 0,
  status: 'proposed',
  isSpecial: false,
  max_participants: 20,
  description: '',
}

const EMPTY_ORDER: Partial<OrderFormData> = {
  contact_person: '',
  sales_person: '',
  assistant: '',
  member_count: 1,
  total_amount: 0,
}

/**
 * 「成品零件」版的開團 Dialog — 給 todo dialog 等嵌套場景使用。
 *
 * 跟既有 ToursPage 用 TourFormShell 的差別：
 * - 自己 manage state（不依賴 useTourPageState）
 * - 透過 onCreated callback 抑制 useTourOperations 預設的 router.push 副作用
 * - 接受 dialogLevel prop 避免遮罩衝突
 */
export function TourCreateDialog({
  open,
  onOpenChange,
  onCreated,
  level = 2,
  defaultTourName,
}: TourCreateDialogProps) {
  const { user } = useAuthStore()
  const [newTour, setNewTour] = useState<NewTourData>({
    ...EMPTY_TOUR,
    name: defaultTourName || '',
  })
  const [newOrder, setNewOrder] = useState<Partial<OrderFormData>>(EMPTY_ORDER)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setNewTour({ ...EMPTY_TOUR, name: defaultTourName || '' })
    setNewOrder(EMPTY_ORDER)
    setFormError(null)
  }, [defaultTourName])

  const closeDialog = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const operations = useTourOperations({
    actions: {
      create: createTour,
      update: updateTour,
      delete: deleteTour,
    },
    resetForm,
    closeDialog,
    setSubmitting,
    setFormError,
    workspaceId: user?.workspace_id,
    onCreated: tour => {
      onCreated?.(tour)
      // closeDialog 在 useTourOperations 內已執行、無需再呼叫
    },
  })

  const handleSubmit = useCallback(() => {
    operations.handleAddTour(newTour, newOrder)
  }, [operations, newTour, newOrder])

  return (
    <TourFormShell
      isOpen={open}
      onClose={() => {
        resetForm()
        onOpenChange(false)
      }}
      mode="create"
      newTour={newTour}
      setNewTour={setNewTour}
      newOrder={newOrder}
      setNewOrder={setNewOrder}
      submitting={submitting}
      formError={formError}
      onSubmit={handleSubmit}
      isFromProposal={false}
      dialogLevel={level}
    />
  )
}
