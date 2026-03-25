'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { insertRoomAssignments } from '@/features/orders/services/order_member.service'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { COMP_ORDERS_LABELS } from '../constants/labels'
import { MEMBER_DATA_LABELS } from '../constants/labels'

interface UseRoomVehicleAssignmentsParams {
  tourId: string
  departureDate?: string | null // 出發日期，用於計算成員年齡
}

// 根據出生日期和出發日期計算年齡
function calculateAge(
  birthDate: string | null | undefined,
  referenceDate: string | null | undefined
): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const ref = referenceDate ? new Date(referenceDate) : new Date()
  let age = ref.getFullYear() - birth.getFullYear()
  const monthDiff = ref.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// 判斷是否為不佔床的成員（嬰兒或6歲以下幼童）
export function isChildNotOccupyingBed(
  birthDate: string | null | undefined,
  referenceDate: string | null | undefined
): boolean {
  const age = calculateAge(birthDate, referenceDate)
  return age !== null && age < 6
}

// 判斷是否為嬰兒（2歲以下）
export function isInfant(
  birthDate: string | null | undefined,
  referenceDate: string | null | undefined
): boolean {
  const age = calculateAge(birthDate, referenceDate)
  return age !== null && age < 2
}

// 飯店欄位資訊
export interface HotelColumn {
  id: string // hotel_name 作為 id
  name: string
  shortName: string // 縮寫（前2字）
  checkIn: string
  checkOut: string
  nightNumbers: number[]
}

// 房間選項（用於下拉選單）
export interface RoomOption {
  id: string
  roomType: string
  roomNumber: number // 同類型的第幾間
  capacity: number
  assignedCount: number
  label: string // 顯示文字：「豪華雙床房1 (剩1床)」
}

// 房間內的成員資訊
export interface RoomMemberInfo {
  id: string
  name: string
  isChild: boolean // 6歲以下不佔床
}

interface UseRoomVehicleAssignmentsReturn {
  showRoomManager: boolean
  setShowRoomManager: (show: boolean) => void
  showVehicleManager: boolean
  setShowVehicleManager: (show: boolean) => void
  showRoomColumn: boolean
  setShowRoomColumn: (show: boolean) => void
  showVehicleColumn: boolean
  setShowVehicleColumn: (show: boolean) => void
  roomAssignments: Record<string, string> // 舊格式，合併顯示
  roomAssignmentsByHotel: Record<string, Record<string, string>> // 新格式：hotelName -> memberId -> 房型
  roomIdByHotelMember: Record<string, Record<string, string>> // hotelName -> memberId -> roomId
  roomMembersByHotelRoom: Record<string, Record<string, RoomMemberInfo[]>> // hotelName -> roomId -> 成員列表
  hotelColumns: HotelColumn[] // 飯店欄位列表
  roomOptionsByHotel: Record<string, RoomOption[]> // 每個飯店的房間選項
  roomSortKeys: Record<string, number>
  vehicleAssignments: Record<string, string>
  loadRoomAssignments: () => Promise<void>
  loadVehicleAssignments: () => Promise<void>
  assignMemberToRoom: (
    memberId: string,
    hotelName: string,
    roomId: string | null,
    memberBirthDate?: string | null
  ) => Promise<void>
  removeMemberFromRoom: (memberId: string, hotelName: string) => Promise<void> // 移除單一成員（不影響室友）
  reorderRoomsByMembers: (memberIds: string[]) => Promise<void>
}

