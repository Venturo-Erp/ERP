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

export function SortableAttractionChip({
  id,
  name,
  onRemove,
  dayIndex,
  verified,
}: SortableAttractionChipProps & { dayIndex?: number; verified?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: {
      type: 'itinerary-attraction',
      attractionId: id,
      attractionName: name,
      attractionVerified: verified,
      sourceDayIndex: dayIndex,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : ('auto' as const),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md
        text-sm cursor-grab active:cursor-grabbing transition-colors
        ${
          verified === false
            ? 'bg-morandi-gold/10 border border-morandi-gold/50 text-morandi-primary hover:bg-morandi-gold/10 hover:border-morandi-gold'
            : 'bg-morandi-gold/10 border border-morandi-gold/30 text-morandi-primary hover:bg-morandi-gold/20 hover:border-morandi-gold/50'
        }
        ${isDragging ? 'shadow-lg ring-2 ring-morandi-gold/60' : ''}
      `}
    >
      {verified === false && <span className="text-morandi-gold text-xs mr-0.5">⚠</span>}
      <GripVertical
        size={12}
        className={
          verified === false
            ? 'text-morandi-gold/60 shrink-0 cursor-grab'
            : 'text-morandi-gold/60 shrink-0 cursor-grab'
        }
        {...attributes}
        {...listeners}
      />
      <span className="truncate max-w-[120px]">{name}</span>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          onRemove()
        }}
        className="text-morandi-muted hover:text-destructive opacity-60 hover:opacity-100 transition-opacity ml-0.5"
      >
        <X size={10} />
      </button>
    </div>
  )
}
