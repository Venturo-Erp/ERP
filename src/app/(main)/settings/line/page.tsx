'use client'

import React, { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Combobox } from '@/components/ui/combobox'
import { MessageCircle, Users, Link2, Unlink } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useSuppliersSlim } from '@/data'
import { toast } from 'sonner'
import { SettingsTabs } from '../components/SettingsTabs'

interface LineGroup {
  id: string
  group_id: string
  group_name: string | null
  member_count: number | null
  supplier_id: string | null
  joined_at: string | null
}

export default function LineSettingsPage() {
  const [groups, setGroups] = useState<LineGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [bindingGroup, setBindingGroup] = useState<LineGroup | null>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const { items: suppliers } = useSuppliersSlim()
  const supabase = createSupabaseBrowserClient()

  // 載入群組
  const loadGroups = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('line_groups')
      .select('*')
      .order('joined_at', { ascending: false })
    if (data) setGroups(data)
    setLoading(false)
  }

  useEffect(() => {
    loadGroups()
  }, [])

  // 取得供應商名稱
  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return null
    const supplier = suppliers.find(s => s.id === supplierId)
    return supplier?.name || null
  }

  // 綁定供應商
  const handleBind = async () => {
    if (!bindingGroup || !selectedSupplierId) return

    try {
      await supabase
        .from('line_groups')
        .update({ supplier_id: selectedSupplierId })
        .eq('id', bindingGroup.id)

      setGroups(prev =>
        prev.map(g =>
          g.id === bindingGroup.id ? { ...g, supplier_id: selectedSupplierId } : g
        )
      )
      toast.success('綁定成功')
      setBindingGroup(null)
      setSelectedSupplierId('')
    } catch {
      toast.error('綁定失敗')
    }
  }

  // 解除綁定
  const handleUnbind = async (group: LineGroup) => {
    try {
      await supabase
        .from('line_groups')
        .update({ supplier_id: null })
        .eq('id', group.id)

      setGroups(prev =>
        prev.map(g => (g.id === group.id ? { ...g, supplier_id: null } : g))
      )
      toast.success('已解除綁定')
    } catch {
      toast.error('解除失敗')
    }
  }

  // 統計
  const boundCount = groups.filter(g => g.supplier_id).length
  const unboundCount = groups.filter(g => !g.supplier_id).length

  // 供應商選項
  const supplierOptions = suppliers.map(s => ({
    value: s.id,
    label: s.name || '未命名供應商',
  }))

  const columns: TableColumn[] = [
    {
      key: 'group_name',
      label: '群組名稱',
      sortable: true,
      render: (value, row) => {
        const group = row as LineGroup
        return (
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span className="font-medium">{String(value) || group.group_id.slice(0, 12)}</span>
          </div>
        )
      },
    },
    {
      key: 'member_count',
      label: '成員數',
      sortable: true,
      render: value => (
        <div className="flex items-center gap-1 text-morandi-secondary">
          <Users className="w-4 h-4" />
          <span>{String(value ?? '-')}</span>
        </div>
      ),
    },
    {
      key: 'supplier_id',
      label: '綁定供應商',
      sortable: false,
      render: (value, row) => {
        const supplierName = getSupplierName(value as string | null)
        if (supplierName) {
          return (
            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
              ✅ {supplierName}
            </span>
          )
        }
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
            ⚠️ 未綁定
          </span>
        )
      },
    },
    {
      key: 'joined_at',
      label: '加入時間',
      sortable: true,
      render: value => {
        if (!value) return '-'
        return new Date(value as string).toLocaleDateString('zh-TW')
      },
    },
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <SettingsTabs />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-morandi-primary flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            LINE 群組管理
          </h2>
          <p className="text-sm text-morandi-secondary mt-1">
            Bot 已加入 {groups.length} 個群組，{boundCount} 個已綁定，{unboundCount} 個待綁定
          </p>
        </div>
      </div>
      <EnhancedTable
        columns={columns}
        data={groups}
        loading={loading}
        actions={row => {
          const group = row as LineGroup
          if (group.supplier_id) {
            return (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => handleUnbind(group)}
              >
                <Unlink className="w-4 h-4 mr-1" />
                解除
              </Button>
            )
          }
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-green-600 hover:bg-green-50"
              onClick={() => {
                setBindingGroup(group)
                setSelectedSupplierId('')
              }}
            >
              <Link2 className="w-4 h-4 mr-1" />
              綁定
            </Button>
          )
        }}
      />

      {/* 綁定 Dialog */}
      <Dialog open={!!bindingGroup} onOpenChange={() => setBindingGroup(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-green-600" />
              綁定供應商
            </DialogTitle>
          </DialogHeader>
          {bindingGroup && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-sm text-morandi-secondary">群組</p>
                <p className="font-medium">
                  {bindingGroup.group_name || bindingGroup.group_id.slice(0, 12)}
                </p>
              </div>

              <div>
                <p className="text-sm text-morandi-secondary mb-2">選擇供應商</p>
                <Combobox
                  options={supplierOptions}
                  value={selectedSupplierId}
                  onChange={setSelectedSupplierId}
                  placeholder="搜尋供應商..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setBindingGroup(null)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={!selectedSupplierId}
                  onClick={handleBind}
                >
                  確認綁定
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
