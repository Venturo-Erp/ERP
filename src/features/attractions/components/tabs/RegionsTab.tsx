'use client'

/**
 * RegionsTab - 地區管理標籤頁
 *
 * [Refactored] 使用 @/data hooks 取代直接 Supabase 查詢
 * - useCountries: 國家列表
 * - useRegions: 地區列表
 * - useCities: 城市列表
 */

import { useState, useMemo } from 'react'
import { Check } from 'lucide-react'
import { useCountries, useRegions, useCities } from '@/data'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ATTRACTIONS_LIST_LABELS, REGIONS_TAB_LABELS } from '../../constants/labels'

// 使用 @/data 中定義的型別
type Country = NonNullable<ReturnType<typeof useCountries>['items']>[number]
type Region = NonNullable<ReturnType<typeof useRegions>['items']>[number]
type City = NonNullable<ReturnType<typeof useCities>['items']>[number]

export default function RegionsTab() {
  // 使用 @/data hooks 載入資料（自動快取、去重、重試）
  const { items: countries = [], loading: countriesLoading } = useCountries()
  const { items: regions = [] } = useRegions()
  const { items: cities = [] } = useCities()

  const loading = countriesLoading

  // 城市管理視窗
  const [isCitiesDialogOpen, setIsCitiesDialogOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)

  // 開啟城市管理視窗
  const handleOpenCitiesDialog = (country: Country) => {
    setSelectedCountry(country)
    setIsCitiesDialogOpen(true)
  }

  // 取得選中國家的城市
  const countryCities = useMemo(() => {
    if (!selectedCountry) return []
    return cities.filter(c => c.country_id === selectedCountry.id)
  }, [cities, selectedCountry])

  // 按地區分組城市
  const citiesByRegion = useMemo(() => {
    const grouped: Record<string, City[]> = { '': [] }
    countryCities.forEach(city => {
      const regionId = city.region_id || ''
      if (!grouped[regionId]) grouped[regionId] = []
      grouped[regionId].push(city)
    })
    return grouped
  }, [countryCities])

  // 取得地區名稱
  const getRegionName = (regionId: string) => {
    if (!regionId) return REGIONS_TAB_LABELS.未分類
    const region = regions.find(r => r.id === regionId)
    return region?.name || regionId
  }

  // 國家表格欄位
  const countryColumns: TableColumn<Country>[] = useMemo(
    () => [
      {
        key: 'name',
        label: REGIONS_TAB_LABELS.國家名稱,
        sortable: true,
        render: (_value, row) => (
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.name_en}</div>
          </div>
        ),
      },
      {
        key: 'code',
        label: REGIONS_TAB_LABELS.代碼,
        render: (_value, row) => <span className="text-sm font-mono">{row.code || '-'}</span>,
      },
      {
        key: 'has_regions',
        label: REGIONS_TAB_LABELS.有地區,
        render: (_value, row) => (
          <span className={row.has_regions ? 'text-status-success' : 'text-muted-foreground'}>
            {row.has_regions ? '是' : REGIONS_TAB_LABELS.否}
          </span>
        ),
      },
      {
        key: 'is_active',
        label: ATTRACTIONS_LIST_LABELS.狀態,
        render: (_value, row) => (
          <span className={row.is_active ? 'text-status-success' : 'text-muted-foreground'}>
            {row.is_active ? '啟用' : ATTRACTIONS_LIST_LABELS.停用}
          </span>
        ),
      },
      {
        key: 'id',
        label: REGIONS_TAB_LABELS.城市,
        render: (_value, row) => {
          const cityCount = cities.filter(c => c.country_id === row.id).length
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenCitiesDialog(row)}
              className="h-8 px-3 text-xs"
            >
              {cityCount} 城市
            </Button>
          )
        },
      },
    ],
    [cities]
  )

  return (
    <div className="h-full flex flex-col">
      {/* 表格內容 */}
      <div className="flex-1 overflow-auto">
        <EnhancedTable<Country>
          columns={countryColumns}
          data={countries}
          isLoading={loading}
          emptyMessage={REGIONS_TAB_LABELS.尚無國家資料}
        />
      </div>

      {/* 城市管理視窗 */}
      <Dialog open={isCitiesDialogOpen} onOpenChange={setIsCitiesDialogOpen}>
        <DialogContent level={1} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCountry?.name} - 城市列表</DialogTitle>
          </DialogHeader>

          {countryCities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {REGIONS_TAB_LABELS.EMPTY_4173}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(citiesByRegion).map(([regionId, regionCities]) => (
                <div key={regionId || 'no-region'}>
                  <div className="text-sm font-medium text-muted-foreground mb-2 pb-1 border-b">
                    {getRegionName(regionId)} ({regionCities.length})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {regionCities.map(city => (
                      <div key={city.id} className="px-2 py-1.5 text-sm">
                        {city.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsCitiesDialogOpen(false)} className="gap-2">
              <Check size={16} />
              {REGIONS_TAB_LABELS.CLOSE}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
