'use client'

import { useRouter } from 'next/navigation'
import { MapPin, Bus, Building2, ImageIcon, Archive, Building } from 'lucide-react'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DATABASE_LABELS } from './constants/labels'

const databaseModules = [
  {
    id: 'travel',
    title: DATABASE_LABELS.MODULE_TRAVEL,
    description: DATABASE_LABELS.MODULE_TRAVEL_DESC,
    icon: MapPin,
    href: '/database/attractions',
    color: 'bg-status-info',
    count: 0,
  },
  {
    id: 'transportation-rates',
    title: DATABASE_LABELS.MODULE_TRANSPORT,
    description: DATABASE_LABELS.MODULE_TRANSPORT_DESC,
    icon: Bus,
    href: '/database/transportation-rates',
    color: 'bg-status-success',
    count: 0,
  },
  {
    id: 'suppliers',
    title: DATABASE_LABELS.MODULE_SUPPLIERS,
    description: DATABASE_LABELS.MODULE_SUPPLIERS_DESC,
    icon: Building2,
    href: '/database/suppliers',
    color: 'bg-status-info',
    count: 12,
  },
  {
    id: 'company-assets',
    title: DATABASE_LABELS.MODULE_ASSETS,
    description: DATABASE_LABELS.MODULE_ASSETS_DESC,
    icon: ImageIcon,
    href: '/database/company-assets',
    color: 'bg-morandi-gold',
    count: 0,
  },
  {
    id: 'archive-management',
    title: DATABASE_LABELS.MODULE_ARCHIVE,
    description: DATABASE_LABELS.MODULE_ARCHIVE_DESC,
    icon: Archive,
    href: '/database/archive-management',
    color: 'bg-morandi-red',
    count: 0,
  },
  {
    id: 'workspaces',
    title: DATABASE_LABELS.MODULE_WORKSPACES,
    description: DATABASE_LABELS.MODULE_WORKSPACES_DESC,
    icon: Building,
    href: '/database/workspaces',
    color: 'bg-morandi-primary',
    count: 0,
  },
]

export default function DatabasePage() {
  const router = useRouter()

  return (
    <ContentPageLayout
      title={DATABASE_LABELS.PAGE_TITLE}
      onAdd={() => {
        /* 批次匯入邏輯 */
      }}
      addLabel={DATABASE_LABELS.BATCH_IMPORT}
    >
      <div className="pb-6">
        {/* 概覽卡片 */}
        <div className="mb-8 bg-gradient-to-r from-morandi-gold/10 to-morandi-primary/10 rounded-lg border border-morandi-gold/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-morandi-primary mb-2">
                {DATABASE_LABELS.STATS_TITLE}
              </h2>
              <p className="text-morandi-secondary text-sm">{DATABASE_LABELS.STATS_DESC}</p>
            </div>
            <div className="flex space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-morandi-primary">59</div>
                <div className="text-xs text-morandi-secondary">{DATABASE_LABELS.TOTAL_ITEMS}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-morandi-gold">3</div>
                <div className="text-xs text-morandi-secondary">{DATABASE_LABELS.COVERAGE}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-morandi-green">24hr</div>
                <div className="text-xs text-morandi-secondary">{DATABASE_LABELS.LAST_UPDATED}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 功能模組卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {databaseModules.map(module => {
            const Icon = module.icon
            return (
              <div
                key={module.id}
                onClick={() => router.push(module.href)}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-morandi-gold/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center',
                      module.color
                    )}
                  >
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-morandi-primary">{module.count}</div>
                    <div className="text-xs text-morandi-secondary">{DATABASE_LABELS.ITEMS}</div>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-morandi-primary mb-2">{module.title}</h3>
                <p className="text-sm text-morandi-secondary">{module.description}</p>

                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-morandi-gold hover:bg-morandi-gold/10"
                  >
                    {DATABASE_LABELS.ENTER_MANAGEMENT}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 快速操作區域 */}
        <div className="mt-8 bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-morandi-primary mb-4">
            {DATABASE_LABELS.QUICK_ACTIONS}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 text-left flex flex-col items-start"
              onClick={() => router.push('/database/attractions')}
            >
              <div className="font-medium text-morandi-primary">
                {DATABASE_LABELS.MANAGE_REGIONS}
              </div>
              <div className="text-sm text-morandi-secondary mt-1">
                {DATABASE_LABELS.MANAGE_REGIONS_DESC}
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 text-left flex flex-col items-start"
              onClick={() => router.push('/database/transportation-rates')}
            >
              <div className="font-medium text-morandi-primary">{DATABASE_LABELS.ADD_RATES}</div>
              <div className="text-sm text-morandi-secondary mt-1">
                {DATABASE_LABELS.ADD_RATES_DESC}
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 text-left flex flex-col items-start"
              onClick={() => router.push('/database/attractions')}
            >
              <div className="font-medium text-morandi-primary">
                {DATABASE_LABELS.ADD_ATTRACTIONS}
              </div>
              <div className="text-sm text-morandi-secondary mt-1">
                {DATABASE_LABELS.ADD_ATTRACTIONS_DESC}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </ContentPageLayout>
  )
}
