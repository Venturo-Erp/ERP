'use client'

import { SupplierRequestDetailPage } from '@/features/supplier'

export default function SupplierRequestDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <SupplierRequestDetailPage paramsPromise={params} />
}
