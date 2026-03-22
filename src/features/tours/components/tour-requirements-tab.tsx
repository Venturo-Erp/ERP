'use client'

/**
 * TourRequirementsTab - 需求總覽頁籤
 */

import { RequirementsList } from '@/features/confirmations/components'
import type { Tour } from '@/stores/types'

interface TourRequirementsTabProps {
  tourId: string
  quoteId?: string | null
  tour?: Tour
  onOpenRequestDialog?: (data: {
    category: string
    supplierName: string
    items: { serviceDate: string | null; title: string; quantity: number; note?: string }[]
    tour?: Tour
    startDate: string | null
  }) => void
}

export function TourRequirementsTab({
  tourId,
  quoteId,
  tour,
  onOpenRequestDialog,
}: TourRequirementsTabProps) {
  return (
    <RequirementsList tourId={tourId} quoteId={quoteId} onOpenRequestDialog={onOpenRequestDialog} />
  )
}
