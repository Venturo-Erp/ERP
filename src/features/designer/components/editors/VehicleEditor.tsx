'use client'

/**
 * 分車/分桌編輯器
 */

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useDragSort } from '@/hooks/useDragSort'
import { ChevronDown, ChevronRight, Plus, Trash2, Bus, Users } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type {
  GroupType,
  VehicleData,
  VehicleMemberData,
  VehicleColumnSettings,
} from '../../templates/definitions/types'
import { DESIGNER_LABELS } from './constants/labels'

/**
 * 分組類型選項
 */
const GROUP_TYPE_OPTIONS: { value: GroupType; label: string; icon: typeof Bus }[] = [
  { value: 'vehicle', label: DESIGNER_LABELS.TAB_VEHICLE, icon: Bus },
  { value: 'table', label: DESIGNER_LABELS.TAB_TABLE, icon: Users },
]

interface VehicleEditorProps {
  templateData: Record<string, unknown>
  onTemplateDataChange: (newData: Record<string, unknown>) => void
  currentVehicleIndex?: number
  pageType?: 'vehicle' | 'table' // 從頁面類型決定預設模式
}

export function VehicleEditor({
  templateData,
  onTemplateDataChange,
  currentVehicleIndex = 0,
  pageType = 'vehicle',
}: VehicleEditorProps) {
  const vehicles = (templateData.vehicles as VehicleData[]) || []
  const currentVehicle = vehicles[currentVehicleIndex]

  // 欄位顯示設定（預設：座位顯示、訂單不顯示、目的地顯示、司機不顯示）
  const columnSettings: VehicleColumnSettings =
    (templateData.vehicleColumnSettings as VehicleColumnSettings) || {
      showSeatNumber: true,
      showOrderCode: false,
      showDestination: true,
      showDriverInfo: false,
    }

  // 當前分組類型（優先從資料取得，否則從頁面類型決定）
  const groupType: GroupType = vehicles[0]?.groupType || pageType
  const isTable = groupType === 'table'

  // 展開的車輛/桌次（記錄哪些是展開的）
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(
    new Set(vehicles.map(v => v.id))
  )
  // 快速新增成員輸入（每個車輛一個）
  const [newMemberNames, setNewMemberNames] = useState<Record<string, string>>({})

  // 切換車輛展開狀態
  const toggleVehicleExpanded = (vehicleId: string) => {
    setExpandedVehicles(prev => {
      const next = new Set(prev)
      if (next.has(vehicleId)) {
        next.delete(vehicleId)
      } else {
        next.add(vehicleId)
      }
      return next
    })
  }

  // 更新欄位顯示設定
  const updateColumnSetting = (key: keyof VehicleColumnSettings, value: boolean) => {
    onTemplateDataChange({
      ...templateData,
      vehicleColumnSettings: {
        ...columnSettings,
        [key]: value,
      },
    })
  }

  // 新增車輛/桌次（可指定類型）
  const addVehicle = (type: GroupType = 'vehicle') => {
    const isNewTable = type === 'table'
    // 計算同類型的數量
    const sameTypeCount = vehicles.filter(v => v.groupType === type).length
    const newVehicle: VehicleData = {
      id: `vehicle-${Date.now()}`,
      groupType: type,
      vehicleName: isNewTable
        ? `${sameTypeCount + 1}${DESIGNER_LABELS.TABLE_SUFFIX}`
        : `${sameTypeCount + 1}${DESIGNER_LABELS.VEHICLE_SUFFIX}`,
      vehicleType: '',
      capacity: isNewTable ? 10 : 43,
      driverName: '',
      driverPhone: '',
      members: [],
    }
    onTemplateDataChange({
      ...templateData,
      vehicles: [...vehicles, newVehicle],
    })
    // 自動展開新增的項目
    setExpandedVehicles(prev => new Set([...prev, newVehicle.id]))
  }

  // 刪除車輛
  const deleteVehicle = (index: number) => {
    const newVehicles = vehicles.filter((_, i) => i !== index)
    const newIndex = Math.min(currentVehicleIndex, Math.max(0, newVehicles.length - 1))
    onTemplateDataChange({
      ...templateData,
      vehicles: newVehicles,
      currentVehiclePageIndex: newIndex,
    })
  }

  // 更新車輛資料
  const updateVehicle = (field: keyof VehicleData, value: unknown) => {
    const newVehicles = vehicles.map((v, i) => {
      if (i !== currentVehicleIndex) return v
      return { ...v, [field]: value }
    })
    onTemplateDataChange({
      ...templateData,
      vehicles: newVehicles,
    })
  }

  // 新增成員（支援直接帶入姓名，指定車輛索引）
  const addMemberToVehicle = (vehicleIdx: number, name?: string) => {
    const vehicle = vehicles[vehicleIdx]
    if (!vehicle) return
    const memberName = name?.trim() || ''
    if (!memberName) return
    const newMember: VehicleMemberData = {
      id: `member-${Date.now()}`,
      chineseName: memberName,
      seatNumber: (vehicle.members?.length || 0) + 1,
    }
    const newVehicles = vehicles.map((v, i) => {
      if (i !== vehicleIdx) return v
      return { ...v, members: [...(v.members || []), newMember] }
    })
    onTemplateDataChange({ ...templateData, vehicles: newVehicles })
    setNewMemberNames(prev => ({ ...prev, [vehicle.id]: '' }))
  }

  // 批量新增成員（支援貼上多行，指定車輛索引）
  const addMembersBatchToVehicle = (vehicleIdx: number, text: string) => {
    const vehicle = vehicles[vehicleIdx]
    if (!vehicle) return
    const names = text
      .split(/[\n,，、]/)
      .map(n => n.trim())
      .filter(n => n.length > 0)
    if (names.length === 0) return
    const existingCount = vehicle.members?.length || 0
    const newMembers = names.map((name, idx) => ({
      id: `member-${Date.now()}-${idx}`,
      chineseName: name,
      seatNumber: existingCount + idx + 1,
    }))
    const newVehicles = vehicles.map((v, i) => {
      if (i !== vehicleIdx) return v
      return { ...v, members: [...(v.members || []), ...newMembers] }
    })
    onTemplateDataChange({ ...templateData, vehicles: newVehicles })
    setNewMemberNames(prev => ({ ...prev, [vehicle.id]: '' }))
  }

  // 更新指定車輛的成員
  const updateMemberInVehicle = (
    vehicleIdx: number,
    memberIdx: number,
    field: keyof VehicleMemberData,
    value: unknown
  ) => {
    const vehicle = vehicles[vehicleIdx]
    if (!vehicle) return
    const newMembers = vehicle.members.map((m, i) => {
      if (i !== memberIdx) return m
      return { ...m, [field]: value }
    })
    const newVehicles = vehicles.map((v, i) => {
      if (i !== vehicleIdx) return v
      return { ...v, members: newMembers }
    })
    onTemplateDataChange({ ...templateData, vehicles: newVehicles })
  }

  // 刪除指定車輛的成員
  const deleteMemberFromVehicle = (vehicleIdx: number, memberIdx: number) => {
    const vehicle = vehicles[vehicleIdx]
    if (!vehicle) return
    const newMembers = vehicle.members.filter((_, i) => i !== memberIdx)
    const newVehicles = vehicles.map((v, i) => {
      if (i !== vehicleIdx) return v
      return { ...v, members: newMembers }
    })
    onTemplateDataChange({ ...templateData, vehicles: newVehicles })
  }

  // 更新指定車輛的欄位
  const updateVehicleField = (vehicleIdx: number, field: keyof VehicleData, value: unknown) => {
    const newVehicles = vehicles.map((v, i) => {
      if (i !== vehicleIdx) return v
      return { ...v, [field]: value }
    })
    onTemplateDataChange({ ...templateData, vehicles: newVehicles })
  }

  // 拖曳排序成員
  const { dragState, dragHandlers } = useDragSort({
    onReorder: (fromIndex, toIndex) => {
      if (!currentVehicle) return
      const newMembers = [...currentVehicle.members]
      const [removed] = newMembers.splice(fromIndex, 1)
      newMembers.splice(toIndex, 0, removed)
      // 重新編號座位
      const renumberedMembers = newMembers.map((m, i) => ({
        ...m,
        seatNumber: i + 1,
      }))
      updateVehicle('members', renumberedMembers)
    },
  })

  // 沒有車輛時顯示新增按鈕
  if (vehicles.length === 0) {
    return (
      <div className="space-y-3">
        {/* 類型選擇 */}
        <div className="space-y-2">
          <Label className="text-xs">{DESIGNER_LABELS.SELECT_3424}</Label>
          <div className="flex gap-2">
            {GROUP_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  // 新增第一個時設定類型
                  const newVehicle: VehicleData = {
                    id: `vehicle-${Date.now()}`,
                    groupType: opt.value,
                    vehicleName:
                      opt.value === 'table'
                        ? `1${DESIGNER_LABELS.TABLE_SUFFIX}`
                        : `1${DESIGNER_LABELS.VEHICLE_SUFFIX}`,
                    vehicleType:
                      opt.value === 'table'
                        ? DESIGNER_LABELS.DEFAULT_TABLE_TYPE
                        : DESIGNER_LABELS.DEFAULT_VEHICLE_TYPE,
                    capacity: opt.value === 'table' ? 10 : 43,
                    driverName: '',
                    driverPhone: '',
                    members: [],
                  }
                  onTemplateDataChange({
                    ...templateData,
                    vehicles: [newVehicle],
                    currentVehiclePageIndex: 0,
                  })
                }}
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-border hover:border-morandi-gold hover:bg-morandi-gold/5 transition-colors"
              >
                <opt.icon size={16} className="text-morandi-gold" />
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 排版設定 */}
      <div className="rounded border border-border/50 bg-morandi-container/10 p-2.5 space-y-2">
        <Label className="text-xs text-morandi-primary">{DESIGNER_LABELS.SETTINGS_5971}</Label>
        {/* 排版模式切換 */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              onTemplateDataChange({
                ...templateData,
                vehicleColumnSettings: { ...columnSettings, layoutMode: 'list' },
              })
            }}
            className={cn(
              'flex-1 px-2 py-1.5 text-xs rounded border transition-colors',
              (columnSettings.layoutMode || 'list') === 'list'
                ? 'bg-morandi-gold text-white border-morandi-gold'
                : 'bg-card border-border hover:border-morandi-gold'
            )}
          >
            {DESIGNER_LABELS.LABEL_9146}
          </button>
          <button
            type="button"
            onClick={() => {
              onTemplateDataChange({
                ...templateData,
                vehicleColumnSettings: { ...columnSettings, layoutMode: 'grid' },
              })
            }}
            className={cn(
              'flex-1 px-2 py-1.5 text-xs rounded border transition-colors',
              columnSettings.layoutMode === 'grid'
                ? 'bg-morandi-gold text-white border-morandi-gold'
                : 'bg-card border-border hover:border-morandi-gold'
            )}
          >
            {DESIGNER_LABELS.LABEL_2441}
          </button>
        </div>
        {/* 列表模式：每行人數設定 */}
        {(columnSettings.layoutMode || 'list') === 'list' && (
          <div className="flex items-center gap-2">
            <span className="text-xs">{DESIGNER_LABELS.LABEL_8436}</span>
            <Select
              value={String(columnSettings.columnsPerRow || 2)}
              onValueChange={v => {
                onTemplateDataChange({
                  ...templateData,
                  vehicleColumnSettings: {
                    ...columnSettings,
                    columnsPerRow: Number(v) as 1 | 2 | 3,
                  },
                })
              }}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1{DESIGNER_LABELS.PERSON_SUFFIX}</SelectItem>
                <SelectItem value="2">2{DESIGNER_LABELS.PERSON_SUFFIX}</SelectItem>
                <SelectItem value="3">3{DESIGNER_LABELS.PERSON_SUFFIX}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {!isTable && (columnSettings.layoutMode || 'list') === 'list' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={columnSettings.showDriverInfo}
              onCheckedChange={checked => updateColumnSetting('showDriverInfo', !!checked)}
            />
            <span className="text-xs">{DESIGNER_LABELS.LABEL_5378}</span>
          </label>
        )}
      </div>

      {/* 車輛列表 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bus size={14} className="text-morandi-secondary" />
          <span className="text-xs font-medium text-morandi-secondary">
            {DESIGNER_LABELS.LABEL_2119}
          </span>
        </div>
        {vehicles.map((vehicle, vehicleIdx) => {
          if (vehicle.groupType === 'table') return null
          const isExpanded = expandedVehicles.has(vehicle.id)
          const memberCount = vehicle.members?.length || 0
          const inputValue = newMemberNames[vehicle.id] || ''
          const vehicleNumber = vehicles
            .slice(0, vehicleIdx + 1)
            .filter(v => v.groupType !== 'table').length

          return (
            <div key={vehicle.id} className="rounded-lg border border-border/50 overflow-hidden">
              <div className="flex items-center gap-2 p-2 bg-morandi-container/20">
                <button
                  type="button"
                  onClick={() => toggleVehicleExpanded(vehicle.id)}
                  className="p-0.5 hover:bg-morandi-container/50 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-morandi-secondary" />
                  ) : (
                    <ChevronRight size={14} className="text-morandi-secondary" />
                  )}
                </button>
                <Input
                  value={vehicle.vehicleName || ''}
                  onChange={e => updateVehicleField(vehicleIdx, 'vehicleName', e.target.value)}
                  placeholder={`${vehicleNumber}${DESIGNER_LABELS.VEHICLE_SUFFIX}`}
                  className="h-7 text-xs font-medium flex-1"
                />
                <span className="text-[10px] text-morandi-secondary whitespace-nowrap">
                  {memberCount} 人
                </span>
                <button
                  type="button"
                  onClick={() => deleteVehicle(vehicleIdx)}
                  className="p-1 rounded text-morandi-muted hover:text-morandi-red hover:bg-morandi-red/10 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {isExpanded && (
                <div className="p-2 space-y-2 border-t border-border/30">
                  <div className="flex gap-2">
                    <Input
                      value={vehicle.vehicleType || ''}
                      onChange={e => updateVehicleField(vehicleIdx, 'vehicleType', e.target.value)}
                      placeholder={DESIGNER_LABELS.LABEL_3072}
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      value={vehicle.notes || ''}
                      onChange={e => updateVehicleField(vehicleIdx, 'notes', e.target.value)}
                      placeholder={DESIGNER_LABELS.REMARKS}
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                  {vehicle.members?.map((member, memberIdx) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-1.5 p-1.5 rounded bg-morandi-container/10"
                    >
                      <span className="text-[10px] text-morandi-secondary w-5 text-center">
                        {memberIdx + 1}.
                      </span>
                      <Input
                        value={member.chineseName || ''}
                        onChange={e =>
                          updateMemberInVehicle(
                            vehicleIdx,
                            memberIdx,
                            'chineseName',
                            e.target.value
                          )
                        }
                        placeholder={DESIGNER_LABELS.LABEL_658}
                        className="flex-1 h-6 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => deleteMemberFromVehicle(vehicleIdx, memberIdx)}
                        className="p-1 rounded text-morandi-muted hover:text-morandi-red hover:bg-morandi-red/10 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1">
                    <Input
                      value={inputValue}
                      onChange={e =>
                        setNewMemberNames(prev => ({ ...prev, [vehicle.id]: e.target.value }))
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter' && inputValue.trim()) {
                          if (
                            inputValue.includes('\n') ||
                            inputValue.includes(',') ||
                            inputValue.includes('，')
                          ) {
                            addMembersBatchToVehicle(vehicleIdx, inputValue)
                          } else {
                            addMemberToVehicle(vehicleIdx, inputValue)
                          }
                        }
                      }}
                      onPaste={e => {
                        const text = e.clipboardData.getData('text')
                        if (text.includes('\n')) {
                          e.preventDefault()
                          addMembersBatchToVehicle(vehicleIdx, text)
                        }
                      }}
                      placeholder={DESIGNER_LABELS.LABEL_794}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (inputValue.includes('\n') || inputValue.includes(',')) {
                          addMembersBatchToVehicle(vehicleIdx, inputValue)
                        } else {
                          addMemberToVehicle(vehicleIdx, inputValue)
                        }
                      }}
                      disabled={!inputValue.trim()}
                      className="h-7 px-2"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addVehicle('vehicle')}
          className="w-full h-7 text-xs gap-1.5 border-dashed"
        >
          <Plus size={12} /> {DESIGNER_LABELS.ADD_2744}
        </Button>
      </div>

      {/* 桌次列表 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-morandi-secondary" />
          <span className="text-xs font-medium text-morandi-secondary">
            {DESIGNER_LABELS.LABEL_1736}
          </span>
        </div>
        {vehicles.map((vehicle, vehicleIdx) => {
          if (vehicle.groupType !== 'table') return null
          const isExpanded = expandedVehicles.has(vehicle.id)
          const memberCount = vehicle.members?.length || 0
          const inputValue = newMemberNames[vehicle.id] || ''
          const tableNumber = vehicles
            .slice(0, vehicleIdx + 1)
            .filter(v => v.groupType === 'table').length

          return (
            <div key={vehicle.id} className="rounded-lg border border-border/50 overflow-hidden">
              <div className="flex items-center gap-2 p-2 bg-morandi-container/20">
                <button
                  type="button"
                  onClick={() => toggleVehicleExpanded(vehicle.id)}
                  className="p-0.5 hover:bg-morandi-container/50 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-morandi-secondary" />
                  ) : (
                    <ChevronRight size={14} className="text-morandi-secondary" />
                  )}
                </button>
                <Input
                  value={vehicle.vehicleName || ''}
                  onChange={e => updateVehicleField(vehicleIdx, 'vehicleName', e.target.value)}
                  placeholder={`${tableNumber}${DESIGNER_LABELS.TABLE_SUFFIX}`}
                  className="h-7 text-xs font-medium flex-1"
                />
                <span className="text-[10px] text-morandi-secondary whitespace-nowrap">
                  {memberCount} 人
                </span>
                <button
                  type="button"
                  onClick={() => deleteVehicle(vehicleIdx)}
                  className="p-1 rounded text-morandi-muted hover:text-morandi-red hover:bg-morandi-red/10 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {isExpanded && (
                <div className="p-2 space-y-2 border-t border-border/30">
                  <div className="flex gap-2">
                    <Input
                      value={vehicle.vehicleType || ''}
                      onChange={e => updateVehicleField(vehicleIdx, 'vehicleType', e.target.value)}
                      placeholder={DESIGNER_LABELS.LABEL_4403}
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      value={vehicle.notes || ''}
                      onChange={e => updateVehicleField(vehicleIdx, 'notes', e.target.value)}
                      placeholder={DESIGNER_LABELS.PLACEHOLDER_NOTES}
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                  {vehicle.members?.map((member, memberIdx) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-1.5 p-1.5 rounded bg-morandi-container/10"
                    >
                      <span className="text-[10px] text-morandi-secondary w-5 text-center">
                        {memberIdx + 1}.
                      </span>
                      <Input
                        value={member.chineseName || ''}
                        onChange={e =>
                          updateMemberInVehicle(
                            vehicleIdx,
                            memberIdx,
                            'chineseName',
                            e.target.value
                          )
                        }
                        placeholder={DESIGNER_LABELS.PLACEHOLDER_NAME}
                        className="flex-1 h-6 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => deleteMemberFromVehicle(vehicleIdx, memberIdx)}
                        className="p-1 rounded text-morandi-muted hover:text-morandi-red hover:bg-morandi-red/10 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1">
                    <Input
                      value={inputValue}
                      onChange={e =>
                        setNewMemberNames(prev => ({ ...prev, [vehicle.id]: e.target.value }))
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter' && inputValue.trim()) {
                          if (
                            inputValue.includes('\n') ||
                            inputValue.includes(',') ||
                            inputValue.includes('，')
                          ) {
                            addMembersBatchToVehicle(vehicleIdx, inputValue)
                          } else {
                            addMemberToVehicle(vehicleIdx, inputValue)
                          }
                        }
                      }}
                      onPaste={e => {
                        const text = e.clipboardData.getData('text')
                        if (text.includes('\n')) {
                          e.preventDefault()
                          addMembersBatchToVehicle(vehicleIdx, text)
                        }
                      }}
                      placeholder={DESIGNER_LABELS.PLACEHOLDER_NAME_LIST}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (inputValue.includes('\n') || inputValue.includes(',')) {
                          addMembersBatchToVehicle(vehicleIdx, inputValue)
                        } else {
                          addMemberToVehicle(vehicleIdx, inputValue)
                        }
                      }}
                      disabled={!inputValue.trim()}
                      className="h-7 px-2"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addVehicle('table')}
          className="w-full h-7 text-xs gap-1.5 border-dashed"
        >
          <Plus size={12} /> {DESIGNER_LABELS.ADD_4177}
        </Button>
      </div>
    </div>
  )
}
