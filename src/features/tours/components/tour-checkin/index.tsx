'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tour } from '@/stores/types'
import { CheckinSettings } from './CheckinSettings'
import { CheckinQRCode } from './CheckinQRCode'
import { CheckinMemberList, CheckinMember } from './CheckinMemberList'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { COMP_TOURS_LABELS } from '../../constants/labels'

interface TourCheckinProps {
  tour: Tour
}

export function TourCheckin({ tour }: TourCheckinProps) {
  const [members, setMembers] = useState<CheckinMember[]>([])
  const [loading, setLoading] = useState(true)
  const [enableCheckin, setEnableCheckin] = useState(tour.enable_checkin ?? false)

  // 載入團員資料
  const loadMembers = useCallback(async () => {
    if (!tour.id) return

    setLoading(true)
    try {
      // 先取得團的訂單
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('tour_id', tour.id)

      if (ordersError) throw ordersError

      if (!orders || orders.length === 0) {
        setMembers([])
        setLoading(false)
        return
      }

      const orderIds = orders.map(o => o.id)

      // 取得所有成員
      const { data: membersData, error: membersError } = await supabase
        .from('order_members')
        .select('id, order_id, chinese_name, passport_name, passport_name_print, gender, age, birth_date, identity, member_type, id_number, passport_number, passport_expiry, passport_image_url, pnr, ticket_number, ticketing_deadline, hotel_1_name, hotel_1_checkin, hotel_1_checkout, hotel_2_name, hotel_2_checkin, hotel_2_checkout, selling_price, cost_price, flight_cost, transport_cost, misc_cost, profit, deposit_amount, balance_amount, deposit_receipt_no, balance_receipt_no, total_payable, special_meal, remarks, customer_id, checked_in, checked_in_at, sort_order, flight_self_arranged, custom_costs, contract_created_at, workspace_id, created_at, created_by, updated_at, updated_by')
        .in('order_id', orderIds)
        .order('chinese_name')
        .limit(500)

      if (membersError) throw membersError

      setMembers((membersData || []) as CheckinMember[])
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.載入團員失敗, error)
      toast.error(COMP_TOURS_LABELS.載入團員資料失敗)
    } finally {
      setLoading(false)
    }
  }, [tour.id])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // 切換報到功能
  const handleToggleCheckin = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('tours')
        .update({ enable_checkin: enabled })
        .eq('id', tour.id)

      if (error) throw error

      setEnableCheckin(enabled)
      toast.success(enabled ? COMP_TOURS_LABELS.已啟用報到功能 : COMP_TOURS_LABELS.已停用報到功能)
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.切換報到功能失敗, error)
      toast.error(COMP_TOURS_LABELS.操作失敗)
    }
  }

  // 手動報到
  const handleManualCheckin = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('order_members')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq('id', memberId)

      if (error) throw error

      // 更新本地狀態
      setMembers(prev =>
        prev.map(m =>
          m.id === memberId
            ? { ...m, checked_in: true, checked_in_at: new Date().toISOString() }
            : m
        )
      )
      toast.success(COMP_TOURS_LABELS.報到成功)
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.報到失敗_2, error)
      toast.error(COMP_TOURS_LABELS.報到失敗)
    }
  }

  // 取消報到
  const handleCancelCheckin = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('order_members')
        .update({
          checked_in: false,
          checked_in_at: null,
        })
        .eq('id', memberId)

      if (error) throw error

      // 更新本地狀態
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, checked_in: false, checked_in_at: null } : m))
      )
      toast.success(COMP_TOURS_LABELS.已取消報到)
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.取消報到失敗, error)
      toast.error(COMP_TOURS_LABELS.操作失敗)
    }
  }

  // 計算統計
  const stats = {
    total: members.length,
    checkedIn: members.filter(m => m.checked_in).length,
    notCheckedIn: members.filter(m => !m.checked_in).length,
  }

  return (
    <div className="space-y-6">
      {/* 報到設定 + 統計 */}
      <CheckinSettings enableCheckin={enableCheckin} onToggle={handleToggleCheckin} stats={stats} />

      {/* QR Code */}
      {enableCheckin && <CheckinQRCode tour={tour} />}

      {/* 報到名單 */}
      <CheckinMemberList
        members={members}
        loading={loading}
        onManualCheckin={handleManualCheckin}
        onCancelCheckin={handleCancelCheckin}
        onRefresh={loadMembers}
      />
    </div>
  )
}
