'use client'

/**
 * TourVehicleTab - 分車 Tab
 * 從 TourVehicleManager 提取的分車功能
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createTourVehicle, deleteTourVehicle } from '@/data/entities/tour-vehicles'
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
import { Bus, Plus, Trash2, X, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/lib/ui/alert-dialog'
import { VEHICLE_TYPES } from '@/types/room-vehicle.types'
import type { TourVehicleStatus } from '@/types/room-vehicle.types'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '@/features/orders/types/order-member.types'
import { COMP_TOURS_LABELS } from '../../constants/labels'

type MemberBasic = Pick<OrderMember, 'id' | 'chinese_name' | 'passport_name'>

interface TourVehicleTabProps {
  tourId: string
  members: MemberBasic[]
}

export function TourVehicleTab({ tourId, members }: TourVehicleTabProps) {
  const user = useAuthStore(state => state.user)
  const [vehicles, setVehicles] = useState<TourVehicleStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddVehicle, setShowAddVehicle] = useState(false)

  const [newVehicle, setNewVehicle] = useState({
    vehicle_name: '',
    vehicle_type: 'large_bus',
    capacity: 45,
    driver_name: '',
    driver_phone: '',
    license_plate: '',
  })

  useEffect(() => {
    loadVehicles()
  }, [tourId])

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('tour_vehicles_status')
        .select('id, tour_id, vehicle_name, vehicle_type, license_plate, driver_name, driver_phone, capacity, assigned_count, remaining_seats, is_full, display_order, notes')
        .eq('tour_id', tourId)
        .order('display_order')
        .limit(500)

      if (error) throw error
      setVehicles((data || []) as TourVehicleStatus[])
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.載入車輛失敗, error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddVehicle = async () => {
    if (!newVehicle.vehicle_name.trim()) {
      toast.error(COMP_TOURS_LABELS.請輸入車輛名稱)
      return
    }

    try {
      await createTourVehicle({
        tour_id: tourId,
        vehicle_name: newVehicle.vehicle_name,
        vehicle_type: newVehicle.vehicle_type,
        capacity: newVehicle.capacity,
        driver_name: newVehicle.driver_name || null,
        driver_phone: newVehicle.driver_phone || null,
        license_plate: newVehicle.license_plate || null,
        display_order: vehicles.length,
      })

      toast.success(COMP_TOURS_LABELS.車輛已新增)
      setShowAddVehicle(false)
      setNewVehicle({
        vehicle_name: '',
        vehicle_type: 'large_bus',
        capacity: 45,
        driver_name: '',
        driver_phone: '',
        license_plate: '',
      })
      loadVehicles()
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.新增車輛失敗_2, error)
      toast.error(COMP_TOURS_LABELS.新增車輛失敗)
    }
  }

  const handleDeleteVehicle = async (vehicleId: string) => {
    const confirmed = await confirm(COMP_TOURS_LABELS.確定要刪除這輛車嗎, {
      title: COMP_TOURS_LABELS.刪除車輛,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteTourVehicle(vehicleId)

      toast.success(COMP_TOURS_LABELS.車輛已刪除)
      loadVehicles()
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.刪除車輛失敗_2, error)
      toast.error(COMP_TOURS_LABELS.刪除車輛失敗)
    }
  }

  const totalCapacity = vehicles.reduce((sum, v) => sum + v.capacity, 0)
  const totalAssigned = vehicles.reduce((sum, v) => sum + v.assigned_count, 0)

  return (
    <>
      {/* 工具列 */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="text-sm text-morandi-secondary">
          {vehicles.length > 0 && `共 ${vehicles.length} 輛車`}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddVehicle(true)}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          {COMP_TOURS_LABELS.ADD_5339}
        </Button>
      </div>

      {/* 車輛列表 */}
      <div className="py-4 space-y-2 max-h-[350px] overflow-auto">
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-morandi-muted">
            <Bus className="h-8 w-8 mb-2" />
            <p className="text-sm">{COMP_TOURS_LABELS.SETTINGS_4888}</p>
            <p className="text-xs mt-1">{COMP_TOURS_LABELS.ADD_7430}</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-morandi-muted mb-2">
              共 {vehicles.length} 輛車，總容量 {totalCapacity} 人，已分配 {totalAssigned} 人
            </div>
            {vehicles.map(vehicle => {
              const vehicleTypeLabel =
                VEHICLE_TYPES.find(t => t.value === vehicle.vehicle_type)?.label ||
                vehicle.vehicle_type
              const progress = (vehicle.assigned_count / vehicle.capacity) * 100

              return (
                <div
                  key={vehicle.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    vehicle.is_full
                      ? 'border-morandi-green bg-morandi-green/5'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Bus
                        className={cn(
                          'h-4 w-4',
                          vehicle.is_full ? 'text-morandi-green' : 'text-morandi-gold'
                        )}
                      />
                      <span className="font-medium text-morandi-primary">
                        {vehicle.vehicle_name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-morandi-container text-morandi-secondary">
                        {vehicleTypeLabel}
                      </span>
                      {vehicle.license_plate && (
                        <span className="text-xs text-morandi-muted font-mono">
                          {vehicle.license_plate}
                        </span>
                      )}
                    </div>

                    {/* 司機資訊 */}
                    {(vehicle.driver_name || vehicle.driver_phone) && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-morandi-muted">
                        {vehicle.driver_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {vehicle.driver_name}
                          </span>
                        )}
                        {vehicle.driver_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vehicle.driver_phone}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 容量進度條 */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-24 h-1.5 bg-morandi-container rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            vehicle.is_full ? 'bg-morandi-green' : 'bg-morandi-gold'
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-xs',
                          vehicle.is_full ? 'text-morandi-green' : 'text-morandi-secondary'
                        )}
                      >
                        {vehicle.assigned_count}/{vehicle.capacity} 人
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-morandi-muted hover:text-morandi-red"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* 新增車輛 Dialog */}
      <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
        <DialogContent level={3} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-morandi-primary">
              <Plus className="h-5 w-5 text-morandi-gold" />
              {COMP_TOURS_LABELS.ADD_5339}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_1938}</Label>
              <Input
                value={newVehicle.vehicle_name}
                onChange={e => setNewVehicle({ ...newVehicle, vehicle_name: e.target.value })}
                placeholder={COMP_TOURS_LABELS.例如_1號車_A車}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_8181}</Label>
                <Select
                  value={newVehicle.vehicle_type}
                  onValueChange={value => {
                    const type = VEHICLE_TYPES.find(t => t.value === value)
                    setNewVehicle({
                      ...newVehicle,
                      vehicle_type: value,
                      capacity: type?.capacity || 45,
                    })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_7438}</Label>
                <Input
                  type="number"
                  min={1}
                  value={newVehicle.capacity}
                  onChange={e =>
                    setNewVehicle({ ...newVehicle, capacity: parseInt(e.target.value) || 45 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_6947}</Label>
                <Input
                  value={newVehicle.driver_name}
                  onChange={e => setNewVehicle({ ...newVehicle, driver_name: e.target.value })}
                  placeholder={COMP_TOURS_LABELS.選填}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_8290}</Label>
                <Input
                  value={newVehicle.driver_phone}
                  onChange={e => setNewVehicle({ ...newVehicle, driver_phone: e.target.value })}
                  placeholder={COMP_TOURS_LABELS.選填}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-morandi-primary">{COMP_TOURS_LABELS.LABEL_6418}</Label>
              <Input
                value={newVehicle.license_plate}
                onChange={e => setNewVehicle({ ...newVehicle, license_plate: e.target.value })}
                placeholder={COMP_TOURS_LABELS.選填}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowAddVehicle(false)} className="gap-2">
                <X size={16} />
                {COMP_TOURS_LABELS.取消}
              </Button>
              <Button onClick={handleAddVehicle} className="gap-2">
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
