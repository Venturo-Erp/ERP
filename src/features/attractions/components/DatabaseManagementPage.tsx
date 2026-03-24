'use client'

import { useState, lazy, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MapPin, Star, Sparkles, Globe } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAttractionsDialog } from '../hooks/useAttractionsDialog'
import { useCountries } from '@/data'
import { ATTRACTIONS_DIALOG_LABELS, DATABASE_MANAGEMENT_PAGE_LABELS } from '../constants/labels'

// Lazy load tabs - 只有切換到該 tab 才載入組件
const RegionsTab = lazy(() => import('./tabs/RegionsTab'))
const AttractionsTab = lazy(() => import('./tabs/AttractionsTab'))
const MichelinRestaurantsTab = lazy(() => import('./tabs/MichelinRestaurantsTab'))
const PremiumExperiencesTab = lazy(() => import('./tabs/PremiumExperiencesTab'))

// 有效的 tab 值
const VALID_TABS = ['regions', 'attractions', 'michelin', 'experiences'] as const
type TabValue = (typeof VALID_TABS)[number]

// ============================================
// 資料庫管理主頁面（含景點、米其林、體驗）
// ============================================

export default function DatabaseManagementPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // 從 URL 讀取 tab，預設為 'regions'
  const tabFromUrl = searchParams.get('tab') as TabValue | null
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'regions'

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set([initialTab]))

  // 景點分頁的狀態
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedCountry, setSelectedCountry] = useState('')
  const { openAdd, isAddOpen, closeAdd, initialFormData } = useAttractionsDialog()

  // 國家列表（SWR 快取，只載入一次）
  const { items: countries = [] } = useCountries()

  // 當切換 tab 時，更新 URL 並標記該 tab 已載入
  const handleTabChange = (tab: string) => {
    const newTab = tab as TabValue
    setActiveTab(newTab)
    setLoadedTabs(prev => new Set(prev).add(tab))

    // 更新 URL（不重新載入頁面）
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'regions') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.replace(`/database/attractions${params.toString() ? `?${params.toString()}` : ''}`, {
      scroll: false,
    })
  }

  // 同步 URL 變化到 state（處理瀏覽器前進/後退）
  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
      setLoadedTabs(prev => new Set(prev).add(tabFromUrl))
    }
  }, [tabFromUrl])

  // 清除篩選
  const clearFilters = () => {
    setSelectedCountry('')
    setSelectedCategory('all')
  }

  const hasActiveFilters = selectedCountry || selectedCategory !== 'all'

  // 分類選項
  const categoryOptions = [
    { value: DATABASE_MANAGEMENT_PAGE_LABELS.景點, label: '景點' },
    { value: DATABASE_MANAGEMENT_PAGE_LABELS.餐廳, label: '餐廳' },
    { value: DATABASE_MANAGEMENT_PAGE_LABELS.住宿, label: '住宿' },
    { value: DATABASE_MANAGEMENT_PAGE_LABELS.購物, label: '購物' },
    { value: DATABASE_MANAGEMENT_PAGE_LABELS.交通, label: '交通' },
  ]

  return (
    <ContentPageLayout
      title="景點庫"
      icon={MapPin}
      breadcrumb={[
        { label: DATABASE_MANAGEMENT_PAGE_LABELS.首頁, href: '/dashboard' },
        { label: DATABASE_MANAGEMENT_PAGE_LABELS.資料庫管理, href: '/database' },
        { label: DATABASE_MANAGEMENT_PAGE_LABELS.旅遊資料庫, href: '/database/attractions' },
      ]}
      tabs={[
        { value: 'regions', label: DATABASE_MANAGEMENT_PAGE_LABELS.國家_區域, icon: Globe },
        { value: 'attractions', label: DATABASE_MANAGEMENT_PAGE_LABELS.景點活動, icon: MapPin },
        { value: 'michelin', label: DATABASE_MANAGEMENT_PAGE_LABELS.米其林餐廳, icon: Star },
        { value: 'experiences', label: DATABASE_MANAGEMENT_PAGE_LABELS.頂級體驗, icon: Sparkles },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      showSearch={activeTab === 'attractions'}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={DATABASE_MANAGEMENT_PAGE_LABELS.搜尋景點名稱}
      filters={
        activeTab !== 'regions' ? (
          <>
            {/* 國家篩選 - 景點相關 tab 共用 */}
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="px-3 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-morandi-primary bg-card text-morandi-primary min-w-[120px]"
            >
              <option value="">{DATABASE_MANAGEMENT_PAGE_LABELS.LABEL_937}</option>
              {countries.map(country => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
            {/* 分類篩選 - 只在景點活動顯示 */}
            {activeTab === 'attractions' && (
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-morandi-primary bg-card text-morandi-primary min-w-[120px]"
              >
                <option value="all">{DATABASE_MANAGEMENT_PAGE_LABELS.LABEL_3573}</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </>
        ) : undefined
      }
      showClearFilters={activeTab !== 'regions' && Boolean(hasActiveFilters)}
      onClearFilters={clearFilters}
      onAdd={activeTab === 'attractions' ? openAdd : undefined}
      addLabel={ATTRACTIONS_DIALOG_LABELS.新增景點}
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
        {/* 分頁內容 - 只載入已訪問過的 tab */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="regions" className="h-full mt-0 data-[state=inactive]:hidden">
            {loadedTabs.has('regions') && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    {DATABASE_MANAGEMENT_PAGE_LABELS.LOADING_6912}
                  </div>
                }
              >
                <RegionsTab />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="attractions" className="h-full mt-0 data-[state=inactive]:hidden">
            {loadedTabs.has('attractions') && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    {DATABASE_MANAGEMENT_PAGE_LABELS.LOADING_6912}
                  </div>
                }
              >
                <AttractionsTab
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedCountry={selectedCountry}
                  openAdd={openAdd}
                  isAddOpen={isAddOpen}
                  closeAdd={closeAdd}
                  initialFormData={initialFormData}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="michelin" className="h-full mt-0 data-[state=inactive]:hidden">
            {loadedTabs.has('michelin') && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    {DATABASE_MANAGEMENT_PAGE_LABELS.LOADING_6912}
                  </div>
                }
              >
                <MichelinRestaurantsTab selectedCountry={selectedCountry} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="experiences" className="h-full mt-0 data-[state=inactive]:hidden">
            {loadedTabs.has('experiences') && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    {DATABASE_MANAGEMENT_PAGE_LABELS.LOADING_6912}
                  </div>
                }
              >
                <PremiumExperiencesTab selectedCountry={selectedCountry} />
              </Suspense>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </ContentPageLayout>
  )
}
