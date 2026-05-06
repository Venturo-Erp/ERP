'use client'
/**
 * MemberRow - 成員行元件
 * 從 OrderMembersExpandable.tsx 拆分出來
 *
 * 功能：
 * - 顯示單個成員的所有資訊
 * - 支援編輯模式（行內編輯）
 * - 支援團體模式額外欄位
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Check, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { OrderMember, CustomCostField } from '../types/order-member.types'
import type { ColumnVisibility } from './OrderMembersExpandable'
import type { MemberSurcharges } from '../types/member-surcharge.types'
import {
  MemberBasicInfo,
  MemberPassportInfo,
  MemberActions,
  MemberSurchargeCell,
} from './member-row'

import type { HotelColumn, RoomOption, RoomMemberInfo } from '../hooks/useRoomVehicleAssignments'
import { RoomAssignmentCell } from './member-row/RoomAssignmentCell'
import { ORDERS_LABELS } from './constants/labels'

interface MemberRowProps {
  member: OrderMember
  index: number
  isEditMode: boolean
  showPnrColumn: boolean
  showRoomColumn: boolean
  showVehicleColumn: boolean
  showOrderCode: boolean
  departureDate: string | null
  roomAssignment?: string
  vehicleAssignment?: string
  roomRowSpan?: number // 分房欄位合併行數（0 表示被上方合併，不渲染）
  vehicleRowSpan?: number // 分車欄位合併行數
  hotelColumns?: HotelColumn[] // 飯店欄位列表
  roomAssignmentsByHotel?: Record<string, Record<string, string>> // 按飯店分組的分房
  roomIdByHotelMember?: Record<string, Record<string, string>> // hotelName -> memberId -> roomId
  roomMembersByHotelRoom?: Record<string, Record<string, RoomMemberInfo[]>> // hotelName -> roomId -> 成員列表
  roomOptionsByHotel?: Record<string, RoomOption[]> // 每個飯店的房間選項
  roomRowSpansByHotel?: Record<string, Record<string, number>> // 按飯店的合併行數: hotelId -> memberId -> rowSpan
  pnrValue?: string
  customCostFields: CustomCostField[]
  mode: 'order' | 'tour'
  columnVisibility?: ColumnVisibility
  onUpdateField: (memberId: string, field: keyof OrderMember, value: string | number | null) => void
  onDelete: (memberId: string) => void
  onEdit: (member: OrderMember, mode: 'verify' | 'edit') => void
  onPreview: (member: OrderMember) => void
  onPnrChange: (memberId: string, value: string) => void
  onCustomCostChange: (fieldId: string, memberId: string, value: string) => void
  onSurchargeChange?: (memberId: string, surcharges: MemberSurcharges) => void // 附加費用變更
  onKeyDown: (e: React.KeyboardEvent, memberIndex: number, field: string) => void
  onPaste?: (e: React.ClipboardEvent, memberIndex: number, field: string) => void
  onNameSearch?: (memberId: string, value: string) => void
  onIdNumberSearch?: (memberId: string, value: string, memberIndex: number) => void
  onRoomAssign?: (
    memberId: string,
    hotelName: string,
    roomId: string | null,
    memberBirthDate?: string | null
  ) => void
  onRemoveMemberFromRoom?: (memberId: string, hotelName: string) => void // 移除單一成員（不影響室友）
  /** 快速辦簽證用 */
  tourInfo?: { id: string; code: string; name?: string }
  getOrderInfo?: (memberId: string) =>
    | {
        id: string
        order_number: string
        contact_person?: string | null
        contact_phone?: string | null
      }
    | undefined
}

