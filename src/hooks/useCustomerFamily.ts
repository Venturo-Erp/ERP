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
  return useQuery({
    queryKey: ['customer-family', customerId],
    queryFn: async (): Promise<CustomerFamilyGroup | null> => {
      if (!customerId) return null

      // 1. 查詢客戶屬於哪個群組
      const { data: memberData, error: memberError } = await supabase
        .from('customer_group_members')
        .select('group_id')
        .eq('customer_id', customerId)
        .single()

      if (memberError || !memberData) {
        return null
      }

      // 2. 查詢群組詳情
      const { data: groupData, error: groupError } = await supabase
        .from('customer_groups')
        .select('id, name, workspace_id, created_at, updated_at')
        .eq('id', memberData.group_id)
        .eq('type', 'family') // 只查家庭群組
        .single()

      if (groupError || !groupData) {
        return null
      }

      // 3. 查詢群組所有成員（含客戶詳情）
      const { data: membersData, error: membersError } = await supabase
        .from('customer_group_members')
        .select(
          `
          *,
          customer:customers(*)
        `
        )
        .eq('group_id', memberData.group_id)

      if (membersError || !membersData) {
        return null
      }

      return {
        group: groupData as CustomerGroup,
        members: membersData as Array<CustomerGroupMember & { customer: Customer }>,
      }
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 分鐘內不重複查詢
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
