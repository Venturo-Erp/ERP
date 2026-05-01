'use client'

/**
 * Members Entity (order_members)
 *
 * 使用方式：
 * import { useMembers, useMember, useMembersByOrder } from '@/data'
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Member } from '@/stores/types'

// ============================================
// Entity 定義
// ============================================

const memberEntity = createEntityHook<Member>('order_members', {
  list: {
    select:
      'id,order_id,chinese_name,passport_name,passport_name_print,passport_number,passport_expiry,id_number,birth_date,age,gender,identity,member_type,customer_id,sort_order,selling_price,cost_price,profit,deposit_amount,deposit_receipt_no,balance_amount,balance_receipt_no,total_payable,flight_cost,transport_cost,misc_cost,flight_self_arranged,pnr,ticket_number,ticketing_deadline,special_meal,hotel_1_name,hotel_1_checkin,hotel_1_checkout,hotel_2_name,hotel_2_checkin,hotel_2_checkout,checked_in,checked_in_at,contract_created_at,workspace_id,created_at,created_by,updated_by',
    orderBy: {
      column: 'created_at',
      ascending: false,
    },
  },
  slim: {
    select:
      'id,order_id,chinese_name,gender,passport_number,passport_expiry,id_number,birth_date,age',
  },
  detail: {
    select: '*',
  },
  cache: CACHE_PRESETS.high,
})

// ============================================
// 便捷 Hooks Export
// ============================================

/** 完整 Members 列表 */
export const useMembers = memberEntity.useList

/** 精簡 Members 列表 */
export const useMembersSlim = memberEntity.useListSlim

/** 單筆 Member（支援 skip pattern）*/
const useMember = memberEntity.useDetail

/** 分頁 Members */
const useMembersPaginated = memberEntity.usePaginated

/** Member Dictionary */
const useMemberDictionary = memberEntity.useDictionary

// ============================================
// CRUD Export
// ============================================

const createMember = memberEntity.create
export const updateMember = memberEntity.update
export const deleteMember = memberEntity.delete
const invalidateMembers = memberEntity.invalidate
