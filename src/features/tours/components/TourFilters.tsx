'use client'

import React from 'react'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, FileCheck, MapPin, BarChart3, Archive, Plus, FileText, Copy } from 'lucide-react'
import { TOUR_FILTERS } from '../constants'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

interface TourFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeTab: string
  onTabChange: (tab: string) => void
  onAddTour: () => void
  onAddProposal?: () => void
  onAddTemplate?: () => void
}

export const TourFilters: React.FC<TourFiltersProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  onAddTour,
  onAddProposal,
  onAddTemplate,
}) => {
  // 封存分頁已隱藏（需要時從 DB archived=true 還是能取到）
  const tabs = [
    { value: TOUR_STATUS.UPCOMING, label: TOUR_FILTERS.tab_active, icon: Calendar },
    { value: 'all', label: TOUR_FILTERS.tab_all, icon: BarChart3 },
    { value: TOUR_STATUS.CLOSED, label: TOUR_FILTERS.tab_closed, icon: FileCheck },
    { value: TOUR_STATUS.PROPOSAL, label: TOUR_FILTERS.tab_proposals, icon: FileText },
    { value: TOUR_STATUS.TEMPLATE, label: TOUR_FILTERS.tab_templates, icon: Copy },
  ]

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
              className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all"
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
