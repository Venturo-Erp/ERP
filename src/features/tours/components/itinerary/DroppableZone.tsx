'use client'

import { useDroppable } from '@dnd-kit/core'

export type DropZoneAcceptType = 'attraction' | 'hotel' | 'restaurant'

interface DroppableZoneProps {
  id: string
  acceptType: DropZoneAcceptType
  children: React.ReactNode
  className?: string
}

export function DroppableZone({ id, acceptType, children, className }: DroppableZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: { acceptType },
  })

  const draggedType = active?.data.current?.type as string | undefined
  // 景點卡片（itinerary-attraction）也算 attraction 類型
  const normalizedType = draggedType === 'itinerary-attraction' ? 'attraction' : draggedType
  const isCompatible = normalizedType === acceptType
  const showHighlight = isOver && isCompatible
  const showReject = isOver && draggedType !== undefined && !isCompatible

  const highlightStyles: Record<DropZoneAcceptType, string> = {
    attraction: 'ring-2 ring-morandi-gold/50 bg-morandi-gold/5',
    hotel: 'ring-2 ring-morandi-gold/40 bg-morandi-gold/5',
    restaurant: 'ring-2 ring-morandi-gold/40 bg-morandi-gold/5',
  }

  return (
    <div
      ref={setNodeRef}
      className={`${className || ''} transition-all duration-150 ${
        showHighlight ? highlightStyles[acceptType] : ''
      }${showReject ? ' ring-1 ring-red-300/40' : ''}`}
    >
      {children}
    </div>
  )
}
