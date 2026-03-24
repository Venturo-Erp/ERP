'use client'
/**
 * SuppliersList - 供應商列表（含類別顯示）
 */

import React, { useState, useEffect } from 'react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, MessageCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Supplier } from '../types'
import { LABELS } from '../constants/labels'
import { SUPPLIER_TYPE_LABELS } from '../constants/labels'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
  const [lineGroups, setLineGroups] = useState<
    { group_id: string; group_name: string | null; supplier_id: string | null }[]
  >([])
  const [bindingSupplier, setBindingSupplier] = useState<Supplier | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const supabase = createSupabaseBrowserClient()

  // 載入 LINE 群組
  useEffect(() => {
    const loadGroups = async () => {
      const { data } = await supabase
        .from('line_groups')
        .select('group_id, group_name, supplier_id')
      if (data) setLineGroups(data)
    }
    loadGroups()
  }, [])

  // 取得供應商綁定的群組名稱
  const getGroupName = (supplierId: string) => {
    const group = lineGroups.find(g => g.supplier_id === supplierId)
    return group?.group_name || null
  }

  // 綁定群組
  const handleBindGroup = async () => {
    if (!bindingSupplier || !selectedGroupId) return

    try {
      // 先解除其他供應商對這個群組的綁定
      await supabase
        .from('line_groups')
        .update({ supplier_id: null })
        .eq('group_id', selectedGroupId)

      // 綁定到當前供應商
      await supabase
        .from('line_groups')
        .update({ supplier_id: bindingSupplier.id })
        .eq('group_id', selectedGroupId)

      // 更新本地狀態
      setLineGroups(prev =>
        prev.map(g => ({
          ...g,
          supplier_id:
            g.group_id === selectedGroupId
              ? bindingSupplier.id
              : g.supplier_id === bindingSupplier.id
                ? null
                : g.supplier_id,
        }))
      )

      toast.success(`已綁定 LINE 群組`)
      setBindingSupplier(null)
      setSelectedGroupId('')
    } catch (err) {
      toast.error('綁定失敗')
    }
  }

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
    {
      key: 'line_group',
      label: 'LINE 群組',
      sortable: false,
      render: (_value, row) => {
        const supplier = row as Supplier
        const groupName = getGroupName(supplier.id)
        if (groupName) {
          return (
            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {groupName}
            </span>
          )
        }
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={e => {
              e.stopPropagation()
              setBindingSupplier(supplier)
            }}
          >
            綁定群組
          </Button>
        )
      },
    },
  ]

  // 可用群組（未綁定 + 當前供應商綁定的）
  const availableGroups = lineGroups.filter(
    g => !g.supplier_id || g.supplier_id === bindingSupplier?.id
  )

  return (
    <>
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
                  <Pencil size={16} />
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

      {/* LINE 群組綁定 Dialog */}
      <Dialog open={!!bindingSupplier} onOpenChange={() => setBindingSupplier(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              綁定 LINE 群組
            </DialogTitle>
          </DialogHeader>
          {bindingSupplier && (
            <div className="space-y-4">
              <p className="text-sm text-morandi-secondary">
                為「<span className="font-medium text-morandi-primary">{bindingSupplier.name}</span>
                」選擇 LINE 群組
              </p>

              {availableGroups.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
                  目前沒有可綁定的群組。請先將 VENTURO 數位助理加入 LINE 群組。
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableGroups.map(group => (
                    <button
                      key={group.group_id}
                      className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                        selectedGroupId === group.group_id
                          ? 'border-green-500 bg-green-50'
                          : 'border-border hover:border-green-300 hover:bg-green-50/50'
                      }`}
                      onClick={() => setSelectedGroupId(group.group_id)}
                    >
                      <div className="font-medium">
                        {group.group_name || group.group_id.slice(0, 12)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setBindingSupplier(null)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={!selectedGroupId}
                  onClick={handleBindGroup}
                >
                  確認綁定
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
