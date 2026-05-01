/**
 * order_member.service.ts - 團員資料存取服務
 */

import { supabase } from '@/lib/supabase/client'

/** 批量更新團員的開票期限 */
export async function updateMembersTicketingDeadline(
  memberIds: string[],
  deadline: string | null
): Promise<void> {
  const { error } = await supabase
    .from('order_members')
    .update({ ticketing_deadline: deadline })
    .in('id', memberIds)
  if (error) throw error
}

/** 批量插入房間分配（2026-04-23：tour_room_assignments 砍除、stub） */
async function insertRoomAssignments(
  _assignments: Array<{ room_id: string; order_member_id: string }>
): Promise<void> {
  // 分房功能砍除、之後重做時恢復
}

/** 查詢所有客戶（用於護照驗證比對） */
export async function fetchAllCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, name, passport_name, passport_number, passport_expiry, passport_image_url, birth_date, gender, nationality, national_id, workspace_id'
    )
    .limit(500)
  if (error) {
    throw new Error(`查詢客戶失敗: ${error.message}`)
  }
  return data ?? []
}
