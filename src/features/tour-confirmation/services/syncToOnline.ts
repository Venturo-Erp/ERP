/**
 * 同步行程到 Online App
 *
 * 當確認單交接時呼叫，將行程資料同步到 online_trips 表
 *
 * online_trips 表已建立，types 已更新
 */

import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type {
  DailyItineraryDay,
  LeaderInfo,
  MeetingInfo,
  FlightInfo,
} from '@/stores/types/tour.types'

// === Labels ===
const SYNC_LABELS = {
  TOUR_NOT_FOUND: 'Tour not found for online sync',
  UPDATE_TRIP_FAILED: 'Failed to update online trip',
  UPDATE_TRIP_SUCCESS: 'Online trip updated',
  CREATE_TRIP_FAILED: 'Failed to create online trip',
  CREATE_TRIP_SUCCESS: 'Online trip created',
  SYNC_ERROR: 'Error syncing to online',
  SYNC_SUCCESS: 'Sync to online completed',
  SYNC_FAILED: 'Sync to online failed',
  SYNC_LEADER: 'Synced leader to online',
  NO_ORDER_MEMBERS: 'No order members found',
  SYNC_MEMBERS_FAILED: 'Failed to sync members to online',
  SYNC_MEMBERS_SUCCESS: 'Members synced to online',
  SYNC_MEMBERS_ERROR: 'Error syncing members to online',
} as const

interface SyncResult {
  success: boolean
  message: string
  onlineTripId?: string
}

/** online_trips 表的資料結構（與 Online useTrips.ts 一致） */
interface OnlineTrip {
  id: string
  erp_tour_id: string
  erp_itinerary_id: string | null
  workspace_id: string
  code: string
  name: string
  departure_date: string
  return_date: string
  destination: string | null
  daily_itinerary: DailyItineraryDay[]
  leader_info: LeaderInfo | null
  meeting_info: MeetingInfo | null
  outbound_flight: FlightInfo | null
  return_flight: FlightInfo | null
  status: 'active' | 'departed' | 'completed' | 'cancelled'
  handoff_at: string
  created_at?: string
  updated_at: string
}

type OnlineTripInsert = Omit<OnlineTrip, 'id' | 'created_at'>

/** 無類型的 Supabase client（用於尚未加入 Database 類型的表） */
const untypedSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * 同步行程到 Online
 */
