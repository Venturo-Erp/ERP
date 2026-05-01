'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useVirtualList } from '@/hooks/useVirtualList'
import type { TableColumn, RowData } from './types'
import { ENHANCED_TABLE_LABELS } from './constants/labels'

interface VirtualizedTableProps<T extends RowData = RowData> {
  columns: TableColumn<T>[]
  data: T[]
  /** Container height (required for virtualization) */
  height?: string | number
  /** Estimated row height in pixels */
  estimateRowHeight?: number
  /** Number of rows to render outside visible area */
  overscan?: number
  onRowClick?: (row: T, index: number) => void
  onRowDoubleClick?: (row: T, index: number) => void
  actions?: (row: T, index: number) => React.ReactNode
  rowClassName?: (row: T) => string
  striped?: boolean
  hoverable?: boolean
  emptyState?: React.ReactNode
  className?: string
}

/**
 * VirtualizedTable - 虛擬化表格組件
 * 用於渲染大量資料的場景（>100筆）
 * 使用 @tanstack/react-virtual 實現虛擬滾動
 *
 * @example
 * ```tsx
 * <VirtualizedTable
 *   columns={columns}
 *   data={largeDataset}
 *   height={600}
 *   estimateRowHeight={48}
 *   onRowClick={(row) => handleRowClick(row)}
 * />
 * ```
 */
function VirtualizedTable<T extends RowData = RowData>({
  columns,
  data,
  height = 600,
  estimateRowHeight = 48,
  overscan = 5,
  onRowClick,
  onRowDoubleClick,
  actions,
  rowClassName,
  striped = false,
  hoverable = true,
  emptyState,
  className,
}: VirtualizedTableProps<T>) {
  const { parentRef, virtualItems, totalSize, measureElement } = useVirtualList({
    data,
    estimateSize: estimateRowHeight,
    overscan,
  })

  const containerHeight = typeof height === 'number' ? `${height}px` : height

  // Empty state
  if (data.length === 0) {
    return (
      <div
        className={cn(
          'border border-border rounded-xl overflow-hidden bg-card shadow-sm',
          className
        )}
      >
        {/* Header */}
        <div className="flex border-b border-border bg-morandi-container/50">
          {columns.map(column => (
            <div
              key={String(column.key)}
              className={cn(
                'py-3 px-4 text-sm font-semibold text-morandi-primary',
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-right',
                column.className
              )}
              style={{ width: column.width, flex: column.width ? 'none' : 1 }}
            >
              {column.label}
            </div>
          ))}
          {actions && (
            <div
              className="py-3 px-4 text-sm font-semibold text-morandi-primary"
              style={{ width: '100px' }}
            >
              {ENHANCED_TABLE_LABELS.ACTIONS}
            </div>
          )}
        </div>
        {/* Empty state */}
        <div className="py-12 px-6 text-center text-sm text-morandi-secondary">
          {emptyState || (
            <div className="flex flex-col items-center justify-center min-h-[200px]">
              <svg
                className="w-12 h-12 mb-4 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-sm">{ENHANCED_TABLE_LABELS.NOT_FOUND_8580}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border border-border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col',
        className
      )}
    >
      {/* Fixed Header */}
      <div className="flex border-b border-border bg-morandi-container/50 shrink-0">
        {columns.map(column => (
          <div
            key={String(column.key)}
            className={cn(
              'py-3 px-4 text-sm font-semibold text-morandi-primary',
              column.align === 'center' && 'text-center',
              column.align === 'right' && 'text-right',
              column.className
            )}
            style={{ width: column.width, flex: column.width ? 'none' : 1 }}
          >
            {column.label}
          </div>
        ))}
        {actions && (
          <div
            className="py-3 px-4 text-sm font-semibold text-morandi-primary"
            style={{ width: '100px' }}
          >
            {ENHANCED_TABLE_LABELS.ACTIONS}
          </div>
        )}
      </div>

      {/* Virtualized Body */}
      <div ref={parentRef} className="overflow-auto flex-1" style={{ height: containerHeight }}>
        <div
          style={{
            height: `${totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map(virtualRow => {
            const row = data[virtualRow.index] as T
            const rowIndex = virtualRow.index

            return (
              <div
                key={virtualRow.key}
                ref={measureElement}
                data-index={virtualRow.index}
                className={cn(
                  'flex border-b border-border/40 last:border-b-0',
                  (onRowClick || onRowDoubleClick) && 'cursor-pointer',
                  hoverable && 'hover:bg-morandi-container/20 transition-all duration-150',
                  striped && rowIndex % 2 === 0 && 'bg-morandi-container/20',
                  rowClassName?.(row)
                )}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(row, rowIndex)}
                onDoubleClick={() => onRowDoubleClick?.(row, rowIndex)}
              >
                {/* Data columns */}
                {columns.map(column => (
                  <div
                    key={String(column.key)}
                    className={cn(
                      'py-3 px-4 text-sm text-morandi-primary flex items-center',
                      column.align === 'center' && 'justify-center',
                      column.align === 'right' && 'justify-end',
                      column.className
                    )}
                    style={{ width: column.width, flex: column.width ? 'none' : 1 }}
                  >
                    {column.render
                      ? column.render(row[column.key as keyof T], row)
                      : String(row[column.key as keyof T] ?? '')}
                  </div>
                ))}

                {/* Actions column */}
                {actions && (
                  <div
                    className="py-3 px-4 flex items-center"
                    style={{ width: '100px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {actions(row, rowIndex)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 text-sm text-morandi-secondary border-t border-border bg-morandi-container/30 shrink-0">
        共 {data.length} 筆資料
      </div>
    </div>
  )
}
