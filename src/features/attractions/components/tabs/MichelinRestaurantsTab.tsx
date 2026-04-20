'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Star, Edit2, Power, Trash2, X, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import {
  useMichelinRestaurants,
  updateMichelinRestaurant,
  deleteMichelinRestaurant,
} from '@/data/entities/michelin-restaurants'
import { toast } from 'sonner'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import { cn } from '@/lib/utils'
import { confirm } from '@/lib/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ATTRACTIONS_LIST_LABELS, MICHELIN_RESTAURANTS_TAB_LABELS } from '../../constants/labels'

interface MichelinRestaurant {
  id: string
  name: string
  english_name?: string
  michelin_stars: number
  country_id: string
  city_id: string
  cuisine_type?: string[]
  price_range?: string
  chef_name?: string
  avg_price_dinner?: number
  currency?: string
  phone?: string
  commission_rate?: number
  is_active: boolean
}

interface MichelinRestaurantsTabProps {
  selectedCountry: string
}

export default function MichelinRestaurantsTab({ selectedCountry }: MichelinRestaurantsTabProps) {
  const { items, loading } = useMichelinRestaurants()
  const restaurants = items as unknown as MichelinRestaurant[]

  const [countries, setCountries] = useState<Array<{ id: string; name: string }>>([])
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([])

  const [editingRestaurant, setEditingRestaurant] = useState<MichelinRestaurant | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // 載入用到的國家和城市資料
  useEffect(() => {
    if (restaurants.length === 0) return

    const countryIds = Array.from(new Set(restaurants.map(r => r.country_id).filter(Boolean)))
    const cityIds = Array.from(new Set(restaurants.map(r => r.city_id).filter(Boolean)))

    if (countryIds.length > 0) {
      supabase
        .from('countries')
        .select('id, name')
        .in('id', countryIds)
        .limit(500)
        .then(({ data }) => {
          if (data) setCountries(data.map(c => ({ id: c.id, name: c.name })))
        })
    }

    if (cityIds.length > 0) {
      supabase
        .from('cities')
        .select('id, name')
        .in('id', cityIds)
        .limit(500)
        .then(({ data }) => {
          if (data) setCities(data.map(c => ({ id: c.id, name: c.name })))
        })
    }
  }, [restaurants])

  // 刪除餐廳
  const handleDelete = async (id: string) => {
    const confirmed = await confirm(MICHELIN_RESTAURANTS_TAB_LABELS.確定要刪除此餐廳, {
      title: MICHELIN_RESTAURANTS_TAB_LABELS.刪除餐廳,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteMichelinRestaurant(id)
      toast.success(MICHELIN_RESTAURANTS_TAB_LABELS.刪除成功)
    } catch (error) {
      logger.error('刪除米其林餐廳失敗:', error)
      toast.error(MICHELIN_RESTAURANTS_TAB_LABELS.刪除失敗)
    }
  }

  // 開啟編輯對話框
  const handleEdit = (restaurant: MichelinRestaurant) => {
    setEditingRestaurant(restaurant)
    setIsEditDialogOpen(true)
  }

  // 關閉編輯對話框
  const handleCloseEdit = () => {
    setEditingRestaurant(null)
    setIsEditDialogOpen(false)
  }

  // 更新餐廳
  const handleUpdate = async (updatedData: Partial<MichelinRestaurant>) => {
    if (!editingRestaurant) return

    try {
      await updateMichelinRestaurant(editingRestaurant.id, updatedData as never)
      handleCloseEdit()
      toast.success(MICHELIN_RESTAURANTS_TAB_LABELS.更新成功)
    } catch (error) {
      logger.error('更新米其林餐廳失敗:', error)
      toast.error(MICHELIN_RESTAURANTS_TAB_LABELS.更新失敗)
    }
  }

  // 切換啟用狀態
  const handleToggleStatus = async (restaurant: MichelinRestaurant) => {
    const newStatus = !restaurant.is_active

    try {
      await updateMichelinRestaurant(restaurant.id, { is_active: newStatus } as never)
      toast.success(newStatus ? '已啟用' : MICHELIN_RESTAURANTS_TAB_LABELS.已停用)
    } catch (error) {
      logger.error('切換米其林餐廳狀態失敗:', error)
      toast.error(MICHELIN_RESTAURANTS_TAB_LABELS.更新失敗)
    }
  }

  // 星星顯示
  const renderStars = (stars: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-status-warning text-status-warning" />
        ))}
      </div>
    )
  }

  // 根據國家篩選餐廳
  const filteredRestaurants = useMemo(() => {
    if (!selectedCountry) return restaurants
    return restaurants.filter(r => r.country_id === selectedCountry)
  }, [restaurants, selectedCountry])

  // 定義表格欄位
  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.餐廳名稱,
        sortable: true,
        render: (_: unknown, restaurant: MichelinRestaurant) => (
          <div className="min-w-[180px]">
            <div className="font-medium text-morandi-primary line-clamp-1">{restaurant.name}</div>
            {restaurant.english_name && (
              <div className="text-xs text-morandi-muted line-clamp-1">
                {restaurant.english_name}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'michelin_stars',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.星級,
        sortable: true,
        render: (_: unknown, restaurant: MichelinRestaurant) =>
          renderStars(restaurant.michelin_stars),
      },
      {
        key: 'city',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.地點,
        sortable: false,
        render: (_: unknown, restaurant: MichelinRestaurant) => {
          const country = countries.find(c => c.id === restaurant.country_id)
          const city = cities.find(c => c.id === restaurant.city_id)
          return (
            <div className="text-sm text-morandi-secondary line-clamp-1">{city?.name || '-'}</div>
          )
        },
      },
      {
        key: 'chef_name',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.主廚,
        sortable: true,
        render: (_: unknown, restaurant: MichelinRestaurant) => (
          <div className="text-sm text-morandi-secondary">{restaurant.chef_name || '-'}</div>
        ),
      },
      {
        key: 'cuisine_type',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.料理類型,
        sortable: false,
        render: (_: unknown, restaurant: MichelinRestaurant) => (
          <div className="flex flex-wrap gap-1 min-w-[120px]">
            {restaurant.cuisine_type?.slice(0, 2).map((cuisine, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-morandi-container text-morandi-secondary"
              >
                {cuisine}
              </span>
            ))}
            {(restaurant.cuisine_type?.length || 0) > 2 && (
              <span className="text-xs text-morandi-muted">
                +{(restaurant.cuisine_type?.length || 0) - 2}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'price',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.價格,
        sortable: false,
        render: (_: unknown, restaurant: MichelinRestaurant) => (
          <div className="text-sm text-morandi-gold font-medium">
            {restaurant.avg_price_dinner
              ? `${restaurant.avg_price_dinner.toLocaleString()} ${restaurant.currency || 'TWD'}`
              : '-'}
          </div>
        ),
      },
      {
        key: 'phone',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.電話,
        sortable: false,
        render: (_: unknown, restaurant: MichelinRestaurant) => (
          <div className="text-sm text-morandi-secondary">{restaurant.phone || '-'}</div>
        ),
      },
      {
        key: 'is_active',
        label: ATTRACTIONS_LIST_LABELS.狀態,
        sortable: true,
        render: (_: unknown, restaurant: MichelinRestaurant) => (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              restaurant.is_active
                ? 'bg-morandi-green/80 text-white'
                : 'bg-morandi-container text-morandi-secondary'
            )}
          >
            {restaurant.is_active ? '啟用' : ATTRACTIONS_LIST_LABELS.停用}
          </span>
        ),
      },
    ],
    [countries, cities]
  )

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <EnhancedTable
            columns={columns as unknown as Parameters<typeof EnhancedTable>[0]['columns']}
            data={filteredRestaurants}
            loading={loading}
            initialPageSize={15}
            onRowClick={handleEdit as (row: unknown) => void}
            actions={(row: unknown) => {
              const restaurant = row as MichelinRestaurant
              return (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleEdit(restaurant)
                    }}
                    className="h-8 px-2 text-morandi-blue hover:bg-morandi-blue/10"
                    title={ATTRACTIONS_LIST_LABELS.編輯}
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleToggleStatus(restaurant)
                    }}
                    className="h-8 px-2"
                    title={restaurant.is_active ? '停用' : ATTRACTIONS_LIST_LABELS.啟用}
                  >
                    <Power
                      size={14}
                      className={
                        restaurant.is_active ? 'text-morandi-green' : 'text-morandi-secondary'
                      }
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleDelete(restaurant.id)
                    }}
                    className="h-8 px-2 hover:text-morandi-red hover:bg-morandi-red/10"
                    title={ATTRACTIONS_LIST_LABELS.刪除}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )
            }}
          />
        </div>
      </div>

      {/* 編輯對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent level={1} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{MICHELIN_RESTAURANTS_TAB_LABELS.EDIT_6298}</DialogTitle>
          </DialogHeader>
          {editingRestaurant && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    {MICHELIN_RESTAURANTS_TAB_LABELS.餐廳名稱}
                  </label>
                  <Input
                    value={editingRestaurant.name}
                    onChange={e =>
                      setEditingRestaurant({ ...editingRestaurant, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {MICHELIN_RESTAURANTS_TAB_LABELS.LABEL_3778}
                  </label>
                  <Input
                    value={editingRestaurant.english_name || ''}
                    onChange={e =>
                      setEditingRestaurant({ ...editingRestaurant, english_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    {MICHELIN_RESTAURANTS_TAB_LABELS.LABEL_9629}
                  </label>
                  <Input
                    value={editingRestaurant.chef_name || ''}
                    onChange={e =>
                      setEditingRestaurant({ ...editingRestaurant, chef_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {MICHELIN_RESTAURANTS_TAB_LABELS.電話}
                  </label>
                  <Input
                    value={editingRestaurant.phone || ''}
                    onChange={e =>
                      setEditingRestaurant({ ...editingRestaurant, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    {MICHELIN_RESTAURANTS_TAB_LABELS.LABEL_5803}
                  </label>
                  <Input
                    type="number"
                    value={editingRestaurant.avg_price_dinner || ''}
                    onChange={e =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        avg_price_dinner: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {MICHELIN_RESTAURANTS_TAB_LABELS.LABEL_3529}
                  </label>
                  <Input
                    value={editingRestaurant.currency || ''}
                    onChange={e =>
                      setEditingRestaurant({ ...editingRestaurant, currency: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEdit} className="gap-2">
              <X size={16} />
              {MICHELIN_RESTAURANTS_TAB_LABELS.CANCEL}
            </Button>
            <Button
              onClick={() => editingRestaurant && handleUpdate(editingRestaurant)}
              className="gap-2"
            >
              <Save size={16} />
              {MICHELIN_RESTAURANTS_TAB_LABELS.SAVE}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
