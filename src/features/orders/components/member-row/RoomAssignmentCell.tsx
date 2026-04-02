'use client'

/**
 * RoomAssignmentCell - 分房欄位組件
 *
 * 未分配時：顯示下拉選單選擇房間
 * 已分配時：顯示房間名稱，點擊開啟 Popover 查看/管理室友
 */

import React, { useState, useMemo } from 'react'
import { X, Plus, Bed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { RoomOption, RoomMemberInfo } from '../../hooks/useRoomVehicleAssignments'
import { COMP_ORDERS_LABELS } from '../../constants/labels'

interface RoomAssignmentCellProps {
  memberId: string
  memberName: string
  memberBirthDate?: string | null
  hotelId: string
  hotelName: string
  currentRoomId: string
  currentRoomLabel: string // 目前顯示的房間標籤（如 COMP_ORDERS_LABELS.雙床1）
  roomOptions: RoomOption[]
  roomMembers: RoomMemberInfo[] // 同房成員列表
  rowSpan?: number
  onAssign: (
    memberId: string,
    hotelName: string,
    roomId: string | null,
    memberBirthDate?: string | null
  ) => void
  onRemoveMember?: (memberId: string, hotelName: string) => void // 移除單一成員
  departureDate?: string | null
}

export function RoomAssignmentCell({
  memberId,
  memberName,
  memberBirthDate,
  hotelId,
  hotelName,
  currentRoomId,
  currentRoomLabel,
  roomOptions,
  roomMembers,
  rowSpan,
  onAssign,
  onRemoveMember,
  departureDate,
}: RoomAssignmentCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showAddDropdown, setShowAddDropdown] = useState(false)

  // 未分配的成員（可以加入此房間）
  // 注意：這裡需要從外部傳入，暫時留空
  const isAssigned = !!currentRoomId

  // 處理選擇房間（未分配狀態）
  const handleSelectRoom = (roomId: string) => {
    onAssign(memberId, hotelName, roomId || null, memberBirthDate)
  }

  // 處理移除成員
  const handleRemoveMember = (targetMemberId: string) => {
    if (onRemoveMember) {
      onRemoveMember(targetMemberId, hotelName)
    }
    // 如果移除的是自己，關閉 popover
    if (targetMemberId === memberId) {
      setIsOpen(false)
    }
  }

  // 取得房間資訊
  const currentRoom = useMemo(() => {
    return roomOptions.find(r => r.id === currentRoomId)
  }, [roomOptions, currentRoomId])

  // 未分配：顯示下拉選單
  if (!isAssigned) {
    return (
      <td
        className="border border-morandi-gold/20 px-1 py-1 bg-morandi-green/10/50 text-xs align-middle"
        rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
      >
        <select
          value=""
          onChange={e => handleSelectRoom(e.target.value)}
          className="w-full h-6 bg-transparent border-none outline-none text-xs text-morandi-secondary cursor-pointer"
        >
          <option value="">{COMP_ORDERS_LABELS.LABEL_322}</option>
          {roomOptions.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
    )
  }

  // 已分配：顯示房間名稱，點擊開啟 Popover
  return (
    <td
      className="border border-morandi-gold/20 px-1 py-1 bg-morandi-green/10/50 text-xs align-middle"
      rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full h-6 text-left px-1 rounded hover:bg-morandi-green/10 transition-colors',
              'text-morandi-primary cursor-pointer'
            )}
          >
            {currentRoomLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start" side="bottom">
          {/* 房間標題 */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
            <Bed className="h-4 w-4 text-morandi-gold" />
            <span className="font-medium text-sm text-morandi-primary">
              {currentRoom?.roomType || ''} {currentRoom?.roomNumber || ''}
            </span>
            <span className="text-xs text-morandi-muted ml-auto">
              {roomMembers.length}/{currentRoom?.capacity || 0} 人
            </span>
          </div>

          {/* 成員列表 */}
          <div className="py-1">
            {roomMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50"
              >
                <span
                  className={cn(
                    'text-sm',
                    member.isChild ? 'text-morandi-muted' : 'text-morandi-primary'
                  )}
                >
                  {member.name}
                  {member.isChild && <span className="ml-1 text-xs text-status-warning">(不佔床)</span>}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1 rounded hover:bg-morandi-red/10 text-morandi-muted hover:text-morandi-red transition-colors"
                  title={COMP_ORDERS_LABELS.移除此成員}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* 新增成員下拉選單 */}
          {currentRoom && roomMembers.length < currentRoom.capacity && (
            <div className="px-3 py-2 border-t border-border">
              {showAddDropdown ? (
                <select
                  autoFocus
                  className="w-full h-7 text-xs border border-border rounded px-2 bg-card"
                  onChange={e => {
                    if (e.target.value) {
                      onAssign(e.target.value, hotelName, currentRoomId, null)
                      setShowAddDropdown(false)
                    }
                  }}
                  onBlur={() => setShowAddDropdown(false)}
                >
                  <option value="">{COMP_ORDERS_LABELS.SELECT_6914}</option>
                  {/* 這裡需要從外部傳入未分配成員列表 */}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddDropdown(true)}
                  className="flex items-center gap-1.5 text-xs text-morandi-secondary hover:text-morandi-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {COMP_ORDERS_LABELS.新增成員}
                </button>
              )}
            </div>
          )}

          {/* 換房選項 */}
          <div className="px-3 py-2 border-t border-border">
            <select
              value={currentRoomId}
              onChange={e => {
                handleSelectRoom(e.target.value)
                setIsOpen(false)
              }}
              className="w-full h-7 text-xs border border-border rounded px-2 bg-card"
            >
              <option value="">{COMP_ORDERS_LABELS.LABEL_3431}</option>
              {roomOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </PopoverContent>
      </Popover>
    </td>
  )
}
