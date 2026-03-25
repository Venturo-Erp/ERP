'use client'

/**
 * TourRoomTab - 分房 Tab
 * 
 * 功能：
 * - 從行程表讀取住宿區段
 * - 簡單列表輸入：房型名稱 + 數量
 * - 同步到行程表的 room_details
 */

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createTourRoom, deleteTourRoom } from '@/data/entities/tour-rooms'
import { useAuthStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Bed, Hotel, Save } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/lib/ui/alert-dialog'
import type { TourRoomStatus } from '@/types/room-vehicle.types'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '@/features/orders/types/order-member.types'
import { COMP_TOURS_LABELS } from '../../constants/labels'
import { useAccommodationSegments, type AccommodationSegment } from '../../hooks/useAccommodationSegments'

type MemberBasic = Pick<OrderMember, 'id' | 'chinese_name' | 'passport_name'>

// 根據房型名稱猜測容量
function guessCapacity(roomType: string): number {
  const lower = roomType.toLowerCase()
  if (lower.includes('單人') || lower.includes('single')) return 1
  if (lower.includes('三人') || lower.includes('triple')) return 3
  if (lower.includes('四人') || lower.includes('quad') || lower.includes('家庭')) return 4
  if (lower.includes('五人')) return 5
  if (lower.includes('六人')) return 6
  return 2 // 預設雙人
}

interface TourInfo {
  id: string
  departure_date: string
  return_date: string
}

interface TourRoomTabProps {
  tourId: string
  tour?: TourInfo
  members: MemberBasic[]
  tourNights: number
}

// 房型輸入行
interface RoomTypeRow {
  id: string
  room_type: string
  quantity: number
  capacity: number
}

