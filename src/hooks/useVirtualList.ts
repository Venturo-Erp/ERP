'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useCallback } from 'react'

interface UseVirtualListOptions<T> {
  /** 資料陣列 */
  data: T[]
  /** 每行預估高度 (px) */
  estimateSize?: number
  /** 超出可視區域的額外渲染行數 */
  overscan?: number
}

/**
 * 虛擬列表 Hook
 * 用於優化大量資料的列表渲染
 *
 * @example
 * ```tsx
 * const { parentRef, virtualItems, totalSize, measureElement } = useVirtualList({
 *   data: items,
 *   estimateSize: 50,
 * })
 *
 * return (
 *   <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
 *     <div style={{ height: totalSize, position: 'relative' }}>
 *       {virtualItems.map((virtualRow) => (
 *         <div
 *           key={virtualRow.key}
 *           ref={measureElement}
 *           data-index={virtualRow.index}
 *           style={{
 *             position: 'absolute',
 *             top: virtualRow.start,
 *             width: '100%',
 *           }}
 *         >
 *           {data[virtualRow.index].name}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * )
 * ```
 */
export function useVirtualList<T>({
  data,
  estimateSize = 50,
  overscan = 5,
}: UseVirtualListOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  const measureElement = useCallback(
    (node: HTMLElement | null) => {
      if (node) {
        const index = parseInt(node.dataset.index || '0', 10)
        virtualizer.measureElement(node)
      }
    },
    [virtualizer]
  )

  return {
    parentRef,
    virtualItems,
    totalSize,
    measureElement,
    virtualizer,
  }
}

/**
 * 虛擬表格 Hook
 * 專門用於表格的虛擬化
 */
function useVirtualTable<T>({
  data,
  estimateSize = 48,
  overscan = 10,
}: UseVirtualListOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  return {
    parentRef,
    rows: rowVirtualizer.getVirtualItems(),
    totalSize: rowVirtualizer.getTotalSize(),
    virtualizer: rowVirtualizer,
  }
}
