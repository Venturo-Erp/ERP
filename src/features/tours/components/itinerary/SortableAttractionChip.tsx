'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical } from 'lucide-react'

interface SortableAttractionChipProps {
  id: string
  name: string
  onRemove: () => void
}

export function SortableAttractionChip({ id, name, onRemove, dayIndex }: SortableAttractionChipProps & { dayIndex?: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: 'itinerary-attraction',
      attractionId: id,
      attractionName: name,
      sourceDayIndex: dayIndex,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md
        bg-morandi-gold/10 border border-morandi-gold/30 text-morandi-primary
        text-sm cursor-grab active:cursor-grabbing
        hover:bg-morandi-gold/20 hover:border-morandi-gold/50
        transition-colors
        ${isDragging ? 'shadow-lg ring-2 ring-morandi-gold/60' : ''}
      `}
    >
      <GripVertical
        size={12}
        className="text-morandi-gold/60 shrink-0 cursor-grab"
        {...attributes}
        {...listeners}
      />
      <span className="truncate max-w-[120px]">{name}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="text-morandi-muted hover:text-destructive opacity-60 hover:opacity-100 transition-opacity ml-0.5"
      >
        <X size={10} />
      </button>
    </div>
  )
}
