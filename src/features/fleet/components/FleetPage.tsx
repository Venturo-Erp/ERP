'use client'
/**
 * FleetPage - 車隊管理頁面（含車輛、司機、維護記錄）
 */

import { logger } from '@/lib/utils/logger'
import React, { useState, useCallback } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bus, Users, Wrench } from 'lucide-react'
import { FleetVehicleList } from './FleetVehicleList'
import { FleetVehicleDialog } from './FleetVehicleDialog'
import { FleetDriverList } from './FleetDriverList'
import { FleetDriverDialog } from './FleetDriverDialog'
import {
  useFleetVehicles,
  useFleetDrivers,
  createFleetVehicle,
  updateFleetVehicle,
  deleteFleetVehicle,
  createFleetDriver,
  updateFleetDriver,
  deleteFleetDriver,
} from '@/data'
import type {
  FleetVehicle,
  FleetVehicleFormData,
  FleetDriver,
  FleetDriverFormData,
  VehicleType,
  VehicleStatus,
  DriverStatus,
  LicenseType,
} from '@/types/fleet.types'
import { VEHICLE_TYPE_OPTIONS } from '@/types/fleet.types'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { FLEET_LABELS } from './constants/labels'

// 車輛表單預設值
const emptyVehicleFormData: FleetVehicleFormData = {
  license_plate: '',
  vehicle_name: '',
  vehicle_type: 'large_bus',
  brand: '',
  model: '',
  year: null,
  capacity: 45,
  vin: '',
  registration_date: '',
  inspection_due_date: '',
  insurance_due_date: '',
  next_maintenance_date: '',
  next_maintenance_km: null,
  current_mileage: 0,
  status: 'available',
  notes: '',
}

// 司機表單預設值
const emptyDriverFormData: FleetDriverFormData = {
  name: '',
  phone: '',
  id_number: '',
  license_number: '',
  license_type: 'professional',
  license_expiry_date: '',
  professional_license_number: '',
  professional_license_expiry: '',
  health_check_expiry: '',
  status: 'active',
  notes: '',
}

