// src/hooks/useMemberActions.ts
// 輕量級 hook：只提供 create/update/delete，不觸發 SWR fetch
// 用於只需要寫入操作的頁面（如 /orders），避免首屏載入整個 members 表

import { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { generateUUID } from '@/lib/utils/uuid'
import { logger } from '@/lib/utils/logger'
import { getCurrentWorkspaceId } from '@/lib/workspace-helpers'
import type { Member } from '@/stores/types'
import type { Database } from '@/lib/supabase/types'
import { deleteMember, updateMember } from '@/data/entities/members'
import { recalculateParticipants } from '@/features/tours/services/tour-stats.service'
import { recalculateOrderAmount } from '@/features/orders/services/order-stats.service'

// Supabase Insert 類型（使用 order_members 表）
type OrderMemberInsert = Database['public']['Tables']['order_members']['Insert']

// SWR key 與 @/data 的 createEntityHook 一致，確保 mutate 時能同步
// members 對應表名是 order_members，orders 對應表名是 orders
const SWR_KEY = 'entity:order_members:list'
const ORDERS_SWR_KEY = 'entity:orders:list'

// 使用 @/lib/workspace-helpers 的 getCurrentWorkspaceId

/**
 * 同步更新訂單的 member_count
 * 根據實際 order_members 數量更新
 */
async function syncOrderMemberCount(orderId: string): Promise<void> {
  if (!orderId) return

  // 計算該訂單的實際團員數量（從 order_members 表）
  const { count, error: countError } = await supabase
    .from('order_members')
    .select('*', { count: 'exact', head: true })
    .eq('order_id', orderId)

  if (countError) {
    logger.error('Failed to count members:', countError)
    return
  }

  // 更新訂單的 member_count
  const { error: updateError } = await supabase
    .from('orders')
    .update({ member_count: count || 0, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (updateError) {
    logger.error('Failed to update order member_count:', updateError)
    return
  }

  // 觸發 orders SWR revalidate
  mutate(ORDERS_SWR_KEY)
}

interface MemberActionsReturn {
  create: (data: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => Promise<Member>
  update: (id: string, updates: Partial<Member>) => Promise<void>
  delete: (id: string, orderId?: string) => Promise<void>
}

/**
 * 輕量級 Member 操作 hook
 * 不會觸發 SWR fetch，只提供寫入操作
 * 寫入後會 mutate SWR cache，讓其他使用 useMembers() 的頁面同步更新
 * 新增/刪除時會自動同步更新訂單的 member_count
 */
export function useMemberActions(): MemberActionsReturn {
  const create = async (
    data: Omit<Member, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Member> => {
    const now = new Date().toISOString()
    const workspace_id = getCurrentWorkspaceId()

    const newMember = {
      ...data,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
      chinese_name: data.name || '', // 確保 chinese_name 不為 undefined（標準欄位）
      ...(workspace_id ? { workspace_id } : {}),
    } as Member

    // 轉換為 Supabase Insert 類型（保留所有傳入的欄位）
    // 注意：使用 order_members 表而非 members 表
    const memberData = newMember as unknown as Record<string, unknown>
    const insertData: OrderMemberInsert = {
      id: newMember.id,
      chinese_name: newMember.chinese_name || '',
      order_id: newMember.order_id,
      member_type: (memberData.member_type as string) || 'adult',
      // 基本資料
      passport_image_url: (memberData.passport_image_url as string | null) ?? null,
      passport_number: newMember.passport_number ?? null,
      passport_name: newMember.passport_name ?? (memberData.name_en as string | null) ?? null,
      passport_expiry: newMember.passport_expiry ?? null,
      id_number: (memberData.id_number as string | null) ?? null,
      gender: newMember.gender ?? null,
      birth_date:
        (memberData.birth_date as string | null) ??
        (memberData.birth_date as string | null) ??
        null,
      // 其他常用欄位
      pnr:
        (memberData.reservation_code as string | null) ?? (memberData.pnr as string | null) ?? null,
      customer_id: (memberData.customer_id as string | null) ?? null,
      workspace_id: workspace_id ?? null,
    }
    const { error } = await supabase.from('order_members').insert(insertData)
    if (error) throw error

    // 觸發 SWR revalidate，讓其他頁面的 useMembers() 同步
    mutate(SWR_KEY)

    // 同步更新訂單的 member_count
    if (data.order_id) {
      await syncOrderMemberCount(data.order_id)

      // 重算團人數
      const { data: order } = await supabase
        .from('orders')
        .select('tour_id')
        .eq('id', data.order_id)
        .single()
      if (order?.tour_id) {
        recalculateParticipants(order.tour_id).catch(err => {
          logger.error('重算團人數失敗:', err)
        })
      }
    }

    return newMember
  }

  const update = async (id: string, updates: Partial<Member>): Promise<void> => {
    const updatedData = {
      ...updates,
      // 處理欄位名稱對應
      ...(updates.passport_name !== undefined ||
      (updates as Record<string, unknown>).name_en !== undefined
        ? { passport_name: updates.passport_name ?? (updates as Record<string, unknown>).name_en }
        : {}),
      ...(updates.birth_date !== undefined ||
      (updates as Record<string, unknown>).birth_date !== undefined
        ? { birth_date: updates.birth_date ?? (updates as Record<string, unknown>).birth_date }
        : {}),
      ...((updates as Record<string, unknown>).reservation_code !== undefined ||
      (updates as Record<string, unknown>).pnr !== undefined
        ? {
            pnr:
              (updates as Record<string, unknown>).reservation_code ??
              (updates as Record<string, unknown>).pnr,
          }
        : {}),
    }

    await updateMember(id, updatedData as Parameters<typeof updateMember>[1])

    mutate(SWR_KEY)
  }

  const remove = async (id: string, orderId?: string): Promise<void> => {
    // 如果沒傳 orderId，先查詢取得
    let memberOrderId = orderId
    if (!memberOrderId) {
      const { data: member } = await supabase
        .from('order_members')
        .select('order_id')
        .eq('id', id)
        .single()
      memberOrderId = member?.order_id ?? undefined
    }

    await deleteMember(id)

    mutate(SWR_KEY)

    // 同步更新訂單的 member_count 和團人數
    if (memberOrderId) {
      await syncOrderMemberCount(memberOrderId)

      const { data: order } = await supabase
        .from('orders')
        .select('tour_id')
        .eq('id', memberOrderId)
        .single()
      if (order?.tour_id) {
        recalculateParticipants(order.tour_id).catch(err => {
          logger.error('重算團人數失敗:', err)
        })
      }
    }
  }

  return {
    create,
    update,
    delete: remove,
  }
}

export default useMemberActions
