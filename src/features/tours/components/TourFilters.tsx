'use client'

import React from 'react'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  FileCheck,
  MapPin,
  BarChart3,
  Archive,
  Plus,
  FileText,
  Copy,
} from 'lucide-react'
import { TOUR_FILTERS } from '../constants'

interface TourFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeTab: string
  onTabChange: (tab: string) => void
  onAddTour: () => void
  onAddProposal?: () => void
  onAddTemplate?: () => void
  showReceivedTab?: boolean // Local/DMC 顯示「收到的委託」分頁
  receivedCount?: number // 收到的委託數量
}

import { Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const TourFilters: React.FC<TourFiltersProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  onAddTour,
  onAddProposal,
  onAddTemplate,
  showReceivedTab,
  receivedCount,
}) => {
  // 基本 tabs（封存分頁已隱藏，需要時從 DB `archived=true` 還是能取到）
  const baseTabs = [
    { value: '待出發', label: TOUR_FILTERS.tab_active, icon: Calendar },
    { value: 'all', label: TOUR_FILTERS.tab_all, icon: BarChart3 },
    { value: '已結團', label: TOUR_FILTERS.tab_closed, icon: FileCheck },
    { value: 'proposal', label: TOUR_FILTERS.tab_proposals, icon: FileText },
    { value: 'template', label: TOUR_FILTERS.tab_templates, icon: Copy },
  ]

  // Local/DMC 時加入「收到的委託」分頁
  const tabs = showReceivedTab
    ? [
        {
          value: 'received',
          label:
            receivedCount && receivedCount > 0 ? `收到的委託 (${receivedCount})` : '收到的委託',
          icon: Inbox,
        },
        ...baseTabs,
      ]
    : baseTabs

  return (
    <ResponsiveHeader
      title={TOUR_FILTERS.page_title}
      icon={MapPin}
      breadcrumb={[{ label: TOUR_FILTERS.breadcrumb_tours, href: '/tours' }]}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder={TOUR_FILTERS.search_placeholder}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      customActions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增專案
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddTour}>
              <Calendar className="mr-2 h-4 w-4" />
              開團
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onAddProposal}>
              <FileText className="mr-2 h-4 w-4" />
              提案
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onAddTemplate}>
              <Copy className="mr-2 h-4 w-4" />
              開模板
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  )
}
