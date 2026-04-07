import { useState, useCallback, useEffect } from 'react'
import { MapPin, Trash2, Power, Edit2, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Attraction } from '../types'
import type { Country, City } from '@/stores/region-store'
import { ATTRACTIONS_LIST_LABELS, SORTABLE_ATTRACTIONS_LIST_LABELS } from '../constants/labels'

// ============================================
// 可拖拽的景點項目組件
// ============================================

interface SortableAttractionItemProps {
  attraction: Attraction
  countries: Country[]
  cities: City[]
  onEdit: (attraction: Attraction) => void
  onToggleStatus: (attraction: Attraction) => void
  onDelete: (id: string) => void
}

function SortableAttractionItem({
  attraction,
  countries,
  cities,
  onEdit,
  onToggleStatus,
  onDelete,
}: SortableAttractionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: attraction.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const country = countries.find(c => c.id === attraction.country_id)
  const city = cities.find(c => c.id === attraction.city_id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow',
        isDragging && 'shadow-lg scale-105'
      )}
    >
      <div className="flex items-center gap-3">
        {/* 拖拽手柄 */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 text-morandi-muted hover:text-morandi-primary cursor-grab active:cursor-grabbing"
          title={SORTABLE_ATTRACTIONS_LIST_LABELS.拖拽排序}
        >
          <GripVertical size={16} />
        </div>

        {/* 景點圖片 */}
        <div className="flex-shrink-0">
          {attraction.images && attraction.images.length > 0 ? (
            <img
              src={attraction.images[0]}
              alt={attraction.name}
              className="w-16 h-12 object-cover rounded border border-border shadow-sm"
            />
          ) : (
            <div className="w-16 h-12 bg-morandi-container/30 rounded border border-border flex items-center justify-center">
              <MapPin size={14} className="text-morandi-muted opacity-40" />
            </div>
          )}
        </div>

        {/* 景點資訊 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-morandi-primary line-clamp-1">{attraction.name}</h3>
              {attraction.english_name && (
                <p className="text-sm text-morandi-muted line-clamp-1 mt-0.5">
                  {attraction.english_name}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-morandi-secondary">
                  {city?.name || attraction.city_id}
                </span>
                {attraction.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-morandi-blue/10 text-morandi-blue">
                    {attraction.category}
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    attraction.is_active
                      ? 'bg-morandi-green/80 text-white'
                      : 'bg-morandi-container text-morandi-secondary'
                  )}
                >
                  {attraction.is_active ? '啟用' : ATTRACTIONS_LIST_LABELS.停用}
                </span>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(attraction)}
                className="h-8 px-2 text-morandi-blue hover:bg-morandi-blue/10"
                title={ATTRACTIONS_LIST_LABELS.編輯}
              >
                <Edit2 size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleStatus(attraction)}
                className="h-8 px-2"
                title={attraction.is_active ? '停用' : ATTRACTIONS_LIST_LABELS.啟用}
              >
                <Power
                  size={14}
                  className={attraction.is_active ? 'text-morandi-green' : 'text-morandi-secondary'}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(attraction.id)}
                className="h-8 px-2 hover:text-morandi-red hover:bg-morandi-red/10"
                title={ATTRACTIONS_LIST_LABELS.刪除}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* 描述 */}
          {attraction.description && (
            <p className="text-sm text-morandi-secondary line-clamp-2 leading-relaxed mt-2">
              {attraction.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 可排序的景點列表主組件
// ============================================

interface SortableAttractionsListProps {
  loading: boolean
  attractions: Attraction[]
  countries: Country[]
  cities: City[]
  onEdit: (attraction: Attraction) => void
  onToggleStatus: (attraction: Attraction) => void
  onDelete: (id: string) => void
  onReorder: (attractions: Attraction[]) => void
}

export function SortableAttractionsList({
  loading,
  attractions,
  countries,
  cities,
  onEdit,
  onToggleStatus,
  onDelete,
  onReorder,
}: SortableAttractionsListProps) {
  const [items, setItems] = useState(attractions)

  // 同步外部資料
  useEffect(() => {
    setItems(attractions)
  }, [attractions])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)

        // 更新 display_order
        const reorderedItems = newItems.map((item, index) => ({
          ...item,
          display_order: index,
        }))

        setItems(reorderedItems)
        onReorder(reorderedItems)
      }
    },
    [items, onReorder]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-morandi-container rounded" />
              <div className="w-16 h-12 bg-morandi-container rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-morandi-container rounded w-1/3" />
                <div className="h-3 bg-morandi-container rounded w-1/2" />
                <div className="h-3 bg-morandi-container rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-morandi-muted">
        <MapPin size={48} className="mx-auto mb-4 opacity-50" />
        <p>{SORTABLE_ATTRACTIONS_LIST_LABELS.EMPTY_2193}</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map(attraction => (
            <SortableAttractionItem
              key={attraction.id}
              attraction={attraction}
              countries={countries}
              cities={cities}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
