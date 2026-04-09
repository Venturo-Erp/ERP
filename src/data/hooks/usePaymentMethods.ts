import useSWR from 'swr'
import { useAuthStore } from '@/stores'

export interface PaymentMethod {
  id: string
  name: string
  placeholder?: string | null
}

type PaymentMethodType = 'receipt' | 'payment'

const fetcher = async (url: string): Promise<PaymentMethod[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

/**
 * SWR hook for fetching payment methods with caching.
 * Replaces direct fetch() / supabase queries for payment_methods.
 */
export function usePaymentMethodsCached(type?: PaymentMethodType) {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  const params = new URLSearchParams()
  if (workspaceId) params.set('workspace_id', workspaceId)
  if (type) params.set('type', type)

  const key = workspaceId ? `payment-methods-${workspaceId}-${type ?? 'all'}` : null

  const { data, isLoading } = useSWR<PaymentMethod[]>(
    key,
    () => fetcher(`/api/finance/payment-methods?${params.toString()}`),
    { revalidateOnFocus: false }
  )

  // 去重：多租戶 RLS 可能返回重複，用 id 去重
  const uniqueMethods = (data ?? []).filter(
    (method, index, arr) => arr.findIndex(m => m.id === method.id) === index
  )

  return {
    methods: uniqueMethods,
    loading: isLoading,
  }
}
