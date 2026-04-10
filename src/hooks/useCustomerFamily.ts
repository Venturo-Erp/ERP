/**
 * 客戶家庭群組查詢 Hook
 * 用於快速加入家人到訂單/團員名單
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Customer, CustomerGroup, CustomerGroupMember } from '@/stores/types'

/**
 * 家庭群組完整資訊
 */
export interface CustomerFamilyGroup {
  group: CustomerGroup
  members: Array<CustomerGroupMember & { customer: Customer }>
}

/**
 * 查詢客戶所屬的家庭群組
 */
export function useCustomerFamily(customerId: string | null | undefined) {
  // 家庭群組功能暫時停用（customer_groups / customer_group_members 表尚未建立）
  return useQuery({
    queryKey: ['customer-family', customerId],
    queryFn: async (): Promise<CustomerFamilyGroup | null> => null,
    enabled: false,
  })
}

/**
 * 檢查客戶是否有家人
 */
export function useHasFamily(customerId: string | null | undefined) {
  const { data: family, isLoading } = useCustomerFamily(customerId)
  return {
    hasFamily: !!family && family.members.length > 1, // 排除自己
    memberCount: family?.members.length ?? 0,
    isLoading,
  }
}
