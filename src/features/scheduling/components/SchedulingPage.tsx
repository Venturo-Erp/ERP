// @ts-nocheck
'use client'
/**
 * SchedulingPage - 資源調度主頁面
 * 甘特圖式日曆，顯示車輛和領隊的調度情況
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Calendar, Bus, Users, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
// ScheduleCalendar 保留用於未來可能的資源視圖
// import { ScheduleCalendar } from './ScheduleCalendar'
import { RequirementGanttChart } from './RequirementGanttChart'
import { VehicleScheduleDialog } from './VehicleScheduleDialog'
import { LeaderScheduleDialog } from './LeaderScheduleDialog'
import {
  useFleetVehicles,
  useFleetSchedules,
  useLeaderSchedules,
  useTourLeaders,
  createFleetSchedule,
  updateFleetSchedule,
  deleteFleetSchedule,
  createLeaderSchedule,
  updateLeaderSchedule,
  deleteLeaderSchedule,
} from '@/data'
import { useLeaderAvailability } from '@/stores/leader-availability-store'
import { useSupplierResponses } from '../hooks/useSupplierResponses'
import type {
  FleetVehicle,
  FleetSchedule,
  LeaderSchedule,
  FleetScheduleFormData,
  LeaderScheduleFormData,
} from '@/types/fleet.types'
import type { TourLeader } from '@/types/tour-leader.types'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { useVehicleScheduleConflict, useLeaderScheduleConflict } from '../hooks/useScheduleConflict'
import { supabase } from '@/lib/supabase/client'
import { getCurrentWorkspaceId } from '@/lib/workspace-helpers'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { SCHEDULING_LABELS } from './constants/labels'

// 需求單類型
interface TourRequest {
  id: string
  code: string
  category: string
  tour_id: string | null
  tour_code: string | null
  tour_name: string | null
  supplier_name: string | null
  title: string | null
  service_date: string | null
  service_date_end: string | null
  quantity: number | null
  status: string
  handler_type: string
  description: string | null
  notes: string | null
  created_at: string | null
  // 分配相關欄位
  assigned_vehicle_id: string | null
  assigned_leader_id: string | null
  assigned_at: string | null
  assigned_by: string | null
  assigned_by_name: string | null
  assignment_note: string | null
  // 跨公司需求欄位
  recipient_workspace_id: string | null
  response_status: string | null
}

type ViewMode = 'week' | 'month'
type TabType = 'vehicles' | 'leaders'

const emptyVehicleScheduleForm: FleetScheduleFormData = {
  vehicle_id: '',
  driver_id: '',
  start_date: '',
  end_date: '',
  client_name: '',
  tour_name: '',
  tour_code: '',
  contact_person: '',
  contact_phone: '',
  pickup_location: '',
  destination: '',
  rental_fee: null,
  notes: '',
}

const emptyLeaderScheduleForm: LeaderScheduleFormData = {
  leader_id: '',
  start_date: '',
  end_date: '',
  tour_id: '',
  tour_name: '',
  tour_code: '',
  destination: '',
  notes: '',
}

export const SchedulingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('vehicles')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  // 車輛調度
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false)
  const [vehicleEditMode, setVehicleEditMode] = useState(false)
  const [editingVehicleSchedule, setEditingVehicleSchedule] = useState<FleetSchedule | null>(null)
  const [vehicleFormData, setVehicleFormData] =
    useState<FleetScheduleFormData>(emptyVehicleScheduleForm)

  // 領隊調度
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false)
  const [leaderEditMode, setLeaderEditMode] = useState(false)
  const [editingLeaderSchedule, setEditingLeaderSchedule] = useState<LeaderSchedule | null>(null)
  const [leaderFormData, setLeaderFormData] =
    useState<LeaderScheduleFormData>(emptyLeaderScheduleForm)

  // Data hooks
  const { items: vehicles } = useFleetVehicles()
  const { items: vehicleSchedules } = useFleetSchedules()
  const { items: leaderSchedules } = useLeaderSchedules()
  const { items: leaders } = useTourLeaders()

  // 領隊可用檔期
  const { items: leaderAvailability } = useLeaderAvailability()

  // 供應商回覆的資源
  const { availableResources: supplierResources } = useSupplierResponses({
    itemType: activeTab === 'vehicles' ? 'vehicle' : 'leader',
  })

  // 衝突檢查
  const { checkConflict: checkVehicleConflict } = useVehicleScheduleConflict()
  const { checkConflict: checkLeaderConflict } = useLeaderScheduleConflict()

  // 需求單資料
  const [transportRequests, setTransportRequests] = useState<TourRequest[]>([])
  const [guideRequests, setGuideRequests] = useState<TourRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  // 載入需求單
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true)
    try {
      // 取得當前 workspace_id
      const workspaceId = getCurrentWorkspaceId()

      let query = supabase
        .from('tour_requests')
        .select('*')
        .in('category', ['transport', 'guide'])
        .order('service_date', { ascending: true })
        .limit(500)

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }

      const { data, error } = await query

      if (error) throw error

      const requests = (data || []) as TourRequest[]
      setTransportRequests(requests.filter(r => r.category === 'transport'))
      setGuideRequests(requests.filter(r => r.category === 'guide'))
    } catch (error) {
      logger.error('載入需求單失敗:', error)
    } finally {
      setLoadingRequests(false)
    }
  }, [])

  // 處理需求分配資源
  const handleAssignResource = useCallback(
    async (requestId: string, resourceId: string, _index: number) => {
      try {
        const isVehicle = activeTab === 'vehicles'
        const updateData = isVehicle
          ? { assigned_vehicle_id: resourceId, assigned_at: new Date().toISOString() }
          : { assigned_leader_id: resourceId, assigned_at: new Date().toISOString() }

        const { error } = await supabase
          .from('tour_requests')
          .update(updateData)
          .eq('id', requestId)

        if (error) throw error

        // 重新載入需求單
        await fetchRequests()
        await alert('分配成功', 'success')
      } catch (error) {
        logger.error('分配資源失敗:', error)
        await alert('分配失敗', 'error')
      }
    },
    [activeTab, fetchRequests]
  )

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // 計算當前視圖的日期範圍
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      }
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      }
    }
  }, [currentDate, viewMode])

  // 導航
  const navigatePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(subMonths(currentDate, 1))
    }
  }

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1))
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  // 格式化日期範圍標題
  const dateRangeTitle = useMemo(() => {
    if (viewMode === 'week') {
      return `${format(dateRange.start, 'yyyy年M月d日', { locale: zhTW })} - ${format(dateRange.end, 'M月d日', { locale: zhTW })}`
    } else {
      return format(currentDate, 'yyyy年M月', { locale: zhTW })
    }
  }, [dateRange, currentDate, viewMode])

  // ========== 車輛調度操作 ==========
  const handleAddVehicleSchedule = useCallback(
    (vehicleId: string, date: string) => {
      const vehicle = vehicles.find(v => v.id === vehicleId)
      setVehicleEditMode(false)
      setEditingVehicleSchedule(null)
      setVehicleFormData({
        ...emptyVehicleScheduleForm,
        vehicle_id: vehicleId,
        driver_id: vehicle?.default_driver_id || '',
        start_date: date,
        end_date: date,
      })
      setVehicleDialogOpen(true)
    },
    [vehicles]
  )

  const handleEditVehicleSchedule = useCallback((schedule: FleetSchedule) => {
    setVehicleEditMode(true)
    setEditingVehicleSchedule(schedule)
    setVehicleFormData({
      vehicle_id: schedule.vehicle_id,
      driver_id: schedule.driver_id || '',
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      client_name: schedule.client_name || '',
      tour_name: schedule.tour_name || '',
      tour_code: schedule.tour_code || '',
      contact_person: schedule.contact_person || '',
      contact_phone: schedule.contact_phone || '',
      pickup_location: schedule.pickup_location || '',
      destination: schedule.destination || '',
      rental_fee: schedule.rental_fee,
      notes: schedule.notes || '',
    })
    setVehicleDialogOpen(true)
  }, [])

  const handleDeleteVehicleSchedule = useCallback(async (schedule: FleetSchedule) => {
    const confirmed = await confirm(`確定要刪除此調度嗎？\n${schedule.tour_name || '未命名行程'}`, {
      title: '刪除調度',
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteFleetSchedule(schedule.id)
      await alert('調度已刪除', 'success')
    } catch (error) {
      logger.error('刪除車輛調度失敗:', error)
      await alert('刪除失敗', 'error')
    }
  }, [])

  const handleVehicleFormChange = useCallback(
    <K extends keyof FleetScheduleFormData>(field: K, value: FleetScheduleFormData[K]) => {
      setVehicleFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleVehicleSubmit = useCallback(async () => {
    try {
      // 檢查衝突
      const hasConflict = await checkVehicleConflict(
        vehicleFormData.vehicle_id,
        vehicleFormData.start_date,
        vehicleFormData.end_date,
        vehicleEditMode ? editingVehicleSchedule?.id : undefined
      )

      if (hasConflict) {
        const proceed = await confirm('此車輛在選擇的日期範圍內已有其他調度，確定要繼續嗎？', {
          title: '調度衝突',
          type: 'warning',
        })
        if (!proceed) return
      }

      const data = {
        vehicle_id: vehicleFormData.vehicle_id,
        start_date: vehicleFormData.start_date,
        end_date: vehicleFormData.end_date,
        client_name: vehicleFormData.client_name || null,
        tour_name: vehicleFormData.tour_name || null,
        tour_code: vehicleFormData.tour_code || null,
        contact_person: vehicleFormData.contact_person || null,
        contact_phone: vehicleFormData.contact_phone || null,
        driver_name: vehicleFormData.driver_name || null,
        driver_phone: vehicleFormData.driver_phone || null,
        notes: vehicleFormData.notes || null,
        status: 'confirmed' as const,
      }

      if (vehicleEditMode && editingVehicleSchedule) {
        await updateFleetSchedule(editingVehicleSchedule.id, data)
        await alert('調度更新成功', 'success')
      } else {
        await createFleetSchedule(data as Parameters<typeof createFleetSchedule>[0])
        await alert('調度建立成功', 'success')
      }
      setVehicleDialogOpen(false)
      setVehicleFormData(emptyVehicleScheduleForm)
    } catch (error) {
      logger.error('儲存車輛調度失敗:', error)
      await alert('儲存失敗', 'error')
    }
  }, [vehicleFormData, vehicleEditMode, editingVehicleSchedule, checkVehicleConflict])

  // ========== 領隊調度操作 ==========
  const handleAddLeaderSchedule = useCallback((leaderId: string, date: string) => {
    setLeaderEditMode(false)
    setEditingLeaderSchedule(null)
    setLeaderFormData({
      ...emptyLeaderScheduleForm,
      leader_id: leaderId,
      start_date: date,
      end_date: date,
    })
    setLeaderDialogOpen(true)
  }, [])

  const handleEditLeaderSchedule = useCallback((schedule: LeaderSchedule) => {
    setLeaderEditMode(true)
    setEditingLeaderSchedule(schedule)
    setLeaderFormData({
      leader_id: schedule.leader_id,
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      tour_id: schedule.tour_id || '',
      tour_name: schedule.tour_name || '',
      tour_code: schedule.tour_code || '',
      destination: schedule.destination || '',
      notes: schedule.notes || '',
    })
    setLeaderDialogOpen(true)
  }, [])

  const handleDeleteLeaderScheduleItem = useCallback(async (schedule: LeaderSchedule) => {
    const confirmed = await confirm(`確定要刪除此調度嗎？\n${schedule.tour_name || '未命名行程'}`, {
      title: '刪除調度',
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteLeaderSchedule(schedule.id)
      await alert('調度已刪除', 'success')
    } catch (error) {
      logger.error('刪除領隊調度失敗:', error)
      await alert('刪除失敗', 'error')
    }
  }, [])

  const handleLeaderFormChange = useCallback(
    <K extends keyof LeaderScheduleFormData>(field: K, value: LeaderScheduleFormData[K]) => {
      setLeaderFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleLeaderSubmit = useCallback(async () => {
    try {
      // 檢查衝突
      const hasConflict = await checkLeaderConflict(
        leaderFormData.leader_id,
        leaderFormData.start_date,
        leaderFormData.end_date,
        leaderEditMode ? editingLeaderSchedule?.id : undefined
      )

      if (hasConflict) {
        const proceed = await confirm('此領隊在選擇的日期範圍內已有其他調度，確定要繼續嗎？', {
          title: '調度衝突',
          type: 'warning',
        })
        if (!proceed) return
      }

      const data = {
        leader_id: leaderFormData.leader_id,
        start_date: leaderFormData.start_date,
        end_date: leaderFormData.end_date,
        tour_id: leaderFormData.tour_id || null,
        tour_name: leaderFormData.tour_name || null,
        tour_code: leaderFormData.tour_code || null,
        destination: leaderFormData.destination || null,
        notes: leaderFormData.notes || null,
        status: 'confirmed' as const,
      }

      if (leaderEditMode && editingLeaderSchedule) {
        await updateLeaderSchedule(editingLeaderSchedule.id, data)
        await alert('調度更新成功', 'success')
      } else {
        await createLeaderSchedule(data as Parameters<typeof createLeaderSchedule>[0])
        await alert('調度建立成功', 'success')
      }
      setLeaderDialogOpen(false)
      setLeaderFormData(emptyLeaderScheduleForm)
    } catch (error) {
      logger.error('儲存領隊調度失敗:', error)
      await alert('儲存失敗', 'error')
    }
  }, [leaderFormData, leaderEditMode, editingLeaderSchedule, checkLeaderConflict])

  return (
    <ContentPageLayout
      title={SCHEDULING_LABELS.LABEL_7493}
      icon={Calendar}
      breadcrumb={[
        { label: SCHEDULING_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
        { label: SCHEDULING_LABELS.BREADCRUMB_SCHEDULING, href: '/scheduling' },
      ]}
      headerActions={
        <div className="flex items-center gap-4">
          {/* 資源類型切換 */}
          <div className="flex items-center gap-1">
            <Button
              variant={activeTab === 'vehicles' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('vehicles')}
              className={
                activeTab === 'vehicles'
                  ? 'bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-1'
                  : 'gap-1'
              }
            >
              <Bus size={14} />
              {SCHEDULING_LABELS.LABEL_2119}
            </Button>
            <Button
              variant={activeTab === 'leaders' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('leaders')}
              className={
                activeTab === 'leaders'
                  ? 'bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-1'
                  : 'gap-1'
              }
            >
              <Users size={14} />
              {SCHEDULING_LABELS.LABEL_1098}
            </Button>
          </div>

          {/* 日期導航 */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={navigatePrev}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateToday}>
              {SCHEDULING_LABELS.LABEL_6113}
            </Button>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRight size={16} />
            </Button>
            <span className="ml-2 text-sm font-medium text-morandi-primary whitespace-nowrap">
              {dateRangeTitle}
            </span>
          </div>

          {/* 視圖切換 */}
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
              className={
                viewMode === 'week' ? 'bg-morandi-gold hover:bg-morandi-gold-hover text-white' : ''
              }
            >
              {SCHEDULING_LABELS.LABEL_8946}
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
              className={
                viewMode === 'month' ? 'bg-morandi-gold hover:bg-morandi-gold-hover text-white' : ''
              }
            >
              {SCHEDULING_LABELS.LABEL_6426}
            </Button>
          </div>
        </div>
      }
    >
      {/* 需求甘特圖 - 左邊需求列表，右邊資源庫存 */}
      <div className="flex-1 min-h-0 pb-4">
        <RequirementGanttChart
          type={activeTab === 'vehicles' ? 'vehicle' : 'leader'}
          requests={activeTab === 'vehicles' ? transportRequests : guideRequests}
          dateRange={dateRange}
          viewMode={viewMode}
          vehicles={vehicles}
          leaders={leaders}
          leaderAvailability={leaderAvailability}
          supplierResources={supplierResources}
          onAssign={handleAssignResource}
        />
      </div>

      {/* 車輛調度 Dialog */}
      <VehicleScheduleDialog
        isOpen={vehicleDialogOpen}
        isEditMode={vehicleEditMode}
        onClose={() => setVehicleDialogOpen(false)}
        formData={vehicleFormData}
        vehicles={vehicles}
        onFormFieldChange={handleVehicleFormChange}
        onSubmit={handleVehicleSubmit}
      />

      {/* 領隊調度 Dialog */}
      <LeaderScheduleDialog
        isOpen={leaderDialogOpen}
        isEditMode={leaderEditMode}
        onClose={() => setLeaderDialogOpen(false)}
        formData={leaderFormData}
        leaders={leaders}
        onFormFieldChange={handleLeaderFormChange}
        onSubmit={handleLeaderSubmit}
      />
    </ContentPageLayout>
  )
}
