'use client'
/**
 * ConfirmationsList - 確認單列表組件（使用 EnhancedTable）
 */

import React, { useMemo } from 'react'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateCell } from '@/components/table-cells'
import type { Confirmation } from '@/types/confirmation.types'
import { CONFIRMATIONS_LABELS } from './constants/labels'

interface ConfirmationsListProps {
  confirmations: Confirmation[]
  searchTerm: string
  onConfirmationClick: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export const ConfirmationsList: React.FC<ConfirmationsListProps> = ({
  confirmations,
  searchTerm,
  onConfirmationClick,
  onEdit,
  onDelete,
}) => {
  const tableColumns = useMemo(
    () => [
      {
        key: 'type',
        label: '類型',
        sortable: true,
        render: (_: unknown, row: unknown) => {
          const conf = row as Confirmation
          const typeConfig = {
            flight: { label: '航班', colorClass: 'text-morandi-secondary' },
            accommodation: { label: '住宿', colorClass: 'text-status-warning' },
          }
          const config = typeConfig[conf.type]
          return (
            <span className={cn('text-sm font-medium', config.colorClass)}>{config.label}</span>
          )
        },
      },
      {
        key: 'booking_number',
        label: '訂單編號',
        sortable: true,
        render: (_: unknown, row: unknown) => {
          const conf = row as Confirmation
          return (
            <span className="text-sm font-mono text-morandi-primary">{conf.booking_number}</span>
          )
        },
      },
      {
        key: 'confirmation_number',
        label: '確認單號碼',
        sortable: true,
        render: (_: unknown, row: unknown) => {
          const conf = row as Confirmation
          return (
            <span className="text-sm font-mono text-morandi-secondary">
              {conf.confirmation_number || '-'}
            </span>
          )
        },
      },
      {
        key: 'status',
        label: '狀態',
        sortable: true,
        render: (_: unknown, row: unknown) => {
          const conf = row as Confirmation
          const statusConfig = {
            draft: { label: '草稿', colorClass: 'text-morandi-secondary' },
            confirmed: { label: '已確認', colorClass: 'text-status-info' },
            sent: { label: '已寄出', colorClass: 'text-status-success' },
            cancelled: { label: '已取消', colorClass: 'text-status-danger' },
          }
          const config = statusConfig[conf.status]
          return (
            <span className={cn('text-sm font-medium', config.colorClass)}>{config.label}</span>
          )
        },
      },
      {
        key: 'notes',
        label: '備註',
        sortable: false,
        render: (_: unknown, row: unknown) => {
          const conf = row as Confirmation
          return (
            <span className="text-sm text-morandi-secondary truncate max-w-xs">
              {conf.notes || '-'}
            </span>
          )
        },
      },
      {
        key: 'created_at',
        label: '建立時間',
        sortable: true,
        render: (_: unknown, row: unknown) => {
          const conf = row as Confirmation
          return (
            <DateCell date={conf.created_at} showIcon={false} className="text-morandi-secondary" />
          )
        },
      },
    ],
    []
  )

  return (
    <EnhancedTable
      className="min-h-full"
      columns={tableColumns as unknown as Parameters<typeof EnhancedTable>[0]['columns']}
      data={confirmations}
      searchableFields={['booking_number', 'confirmation_number']}
      searchTerm={searchTerm}
      onRowClick={(row: unknown) => onConfirmationClick((row as Confirmation).id)}
      bordered={true}
      actions={(row: unknown) => {
        const conf = row as Confirmation
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={e => {
                e.stopPropagation()
                onEdit(conf.id)
              }}
              className="text-morandi-gold hover:bg-morandi-gold/10"
              title={CONFIRMATIONS_LABELS.EDIT}
            >
              <Edit2 size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={e => {
                e.stopPropagation()
                onDelete(conf.id)
              }}
              className="text-morandi-red hover:bg-morandi-red/10"
              title={CONFIRMATIONS_LABELS.DELETE}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )
      }}
    />
  )
}
