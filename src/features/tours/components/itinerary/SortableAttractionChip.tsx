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

export function SortableAttractionChip({ id, name, onRemove }: SortableAttractionChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

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
        bg-blue-50 border border-blue-200 text-blue-700
        text-sm cursor-grab active:cursor-grabbing
        hover:bg-blue-100 hover:border-blue-300
        transition-colors
        ${isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}
      `}
    >
      <GripVertical
        size={12}
        className="text-blue-400 shrink-0 cursor-grab"
        {...attributes}
        {...listeners}
      />
      <span className="truncate max-w-[120px]">{name}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="hover:text-destructive opacity-40 hover:opacity-100 transition-opacity ml-0.5"
      >
        <X size={10} />
      </button>
    </div>
  )
}
