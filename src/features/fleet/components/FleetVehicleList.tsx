'use client'
/**
 * FleetVehicleList - 車輛列表
 */

import React from 'react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2, AlertTriangle, Calendar } from 'lucide-react'
import type { FleetVehicle, FleetDriver, VehicleType, VehicleStatus } from '@/types/fleet.types'
import { getVehicleTypeLabel, getDaysUntilDue, getDueStatusColor } from '@/types/fleet.types'
import { formatDate } from '@/lib/utils/format-date'
import { FLEET_LABELS } from './constants/labels'

interface FleetVehicleListProps {
  items: FleetVehicle[]
  drivers: FleetDriver[]
  loading?: boolean
  onEdit?: (item: FleetVehicle) => void
  onDelete?: (item: FleetVehicle) => void
}

const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  available: { label: '可用', variant: 'default' },
  in_use: { label: '使用中', variant: 'outline' },
  maintenance: { label: '維修中', variant: 'destructive' },
  retired: { label: '已停用', variant: 'secondary' },
}

const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  large_bus: '🚌',
  medium_bus: '🚐',
  mini_bus: '🚐',
  van: '🚙',
  car: '🚗',
}

export const FleetVehicleList: React.FC<FleetVehicleListProps> = ({
  items,
  drivers,
  loading = false,
  onEdit,
  onDelete,
}) => {
  // 根據 driver id 找司機名稱
  const getDriverName = (driverId: string | null) => {
    if (!driverId) return null
    const driver = drivers.find(d => d.id === driverId)
    return driver?.name || null
  }

  const columns: TableColumn[] = [
    {
      key: 'license_plate',
      label: '車牌號碼',
      sortable: true,
      render: (value, row) => {
        const item = row as FleetVehicle
        return (
          <div className="flex items-center gap-2">
            <span className="text-lg">{VEHICLE_TYPE_ICONS[item.vehicle_type] || '🚌'}</span>
            <div>
              <span className="font-mono font-medium text-morandi-primary">
                {String(value || '-')}
              </span>
              {item.vehicle_name && (
                <div className="text-xs text-morandi-secondary">{item.vehicle_name}</div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'vehicle_type',
      label: '車型',
      sortable: true,
      render: (_, row) => {
        const item = row as FleetVehicle
        return (
          <div>
            <span className="text-morandi-primary">{getVehicleTypeLabel(item.vehicle_type)}</span>
            {item.brand && (
              <div className="text-xs text-morandi-secondary">
                {item.brand} {item.model}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'capacity',
      label: '座位',
      sortable: true,
      width: '80px',
      render: value => <span className="text-morandi-primary">{value ? `${value}人` : '-'}</span>,
    },
    {
      key: 'default_driver_id',
      label: '預設司機',
      render: value => {
        const driverName = getDriverName(value as string | null)
        if (!driverName) return <span className="text-morandi-muted">-</span>
        return <span className="text-morandi-primary">{driverName}</span>
      },
    },
    {
      key: 'inspection_due_date',
      label: '驗車到期',
      sortable: true,
      render: value => {
        if (!value) return <span className="text-morandi-muted">-</span>
        const days = getDaysUntilDue(value as string)
        const colorClass = getDueStatusColor(days)
        return (
          <div className="flex items-center gap-1">
            {days !== null && days <= 30 && <AlertTriangle size={14} className={colorClass} />}
            <span className={colorClass}>{formatDate(value as string)}</span>
            {days !== null && (
              <span className={`text-xs ${colorClass}`}>
                ({days < 0 ? `逾期${Math.abs(days)}天` : `${days}天`})
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'insurance_due_date',
      label: '保險到期',
      sortable: true,
      render: value => {
        if (!value) return <span className="text-morandi-muted">-</span>
        const days = getDaysUntilDue(value as string)
        const colorClass = getDueStatusColor(days)
        return (
          <div className="flex items-center gap-1">
            {days !== null && days <= 30 && <Calendar size={14} className={colorClass} />}
            <span className={colorClass}>{formatDate(value as string)}</span>
          </div>
        )
      },
    },
    {
      key: 'current_mileage',
      label: '里程',
      sortable: true,
      render: value => (
        <span className="text-morandi-primary font-mono">
          {value ? `${Number(value).toLocaleString()} km` : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      sortable: true,
      width: '100px',
      render: value => {
        const status = (value || 'available') as VehicleStatus
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.available
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
  ]

  return (
    <EnhancedTable
      className="min-h-full"
      columns={columns}
      data={items}
      loading={loading}
      actions={row => {
        const item = row as FleetVehicle
        return (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onEdit(item)
                }}
                className="text-morandi-gold hover:bg-morandi-gold/10"
                title={FLEET_LABELS.EDIT}
              >
                <Edit2 size={16} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onDelete(item)
                }}
                className="text-morandi-red hover:bg-morandi-red/10"
                title={FLEET_LABELS.DELETE}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        )
      }}
    />
  )
}
