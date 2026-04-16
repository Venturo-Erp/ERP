'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ENHANCED_TABLE_LABELS } from './constants/labels'

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  startIndex: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export const TablePagination = React.memo(function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  startIndex,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  if (totalItems === 0) return null

  return (
    <div className="p-3 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-border/40 bg-morandi-container/10">
      {/* 分頁控制 */}
      <div className="flex items-center gap-2">
        {/* 每頁顯示筆數 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-morandi-secondary">{ENHANCED_TABLE_LABELS.LABEL_2936}</span>
          <Select
            value={pageSize.toString()}
            onValueChange={value => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-20 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-morandi-secondary">{ENHANCED_TABLE_LABELS.LABEL_2269}</span>
        </div>

        {/* 分頁按鈕 — 永遠顯示以保持版型一致 */}
        <>
          <div className="w-px h-6 bg-border/60 mx-1"></div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="h-9 px-3 text-sm"
          >
            {ENHANCED_TABLE_LABELS.LABEL_5163}
          </Button>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {Array.from({ length: Math.min(5, Math.max(totalPages, 1)) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  disabled={pageNum > totalPages}
                  className={cn(
                    'w-9 h-9 p-0 text-sm',
                    currentPage === pageNum ? '' : 'text-morandi-primary'
                  )}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="h-9 px-3 text-sm"
          >
            {ENHANCED_TABLE_LABELS.LABEL_9383}
          </Button>
        </>
      </div>
    </div>
  )
})
