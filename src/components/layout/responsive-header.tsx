'use client'

import { useState, memo } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBreadcrumb, type BreadcrumbItem } from '@/hooks/useBreadcrumb'
import { ChevronRight } from 'lucide-react'
import { COMP_LAYOUT_LABELS } from './constants/labels'

interface ResponsiveHeaderProps {
  title: string
  icon?: unknown
  /**
   * 手動傳入的 breadcrumb 項目（向後兼容）
   * 如果提供，將使用這些項目而不是自動生成
   */
  breadcrumb?: BreadcrumbItem[]
  /**
   * 是否啟用自動 breadcrumb 模式
   * @default false（保持向後兼容）
   */
  autoBreadcrumb?: boolean
  /**
   * 自動 breadcrumb 時覆蓋最後一項的標籤
   * 用於詳細頁顯示實際名稱（例如顯示報價單編號而非 "報價詳情"）
   */
  breadcrumbLastLabel?: string
  tabs?: {
    value: string
    label: string
    icon?: unknown
  }[]
  activeTab?: string
  onTabChange?: (value: string) => void
  onAdd?: () => void
  addLabel?: string
  children?: React.ReactNode
  actions?: React.ReactNode
  showBackButton?: boolean
  onBack?: () => void
  // 搜尋功能
  showSearch?: boolean
  searchTerm?: string
  onSearchChange?: (term: string) => void
  searchPlaceholder?: string
  // 徽章（用於標記功能狀態）
  badge?: React.ReactNode
  // 篩選功能（例如：作者篩選）
  showFilter?: boolean
  filterOptions?: { value: string; label: string }[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterLabel?: string
  // 多個篩選器支援
  filters?: React.ReactNode
  // 清除篩選按鈕
  showClearFilters?: boolean
  onClearFilters?: () => void
  // 自訂操作按鈕（顯示在 tabs 右邊）
  customActions?: React.ReactNode
}

export const ResponsiveHeader = memo(function ResponsiveHeader(props: ResponsiveHeaderProps) {
  const { sidebarCollapsed } = useAuthStore()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // 自動生成的 breadcrumb（當 autoBreadcrumb 為 true 時使用）
  const autoBreadcrumbItems = useBreadcrumb({
    customItems: props.breadcrumb, // 如果有手動傳入，優先使用
    lastItemLabel: props.breadcrumbLastLabel,
  })

  // 決定要顯示的 breadcrumb
  // 優先級：手動傳入 > 自動生成（需啟用 autoBreadcrumb）
  const breadcrumbItems = props.breadcrumb || (props.autoBreadcrumb ? autoBreadcrumbItems : [])
  const showBreadcrumb = breadcrumbItems.length > 0

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-[72px] bg-background z-[200] flex items-center justify-between px-6 print:hidden',
        'left-0',
        sidebarCollapsed ? 'md:left-16' : 'md:left-[190px]'
      )}
      style={{ transition: 'left 300ms ease-in-out' }}
    >
      {/* 分割線 */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          marginLeft: '24px',
          marginRight: '24px',
          borderTop: '1px solid var(--border)',
          height: '1px',
        }}
      ></div>
      {/* 左側 - 返回按鈕、Breadcrumb 和主標題 */}
      <div className="flex items-center gap-3 relative z-[300]">
        {props.showBackButton && (
          <button
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              props.onBack?.()
            }}
            className="text-morandi-secondary hover:text-morandi-primary transition-colors p-2 hover:bg-morandi-container/50 rounded-md cursor-pointer"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Breadcrumb 導航 */}
        {showBreadcrumb ? (
          <nav className="flex items-center" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1
                return (
                  <li key={item.href} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight
                        size={14}
                        className="mx-1 text-morandi-secondary/60 flex-shrink-0"
                      />
                    )}
                    {isLast ? (
                      <span className="text-base font-bold text-morandi-primary flex items-center">
                        {item.label}
                        {props.badge}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-sm text-morandi-secondary hover:text-morandi-primary transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        ) : (
          <h1 className="text-base font-bold text-morandi-primary flex items-center">
            {props.title}
            {props.badge}
          </h1>
        )}
      </div>

      {/* 右側區域 - 功能、標籤頁和操作按鈕 - 統一無空白設計 */}
      <div className="flex items-center flex-shrink-0 pointer-events-auto gap-2">
        {/* 搜尋功能 - 最左邊 - 手機模式隱藏 */}
        {props.showSearch && (
          <div className="flex items-center mr-4">
            {!isSearchOpen ? (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-morandi-secondary hover:text-morandi-primary transition-colors"
                title={COMP_LAYOUT_LABELS.搜尋}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={props.searchTerm || ''}
                  onChange={e => props.onSearchChange?.(e.target.value)}
                  placeholder={props.searchPlaceholder || COMP_LAYOUT_LABELS.搜尋_2}
                  className="w-48 px-3 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-morandi-primary"
                  autoFocus
                  onBlur={() => {
                    if (!props.searchTerm) {
                      setIsSearchOpen(false)
                    }
                  }}
                />
                <button
                  onClick={() => {
                    props.onSearchChange?.('')
                    setIsSearchOpen(false)
                  }}
                  className="p-1 text-morandi-secondary hover:text-morandi-primary transition-colors"
                  title={COMP_LAYOUT_LABELS.清除搜尋}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 篩選功能 */}
        {props.showFilter && props.filterOptions && (
          <div className="flex items-center mr-4">
            <Select
              value={props.filterValue || 'all'}
              onValueChange={value => props.onFilterChange?.(value)}
            >
              <SelectTrigger className="h-8 text-sm min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  全部{props.filterLabel || COMP_LAYOUT_LABELS.篩選}
                </SelectItem>
                {props.filterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 多個篩選器 */}
        {props.filters && <div className="flex items-center gap-2 mr-4">{props.filters}</div>}

        {/* 清除篩選按鈕 */}
        {props.showClearFilters && (
          <button
            onClick={props.onClearFilters}
            className="px-3 py-1 text-sm text-morandi-secondary hover:text-morandi-primary border border-border rounded-md hover:bg-morandi-container/50 transition-colors mr-4"
          >
            {COMP_LAYOUT_LABELS.FILTER_4998}
          </button>
        )}

        {/* 功能區域 */}
        {props.children && <div className="flex items-center mr-6">{props.children}</div>}

        {/* 標籤頁 - 手機模式隱藏 */}
        {props.tabs && props.tabs.length > 0 && (
          <div className="hidden md:flex items-center space-x-1 pointer-events-auto mr-4">
            {props.tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => props.onTabChange?.(tab.value)}
                className={cn(
                  'relative px-3 py-2 text-sm font-medium transition-colors pointer-events-auto flex items-center gap-1.5',
                  'text-morandi-secondary hover:text-morandi-primary',
                  props.activeTab === tab.value
                    ? 'text-morandi-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-morandi-gold'
                    : ''
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs',
                    props.activeTab === tab.value
                      ? 'bg-morandi-gold/20 text-morandi-gold'
                      : 'bg-morandi-container text-morandi-secondary'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 自訂操作按鈕 */}
        {props.customActions && <div className="flex items-center mr-4">{props.customActions}</div>}

        {/* 操作按鈕 - actions 和 onAdd 可以同時顯示 */}
        <div className="flex items-center gap-3">
          {props.actions}
          {props.onAdd && (
            <button
              onClick={props.onAdd}
              data-create-box
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {props.addLabel || COMP_LAYOUT_LABELS.新增}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
