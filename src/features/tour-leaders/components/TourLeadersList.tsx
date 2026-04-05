'use client'
/**
 * TourLeadersList - 領隊列表
 */

import React from 'react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2, Calendar } from 'lucide-react'
import type { TourLeader } from '@/types/tour-leader.types'
import { TOUR_LEADERS_LABELS } from '../constants/labels'

interface TourLeadersListProps {
  items: TourLeader[]
  loading?: boolean
  onEdit?: (item: TourLeader) => void
  onDelete?: (item: TourLeader) => void
  onAvailability?: (item: TourLeader) => void
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  active: { label: TOUR_LEADERS_LABELS.STATUS_ACTIVE, variant: 'default' },
  inactive: { label: TOUR_LEADERS_LABELS.STATUS_INACTIVE, variant: 'secondary' },
}

export const TourLeadersList: React.FC<TourLeadersListProps> = ({
  items,
  loading = false,
  onEdit,
  onDelete,
  onAvailability,
}) => {
  const columns: TableColumn[] = [
    {
      key: 'code',
      label: TOUR_LEADERS_LABELS.COL_NUMBER,
      sortable: true,
      render: value => (
        <span className="font-mono text-sm text-morandi-secondary">{String(value || '-')}</span>
      ),
    },
    {
      key: 'name',
      label: TOUR_LEADERS_LABELS.COL_NAME,
      sortable: true,
      render: (value, row) => {
        const item = row as TourLeader
        return (
          <div>
            <span className="font-medium text-morandi-primary">{String(value || '')}</span>
            {item.english_name && (
              <span className="ml-2 text-sm text-morandi-muted">({item.english_name})</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'phone',
      label: TOUR_LEADERS_LABELS.COL_PHONE,
      sortable: false,
      render: value => <span className="text-morandi-primary">{String(value || '-')}</span>,
    },
    {
      key: 'languages',
      label: TOUR_LEADERS_LABELS.COL_LANGUAGES,
      sortable: false,
      render: value => {
        const languages = value as string[] | null
        if (!languages || languages.length === 0) return '-'
        return (
          <div className="flex flex-wrap gap-1">
            {languages.slice(0, 3).map((lang, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {lang}
              </Badge>
            ))}
            {languages.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{languages.length - 3}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'specialties',
      label: TOUR_LEADERS_LABELS.COL_SPECIALTY,
      sortable: false,
      render: value => {
        const specialties = value as string[] | null
        if (!specialties || specialties.length === 0) return '-'
        return (
          <div className="flex flex-wrap gap-1">
            {specialties.slice(0, 2).map((spec, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
            {specialties.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{specialties.length - 2}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'license_number',
      label: TOUR_LEADERS_LABELS.COL_LICENSE,
      sortable: false,
      render: value => (
        <span className="text-sm text-morandi-secondary">{String(value || '-')}</span>
      ),
    },
    {
      key: 'status',
      label: TOUR_LEADERS_LABELS.COL_STATUS,
      sortable: true,
      render: value => {
        const status = String(value || 'active')
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
        const item = row as TourLeader
        return (
          <div className="flex items-center gap-1">
            {onAvailability && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onAvailability(item)
                }}
                className="text-morandi-gold hover:bg-morandi-gold/10"
                title={TOUR_LEADERS_LABELS.SCHEDULE_MANAGEMENT}
              >
                <Calendar size={16} />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onEdit(item)
                }}
                className="text-morandi-blue hover:bg-morandi-blue/10"
                title={TOUR_LEADERS_LABELS.EDIT}
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
                title={TOUR_LEADERS_LABELS.DELETE}
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