export function TourRoomTab({ tourId, tour, members, tourNights }: TourRoomTabProps) {
  const user = useAuthStore(state => state.user)
  const [rooms, setRooms] = useState<TourRoomStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

  // 從行程表讀取住宿區段
  const { segments, loading: segmentsLoading } = useAccommodationSegments(tourId)

  // 房型輸入列表
  const [roomTypeRows, setRoomTypeRows] = useState<RoomTypeRow[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // 選中的區段
  const selectedSegment = useMemo(() => 
    segments.find(s => s.id === selectedSegmentId) || segments[0] || null,
    [segments, selectedSegmentId]
  )

  // 如果沒有區段（行程表沒有住宿），fallback 到按晚數
  const fallbackNights = useMemo(() => {
    if (segments.length > 0) return []
    return Array.from({ length: Math.max(tourNights, 1) }, (_, i) => ({
      id: `night-${i + 1}`,
      hotel_name: '',
      start_night: i + 1,
      end_night: i + 1,
      nights: [i + 1],
      night_count: 1,
    } as AccommodationSegment))
  }, [segments, tourNights])

  const effectiveSegments = segments.length > 0 ? segments : fallbackNights

  // 初始化選中的區段
  useEffect(() => {
    if (effectiveSegments.length > 0 && !selectedSegmentId) {
      setSelectedSegmentId(effectiveSegments[0].id)
    }
  }, [effectiveSegments, selectedSegmentId])

  useEffect(() => {
    loadRooms()
  }, [tourId])

  // 當區段或房間變化時，重建輸入列表
  useEffect(() => {
    if (!selectedSegment) return
    
    // 從現有房間統計出房型列表
    const segmentRooms = rooms.filter(r => r.night_number === selectedSegment.start_night)
    const stats: Record<string, RoomTypeRow> = {}
    
    for (const room of segmentRooms) {
      const key = room.room_type
      if (!stats[key]) {
        stats[key] = {
          id: `existing-${key}`,
          room_type: room.room_type,
          quantity: 0,
          capacity: room.capacity,
        }
      }
      stats[key].quantity++
    }
    
    const rows = Object.values(stats)
    // 如果沒有任何房型，加一個空行
    if (rows.length === 0) {
      rows.push({ id: 'new-1', room_type: '', quantity: 0, capacity: 2 })
    }
    
    setRoomTypeRows(rows)
    setHasChanges(false)
  }, [rooms, selectedSegment])

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('tour_rooms_status')
        .select('*')
        .eq('tour_id', tourId)
        .order('night_number')
        .order('display_order')
        .limit(500)

      if (error) throw error
      setRooms((data || []) as TourRoomStatus[])
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.載入房間失敗, error)
    } finally {
      setLoading(false)
    }
  }

  // 更新行
  const updateRow = (id: string, field: keyof RoomTypeRow, value: string | number) => {
    setRoomTypeRows(prev => prev.map(row => {
      if (row.id !== id) return row
      
      const updated = { ...row, [field]: value }
      
      // 如果更新房型名稱，自動猜測容量
      if (field === 'room_type' && typeof value === 'string') {
        updated.capacity = guessCapacity(value)
      }
      
      return updated
    }))
    setHasChanges(true)
  }

  // 新增行
  const addRow = () => {
    setRoomTypeRows(prev => [
      ...prev,
      { id: `new-${Date.now()}`, room_type: '', quantity: 0, capacity: 2 }
    ])
  }

  // 刪除行
  const removeRow = (id: string) => {
    setRoomTypeRows(prev => prev.filter(row => row.id !== id))
    setHasChanges(true)
  }

  // 儲存變更
  const handleSave = async () => {
    if (!selectedSegment) return
    
    // 過濾掉空的行
    const validRows = roomTypeRows.filter(row => row.room_type.trim() && row.quantity > 0)
    
    setSaving(true)
    try {
      // 取得目前區段的所有房間
      const { data: existingRooms } = await supabase
        .from('tour_rooms')
        .select('id, room_type, night_number')
        .eq('tour_id', tourId)
        .in('night_number', selectedSegment.nights)
      
      // 統計目前各房型數量（只看第一晚）
      const existingStats: Record<string, string[]> = {} // room_type -> [room_ids]
      for (const room of (existingRooms || [])) {
        if (room.night_number !== selectedSegment.start_night) continue
        if (!existingStats[room.room_type]) {
          existingStats[room.room_type] = []
        }
        existingStats[room.room_type].push(room.id)
      }
      
      // 計算需要新增和刪除的
      for (const row of validRows) {
        const existingCount = existingStats[row.room_type]?.length || 0
        const targetCount = row.quantity
        
        if (targetCount > existingCount) {
          // 需要新增
          const toAdd = targetCount - existingCount
          for (let i = 0; i < toAdd; i++) {
            for (const nightNumber of selectedSegment.nights) {
              await createTourRoom({
                tour_id: tourId,
                room_type: row.room_type.trim(),
                capacity: row.capacity,
                hotel_name: selectedSegment.hotel_name || null,
                night_number: nightNumber,
                display_order: existingCount + i,
              })
            }
          }
        } else if (targetCount < existingCount) {
          // 需要刪除（從後面開始刪）
          const toDelete = existingCount - targetCount
          const idsToDelete = existingStats[row.room_type].slice(-toDelete)
          
          // 刪除所有晚數對應的房間
          for (const nightNumber of selectedSegment.nights) {
            const { data: roomsToDelete } = await supabase
              .from('tour_rooms')
              .select('id')
              .eq('tour_id', tourId)
              .eq('room_type', row.room_type)
              .eq('night_number', nightNumber)
              .order('display_order', { ascending: false })
              .limit(toDelete)
            
            for (const room of (roomsToDelete || [])) {
              await deleteTourRoom(room.id)
            }
          }
        }
        
        // 從 existingStats 移除已處理的
        delete existingStats[row.room_type]
      }
      
      // 刪除不在列表中的房型
      for (const [roomType, roomIds] of Object.entries(existingStats)) {
        for (const nightNumber of selectedSegment.nights) {
          const { data: roomsToDelete } = await supabase
            .from('tour_rooms')
            .select('id')
            .eq('tour_id', tourId)
            .eq('room_type', roomType)
            .eq('night_number', nightNumber)
          
          for (const room of (roomsToDelete || [])) {
            await deleteTourRoom(room.id)
          }
        }
      }
      
      toast.success('房型已儲存')
      setHasChanges(false)
      await loadRooms()
      await syncRoomDetailsToItinerary()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      logger.error('儲存房型失敗', { error, errorMessage })
      toast.error(`儲存失敗: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  // 同步房間統計到行程表
  const syncRoomDetailsToItinerary = async () => {
    if (!selectedSegment) return
    
    try {
      const { data: latestRooms } = await supabase
        .from('tour_rooms')
        .select('room_type, capacity, night_number')
        .eq('tour_id', tourId)
        .in('night_number', selectedSegment.nights)
      
      if (!latestRooms) return
      
      const firstNightRooms = latestRooms.filter(r => r.night_number === selectedSegment.start_night)
      const roomCounts: Record<string, { type: string; capacity: number; count: number }> = {}
      
      for (const room of firstNightRooms) {
        const key = room.room_type
        if (!roomCounts[key]) {
          roomCounts[key] = { type: room.room_type, capacity: room.capacity, count: 0 }
        }
        roomCounts[key].count++
      }
      
      const roomDetails = Object.values(roomCounts).map(r => ({
        type: r.type,
        capacity: r.capacity,
        quantity: r.count,
      }))
      
      for (const nightNumber of selectedSegment.nights) {
        await supabase
          .from('tour_itinerary_items')
          .update({ room_details: roomDetails })
          .eq('tour_id', tourId)
          .eq('category', 'accommodation')
          .eq('day_number', nightNumber)
      }
    } catch (error) {
      logger.error('同步房間到行程表失敗', error)
    }
  }

  // 當前區段的房間
  const currentSegmentRooms = useMemo(() => {
    if (!selectedSegment) return []
    return rooms.filter(r => r.night_number === selectedSegment.start_night)
  }, [rooms, selectedSegment])

  const totalCapacity = currentSegmentRooms.reduce((sum, r) => sum + r.capacity, 0)
  const totalAssigned = currentSegmentRooms.reduce((sum, r) => sum + r.assigned_count, 0)
  const totalRooms = currentSegmentRooms.length

  return (
    <>
      {/* 區段選擇 + 飯店名稱 */}
      <div className="pb-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {effectiveSegments.map(segment => {
            const isSelected = selectedSegmentId === segment.id
            const roomCount = rooms.filter(r => r.night_number === segment.start_night).length
            
            return (
              <button
                key={segment.id}
                onClick={() => setSelectedSegmentId(segment.id)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm transition-all border flex items-center gap-1.5',
                  isSelected
                    ? 'border-morandi-gold bg-morandi-gold/10 text-morandi-gold'
                    : 'border-border text-morandi-secondary hover:border-morandi-gold'
                )}
              >
                <span>
                  {segment.night_count > 1 
                    ? `第${segment.start_night}-${segment.end_night}晚`
                    : `第${segment.start_night}晚`
                  }
                </span>
                <span className="text-xs opacity-70">({roomCount}房)</span>
              </button>
            )
          })}
        </div>
        
        {/* 飯店名稱（從行程表引用） */}
        {selectedSegment?.hotel_name && (
          <div className="flex items-center gap-2 text-sm text-morandi-primary">
            <Hotel className="h-4 w-4 text-morandi-gold" />
            <span className="font-medium">{selectedSegment.hotel_name}</span>
          </div>
        )}
      </div>

      {/* 房型輸入列表 */}
      <div className="py-4 space-y-2">
        {/* 表頭 */}
        <div className="grid grid-cols-[1fr_80px_80px_40px] gap-2 px-2 text-xs text-morandi-muted">
          <span>房型名稱</span>
          <span className="text-center">幾人房</span>
          <span className="text-center">數量</span>
          <span></span>
        </div>
        
        {/* 輸入行 */}
        {roomTypeRows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-[1fr_80px_80px_40px] gap-2 items-center">
            <Input
              value={row.room_type}
              onChange={e => updateRow(row.id, 'room_type', e.target.value)}
              placeholder="標準雙人房..."
              className="h-9"
            />
            <Input
              type="number"
              min={1}
              max={10}
              value={row.capacity || ''}
              onChange={e => updateRow(row.id, 'capacity', parseInt(e.target.value) || 2)}
              placeholder="2"
              className="h-9 text-center"
            />
            <Input
              type="number"
              min={0}
              value={row.quantity || ''}
              onChange={e => updateRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
              placeholder="0"
              className="h-9 text-center"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-morandi-muted hover:text-morandi-red"
              onClick={() => removeRow(row.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {/* 新增行按鈕 */}
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          className="w-full mt-2 gap-1 text-morandi-muted"
        >
          <Plus className="h-4 w-4" />
          新增房型
        </Button>
      </div>

      {/* 統計與儲存 */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="text-sm text-morandi-muted">
          {totalRooms > 0 ? (
            <>
              共 {totalRooms} 間房，容量 {totalCapacity} 人
              {totalAssigned > 0 && `，已分配 ${totalAssigned} 人`}
            </>
          ) : (
            '尚未設定房型'
          )}
        </div>
        
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-1"
        >
          <Save className="h-4 w-4" />
          {saving ? '儲存中...' : '儲存'}
        </Button>
      </div>
    </>
  )
}
