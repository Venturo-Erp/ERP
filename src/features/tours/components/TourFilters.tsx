'use client'

import React from 'react'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Button } from '@/components/ui/button'
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
  Star,
  Plus,
  FileText,
  Copy,
  ChevronDown,
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
  return (
    <ResponsiveHeader
      title={TOUR_FILTERS.page_title}
      icon={MapPin}
      breadcrumb={[{ label: TOUR_FILTERS.breadcrumb_tours, href: '/tours' }]}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder={TOUR_FILTERS.search_placeholder}
      tabs={[
        { value: 'all', label: TOUR_FILTERS.tab_all, icon: BarChart3 },
        { value: '待出發', label: TOUR_FILTERS.tab_active, icon: Calendar },
        { value: '已結團', label: TOUR_FILTERS.tab_closed, icon: FileCheck },
        { value: '特殊團', label: TOUR_FILTERS.tab_special, icon: Star },
        { value: 'archived', label: TOUR_FILTERS.tab_archived, icon: Archive },
        { value: 'proposal', label: TOUR_FILTERS.tab_proposals, icon: FileText },
        { value: 'template', label: TOUR_FILTERS.tab_templates, icon: Copy },
      ]}
      activeTab={activeTab}
      onTabChange={onTabChange}
      customActions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-1.5">
              <Plus size={16} />
              新增旅遊團
              <ChevronDown size={16} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddTour}>
              <Calendar className="mr-2 h-4 w-4" />
              開團（正式團）
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onAddProposal}>
              <FileText className="mr-2 h-4 w-4" />
              提案（客戶詢價）
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onAddTemplate}>
              <Copy className="mr-2 h-4 w-4" />
              開模板（標準行程）
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  )
}
