'use client'
/**
 * SuppliersList - 供應商列表（含類別顯示）
 */

import React from 'react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2 } from 'lucide-react'
import { Supplier } from '../types'
import { LABELS } from '../constants/labels'
import { SUPPLIER_TYPE_LABELS } from '../constants/labels'

interface SuppliersListProps {
  suppliers: Supplier[]
  loading?: boolean
  onEdit?: (supplier: Supplier) => void
  onDelete?: (supplier: Supplier) => void
}

// 供應商類型中文對應
const TYPE_LABELS: Record<string, string> = {
  hotel: SUPPLIER_TYPE_LABELS.HOTEL,
  restaurant: SUPPLIER_TYPE_LABELS.RESTAURANT,
  transport: SUPPLIER_TYPE_LABELS.TRANSPORTATION,
  attraction: SUPPLIER_TYPE_LABELS.ATTRACTION,
  guide: SUPPLIER_TYPE_LABELS.GUIDE,
  agency: SUPPLIER_TYPE_LABELS.TRAVEL_AGENCY,
  ticketing: SUPPLIER_TYPE_LABELS.TICKETING,
  employee: SUPPLIER_TYPE_LABELS.EMPLOYEE,
  other: SUPPLIER_TYPE_LABELS.OTHER,
}

export const SuppliersList: React.FC<SuppliersListProps> = ({
  suppliers,
  loading = false,
  onEdit,
  onDelete,
}) => {
  const columns: TableColumn[] = [
    {
      key: 'code',
      label: LABELS.supplierCode,
      sortable: true,
      render: value => (
        <span className="font-mono text-sm text-morandi-secondary">{String(value || '-')}</span>
      ),
    },
    {
      key: 'name',
      label: LABELS.supplierName,
      sortable: true,
      render: value => (
        <span className="font-medium text-morandi-primary">{String(value || '')}</span>
      ),
    },
    {
      key: 'bank_code_legacy',
      label: '銀行代碼',
      sortable: true,
      render: value => <span className="text-morandi-primary">{String(value || '-')}</span>,
    },
    {
      key: 'bank_account',
      label: LABELS.bankAccount,
      sortable: true,
      render: value => <span className="text-morandi-secondary">{String(value || '-')}</span>,
    },
    {
      key: 'notes',
      label: LABELS.notes,
      sortable: false,
      render: value => <span className="text-sm text-morandi-muted">{String(value || '-')}</span>,
    },
  ]

  return (
    <EnhancedTable
      className="min-h-full"
      columns={columns}
      data={suppliers}
      loading={loading}
      actions={row => {
        const supplier = row as Supplier
        return (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onEdit(supplier)
                }}
                className="text-morandi-blue hover:bg-morandi-blue/10"
                title={LABELS.edit}
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
                  onDelete(supplier)
                }}
                className="text-morandi-red hover:bg-morandi-red/10"
                title={LABELS.delete}
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
