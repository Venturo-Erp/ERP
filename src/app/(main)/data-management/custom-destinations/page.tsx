'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, Edit2, Trash2, Plus } from 'lucide-react'
import { TableColumn } from '@/components/ui/enhanced-table'
import { ActionCell } from '@/components/table-cells'
import { ConfirmDialog } from '@/components/dialog/confirm-dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { toast } from 'sonner'
import {
  useCustomDestinations,
  deleteCustomDestination,
  invalidateCustomDestinations,
  CustomDestination,
} from '@/data/entities/custom-destinations'
import { CustomDestinationForm } from '@/features/custom-destinations/components/CustomDestinationForm'

export default function CustomDestinationsPage() {
  const { items: destinations, loading } = useCustomDestinations()
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const { confirm, confirmDialogProps } = useConfirmDialog()

  // 取得所有城市清單
  const cities = useMemo(() => {
    const citySet = new Set(destinations.map(d => d.city))
    return ['all', ...Array.from(citySet).sort()]
  }, [destinations])

  // 過濾後的景點
  const filteredDestinations = useMemo(() => {
    if (selectedCity === 'all') return destinations
    return destinations.filter(d => d.city === selectedCity)
  }, [destinations, selectedCity])

  const handleDelete = async (destination: CustomDestination, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    const confirmed = await confirm({
      type: 'danger',
      title: '刪除景點',
      message: `確定要刪除「${destination.name}」嗎？`,
      details: ['此操作無法復原'],
      confirmLabel: '確定刪除',
      cancelLabel: '取消',
    })

    if (!confirmed) return

    try {
      await deleteCustomDestination(destination.id)
      await invalidateCustomDestinations()
      toast.success('景點已刪除')
    } catch (err) {
      toast.error('刪除失敗')
    }
  }

  const columns: TableColumn<CustomDestination>[] = useMemo(
    () => [
      {
        key: 'city',
        label: '城市',
        sortable: true,
        render: value => <span className="font-medium text-morandi-primary">{String(value)}</span>,
      },
      {
        key: 'name',
        label: '景點名稱',
        sortable: true,
        render: value => <span className="font-medium">{String(value)}</span>,
      },
      {
        key: 'category',
        label: '類型',
        sortable: true,
        render: value => {
          if (!value) return <span className="text-morandi-muted text-sm">未分類</span>
          const categoryColors: Record<string, string> = {
            文化: 'bg-purple-100 text-purple-700',
            美食: 'bg-orange-100 text-orange-700',
            自然: 'bg-green-100 text-green-700',
            購物: 'bg-blue-100 text-blue-700',
          }
          const color = categoryColors[String(value)] || 'bg-gray-100 text-gray-700'
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
              {String(value)}
            </span>
          )
        },
      },
      {
        key: 'tags',
        label: '標籤',
        sortable: false,
        render: (value: unknown) => {
          const tags = Array.isArray(value) ? value : []
          if (tags.length === 0)
            return <span className="text-morandi-muted text-sm">無標籤</span>
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-xs bg-morandi-container text-morandi-primary"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-morandi-muted">+{tags.length - 3}</span>
              )}
            </div>
          )
        },
      },
      {
        key: 'description',
        label: '簡介',
        sortable: false,
        render: value => {
          if (!value) return <span className="text-morandi-muted text-sm">無</span>
          return (
            <span className="text-sm text-morandi-secondary line-clamp-2">
              {String(value)}
            </span>
          )
        },
      },
    ],
    []
  )

  const renderActions = useCallback(
    (destination: CustomDestination) => (
      <ActionCell
        actions={[
          {
            icon: Edit2,
            label: '編輯',
            onClick: () => setSelectedDestination(destination.id),
          },
          {
            icon: Trash2,
            label: '刪除',
            onClick: () => handleDelete(destination),
            variant: 'danger',
          },
        ]}
      />
    ),
    []
  )

  return (
    <>
      <ListPageLayout
        title="客製化景點管理"
        icon={MapPin}
        data={filteredDestinations}
        columns={columns}
        searchFields={['name', 'city', 'description'] as (keyof CustomDestination)[]}
        searchPlaceholder="搜尋景點名稱或城市..."
        onRowClick={dest => setSelectedDestination(dest.id)}
        renderActions={renderActions}
        bordered={true}
        loading={loading}
        defaultSort={{ key: 'city', direction: 'asc' }}
        headerActions={
          <div className="flex gap-3 items-center">
            {/* 城市篩選 */}
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="px-3 py-2 border border-morandi-border rounded-lg text-sm bg-white"
            >
              <option value="all">所有城市 ({destinations.length})</option>
              {cities
                .filter(c => c !== 'all')
                .map(city => (
                  <option key={city} value={city}>
                    {city} ({destinations.filter(d => d.city === city).length})
                  </option>
                ))}
            </select>

            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增景點
            </Button>
          </div>
        }
      />

      {/* 編輯 Dialog */}
      {selectedDestination && (
        <Dialog open={true} onOpenChange={() => setSelectedDestination(null)}>
          <DialogContent level={1} className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>編輯景點</DialogTitle>
            </DialogHeader>
            <CustomDestinationForm
              destinationId={selectedDestination}
              onSubmit={() => {
                setSelectedDestination(null)
                invalidateCustomDestinations()
              }}
              onCancel={() => setSelectedDestination(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 新增 Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent level={1} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增景點</DialogTitle>
          </DialogHeader>
          <CustomDestinationForm
            onSubmit={() => {
              setIsAddDialogOpen(false)
              invalidateCustomDestinations()
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmDialogProps} />
    </>
  )
}
