'use client'
/**
 * FleetDriverList - 司機列表
 */

import React from 'react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2, AlertTriangle, Phone } from 'lucide-react'
import type { FleetDriver, DriverStatus } from '@/types/fleet.types'
import { getDaysUntilDue, getDueStatusColor } from '@/types/fleet.types'
import { formatDate } from '@/lib/utils/format-date'
import { FLEET_LABELS } from './constants/labels'

interface FleetDriverListProps {
  items: FleetDriver[]
  loading?: boolean
  onEdit?: (item: FleetDriver) => void
  onDelete?: (item: FleetDriver) => void
}

const STATUS_CONFIG: Record<
  DriverStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  active: { label: '在職', variant: 'default' },
  inactive: { label: '離職', variant: 'secondary' },
  suspended: { label: '停權', variant: 'destructive' },
}

export const FleetDriverList: React.FC<FleetDriverListProps> = ({
  items,
  loading = false,
  onEdit,
  onDelete,
}) => {
  const columns: TableColumn[] = [
    {
      key: 'name',
      label: '姓名',
      sortable: true,
      render: (value, row) => {
        const item = row as FleetDriver
        return (
          <div>
            <span className="font-medium text-morandi-primary">{String(value || '-')}</span>
            {item.phone && (
              <div className="flex items-center gap-1 text-xs text-morandi-secondary">
                <Phone size={12} />
                {item.phone}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'license_number',
      label: '駕照號碼',
      sortable: true,
      render: (value, row) => {
        const item = row as FleetDriver
        if (!value) return <span className="text-morandi-muted">-</span>
        return (
          <div>
            <span className="font-mono text-morandi-primary">{String(value)}</span>
            <div className="text-xs text-morandi-secondary">
              {item.license_type === 'professional' ? '職業駕照' : '普通駕照'}
            </div>
          </div>
        )
      },
    },
    {
      key: 'license_expiry_date',
      label: '駕照到期',
      sortable: true,
      render: value => {
        if (!value) return <span className="text-morandi-muted">-</span>
        const days = getDaysUntilDue(value as string)
        const colorClass = getDueStatusColor(days)
        return (
          <div className="flex items-center gap-1">
            {days !== null && days <= 30 && <AlertTriangle size={14} className={colorClass} />}
            <span className={colorClass}>{formatDate(value as string)}</span>
          </div>
        )
      },
    },
    {
      key: 'professional_license_expiry',
      label: '職業駕照到期',
      sortable: true,
      render: value => {
        if (!value) return <span className="text-morandi-muted">-</span>
        const days = getDaysUntilDue(value as string)
        const colorClass = getDueStatusColor(days)
        return (
          <div className="flex items-center gap-1">
            {days !== null && days <= 30 && <AlertTriangle size={14} className={colorClass} />}
            <span className={colorClass}>{formatDate(value as string)}</span>
          </div>
        )
      },
    },
    {
      key: 'health_check_expiry',
      label: '體檢到期',
      sortable: true,
      render: value => {
        if (!value) return <span className="text-morandi-muted">-</span>
        const days = getDaysUntilDue(value as string)
        const colorClass = getDueStatusColor(days)
        return (
          <div className="flex items-center gap-1">
            {days !== null && days <= 30 && <AlertTriangle size={14} className={colorClass} />}
            <span className={colorClass}>{formatDate(value as string)}</span>
          </div>
        )
      },
    },
    {
      key: 'status',
      label: '狀態',
      sortable: true,
      width: '100px',
      render: value => {
        const status = (value || 'active') as DriverStatus
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.active
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
        const item = row as FleetDriver
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
