'use client'
/**
 * SupplierDispatchPage - 供應商派單管理
 *
 * 顯示已確認的需求，可派給司機
 */

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Truck, User, Calendar, MapPin, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { SUPPLIER_LABELS } from './constants/labels'

interface ConfirmedRequest {
  id: string
  request_code: string
  tour_code: string | null
  tour_name: string | null
  category: string
  service_date: string
  title: string
  quantity: number
  notes: string | null
  dispatch_status: 'pending' | 'assigned' | 'completed'
  assigned_driver_id: string | null
  assigned_driver_name: string | null
}

interface Driver {
  id: string
  name: string
  phone: string
  vehicle_plate: string | null
  vehicle_type: string | null
  status: string
}

const DISPATCH_STATUS_CONFIG = {
  pending: { label: SUPPLIER_LABELS.DISPATCH_PENDING, variant: 'outline' as const, icon: Clock },
  assigned: {
    label: SUPPLIER_LABELS.DISPATCH_ASSIGNED,
    variant: 'secondary' as const,
    icon: Truck,
  },
  completed: {
    label: SUPPLIER_LABELS.DISPATCH_COMPLETED,
    variant: 'default' as const,
    icon: CheckCircle2,
  },
}

export function SupplierDispatchPage() {
  const { user } = useAuthStore()
  const [requests, setRequests] = useState<ConfirmedRequest[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ConfirmedRequest | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // 載入已確認的需求（可派單）
  useEffect(() => {
    const loadData = async () => {
      if (!user?.workspace_id) return
      setIsLoading(true)

      try {
        // 載入已確認的需求（從 tour_requests 表）
        const { data: requestsData } = await supabase
          .from('tour_requests')
          .select(
            `
            id,
            code,
            tour_id,
            tour_code,
            tour_name,
            category,
            service_date,
            title,
            quantity,
            notes,
            response_status,
            reply_content,
            assigned_vehicle_id,
            assignee_name
          `
          )
          .eq('recipient_workspace_id', user.workspace_id)
          .eq('response_status', 'accepted')

        // 整理需求資料（generated types are stale, cast to Record）
        const rows = (requestsData || []) as unknown as Array<Record<string, unknown>>
        const confirmedRequests: ConfirmedRequest[] = rows.map(r => {
          const replyContent = r.reply_content as {
            driver_id?: string
            driver_name?: string
            dispatch_status?: string
          } | null

          return {
            id: r.id as string,
            request_code: (r.code as string) || '',
            tour_code: (r.tour_code as string | null) || null,
            tour_name: (r.tour_name as string | null) || null,
            category: (r.category as string) || 'other',
            service_date: (r.service_date as string) || '',
            title: (r.title as string) || '',
            quantity: (r.quantity as number) || 1,
            notes: (r.notes as string | null) || null,
            dispatch_status:
              (replyContent?.dispatch_status as 'pending' | 'assigned' | 'completed') || 'pending',
            assigned_driver_id:
              replyContent?.driver_id || (r.assigned_vehicle_id as string | null) || null,
            assigned_driver_name:
              replyContent?.driver_name || (r.assignee_name as string | null) || null,
          }
        })

        setRequests(confirmedRequests)

        // 載入司機列表
        const { data: driversData } = await supabase
          .from('supplier_employees')
          .select('id, name, phone, vehicle_plate, vehicle_type, is_active')
          .eq('supplier_id', user.workspace_id)
          .eq('role', 'driver')
          .eq('is_active', true)

        // 轉換為 Driver 格式
        const formattedDrivers: Driver[] = (driversData || []).map(d => ({
          id: d.id,
          name: d.name,
          phone: d.phone || '',
          vehicle_plate: d.vehicle_plate,
          vehicle_type: d.vehicle_type,
          status: d.is_active ? 'active' : 'inactive',
        }))
        setDrivers(formattedDrivers)
      } catch (error) {
        logger.error('載入資料失敗:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.workspace_id])

  // 派單給司機
  const handleAssign = async () => {
    if (!selectedRequest || !selectedDriverId) return

    setIsAssigning(true)
    try {
      const driver = drivers.find(d => d.id === selectedDriverId)

      // 取得現有 reply_content 並更新
      const { data: currentData } = await supabase
        .from('tour_requests')
        .select('reply_content')
        .eq('id', selectedRequest.id)
        .single()

      const existingContent = ((currentData as unknown as Record<string, unknown>)?.reply_content ||
        {}) as Record<string, unknown>

      // 更新 reply_content 和 assignee_name（保留現有資料）
      const { error } = await supabase
        .from('tour_requests')
        .update({
          assigned_vehicle_id: selectedDriverId,
          assignee_name: driver?.name || '',
          reply_content: {
            ...existingContent,
            driver_id: selectedDriverId,
            driver_name: driver?.name || '',
            dispatch_status: 'assigned',
            assigned_at: new Date().toISOString(),
          },
        } as Record<string, unknown>)
        .eq('id', selectedRequest.id)

      if (error) throw error

      // 更新本地狀態
      setRequests(prev =>
        prev.map(r =>
          r.id === selectedRequest.id
            ? {
                ...r,
                dispatch_status: 'assigned',
                assigned_driver_id: selectedDriverId,
                assigned_driver_name: driver?.name || null,
              }
            : r
        )
      )

      setSelectedRequest(null)
      setSelectedDriverId('')
    } catch (error) {
      logger.error('派單失敗:', error)
      alert(SUPPLIER_LABELS.ASSIGN_FAILED)
    } finally {
      setIsAssigning(false)
    }
  }

  // 過濾需求
  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'all') return true
    return r.dispatch_status === filterStatus
  })

  // 表格欄位
  const columns: TableColumn<ConfirmedRequest>[] = [
    {
      key: 'service_date',
      label: SUPPLIER_LABELS.COL_SERVICE_DATE,
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-morandi-secondary" />
          <span>
            {row.service_date
              ? format(new Date(row.service_date), 'MM/dd (EEE)', { locale: zhTW })
              : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'tour_code',
      label: SUPPLIER_LABELS.COL_TOUR_CODE,
      width: '120px',
      render: (_, row) => <span className="font-mono text-sm">{row.tour_code || '-'}</span>,
    },
    {
      key: 'title',
      label: SUPPLIER_LABELS.COL_SERVICE_CONTENT,
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.title}</div>
          {row.notes && (
            <div className="text-xs text-morandi-secondary mt-1 truncate max-w-[200px]">
              {row.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      label: SUPPLIER_LABELS.COL_QUANTITY,
      width: '80px',
      render: (_, row) => (
        <span>
          {row.quantity} {SUPPLIER_LABELS.UNIT_VEHICLE}
        </span>
      ),
    },
    {
      key: 'dispatch_status',
      label: SUPPLIER_LABELS.COL_DISPATCH_STATUS,
      width: '100px',
      render: (_, row) => {
        const config = DISPATCH_STATUS_CONFIG[row.dispatch_status]
        const Icon = config.icon
        return (
          <Badge variant={config.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: 'assigned_driver_name',
      label: SUPPLIER_LABELS.COL_ASSIGNED_DRIVER,
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.assigned_driver_name ? (
            <>
              <User className="h-4 w-4 text-morandi-green" />
              <span>{row.assigned_driver_name}</span>
            </>
          ) : (
            <span className="text-morandi-secondary">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: SUPPLIER_LABELS.COL_ACTIONS,
      width: '100px',
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedRequest(row)}
          disabled={row.dispatch_status === 'completed'}
        >
          {row.dispatch_status === 'pending'
            ? SUPPLIER_LABELS.BTN_ASSIGN
            : SUPPLIER_LABELS.BTN_MODIFY}
        </Button>
      ),
    },
  ]

  return (
    <ContentPageLayout title={SUPPLIER_LABELS.MANAGE_5809} icon={Truck}>
      {/* 篩選器 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-morandi-secondary">{SUPPLIER_LABELS.LABEL_7626}</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{SUPPLIER_LABELS.ALL}</SelectItem>
              <SelectItem value="pending">{SUPPLIER_LABELS.LABEL_444}</SelectItem>
              <SelectItem value="assigned">{SUPPLIER_LABELS.LABEL_4291}</SelectItem>
              <SelectItem value="completed">{SUPPLIER_LABELS.LABEL_7255}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <div className="text-sm text-morandi-secondary">
          {SUPPLIER_LABELS.TOTAL_REQUESTS(filteredRequests.length)}
        </div>
      </div>

      {/* 需求表格 */}
      <EnhancedTable
        data={filteredRequests}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={SUPPLIER_LABELS.EMPTY_DISPATCH}
      />

      {/* 派單對話框 */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent level={2}>
          <DialogHeader>
            <DialogTitle>{SUPPLIER_LABELS.LABEL_8625}</DialogTitle>
            <DialogDescription>{SUPPLIER_LABELS.LABEL_2651}</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* 需求資訊 */}
              <div className="p-4 bg-morandi-bg rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-morandi-secondary" />
                  <span>
                    {selectedRequest.service_date
                      ? format(new Date(selectedRequest.service_date), 'yyyy/MM/dd (EEE)', {
                          locale: zhTW,
                        })
                      : '-'}
                  </span>
                </div>
                <div className="font-medium">{selectedRequest.title}</div>
                {selectedRequest.tour_code && (
                  <div className="text-sm text-morandi-secondary">
                    {SUPPLIER_LABELS.TOUR_CODE_LABEL}
                    {selectedRequest.tour_code}
                  </div>
                )}
              </div>

              {/* 司機選擇 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{SUPPLIER_LABELS.SELECT_5145}</label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder={SUPPLIER_LABELS.PLEASE_SELECT_2927} />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{driver.name}</span>
                          {driver.vehicle_plate && (
                            <span className="text-xs text-morandi-secondary">
                              ({driver.vehicle_plate})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {drivers.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-morandi-gold/10 rounded text-sm">
                    <AlertCircle className="h-4 w-4 text-morandi-gold" />
                    <span>{SUPPLIER_LABELS.ADD_9655}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              {SUPPLIER_LABELS.CANCEL}
            </Button>
            <Button onClick={handleAssign} disabled={!selectedDriverId || isAssigning}>
              {isAssigning ? SUPPLIER_LABELS.ASSIGNING : SUPPLIER_LABELS.CONFIRM_ASSIGN}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
