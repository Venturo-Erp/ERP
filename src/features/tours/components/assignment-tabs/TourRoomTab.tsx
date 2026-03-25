'use client'

/**
 * TourRoomTab - 分房 Tab
 * 
 * 功能：
 * - 從行程表讀取住宿區段
 * - 房型自由文字輸入（可選常用或自己打）
 * - 一次新增多間同類型房間
 * - 同步到行程表的 room_details
 */

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createTourRoom, deleteTourRoom } from '@/data/entities/tour-rooms'
import { useAuthStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, X, Bed, Hotel, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/lib/ui/alert-dialog'
import type { TourRoomStatus } from '@/types/room-vehicle.types'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '@/features/orders/types/order-member.types'
import { COMP_TOURS_LABELS } from '../../constants/labels'
import { useAccommodationSegments, type AccommodationSegment } from '../../hooks/useAccommodationSegments'

type MemberBasic = Pick<OrderMember, 'id' | 'chinese_name' | 'passport_name'>

// 常用房型選項（可自由輸入其他）
const COMMON_ROOM_TYPES = [
  { value: '標準雙人房', label: '標準雙人房', capacity: 2 },
  { value: '豪華雙人房', label: '豪華雙人房', capacity: 2 },
  { value: '標準單人房', label: '標準單人房', capacity: 1 },
  { value: '標準三人房', label: '標準三人房', capacity: 3 },
  { value: '標準四人房', label: '標準四人房', capacity: 4 },
  { value: '和室四人房', label: '和室四人房', capacity: 4 },
  { value: '家庭房', label: '家庭房', capacity: 4 },
  { value: '套房', label: '套房', capacity: 2 },
]

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

export function TourRoomTab({ tourId, tour, members, tourNights }: TourRoomTabProps) {
  const user = useAuthStore(state => state.user)
  const [rooms, setRooms] = useState<TourRoomStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

  // 從行程表讀取住宿區段
  const { segments, loading: segmentsLoading } = useAccommodationSegments(tourId)

  // 新增房間表單
  const [newRoom, setNewRoom] = useState({
    room_type: '',
    capacity: 2,
    quantity: 1, // 新增：數量
    hotel_name: '',
  })

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

  // 當選中區段變化時，自動帶入飯店名稱
  useEffect(() => {
    if (selectedSegment?.hotel_name) {
      setNewRoom(prev => ({ ...prev, hotel_name: selectedSegment.hotel_name }))
    }
  }, [selectedSegment])

  useEffect(() => {
    loadRooms()
  }, [tourId])

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

  const handleAddRoom = async () => {
    if (!selectedSegment) {
      toast.error('請先選擇住宿區段')
      return
    }

    if (!newRoom.room_type.trim()) {
      toast.error('請輸入房型名稱')
      return
    }

    if (newRoom.quantity < 1) {
      toast.error('數量至少為 1')
      return
    }

    try {
      // 為區段內的每一晚、每個數量都創建房間
      for (const nightNumber of selectedSegment.nights) {
        const currentNightRooms = rooms.filter(r => r.night_number === nightNumber)
        
        for (let i = 0; i < newRoom.quantity; i++) {
          await createTourRoom({
            tour_id: tourId,
            room_type: newRoom.room_type.trim(),
            capacity: newRoom.capacity,
            hotel_name: newRoom.hotel_name || selectedSegment.hotel_name || null,
            night_number: nightNumber,
            display_order: currentNightRooms.length + i,
          })
        }
      }

      const nightsText = selectedSegment.night_count > 1 
        ? `第 ${selectedSegment.start_night}-${selectedSegment.end_night} 晚`
        : `第 ${selectedSegment.start_night} 晚`
      
      const qtyText = newRoom.quantity > 1 ? ` ×${newRoom.quantity}` : ''
      
      toast.success(`已為${nightsText}新增「${newRoom.room_type}」${qtyText}`)
      setShowAddRoom(false)
      setNewRoom({ 
        room_type: '', 
        capacity: 2, 
        quantity: 1,
        hotel_name: selectedSegment.hotel_name || '' 
      })
      loadRooms()
      
      // 同步到行程表
      await syncRoomDetailsToItinerary()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      logger.error(COMP_TOURS_LABELS.新增房間失敗_2, { error, tourId, newRoom, errorMessage })
      toast.error(`${COMP_TOURS_LABELS.新增房間失敗}: ${errorMessage}`)
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    const confirmed = await confirm(COMP_TOURS_LABELS.確定要刪除這個房間嗎, {
      title: COMP_TOURS_LABELS.刪除房間,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteTourRoom(roomId)
      toast.success(COMP_TOURS_LABELS.房間已刪除)
      loadRooms()
      
      // 同步到行程表
      await syncRoomDetailsToItinerary()
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.刪除房間失敗_2, error)
      toast.error(COMP_TOURS_LABELS.刪除房間失敗)
    }
  }

  // 同步房間統計到行程表
  const syncRoomDetailsToItinerary = async () => {
    if (!selectedSegment) return
    
    try {
      // 取得最新房間資料
      const { data: latestRooms } = await supabase
        .from('tour_rooms')
        .select('room_type, capacity, night_number')
        .eq('tour_id', tourId)
        .in('night_number', selectedSegment.nights)
      
      if (!latestRooms) return
      
      // 統計各房型數量（只統計第一晚，因為區段內每晚相同）
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
      
      // 更新行程表（區段內每天的住宿項目）
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

  // 當前區段的房間統計
  const currentSegmentRooms = useMemo(() => {
    if (!selectedSegment) return []
    return rooms.filter(r => r.night_number === selectedSegment.start_night)
  }, [rooms, selectedSegment])

  // 按房型分組統計
  const roomTypeStats = useMemo(() => {
    const stats: Record<string, { type: string; count: number; capacity: number; rooms: TourRoomStatus[] }> = {}
    for (const room of currentSegmentRooms) {
      const key = room.room_type
      if (!stats[key]) {
        stats[key] = { type: room.room_type, count: 0, capacity: room.capacity, rooms: [] }
      }
      stats[key].count++
      stats[key].rooms.push(room)
    }
    return Object.values(stats)
  }, [currentSegmentRooms])

  const totalCapacity = currentSegmentRooms.reduce((sum, r) => sum + r.capacity, 0)
  const totalAssigned = currentSegmentRooms.reduce((sum, r) => sum + r.assigned_count, 0)

  // 格式化區段標籤
  const formatSegmentLabel = (segment: AccommodationSegment) => {
    const nightsText = segment.night_count > 1 
      ? `第${segment.start_night}-${segment.end_night}晚`
      : `第${segment.start_night}晚`
    return nightsText
  }

  // 房型選項（供 Combobox 使用）
  const roomTypeOptions = COMMON_ROOM_TYPES.map(t => ({
    value: t.value,
    label: t.label,
  }))

  return (
    <>
      {/* 區段選擇 */}
      <div className="flex items-center gap-2 pb-3 border-b border-border flex-wrap">
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
              {segment.hotel_name && <Hotel className="h-3.5 w-3.5" />}
              <span>{formatSegmentLabel(segment)}</span>
              <span className="text-xs opacity-70">({roomCount}房)</span>
            </button>
          )
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddRoom(true)}
          className="ml-auto gap-1"
        >
          <Plus className="h-4 w-4" />
          新增房型
        </Button>
      </div>

      {/* 當前區段資訊 */}
      {selectedSegment?.hotel_name && (
        <div className="mt-3 px-3 py-2 bg-morandi-container/30 rounded-lg flex items-center gap-2 text-sm">
          <Hotel className="h-4 w-4 text-morandi-gold" />
          <span className="text-morandi-primary font-medium">{selectedSegment.hotel_name}</span>
          {selectedSegment.night_count > 1 && (
            <span className="text-morandi-muted">（連續 {selectedSegment.night_count} 晚）</span>
          )}
        </div>
      )}

      {/* 房型統計列表 */}
      <div className="py-4 space-y-3 max-h-[350px] overflow-auto">
        {roomTypeStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-morandi-muted">
            <Bed className="h-8 w-8 mb-2" />
            <p className="text-sm">{COMP_TOURS_LABELS.SETTINGS_4277}</p>
            <p className="text-xs mt-1">點擊「新增房型」開始分配</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-morandi-muted mb-2">
              共 {currentSegmentRooms.length} 間房，容量 {totalCapacity} 人，已分配 {totalAssigned} 人
              {selectedSegment && selectedSegment.night_count > 1 && (
                <span className="ml-2 text-morandi-gold">
                  ✓ 套用到第 {selectedSegment.start_night}-{selectedSegment.end_night} 晚
                </span>
              )}
            </div>
            
            {roomTypeStats.map(stat => (
              <div key={stat.type} className="border rounded-lg overflow-hidden">
                {/* 房型標題 */}
                <div className="flex items-center justify-between px-3 py-2 bg-morandi-container/20">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-morandi-primary">{stat.type}</span>
                    <span className="text-xs text-morandi-muted">（{stat.capacity}人房）</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-gold/10 text-morandi-gold">
                      ×{stat.count}
                    </span>
                  </div>
                </div>
                
                {/* 房間列表 */}
                <div className="divide-y divide-border/50">
                  {stat.rooms.map((room, index) => (
                    <div
                      key={room.id}
                      className={cn(
                        'flex items-center justify-between px-3 py-2',
                        room.is_full ? 'bg-morandi-green/5' : 'bg-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-morandi-secondary">
                          #{index + 1}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            room.is_full
                              ? 'bg-morandi-green/10 text-morandi-green'
                              : 'bg-morandi-container text-morandi-secondary'
                          )}
                        >
                          {room.assigned_count}/{room.capacity} 人
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-morandi-muted hover:text-morandi-red"
                        onClick={() => handleDeleteRoom(room.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 新增房型 Dialog */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent level={3} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-morandi-primary">
              <Plus className="h-5 w-5 text-morandi-gold" />
              新增房型
              {selectedSegment && (
                <span className="text-sm font-normal text-morandi-muted">
                  （{selectedSegment.night_count > 1 
                    ? `第${selectedSegment.start_night}-${selectedSegment.end_night}晚`
                    : `第${selectedSegment.start_night}晚`
                  }）
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSegment && selectedSegment.night_count > 1 && (
              <div className="px-3 py-2 bg-morandi-gold/10 rounded-lg text-sm text-morandi-gold">
                💡 將為這 {selectedSegment.night_count} 晚同時新增
              </div>
            )}
            
            {/* 房型名稱 */}
            <div className="space-y-1.5">
              <Label className="text-morandi-primary">房型名稱</Label>
              <Combobox
                options={roomTypeOptions}
                value={newRoom.room_type}
                onChange={value => {
                  const preset = COMMON_ROOM_TYPES.find(t => t.value === value)
                  setNewRoom({
                    ...newRoom,
                    room_type: value,
                    capacity: preset?.capacity || guessCapacity(value),
                  })
                }}
                placeholder="選擇或輸入房型..."
                className="w-full"
                showSearchIcon={false}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* 每房容量 */}
              <div className="space-y-1.5">
                <Label className="text-morandi-primary">每房容量</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newRoom.capacity}
                  onChange={e =>
                    setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 2 })
                  }
                  className="text-center"
                />
              </div>
              
              {/* 數量 */}
              <div className="space-y-1.5">
                <Label className="text-morandi-primary">數量（間）</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={newRoom.quantity}
                  onChange={e =>
                    setNewRoom({ ...newRoom, quantity: parseInt(e.target.value) || 1 })
                  }
                  className="text-center"
                />
              </div>
            </div>
            
            {/* 飯店名稱 */}
            <div className="space-y-1.5">
              <Label className="text-morandi-primary">飯店名稱</Label>
              <Input
                value={newRoom.hotel_name}
                onChange={e => setNewRoom({ ...newRoom, hotel_name: e.target.value })}
                placeholder={selectedSegment?.hotel_name || '輸入飯店名稱'}
              />
              {selectedSegment?.hotel_name && newRoom.hotel_name !== selectedSegment.hotel_name && (
                <p className="text-xs text-morandi-muted">
                  行程表飯店：{selectedSegment.hotel_name}
                </p>
              )}
            </div>
            
            {/* 預覽 */}
            {newRoom.room_type && (
              <div className="px-3 py-2 bg-morandi-container/30 rounded-lg text-sm">
                將新增：<span className="font-medium">{newRoom.room_type}</span> ×{newRoom.quantity} 間
                {selectedSegment && selectedSegment.night_count > 1 && (
                  <span className="text-morandi-muted">
                    （共 {newRoom.quantity * selectedSegment.night_count} 間房記錄）
                  </span>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowAddRoom(false)} className="gap-2">
                <X size={16} />
                取消
              </Button>
              <Button onClick={handleAddRoom} className="gap-2">
                <Plus size={16} />
                新增
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