export function MemberRow({
  member,
  index,
  isEditMode,
  showPnrColumn,
  showRoomColumn,
  showVehicleColumn,
  showOrderCode,
  departureDate,
  roomAssignment,
  vehicleAssignment,
  roomRowSpan,
  vehicleRowSpan,
  hotelColumns = [],
  roomAssignmentsByHotel = {},
  roomRowSpansByHotel = {},
  roomMembersByHotelRoom = {},
  pnrValue,
  customCostFields,
  mode,
  columnVisibility,
  onUpdateField,
  onDelete,
  onEdit,
  onPreview,
  onPnrChange,
  onCustomCostChange,
  onSurchargeChange,
  onKeyDown,
  onPaste,
  onNameSearch,
  onIdNumberSearch,
  roomIdByHotelMember = {},
  roomOptionsByHotel = {},
  onRoomAssign,
  onRemoveMemberFromRoom,
  tourInfo,
  getOrderInfo,
}: MemberRowProps) {
  const [isComposing, setIsComposing] = useState(false)

  // 拖曳排序功能
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: member.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // sticky 位置（拖曳欄位一直存在）
  const seqLeft = 'left-[28px]'
  const nameLeft = 'left-[68px]'

  // 預設欄位顯示設定（訂金/尾款/應付金額 預設關閉）
  const cv = columnVisibility || {
    passport_name: true,
    birth_date: true,
    gender: true,
    id_number: true,
    passport_number: true,
    passport_expiry: true,
    special_meal: true,
    total_payable: false,
    deposit_amount: false,
    balance: false,
    remarks: true,
    pnr: false,
    ticket_number: true, // 預設顯示機票號碼
    ticketing_deadline: false,
    flight_cost: false, // 機票金額預設關閉
    room: true, // 分房欄位
    vehicle: true, // 分車欄位
    surcharges: false, // 附加費用預設關閉
  }

  // 處理數字輸入
  const handleNumberInput = useCallback(
    (field: keyof OrderMember, value: string) => {
      const num = parseInt(value.replace(/\D/g, ''), 10)
      onUpdateField(member.id, field, isNaN(num) ? null : num)
    },
    [member.id, onUpdateField]
  )

  // 解析附加費用數據
  const memberSurcharges = useMemo(() => {
    if (!member.custom_costs || typeof member.custom_costs !== 'object') return null
    const customCosts = member.custom_costs as Record<string, unknown>
    return (customCosts.surcharges as MemberSurcharges) || null
  }, [member.custom_costs])

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="group relative hover:bg-morandi-container/20 transition-colors"
    >
      {/* 拖曳把手（一直顯示） */}
      <td
        className="border border-morandi-gold/20 px-1 py-1 bg-background sticky left-0 z-10 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical
          size={14}
          className="text-morandi-secondary/50 hover:text-morandi-secondary"
        />
      </td>

      {/* 基本資訊欄位 */}
      <MemberBasicInfo
        member={member}
        index={index}
        isEditMode={isEditMode}
        showOrderCode={showOrderCode}
        columnVisibility={cv}
        onUpdateField={onUpdateField}
        onPreview={onPreview}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onNameSearch={onNameSearch}
        onIdNumberSearch={onIdNumberSearch}
      />

      {/* 護照資訊欄位 */}
      <MemberPassportInfo
        member={member}
        index={index}
        isEditMode={isEditMode}
        departureDate={departureDate}
        columnVisibility={cv}
        onUpdateField={onUpdateField}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />

      {/* 飲食禁忌 */}
      {cv.special_meal && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-status-warning-bg'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={member.special_meal || ''}
              onChange={e => onUpdateField(member.id, 'special_meal', e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={e => {
                setIsComposing(false)
                setTimeout(() => onUpdateField(member.id, 'special_meal', e.currentTarget.value), 0)
              }}
              onKeyDown={e => {
                if (isComposing) return
                onKeyDown(e, index, 'special_meal')
              }}
              onPaste={e => onPaste?.(e, index, 'special_meal')}
              data-member={member.id}
              data-field="special_meal"
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.special_meal || '-'}</span>
          )}
        </td>
      )}

      {/* 應付金額 */}
      {cv.total_payable && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-card">
          <input
            type="text"
            inputMode="numeric"
            value={member.total_payable || ''}
            onChange={e => handleNumberInput('total_payable', e.target.value)}
            className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
          />
        </td>
      )}

      {/* 訂金 */}
      {cv.deposit_amount && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-card">
          <input
            type="text"
            inputMode="numeric"
            value={member.deposit_amount || ''}
            onChange={e => handleNumberInput('deposit_amount', e.target.value)}
            className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
          />
        </td>
      )}

      {/* 尾款 (自動計算) */}
      {cv.balance && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-muted text-xs text-center text-morandi-secondary">
          {((member.total_payable || 0) - (member.deposit_amount || 0)).toLocaleString()}
        </td>
      )}

      {/* 備註 */}
      {cv.remarks && (
        <td
          className={cn(
            'border border-morandi-gold/20 px-2 py-1',
            isEditMode ? 'bg-card' : 'bg-muted'
          )}
        >
          {isEditMode ? (
            <input
              type="text"
              value={member.remarks || ''}
              onChange={e => onUpdateField(member.id, 'remarks', e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={e => {
                setIsComposing(false)
                setTimeout(() => onUpdateField(member.id, 'remarks', e.currentTarget.value), 0)
              }}
              onKeyDown={e => {
                if (isComposing) return
                onKeyDown(e, index, 'remarks')
              }}
              onPaste={e => onPaste?.(e, index, 'remarks')}
              data-member={member.id}
              data-field="remarks"
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.remarks || '-'}</span>
          )}
        </td>
      )}

      {/* 團體模式：分房欄位（按飯店分欄位） */}
      {mode === 'tour' &&
        showRoomColumn &&
        hotelColumns.length > 0 &&
        hotelColumns.map(hotel => {
          const hotelSpans = roomRowSpansByHotel[hotel.id] || {}
          const hotelRoomSpan = hotelSpans[member.id]
          if (hotelRoomSpan === 0) return null // 被合併，不渲染
          const assignment = roomAssignmentsByHotel[hotel.id]?.[member.id]
          const currentRoomId = roomIdByHotelMember[hotel.id]?.[member.id] || ''
          const options = roomOptionsByHotel[hotel.id] || []
          const roomMembers = currentRoomId
            ? roomMembersByHotelRoom[hotel.id]?.[currentRoomId] || []
            : []

          return (
            <RoomAssignmentCell
              key={hotel.id}
              memberId={member.id}
              memberName={member.chinese_name || member.passport_name || ''}
              memberBirthDate={member.birth_date}
              hotelId={hotel.id}
              hotelName={hotel.id}
              currentRoomId={currentRoomId}
              currentRoomLabel={assignment || ''}
              roomOptions={options}
              roomMembers={roomMembers}
              rowSpan={hotelRoomSpan && hotelRoomSpan > 1 ? hotelRoomSpan : undefined}
              onAssign={onRoomAssign || (() => {})}
              onRemoveMember={onRemoveMemberFromRoom}
              departureDate={departureDate}
            />
          )
        })}
      {/* 單欄位模式（沒有飯店欄位資訊時的後備） */}
      {mode === 'tour' && showRoomColumn && hotelColumns.length === 0 && roomRowSpan !== 0 && (
        <td
          className="border border-morandi-gold/20 px-2 py-1 bg-morandi-green/10/50 text-xs align-middle"
          rowSpan={roomRowSpan && roomRowSpan > 1 ? roomRowSpan : undefined}
        >
          {roomAssignment || '-'}
        </td>
      )}

      {/* 團體模式：分車欄位（支援合併儲存格） */}
      {mode === 'tour' && showVehicleColumn && vehicleRowSpan !== 0 && (
        <td
          className="border border-morandi-gold/20 px-2 py-1 bg-morandi-gold/10/50 text-xs align-middle"
          rowSpan={vehicleRowSpan && vehicleRowSpan > 1 ? vehicleRowSpan : undefined}
        >
          {vehicleAssignment || '-'}
        </td>
      )}

      {/* 團體模式：PNR 欄位 */}
      {mode === 'tour' && showPnrColumn && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-info-bg/50">
          {isEditMode ? (
            <input
              type="text"
              value={pnrValue || ''}
              onChange={e => onPnrChange(member.id, e.target.value)}
              onBlur={e => {
                // 離開欄位時儲存到資料庫
                if (e.target.value !== member.pnr) {
                  onUpdateField(member.id, 'pnr', e.target.value)
                }
              }}
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.pnr || '-'}</span>
          )}
        </td>
      )}

      {/* 團體模式：機票號碼 */}
      {mode === 'tour' && cv.ticket_number && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-info-bg/50">
          {isEditMode ? (
            <input
              type="text"
              value={member.ticket_number || ''}
              onChange={e => onUpdateField(member.id, 'ticket_number', e.target.value)}
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">{member.ticket_number || '-'}</span>
          )}
        </td>
      )}

      {/* 團體模式：開票期限 */}
      {mode === 'tour' && cv.ticketing_deadline && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-warning/10/50">
          {member.ticket_number ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-morandi-green/20 text-morandi-green text-xs rounded-full font-medium">
              <Check size={10} />
              {ORDERS_LABELS.LABEL_9032}
            </span>
          ) : isEditMode ? (
            <input
              type="date"
              value={member.ticketing_deadline ? member.ticketing_deadline.slice(0, 10) : ''}
              onChange={e => onUpdateField(member.id, 'ticketing_deadline', e.target.value || null)}
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          ) : (
            <span className="text-xs text-morandi-primary">
              {member.ticketing_deadline ? member.ticketing_deadline.slice(0, 10) : '-'}
            </span>
          )}
        </td>
      )}

      {/* 團體模式：機票金額（成本，從機票訂單明細匯入） */}
      {mode === 'tour' && cv.flight_cost && (
        <td className="border border-morandi-gold/20 px-2 py-1 bg-status-info/10/50 text-xs text-right">
          {member.flight_cost ? member.flight_cost.toLocaleString() : '-'}
        </td>
      )}

      {/* 團體模式：附加費用 */}
      {mode === 'tour' && cv.surcharges && onSurchargeChange && (
        <MemberSurchargeCell
          memberId={member.id}
          memberName={member.chinese_name || member.passport_name || '成員'}
          surcharges={memberSurcharges}
          baseCost={member.selling_price ?? null}
          onChange={onSurchargeChange}
        />
      )}

      {/* 團體模式：自訂費用欄位 */}
      {mode === 'tour' &&
        customCostFields.map(field => (
          <td
            key={field.id}
            className="border border-morandi-gold/20 px-2 py-1 bg-morandi-green/10/50"
          >
            <input
              type="text"
              value={field.values[member.id] || ''}
              onChange={e => onCustomCostChange(field.id, member.id, e.target.value)}
              className="bg-transparent text-xs border-none outline-none shadow-none focus:ring-0 text-morandi-primary"
            />
          </td>
        ))}

      {/* 操作按鈕 */}
      <MemberActions
        member={member}
        onEdit={onEdit}
        onDelete={onDelete}
        tourInfo={tourInfo}
        orderInfo={getOrderInfo?.(member.id)}
      />
    </tr>
  )
}