export function useRoomVehicleAssignments({
  tourId,
  departureDate,
}: UseRoomVehicleAssignmentsParams): UseRoomVehicleAssignmentsReturn {
  // 分房分車相關狀態
  const [showRoomManager, setShowRoomManager] = useState(false)
  const [showVehicleManager, setShowVehicleManager] = useState(false)
  const [showRoomColumn, setShowRoomColumn] = useState(false)
  const [showVehicleColumn, setShowVehicleColumn] = useState(false)
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string>>({})
  const [roomAssignmentsByHotel, setRoomAssignmentsByHotel] = useState<
    Record<string, Record<string, string>>
  >({})
  const [roomIdByHotelMember, setRoomIdByHotelMember] = useState<
    Record<string, Record<string, string>>
  >({})
  const [roomMembersByHotelRoom, setRoomMembersByHotelRoom] = useState<
    Record<string, Record<string, RoomMemberInfo[]>>
  >({})
  const [hotelColumns, setHotelColumns] = useState<HotelColumn[]>([])
  const [roomOptionsByHotel, setRoomOptionsByHotel] = useState<Record<string, RoomOption[]>>({})
  const [roomSortKeys, setRoomSortKeys] = useState<Record<string, number>>({})
  const [vehicleAssignments, setVehicleAssignments] = useState<Record<string, string>>({})

  // 載入分房資訊
  const loadRoomAssignments = async () => {
    if (!tourId) return
    try {
      const { data: rooms } = await supabase
        .from('tour_rooms')
        .select('id, room_number, room_type, display_order, night_number, hotel_name, capacity')
        .eq('tour_id', tourId)
        .order('night_number')
        .order('display_order')

      if (!rooms || rooms.length === 0) {
        setRoomAssignments({})
        setRoomSortKeys({})
        return
      }

      // 修復負數或過大的 display_order（之前程式碼可能造成的問題）
      const roomsToFix = rooms.filter(
        r => r.display_order === null || r.display_order < 0 || r.display_order >= 10000
      )
      if (roomsToFix.length > 0) {
        logger.info(`修復 ${roomsToFix.length} 個房間的 display_order`)
        // 按飯店分組修復
        const byHotel: Record<string, typeof roomsToFix> = {}
        roomsToFix.forEach(r => {
          const hotel = r.hotel_name || COMP_ORDERS_LABELS.未指定
          if (!byHotel[hotel]) byHotel[hotel] = []
          byHotel[hotel].push(r)
        })
        // 為每個飯店重新分配 display_order
        for (const [hotelName, hotelRooms] of Object.entries(byHotel)) {
          const goodRooms = rooms.filter(
            r =>
              r.hotel_name === hotelName &&
              r.display_order !== null &&
              r.display_order >= 0 &&
              r.display_order < 10000
          )
          let nextOrder =
            goodRooms.length > 0 ? Math.max(...goodRooms.map(r => r.display_order!)) + 1 : 0
          for (const room of hotelRooms) {
            // 對於負數，恢復原本的值
            const originalOrder =
              room.display_order !== null && room.display_order < 0
                ? room.display_order >= -1999
                  ? -(room.display_order + 1000)
                  : room.display_order - 10000
                : nextOrder++
            await supabase
              .from('tour_rooms')
              .update({
                display_order:
                  originalOrder >= 0 && originalOrder < 10000 ? originalOrder : nextOrder++,
              })
              .eq('id', room.id)
          }
        }
        // 重新載入修復後的資料
        const { data: fixedRooms } = await supabase
          .from('tour_rooms')
          .select('id, room_number, room_type, display_order, night_number, hotel_name, capacity')
          .eq('tour_id', tourId)
          .order('night_number')
          .order('display_order')
        if (fixedRooms) {
          rooms.length = 0
          rooms.push(...fixedRooms)
        }
      }

      // 查詢分配資訊，包含成員姓名和出生日期
      const { data: assignments } = await supabase
        .from('tour_room_assignments')
        .select(
          `
          order_member_id,
          room_id,
          order_members:order_member_id (
            id,
            chinese_name,
            passport_name,
            birth_date
          )
        `
        )
        .in(
          'room_id',
          rooms.map(r => r.id)
        )

      if (assignments) {
        const map: Record<string, string> = {}
        const sortKeys: Record<string, number> = {}

        // 收集所有不同的飯店（按 night_number 排序）
        const uniqueHotels = [
          ...new Map(
            rooms
              .sort((a, b) => a.night_number - b.night_number)
              .map(r => [r.hotel_name, r.night_number])
          ).entries(),
        ]

        // 為每個飯店創建縮寫（取前2個字）
        const hotelAbbrev: Record<string, string> = {}
        uniqueHotels.forEach(([name]) => {
          if (name) {
            hotelAbbrev[name] = name.slice(0, 2)
          }
        })

        // 按成員分組所有房間分配
        const memberRooms: Record<
          string,
          { hotel: string; type: string; num: number; nightNum: number }[]
        > = {}

        // 計算每個飯店內的房間編號（簡化版：直接按順序編號）
        const roomNumbers: Record<string, number> = {}
        const counters: Record<string, number> = {}

        // 房間已按 night_number + display_order 排序（來自 SQL）
        rooms.forEach(room => {
          // 用「飯店+房型+晚數」作為分組 key
          const groupKey = `${room.hotel_name || ''}_${room.room_type}_${room.night_number}`
          if (!counters[groupKey]) {
            counters[groupKey] = 0
          }
          counters[groupKey]++
          roomNumbers[room.id] = counters[groupKey]
        })

        // 第一晚的房間用於排序
        const firstNightRooms = rooms.filter(r => r.night_number === 1)
        const roomOrderMap: Record<string, number> = {}
        firstNightRooms.forEach((room, index) => {
          roomOrderMap[room.id] = index
        })

        assignments.forEach(a => {
          const room = rooms.find(r => r.id === a.room_id)
          if (room) {
            const memberId = a.order_member_id
            if (!memberRooms[memberId]) {
              memberRooms[memberId] = []
            }

            // 房型標籤（完整名稱）
            const typeLabel = room.room_type

            memberRooms[memberId].push({
              hotel: room.hotel_name || '',
              type: typeLabel,
              num: roomNumbers[room.id] || 1,
              nightNum: room.night_number,
            })

            // 用第一晚的房間做排序
            if (room.night_number === 1) {
              const roomOrder = roomOrderMap[room.id] ?? 999
              const existingSortKeys = Object.values(sortKeys).filter(
                v => Math.floor(v / 10) === roomOrder
              )
              sortKeys[memberId] = roomOrder * 10 + existingSortKeys.length
            }
          }
        })

        // 組合顯示文字（舊格式，合併顯示）
        Object.entries(memberRooms).forEach(([memberId, roomList]) => {
          // 按 nightNum 排序，去重（同飯店只顯示一次）
          const uniqueByHotel = roomList
            .sort((a, b) => a.nightNum - b.nightNum)
            .filter((r, i, arr) => arr.findIndex(x => x.hotel === r.hotel) === i)

          if (uniqueByHotel.length === 1) {
            // 只有一間飯店，顯示房型+編號
            const r = uniqueByHotel[0]
            map[memberId] = `${r.type}${r.num}`
          } else {
            // 多間飯店，顯示縮寫
            map[memberId] = uniqueByHotel
              .map(r => `${hotelAbbrev[r.hotel] || ''}${r.type}${r.num}`)
              .join(' / ')
          }
        })

        // 建立飯店欄位資訊
        const hotelColsMap = new Map<string, HotelColumn>()
        rooms.forEach(room => {
          const hotelName = room.hotel_name || COMP_ORDERS_LABELS.未指定
          if (!hotelColsMap.has(hotelName)) {
            hotelColsMap.set(hotelName, {
              id: hotelName,
              name: hotelName,
              shortName: hotelName.slice(0, 4), // 取前4字作為縮寫
              checkIn: '',
              checkOut: '',
              nightNumbers: [],
            })
          }
          const col = hotelColsMap.get(hotelName)!
          if (!col.nightNumbers.includes(room.night_number)) {
            col.nightNumbers.push(room.night_number)
          }
        })

        // 排序並計算入住/退房日期
        const sortedHotelCols = Array.from(hotelColsMap.values()).sort(
          (a, b) => Math.min(...a.nightNumbers) - Math.min(...b.nightNumbers)
        )

        // 按飯店分組的分房資料
        const byHotel: Record<string, Record<string, string>> = {}
        const idByHotelMember: Record<string, Record<string, string>> = {}

        // 按飯店分組房間（只取每個飯店的第一晚，因為續住房間相同）
        const firstNightByHotel: Record<string, number> = {}
        rooms.forEach(r => {
          if (
            r.hotel_name &&
            (!firstNightByHotel[r.hotel_name] || r.night_number < firstNightByHotel[r.hotel_name])
          ) {
            firstNightByHotel[r.hotel_name] = r.night_number
          }
        })

        // 建立 display_order -> 第一晚房間 ID 的對照表（按飯店）
        const firstNightRoomByOrder: Record<string, Record<number, string>> = {}
        rooms.forEach(r => {
          if (
            r.hotel_name &&
            r.night_number === firstNightByHotel[r.hotel_name] &&
            r.display_order !== null
          ) {
            if (!firstNightRoomByOrder[r.hotel_name]) {
              firstNightRoomByOrder[r.hotel_name] = {}
            }
            firstNightRoomByOrder[r.hotel_name][r.display_order] = r.id
          }
        })

        // 建立 memberId -> 第一晚房間 ID 的對應（按飯店）
        assignments.forEach(a => {
          const room = rooms.find(r => r.id === a.room_id)
          if (room && room.hotel_name && room.display_order !== null) {
            if (!idByHotelMember[room.hotel_name]) {
              idByHotelMember[room.hotel_name] = {}
            }
            // 使用第一晚對應的房間 ID（根據 display_order 對應）
            const firstNightRoomId = firstNightRoomByOrder[room.hotel_name]?.[room.display_order]
            if (firstNightRoomId) {
              idByHotelMember[room.hotel_name][a.order_member_id] = firstNightRoomId
            }
          }
        })

        Object.entries(memberRooms).forEach(([memberId, roomList]) => {
          roomList.forEach(r => {
            if (!byHotel[r.hotel]) {
              byHotel[r.hotel] = {}
            }
            // 只保留每個飯店第一次出現的房間（因為同飯店多晚房間相同）
            if (!byHotel[r.hotel][memberId]) {
              byHotel[r.hotel][memberId] = `${r.type}${r.num}`
            }
          })
        })

        // 計算每個飯店的房間選項（用於下拉選單）
        const optionsByHotel: Record<string, RoomOption[]> = {}

        // 計算每個房間已分配人數（用第一晚的房間 ID，每個成員只算一次）
        const roomAssignedMembers: Record<string, Set<string>> = {}
        assignments.forEach(a => {
          const room = rooms.find(r => r.id === a.room_id)
          if (room && room.hotel_name && room.display_order !== null) {
            // 用第一晚對應房間的 ID 來計算
            const firstNightRoomId = firstNightRoomByOrder[room.hotel_name]?.[room.display_order]
            if (firstNightRoomId) {
              if (!roomAssignedMembers[firstNightRoomId]) {
                roomAssignedMembers[firstNightRoomId] = new Set()
              }
              roomAssignedMembers[firstNightRoomId].add(a.order_member_id)
            }
          }
        })
        // 轉換成人數
        const roomAssignedCount: Record<string, number> = {}
        Object.entries(roomAssignedMembers).forEach(([roomId, members]) => {
          roomAssignedCount[roomId] = members.size
        })

        Object.entries(firstNightByHotel).forEach(([hotelName, firstNight]) => {
          const hotelRooms = rooms.filter(
            r => r.hotel_name === hotelName && r.night_number === firstNight
          )
          optionsByHotel[hotelName] = hotelRooms.map(room => {
            const assigned = roomAssignedCount[room.id] || 0
            const remaining = room.capacity - assigned
            return {
              id: room.id,
              roomType: room.room_type,
              roomNumber: roomNumbers[room.id] || 1,
              capacity: room.capacity,
              assignedCount: assigned,
              label: `${room.room_type}${roomNumbers[room.id] || 1}${remaining > 0 ? ` (剩${remaining}床)` : COMP_ORDERS_LABELS.滿}`,
            }
          })
        })

        // 建立 roomMembersByHotelRoom：hotelName -> roomId -> 成員列表
        const membersByHotelRoom: Record<string, Record<string, RoomMemberInfo[]>> = {}

        assignments.forEach(a => {
          const room = rooms.find(r => r.id === a.room_id)
          if (!room || !room.hotel_name) return

          // 使用第一晚的房間 ID 作為 key
          const firstNightRoomId = firstNightRoomByOrder[room.hotel_name]?.[room.display_order!]
          if (!firstNightRoomId) return

          // 取得成員資訊
          const memberData = a.order_members as {
            id: string
            chinese_name: string | null
            passport_name: string | null
            birth_date: string | null
          } | null
          if (!memberData) return

          const memberName =
            memberData.chinese_name || memberData.passport_name || COMP_ORDERS_LABELS.未命名
          const isChild = isChildNotOccupyingBed(memberData.birth_date, departureDate)

          if (!membersByHotelRoom[room.hotel_name]) {
            membersByHotelRoom[room.hotel_name] = {}
          }
          if (!membersByHotelRoom[room.hotel_name][firstNightRoomId]) {
            membersByHotelRoom[room.hotel_name][firstNightRoomId] = []
          }

          // 避免重複加入（因為可能有多晚分配）
          const existing = membersByHotelRoom[room.hotel_name][firstNightRoomId].find(
            m => m.id === a.order_member_id
          )
          if (!existing) {
            membersByHotelRoom[room.hotel_name][firstNightRoomId].push({
              id: a.order_member_id,
              name: memberName,
              isChild,
            })
          }
        })

        setRoomAssignments(map)
        setRoomAssignmentsByHotel(byHotel)
        setRoomIdByHotelMember(idByHotelMember)
        setRoomMembersByHotelRoom(membersByHotelRoom)
        setHotelColumns(sortedHotelCols)
        setRoomOptionsByHotel(optionsByHotel)
        setRoomSortKeys(sortKeys)
        // 有房間資料時自動顯示欄位（不管有沒有分配）
        if (rooms.length > 0) {
          setShowRoomColumn(true)
        }
      }
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.載入分房資訊失敗, error)
    }
  }

  // 載入分車資訊
  const loadVehicleAssignments = async () => {
    if (!tourId) return
    try {
      const { data: vehicles } = await supabase
        .from('tour_vehicles')
        .select('id, vehicle_name, vehicle_type')
        .eq('tour_id', tourId)

      if (!vehicles || vehicles.length === 0) return

      const { data: assignments } = await supabase
        .from('tour_vehicle_assignments')
        .select('order_member_id, vehicle_id')
        .in(
          'vehicle_id',
          vehicles.map(v => v.id)
        )

      if (assignments) {
        const map: Record<string, string> = {}
        assignments.forEach(a => {
          const vehicle = vehicles.find(v => v.id === a.vehicle_id)
          if (vehicle) {
            map[a.order_member_id] =
              vehicle.vehicle_name || vehicle.vehicle_type || COMP_ORDERS_LABELS.已分車
          }
        })
        setVehicleAssignments(map)
        // 有分車資料時自動顯示欄位
        if (Object.keys(map).length > 0) {
          setShowVehicleColumn(true)
        }
      }
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.載入分車資訊失敗, error)
    }
  }

  // 分配成員到房間（或取消分配）
  // 當取消分配（roomId 為 null）時，會一併取消同房所有成員的分配
  // memberBirthDate: 用於判斷是否為幼童（6歲以下不佔床）
  const assignMemberToRoom = async (
    memberId: string,
    hotelName: string,
    roomId: string | null,
    memberBirthDate?: string | null
  ) => {
    if (!tourId) return

    try {
      // 找出該飯店所有晚的房間（用於處理續住）
      const { data: hotelRooms } = await supabase
        .from('tour_rooms')
        .select('id, night_number, display_order, capacity')
        .eq('tour_id', tourId)
        .eq('hotel_name', hotelName)

      if (!hotelRooms) return

      const hotelRoomIds = hotelRooms.map(r => r.id)

      // 如果要分配到房間，先檢查房間是否已滿
      if (roomId) {
        const targetRoom = hotelRooms.find(r => r.id === roomId)
        if (targetRoom) {
          // 查詢該房間目前的分配成員數（去重，因為一個成員可能有多晚的分配）
          const { data: existingAssignments } = await supabase
            .from('tour_room_assignments')
            .select('order_member_id')
            .eq('room_id', roomId)

          // 去重計算實際成員數
          const uniqueMembers = new Set((existingAssignments || []).map(a => a.order_member_id))
          const currentCount = uniqueMembers.size
          const isRoomFull = currentCount >= targetRoom.capacity

          if (isRoomFull) {
            // 房間已滿，顯示警告但仍允許分配
            toast.warning(`此房間已滿（${currentCount}/${targetRoom.capacity}），確定要加入嗎？`, { duration: 3000 })
          }
        }
      }

      if (!roomId) {
        // 取消分配：找出該成員目前的房間，以及同房的所有成員，一起取消
        const { data: currentAssignment } = await supabase
          .from('tour_room_assignments')
          .select('room_id')
          .eq('order_member_id', memberId)
          .in('room_id', hotelRoomIds)
          .limit(1)
          .single()

        if (currentAssignment) {
          // 找出這間房的 display_order
          const currentRoom = hotelRooms.find(r => r.id === currentAssignment.room_id)
          if (currentRoom && currentRoom.display_order !== null) {
            // 找出同 display_order 的所有房間 ID（所有晚）
            const sameRoomIds = hotelRooms
              .filter(r => r.display_order === currentRoom.display_order)
              .map(r => r.id)

            // 找出這些房間裡的所有成員
            const { data: roommateAssignments } = await supabase
              .from('tour_room_assignments')
              .select('order_member_id')
              .in('room_id', sameRoomIds)

            if (roommateAssignments) {
              // 取得所有同房成員的 ID（去重）
              const roommateIds = [...new Set(roommateAssignments.map(a => a.order_member_id))]

              // 刪除所有同房成員的分配
              await supabase
                .from('tour_room_assignments')
                .delete()
                .in('order_member_id', roommateIds)
                .in('room_id', hotelRoomIds)
            }
          }
        }
      } else {
        // 分配到新房間：只處理單一成員
        // 先刪除該成員在這個飯店的所有分配
        await supabase
          .from('tour_room_assignments')
          .delete()
          .eq('order_member_id', memberId)
          .in('room_id', hotelRoomIds)

        // 找出選擇的房間的 display_order
        const { data: selectedRoomDetail } = await supabase
          .from('tour_rooms')
          .select('display_order')
          .eq('id', roomId)
          .single()

        if (selectedRoomDetail && selectedRoomDetail.display_order !== null) {
          // 找出同飯店、同 display_order 的所有晚房間
          const allNightRoomIds = hotelRooms
            .filter(r => r.display_order === selectedRoomDetail.display_order)
            .map(r => r.id)

          if (allNightRoomIds.length > 0) {
            // 為每一晚都新增分配
            const newAssignments = allNightRoomIds.map(rid => ({
              room_id: rid,
              order_member_id: memberId,
            }))
            await insertRoomAssignments(newAssignments)
          }
        }
      }

      // 重新載入分房資料
      await loadRoomAssignments()
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.分配房間失敗, error)
    }
  }

  // 移除單一成員的房間分配（不影響室友）
  const removeMemberFromRoom = async (memberId: string, hotelName: string) => {
    if (!tourId) return

    try {
      // 找出該飯店所有晚的房間
      const { data: hotelRooms } = await supabase
        .from('tour_rooms')
        .select('id')
        .eq('tour_id', tourId)
        .eq('hotel_name', hotelName)

      if (!hotelRooms || hotelRooms.length === 0) return

      const hotelRoomIds = hotelRooms.map(r => r.id)

      // 只刪除該成員的分配（不影響室友）
      await supabase
        .from('tour_room_assignments')
        .delete()
        .eq('order_member_id', memberId)
        .in('room_id', hotelRoomIds)

      // 重新載入分房資料
      await loadRoomAssignments()
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.移除成員房間分配失敗, error)
    }
  }

  // 根據成員順序重新排列房間的 display_order
  // 當拖曳成員時呼叫此函數，讓房間順序跟著成員順序走
  const reorderRoomsByMembers = async (memberIds: string[]) => {
    if (!tourId) return

    try {
      // 取得所有房間資料
      const { data: rooms } = await supabase
        .from('tour_rooms')
        .select('id, hotel_name, night_number, display_order')
        .eq('tour_id', tourId)

      if (!rooms || rooms.length === 0) {
        await loadRoomAssignments()
        return
      }

      // 取得所有分配資料
      const { data: assignments } = await supabase
        .from('tour_room_assignments')
        .select('order_member_id, room_id')
        .in(
          'room_id',
          rooms.map(r => r.id)
        )

      if (!assignments || assignments.length === 0) {
        await loadRoomAssignments()
        return
      }

      // 找出每個飯店的第一晚（用於判斷 display_order）
      const firstNightByHotel: Record<string, number> = {}
      rooms.forEach(r => {
        if (
          r.hotel_name &&
          (!firstNightByHotel[r.hotel_name] || r.night_number < firstNightByHotel[r.hotel_name])
        ) {
          firstNightByHotel[r.hotel_name] = r.night_number
        }
      })

      // 建立 memberId -> 第一晚房間的對應
      const memberToFirstNightRoom: Record<
        string,
        { roomId: string; displayOrder: number; hotelName: string }
      > = {}
      assignments.forEach(a => {
        const room = rooms.find(r => r.id === a.room_id)
        if (
          room &&
          room.hotel_name &&
          room.night_number === firstNightByHotel[room.hotel_name] &&
          room.display_order !== null
        ) {
          memberToFirstNightRoom[a.order_member_id] = {
            roomId: room.id,
            displayOrder: room.display_order,
            hotelName: room.hotel_name,
          }
        }
      })

      // 根據新的成員順序，計算每個房間的新 display_order
      // 同一個房間（display_order 相同）只需要更新一次
      const roomUpdates: Array<{
        displayOrder: number
        newDisplayOrder: number
        hotelName: string
      }> = []
      const processedRooms = new Set<string>() // 用「hotelName-displayOrder」作為 key，避免重複

      let newOrder = 0
      memberIds.forEach(memberId => {
        const roomInfo = memberToFirstNightRoom[memberId]
        if (!roomInfo) return

        const roomKey = `${roomInfo.hotelName}-${roomInfo.displayOrder}`
        if (processedRooms.has(roomKey)) return // 同房的第二人，跳過

        processedRooms.add(roomKey)
        roomUpdates.push({
          displayOrder: roomInfo.displayOrder,
          newDisplayOrder: newOrder,
          hotelName: roomInfo.hotelName,
        })
        newOrder++
      })

      // 如果沒有需要更新的房間，直接重新載入
      if (roomUpdates.length === 0) {
        await loadRoomAssignments()
        return
      }

      // 批次更新房間的 display_order
      // 使用 +1000 偏移來避免衝突，不用負數
      // 先把所有房間的 display_order 改成偏移後的值
      for (const update of roomUpdates) {
        await supabase
          .from('tour_rooms')
          .update({ display_order: update.displayOrder + 10000 })
          .eq('tour_id', tourId)
          .eq('hotel_name', update.hotelName)
          .eq('display_order', update.displayOrder)
      }

      // 再改成新的 display_order
      for (const update of roomUpdates) {
        await supabase
          .from('tour_rooms')
          .update({ display_order: update.newDisplayOrder })
          .eq('tour_id', tourId)
          .eq('hotel_name', update.hotelName)
          .eq('display_order', update.displayOrder + 10000)
      }

      // 重新載入分房資料
      await loadRoomAssignments()
    } catch (error) {
      logger.error(COMP_ORDERS_LABELS.重新排列房間順序失敗, error)
      // 出錯時也要重新載入，確保 UI 狀態正確
      await loadRoomAssignments()
    }
  }

  // 自動載入分房分車資料
  useEffect(() => {
    if (tourId) {
      loadRoomAssignments()
      loadVehicleAssignments()
    }
  }, [tourId])

  return {
    showRoomManager,
    setShowRoomManager,
    showVehicleManager,
    setShowVehicleManager,
    showRoomColumn,
    setShowRoomColumn,
    showVehicleColumn,
    setShowVehicleColumn,
    roomAssignments,
    roomAssignmentsByHotel,
    roomIdByHotelMember,
    roomMembersByHotelRoom,
    hotelColumns,
    roomOptionsByHotel,
    roomSortKeys,
    vehicleAssignments,
    loadRoomAssignments,
    loadVehicleAssignments,
    assignMemberToRoom,
    removeMemberFromRoom,
    reorderRoomsByMembers,
  }
}
