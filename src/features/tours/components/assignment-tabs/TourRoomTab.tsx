'use client'

/**
 * TourRoomTab - 分房 Tab
 * 
 * 改進：從行程表讀取住宿資訊，合併連續住同一飯店的晚數成「區段」
 * 一次分房套用整個區段，自動帶入飯店名稱
 */

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createTourRoom, deleteTourRoom } from '@/data/entities/tour-rooms'
import { useAuthStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, X, Bed, Hotel } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/lib/ui/alert-dialog'
import { ROOM_TYPES } from '@/types/room-vehicle.types'
import type { TourRoomStatus } from '@/types/room-vehicle.types'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '@/features/orders/types/order-member.types'
import { COMP_TOURS_LABELS } from '../../constants/labels'
import { useAccommodationSegments, type AccommodationSegment } from '../../hooks/useAccommodationSegments'

type MemberBasic = Pick<OrderMember, 'id' | 'chinese_name' | 'passport_name'>

// 房型容量對照
const ROOM_CAPACITY: Record<string, number> = {
  single: 1,
  double: 2,
  twin: 2,
  triple: 3,
  quad: 4,
  suite: 2,
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

  const [newRoom, setNewRoom] = useState({
    room_type: 'twin',
    capacity: 2,
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

    try {
      // 為區段內的每一晚都創建房間
      for (const nightNumber of selectedSegment.nights) {
        const currentNightRooms = rooms.filter(r => r.night_number === nightNumber)

        await createTourRoom({
          tour_id: tourId,
          room_type: newRoom.room_type,
          capacity: newRoom.capacity,
          hotel_name: newRoom.hotel_name || selectedSegment.hotel_name || null,
          night_number: nightNumber,
          display_order: currentNightRooms.length,
        })
      }

      const nightsText = selectedSegment.night_count > 1 
        ? `第 ${selectedSegment.start_night}-${selectedSegment.end_night} 晚`
        : `第 ${selectedSegment.start_night} 晚`
      
      toast.success(`已為${nightsText}新增房間`)
      setShowAddRoom(false)
      setNewRoom({ room_type: 'twin', capacity: 2, hotel_name: selectedSegment.hotel_name || '' })
      loadRooms()
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
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.刪除房間失敗_2, error)
      toast.error(COMP_TOURS_LABELS.刪除房間失敗)
    }
  }

  // 當前區段的房間（取區段內第一晚的房間作為代表）
  const currentSegmentRooms = useMemo(() => {
    if (!selectedSegment) return []
    return rooms.filter(r => r.night_number === selectedSegment.start_night)
  }, [rooms, selectedSegment])

  const totalCapacity = currentSegmentRooms.reduce((sum, r) => sum + r.capacity, 0)
  const totalAssigned = currentSegmentRooms.reduce((sum, r) => sum + r.assigned_count, 0)

  // 格式化區段標籤
  const formatSegmentLabel = (segment: AccommodationSegment) => {
    const nightsText = segment.night_count > 1 
      ? `第 ${segment.start_night}-${segment.end_night} 晚`
      : `第 ${segment.start_night} 晚`
    
    const hotelText = segment.hotel_name 
      ? ` · ${segment.hotel_name.length > 15 ? segment.hotel_name.slice(0, 15) + '...' : segment.hotel_name}`
      : ''
    
    const roomCount = rooms.filter(r => r.night_number === segment.start_night).length
    
    return `${nightsText}${hotelText} (${roomCount}房)`
  }

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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddRoom(true)}
          className="ml-auto gap-1"
        >
          <Plus className="h-4 w-4" />
          {COMP_TOURS_LABELS.ADD_9831}
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

      {/* 房間列表 */}
      <div className="py-4 space-y-2 max-h-[350px] overflow-auto">
        {currentSegmentRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-morandi-muted">
            <Bed className="h-8 w-8 mb-2" />
            <p className="text-sm">{COMP_TOURS_LABELS.SETTINGS_4277}</p>
            <p className="text-xs mt-1">{COMP_TOURS_LABELS.ADD_2808}</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-morandi-muted mb-2">
              共 {currentSegmentRooms.length} 間房，容量 {totalCapacity} 人，已分配 {totalAssigned} 人
              {selectedSegment && selectedSegment.night_count > 1 && (
                <span className="ml-2 text-morandi-gold">
                  ✓ 已套用到第 {selectedSegment.start_night}-{selectedSegment.end_night} 晚
                </span>
              )}
            </div>
            {currentSegmentRooms.map((room, index) => {
              const roomTypeLabel =
                ROOM_TYPES.find(t => t.value === room.room_type)?.label || room.room_type
              return (
                <div
                  key={room.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    room.is_full
                      ? 'border-morandi-green bg-morandi-green/5'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-morandi-primary">
                      {roomTypeLabel} {index + 1}
                    </span>
                    {room.hotel_name && (
                      <span className="text-xs text-morandi-muted">{room.hotel_name}</span>
                    )}
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
              )
            })}
          </>
        )}
      </div>

      {/* 新增房間 Dialog */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent level={3} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-morandi-primary">
              <Plus className="h-5 w-5 text-morandi-gold" />
              新增房間
              {selectedSegment && (
                <span className="text-sm font-normal text-morandi-muted">
                  （{selectedSegment.night_count > 1 
                    ? `第${selectedSegment.start_night}-${selectedSegment.end_night}晚，共${selectedSegment.night_count}晚`
                    : `第${selectedSegment.start_night}晚`
                  }）
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSegment && selectedSegment.night_count > 1 && (
              <div className="px-3 py-2 bg-morandi-gold/10 rounded-lg text-sm text-morandi-gold">
                💡 將為這 {selectedSegment.night_count} 晚同時新增房間
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_9}</Label>
                <Select
                  value={newRoom.room_type}
                  onValueChange={value => {
                    setNewRoom({
                      ...newRoom,
                      room_type: value,
                      capacity: ROOM_CAPACITY[value] || 2,
                    })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_7871}</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={newRoom.capacity}
                  onChange={e =>
                    setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 2 })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_5734}</Label>
              <Input
                value={newRoom.hotel_name}
                onChange={e => setNewRoom({ ...newRoom, hotel_name: e.target.value })}
                placeholder={selectedSegment?.hotel_name || COMP_TOURS_LABELS.例如_清邁香格里拉}
              />
              {selectedSegment?.hotel_name && newRoom.hotel_name !== selectedSegment.hotel_name && (
                <p className="text-xs text-morandi-muted">
                  行程表飯店：{selectedSegment.hotel_name}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowAddRoom(false)} className="gap-2">
                <X size={16} />
                {COMP_TOURS_LABELS.取消}
              </Button>
              <Button onClick={handleAddRoom} className="gap-2">
                <Plus size={16} />
                {COMP_TOURS_LABELS.ADD}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
