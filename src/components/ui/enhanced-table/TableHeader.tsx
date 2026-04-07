'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronUp, ChevronDown, ChevronsUpDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TableColumn, SelectionConfig, RowData } from './types'
import { ENHANCED_TABLE_LABELS } from './constants/labels'

interface TableHeaderProps<T extends RowData = RowData> {
  columns: TableColumn<T>[]
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  filters: Record<string, string>
  showFilters: boolean
  selection?: SelectionConfig<T>
  actions?: (row: T) => React.ReactNode
  actionsHeader?: React.ReactNode
  actionsWidth?: string
  allVisibleSelected: boolean
  someVisibleSelected: boolean
  onSort: (columnKey: string) => void
  onFilterChange: (key: string, value: string) => void
  onToggleFilters: () => void
  onToggleSelectAll: () => void
}

export const TableHeader = React.memo(function TableHeader({
  columns,
  sortColumn,
  sortDirection,
  filters,
  showFilters,
  selection,
  actions,
  actionsHeader,
  actionsWidth = '100px',
  allVisibleSelected,
  someVisibleSelected,
  onSort,
  onFilterChange,
  onToggleFilters,
  onToggleSelectAll,
}: TableHeaderProps) {
  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown size={12} className="text-morandi-secondary opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp size={12} className="text-morandi-gold transition-colors" />
    ) : (
      <ChevronDown size={12} className="text-morandi-gold transition-colors" />
    )
  }

  return (
    <thead className="sticky top-0 z-10 bg-morandi-gold-header border-b border-border">
      {/* 主標題行 */}
      <tr className="relative" data-enhanced-table-header-row>
        {/* Selection checkbox column */}
        {selection && (
          <th className="w-12 py-2.5 px-4 text-xs relative">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected && !allVisibleSelected}
              onCheckedChange={onToggleSelectAll}
            />
          </th>
        )}

        {columns.map((column, index) => (
          <th
            key={String(column.key)}
            className={cn(
              'text-left py-2.5 px-4 text-xs relative align-middle'
            )}
            style={{ width: column.width }}
          >
            {/* Remove absolute div - use native border instead */}
            <div className="flex items-center gap-2">
              {column.sortable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:bg-transparent text-xs font-medium text-morandi-primary transition-colors [&_svg]:!size-[12px]"
                  onClick={() => onSort(String(column.key))}
                >
                  {column.label}
                  {getSortIcon(String(column.key))}
                </Button>
              ) : (
                <span className="text-xs font-medium text-morandi-primary">{column.label}</span>
              )}
              {index === columns.length - 1 && columns.some(col => col.filterable) && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  className="text-morandi-primary hover:text-morandi-primary"
                  onClick={onToggleFilters}
                >
                  <Filter
                    size={12}
                    className={cn(
                      'transition-colors',
                      showFilters ? 'text-morandi-primary' : 'text-morandi-muted'
                    )}
                  />
                </Button>
              )}
            </div>
          </th>
        ))}

        {/* Actions column */}
        {actions && (
          <th className="text-left py-2.5 px-4 text-xs relative" style={{ width: actionsWidth }}>
            {actionsHeader || (
              <span className="font-medium text-morandi-secondary">
                {ENHANCED_TABLE_LABELS.ACTIONS}
              </span>
            )}
          </th>
        )}
      </tr>

      {/* 篩選行 */}
      {showFilters && (
        <tr className="bg-card border-t border-border/60">
          {/* Selection checkbox column - empty */}
          {selection && <td className="py-3 px-4"></td>}

          {columns.map(column => (
            <td key={String(column.key)} className="py-3 px-4">
              {column.filterable ? (
                column.filterType === 'select' ? (
                  <Select
                    value={filters[String(column.key)] || '__all__'}
                    onValueChange={value => onFilterChange(String(column.key), value)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={`選擇${column.label}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">
                        {ENHANCED_TABLE_LABELS.ALL}
                        {column.label}
                      </SelectItem>
                      {column.filterOptions?.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={column.filterType || 'text'}
                    placeholder={`搜尋${column.label}...`}
                    value={filters[String(column.key)] || ''}
                    onChange={e => onFilterChange(String(column.key), e.target.value)}
                    className="h-9 text-sm"
                  />
                )
              ) : null}
            </td>
          ))}

          {/* Actions column - empty */}
          {actions && <td className="py-3 px-4"></td>}
        </tr>
      )}
    </thead>
  )
})