export const FleetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('vehicles')
  const [searchQuery, setSearchQuery] = useState('')

  // 車輛狀態
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false)
  const [isVehicleEditMode, setIsVehicleEditMode] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null)
  const [vehicleFormData, setVehicleFormData] = useState<FleetVehicleFormData>(emptyVehicleFormData)

  // 司機狀態
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false)
  const [isDriverEditMode, setIsDriverEditMode] = useState(false)
  const [editingDriver, setEditingDriver] = useState<FleetDriver | null>(null)
  const [driverFormData, setDriverFormData] = useState<FleetDriverFormData>(emptyDriverFormData)

  // Data hooks
  const { items: vehicles, loading: vehiclesLoading } = useFleetVehicles()
  const { items: drivers, loading: driversLoading } = useFleetDrivers()

  // 過濾車輛
  const filteredVehicles = vehicles.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.license_plate?.toLowerCase().includes(query) ||
      item.vehicle_name?.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query)
    )
  })

  // 過濾司機
  const filteredDrivers = drivers.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.name?.toLowerCase().includes(query) ||
      item.phone?.toLowerCase().includes(query) ||
      item.license_number?.toLowerCase().includes(query)
    )
  })

  // ========== 車輛操作 ==========
  const handleOpenAddVehicle = useCallback(() => {
    setIsVehicleEditMode(false)
    setEditingVehicle(null)
    setVehicleFormData(emptyVehicleFormData)
    setIsVehicleDialogOpen(true)
  }, [])

  const handleEditVehicle = useCallback((item: FleetVehicle) => {
    setIsVehicleEditMode(true)
    setEditingVehicle(item)
    setVehicleFormData({
      license_plate: item.license_plate || '',
      vehicle_name: item.vehicle_name || '',
      vehicle_type: item.vehicle_type || 'large_bus',
      brand: item.brand || '',
      model: item.model || '',
      year: item.year,
      capacity: item.capacity || 45,
      vin: item.vin || '',
      registration_date: item.registration_date || '',
      inspection_due_date: item.inspection_due_date || '',
      insurance_due_date: item.insurance_due_date || '',
      next_maintenance_date: item.next_maintenance_date || '',
      next_maintenance_km: item.next_maintenance_km,
      current_mileage: item.current_mileage || 0,
      status: item.status || 'available',
      notes: item.notes || '',
    })
    setIsVehicleDialogOpen(true)
  }, [])

  const handleDeleteVehicle = useCallback(async (item: FleetVehicle) => {
    const confirmed = await confirm(`確定要刪除車輛「${item.license_plate}」嗎？`, {
      title: '刪除車輛',
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteFleetVehicle(item.id)
      await alert('車輛已刪除', 'success')
    } catch (error) {
      logger.error('Delete FleetVehicle Error:', error)
      await alert('刪除失敗，請稍後再試', 'error')
    }
  }, [])

  const handleCloseVehicleDialog = useCallback(() => {
    setIsVehicleDialogOpen(false)
    setIsVehicleEditMode(false)
    setEditingVehicle(null)
    setVehicleFormData(emptyVehicleFormData)
  }, [])

  const handleVehicleFormFieldChange = useCallback(
    <K extends keyof FleetVehicleFormData>(field: K, value: FleetVehicleFormData[K]) => {
      setVehicleFormData(prev => {
        const newData = { ...prev, [field]: value }
        // 當車型變更時，自動更新座位數
        if (field === 'vehicle_type') {
          const option = VEHICLE_TYPE_OPTIONS.find(o => o.value === value)
          if (option) {
            newData.capacity = option.capacity
          }
        }
        return newData
      })
    },
    []
  )

  const handleVehicleSubmit = useCallback(async () => {
    try {
      const data = {
        license_plate: vehicleFormData.license_plate,
        vehicle_name: vehicleFormData.vehicle_name || null,
        vehicle_type: vehicleFormData.vehicle_type as VehicleType,
        brand: vehicleFormData.brand || null,
        model: vehicleFormData.model || null,
        year: vehicleFormData.year,
        capacity: vehicleFormData.capacity,
        vin: vehicleFormData.vin || null,
        registration_date: vehicleFormData.registration_date || null,
        inspection_due_date: vehicleFormData.inspection_due_date || null,
        insurance_due_date: vehicleFormData.insurance_due_date || null,
        next_maintenance_date: vehicleFormData.next_maintenance_date || null,
        next_maintenance_km: vehicleFormData.next_maintenance_km,
        current_mileage: vehicleFormData.current_mileage,
        status: vehicleFormData.status as VehicleStatus,
        notes: vehicleFormData.notes || null,
      }

      if (isVehicleEditMode && editingVehicle) {
        await updateFleetVehicle(editingVehicle.id, data)
        await alert('車輛資料更新成功', 'success')
      } else {
        await createFleetVehicle(data as Parameters<typeof createFleetVehicle>[0])
        await alert('車輛資料建立成功', 'success')
      }
      handleCloseVehicleDialog()
    } catch (error) {
      logger.error('Save FleetVehicle Error:', error)
      await alert('儲存失敗，請稍後再試', 'error')
    }
  }, [vehicleFormData, isVehicleEditMode, editingVehicle, handleCloseVehicleDialog])

  // ========== 司機操作 ==========
  const handleOpenAddDriver = useCallback(() => {
    setIsDriverEditMode(false)
    setEditingDriver(null)
    setDriverFormData(emptyDriverFormData)
    setIsDriverDialogOpen(true)
  }, [])

  const handleEditDriver = useCallback((item: FleetDriver) => {
    setIsDriverEditMode(true)
    setEditingDriver(item)
    setDriverFormData({
      name: item.name || '',
      phone: item.phone || '',
      id_number: item.id_number || '',
      license_number: item.license_number || '',
      license_type: item.license_type || 'professional',
      license_expiry_date: item.license_expiry_date || '',
      professional_license_number: item.professional_license_number || '',
      professional_license_expiry: item.professional_license_expiry || '',
      health_check_expiry: item.health_check_expiry || '',
      status: item.status || 'active',
      notes: item.notes || '',
    })
    setIsDriverDialogOpen(true)
  }, [])

  const handleDeleteDriver = useCallback(async (item: FleetDriver) => {
    const confirmed = await confirm(`確定要刪除司機「${item.name}」嗎？`, {
      title: '刪除司機',
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteFleetDriver(item.id)
      await alert('司機已刪除', 'success')
    } catch (error) {
      logger.error('Delete FleetDriver Error:', error)
      await alert('刪除失敗，請稍後再試', 'error')
    }
  }, [])

  const handleCloseDriverDialog = useCallback(() => {
    setIsDriverDialogOpen(false)
    setIsDriverEditMode(false)
    setEditingDriver(null)
    setDriverFormData(emptyDriverFormData)
  }, [])

  const handleDriverFormFieldChange = useCallback(
    <K extends keyof FleetDriverFormData>(field: K, value: FleetDriverFormData[K]) => {
      setDriverFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleDriverSubmit = useCallback(async () => {
    try {
      const data = {
        name: driverFormData.name,
        phone: driverFormData.phone || null,
        id_number: driverFormData.id_number || null,
        license_number: driverFormData.license_number || null,
        license_type: driverFormData.license_type as LicenseType,
        license_expiry_date: driverFormData.license_expiry_date || null,
        professional_license_number: driverFormData.professional_license_number || null,
        professional_license_expiry: driverFormData.professional_license_expiry || null,
        health_check_expiry: driverFormData.health_check_expiry || null,
        status: driverFormData.status as DriverStatus,
        notes: driverFormData.notes || null,
      }

      if (isDriverEditMode && editingDriver) {
        await updateFleetDriver(editingDriver.id, data)
        await alert('司機資料更新成功', 'success')
      } else {
        await createFleetDriver(data as Parameters<typeof createFleetDriver>[0])
        await alert('司機資料建立成功', 'success')
      }
      handleCloseDriverDialog()
    } catch (error) {
      logger.error('Save FleetDriver Error:', error)
      await alert('儲存失敗，請稍後再試', 'error')
    }
  }, [driverFormData, isDriverEditMode, editingDriver, handleCloseDriverDialog])

  // 根據當前 Tab 決定新增按鈕行為
  const handleAdd = useCallback(() => {
    if (activeTab === 'vehicles') {
      handleOpenAddVehicle()
    } else if (activeTab === 'drivers') {
      handleOpenAddDriver()
    }
  }, [activeTab, handleOpenAddVehicle, handleOpenAddDriver])

  const addLabel = activeTab === 'vehicles' ? '新增車輛' : activeTab === 'drivers' ? '新增司機' : ''

  return (
    <ContentPageLayout
      title={FLEET_LABELS.MANAGE_8153}
      icon={Bus}
      breadcrumb={[
        { label: '資料庫管理', href: '/database' },
        { label: '車隊管理', href: '/database/fleet' },
      ]}
      tabs={[
        { value: 'vehicles', label: `車輛 (${vehicles.length})`, icon: Bus },
        { value: 'drivers', label: `司機 (${drivers.length})`, icon: Users },
        { value: 'logs', label: FLEET_LABELS.LABEL_9547, icon: Wrench },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showSearch
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="搜尋車牌、司機、品牌..."
      onAdd={activeTab !== 'logs' ? handleAdd : undefined}
      addLabel={addLabel}
      contentClassName="flex-1 overflow-hidden flex flex-col"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsContent value="vehicles" className="flex-1 overflow-auto mt-0 p-0">
          <FleetVehicleList
            items={filteredVehicles}
            drivers={drivers}
            loading={vehiclesLoading}
            onEdit={handleEditVehicle}
            onDelete={handleDeleteVehicle}
          />
        </TabsContent>

        <TabsContent value="drivers" className="flex-1 overflow-auto mt-0 p-0">
          <FleetDriverList
            items={filteredDrivers}
            loading={driversLoading}
            onEdit={handleEditDriver}
            onDelete={handleDeleteDriver}
          />
        </TabsContent>

        <TabsContent value="logs" className="flex-1 overflow-auto mt-0 p-0">
          <div className="flex items-center justify-center h-full text-morandi-secondary">
            {FLEET_LABELS.LABEL_7181}
          </div>
        </TabsContent>
      </Tabs>

      {/* 車輛對話框 */}
      <FleetVehicleDialog
        isOpen={isVehicleDialogOpen}
        isEditMode={isVehicleEditMode}
        onClose={handleCloseVehicleDialog}
        formData={vehicleFormData}
        onFormFieldChange={handleVehicleFormFieldChange}
        onSubmit={handleVehicleSubmit}
        drivers={drivers}
      />

      {/* 司機對話框 */}
      <FleetDriverDialog
        isOpen={isDriverDialogOpen}
        isEditMode={isDriverEditMode}
        onClose={handleCloseDriverDialog}
        formData={driverFormData}
        onFormFieldChange={handleDriverFormFieldChange}
        onSubmit={handleDriverSubmit}
      />
    </ContentPageLayout>
  )
}
