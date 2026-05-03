'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  startIndex: number
  totalItems: number
  onPageChange: (page: number) => void
  /** 保留 prop 介面、但 UI 不再提供選擇器（William 2026-05-02 拍板：固定 15 筆 / 頁、用篩選找特定資料） */
  onPageSizeChange?: (size: number) => void
}

export const TablePagination = React.memo(function TablePagination({
  currentPage,
  totalPages,
  pageSize: _pageSize,
  startIndex: _startIndex,
  totalItems,
  onPageChange,
  onPageSizeChange: _onPageSizeChange,
}: TablePaginationProps) {
  if (totalItems === 0) return null

  const visiblePageNums = Array.from(
    { length: Math.min(5, Math.max(totalPages, 1)) },
    (_, i) => {
      if (totalPages <= 5) return i + 1
      if (currentPage <= 3) return i + 1
      if (currentPage >= totalPages - 2) return totalPages - 4 + i
      return currentPage - 2 + i
    }
  )

  return (
    <div className="p-3 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-border/40 bg-morandi-container/10">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="第一頁"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          aria-label="上一頁"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {visiblePageNums.map(pageNum => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'soft-gold' : 'ghost'}
              size="iconSm"
              onClick={() => onPageChange(pageNum)}
              disabled={pageNum > totalPages}
              className={cn(
                'text-xs',
                currentPage === pageNum
                  ? 'font-semibold'
                  : 'text-morandi-secondary hover:text-morandi-primary'
              )}
            >
              {pageNum}
            </Button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage >= totalPages}
          aria-label="下一頁"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="最後頁"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
})