export async function syncTripToOnline(tourId: string): Promise<SyncResult> {
  try {
    // 1. 取得旅遊團資料
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select(
        'workspace_id, code, name, departure_date, return_date, country_id, airport_code, outbound_flight, return_flight'
      )
      .eq('id', tourId)
      .single()

    if (tourError || !tour) {
      return { success: false, message: SYNC_LABELS.TOUR_NOT_FOUND }
    }

    // SSOT：從 airport_code → 城市名 → 國家名 衍生目的地字串
    let tourDestination: string | null = null
    if (tour.airport_code) {
      const { data: airport } = await supabase
        .from('ref_airports')
        .select('city_name_zh')
        .eq('iata_code', tour.airport_code)
        .maybeSingle()
      tourDestination = airport?.city_name_zh || null
    }
    if (!tourDestination && tour.country_id) {
      const { data: country } = await supabase
        .from('countries')
        .select('name')
        .eq('id', tour.country_id)
        .maybeSingle()
      tourDestination = country?.name || null
    }

    // 2. 取得行程表資料
    const { data: itinerary } = await supabase
      .from('itineraries')
      .select('id, daily_itinerary, leader, meeting_info')
      .eq('tour_id', tourId)
      .maybeSingle()

    // 3. 檢查是否已經同步過
    const { data: existingTrip } = await untypedSupabase
      .from('online_trips')
      .select('id')
      .eq('erp_tour_id', tourId)
      .maybeSingle<Pick<OnlineTrip, 'id'>>()

    // 4. 準備同步資料
    const dailyItinerary = itinerary?.daily_itinerary as DailyItineraryDay[] | undefined
    const syncData: OnlineTripInsert = {
      erp_tour_id: tourId,
      erp_itinerary_id: itinerary?.id ?? null,
      workspace_id: tour.workspace_id ?? '',
      code: tour.code,
      name: tour.name,
      departure_date: tour.departure_date || '',
      return_date: tour.return_date || '',
      destination: tourDestination,
      daily_itinerary: Array.isArray(dailyItinerary) ? dailyItinerary : [],
      leader_info: (itinerary?.leader as unknown as LeaderInfo) ?? null,
      meeting_info: (itinerary?.meeting_info as unknown as MeetingInfo) ?? null,
      outbound_flight: (tour.outbound_flight as unknown as FlightInfo) ?? null,
      return_flight: (tour.return_flight as unknown as FlightInfo) ?? null,
      status: 'active',
      handoff_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    let onlineTripId: string

    if (existingTrip) {
      // 更新現有記錄
      const { error: updateError } = await untypedSupabase
        .from('online_trips')
        .update(syncData)
        .eq('id', existingTrip.id)

      if (updateError) {
        logger.error(SYNC_LABELS.UPDATE_TRIP_FAILED, updateError)
        return { success: false, message: updateError.message }
      }

      onlineTripId = existingTrip.id
      logger.info(SYNC_LABELS.UPDATE_TRIP_SUCCESS, { onlineTripId })
    } else {
      // 建立新記錄
      const { data: newTrip, error: insertError } = await untypedSupabase
        .from('online_trips')
        .insert(syncData)
        .select('id')
        .single<Pick<OnlineTrip, 'id'>>()

      if (insertError || !newTrip) {
        logger.error(SYNC_LABELS.CREATE_TRIP_FAILED, insertError)
        return { success: false, message: insertError?.message ?? SYNC_LABELS.CREATE_TRIP_FAILED }
      }

      onlineTripId = newTrip.id
      logger.info(SYNC_LABELS.CREATE_TRIP_SUCCESS, { onlineTripId })
    }

    // V2: 行程群組聊天室（conversations 表尚未建立）
    // const { data: existingConv } = await untypedSupabase
    //   .from('conversations')
    //   .select('id')
    //   .eq('trip_id', onlineTripId)
    //   .eq('type', 'trip')
    //   .maybeSingle()
    //
    // if (!existingConv) {
    //   const chatName = `${tour.code} ${tour.name}`
    //   const { data: newConv, error: convError } = await untypedSupabase
    //     .from('conversations')
    //     .insert({
    //       type: 'trip',
    //       trip_id: onlineTripId,
    //       name: chatName,
    //       status: 'active',
    //     })
    //     .select('id')
    //     .single()
    //
    //   if (convError) {
    //     logger.warn('建立行程群組失敗（不影響同步）:', convError)
    //   } else if (newConv) {
    //     // 發送系統訊息
    //     await untypedSupabase.from('messages').insert({
    //       conversation_id: newConv.id,
    //       sender_id: null,
    //       type: 'system',
    //       content: '行程群組已建立，團員可以在這裡交流',
    //     })
    //     logger.info(`行程群組已建立: ${newConv.id}`)
    //   }
    // }

    // 6. 同步團員到 online_trip_members
    await syncTripMembers(tourId, onlineTripId, itinerary?.leader as LeaderInfo | null)

    return {
      success: true,
      message: SYNC_LABELS.SYNC_SUCCESS,
      onlineTripId,
    }
  } catch (error) {
    logger.error(SYNC_LABELS.SYNC_ERROR, error)
    return { success: false, message: SYNC_LABELS.SYNC_FAILED }
  }
}

/**
 * 同步團員到 Online（含分車分房資料）
 */
async function syncTripMembers(
  tourId: string,
  onlineTripId: string,
  leaderInfo: LeaderInfo | null
): Promise<void> {
  try {
    // 1. 先清除舊的成員資料（避免重複）
    await untypedSupabase.from('online_trip_members').delete().eq('trip_id', onlineTripId)

    // 2. 取得該團的所有訂單
    const { data: orders } = await supabase.from('orders').select('id').eq('tour_id', tourId)

    if (!orders || orders.length === 0) {
      // 只同步領隊
      if (leaderInfo?.name) {
        await untypedSupabase.from('online_trip_members').insert({
          trip_id: onlineTripId,
          role: 'leader',
          name: leaderInfo.name,
          phone: leaderInfo.domesticPhone || leaderInfo.overseasPhone || null,
        })
        logger.info(SYNC_LABELS.SYNC_LEADER, { name: leaderInfo.name })
      }
      return
    }

    const orderIds = orders.map(o => o.id)

    // 3. 取得所有訂單成員
    const { data: orderMembers } = await supabase
      .from('order_members')
      .select(
        'id, chinese_name, passport_name, member_type, special_meal, remarks, checked_in, checked_in_at'
      )
      .in('order_id', orderIds)

    if (!orderMembers || orderMembers.length === 0) {
      logger.info(SYNC_LABELS.NO_ORDER_MEMBERS)
      return
    }

    // 4. 取得分車資料
    const memberIds = orderMembers.map(m => m.id)
    const { data: vehicleAssignments } = await supabase
      .from('tour_vehicle_assignments')
      .select('order_member_id, tour_vehicles(vehicle_number, seat_number)')
      .in('order_member_id', memberIds)

    // 5. 取得分房資料
    const { data: roomAssignments } = await supabase
      .from('tour_room_assignments')
      .select('order_member_id, tour_rooms(room_number, room_type)')
      .in('order_member_id', memberIds)

    // 建立查找表
    const vehicleMap = new Map<string, { vehicle_number: string; seat_number?: string }>()
    if (vehicleAssignments) {
      for (const va of vehicleAssignments) {
        const vehicle = va.tour_vehicles as { vehicle_number?: string; seat_number?: string } | null
        if (vehicle?.vehicle_number) {
          vehicleMap.set(va.order_member_id, {
            vehicle_number: vehicle.vehicle_number,
            seat_number: vehicle.seat_number,
          })
        }
      }
    }

    const roomMap = new Map<
      string,
      { room_number: string; room_type?: string; roommates: string[] }
    >()
    if (roomAssignments) {
      // 先按房間分組，找出同房人
      const roomGroups = new Map<string, string[]>()
      for (const ra of roomAssignments) {
        const room = ra.tour_rooms as { room_number?: string; room_type?: string } | null
        if (room?.room_number) {
          const group = roomGroups.get(room.room_number) || []
          group.push(ra.order_member_id)
          roomGroups.set(room.room_number, group)
        }
      }

      // 建立 roomMap
      for (const ra of roomAssignments) {
        const room = ra.tour_rooms as { room_number?: string; room_type?: string } | null
        if (room?.room_number) {
          const allInRoom = roomGroups.get(room.room_number) || []
          const roommates = allInRoom.filter(id => id !== ra.order_member_id)
          const roommateNames = roommates
            .map(id => orderMembers.find(m => m.id === id))
            .filter(m => m)
            .map(m => m!.chinese_name || m!.passport_name || '未知')

          roomMap.set(ra.order_member_id, {
            room_number: room.room_number,
            room_type: room.room_type,
            roommates: roommateNames,
          })
        }
      }
    }

    // 6. 準備插入資料
    const membersToInsert: Array<Record<string, unknown>> = []

    // 領隊
    if (leaderInfo?.name) {
      membersToInsert.push({
        trip_id: onlineTripId,
        role: 'leader',
        name: leaderInfo.name,
        phone: leaderInfo.domesticPhone || leaderInfo.overseasPhone || null,
      })
    }

    // 團員
    for (const member of orderMembers) {
      const vehicle = vehicleMap.get(member.id)
      const room = roomMap.get(member.id)

      membersToInsert.push({
        trip_id: onlineTripId,
        role: 'traveler',
        name: member.chinese_name || member.passport_name || null,
        phone: null,
        erp_order_member_id: member.id,
        member_type: member.member_type,
        special_meal: member.special_meal,
        remarks: member.remarks,
        checked_in: member.checked_in ?? false,
        checked_in_at: member.checked_in_at,
        vehicle_number: vehicle?.vehicle_number ?? null,
        vehicle_seat: vehicle?.seat_number ?? null,
        room_number: room?.room_number ?? null,
        room_type: room?.room_type ?? null,
        roommates: room?.roommates ?? null,
      })
    }

    // 7. 批量插入
    if (membersToInsert.length > 0) {
      const { error: insertError } = await untypedSupabase
        .from('online_trip_members')
        .insert(membersToInsert)

      if (insertError) {
        logger.error(SYNC_LABELS.SYNC_MEMBERS_FAILED, insertError)
      } else {
        logger.info(SYNC_LABELS.SYNC_MEMBERS_SUCCESS, { count: membersToInsert.length })
      }
    }
  } catch (error) {
    logger.error(SYNC_LABELS.SYNC_MEMBERS_ERROR, error)
  }
}
