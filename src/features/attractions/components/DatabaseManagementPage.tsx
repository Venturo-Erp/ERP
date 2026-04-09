'use client'

import { useState, lazy, Suspense, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MapPin, Star, Sparkles, Globe, Hotel, UtensilsCrossed } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useAttractionsDialog } from '../hooks/useAttractionsDialog'
import { useCountries } from '@/data'
import { useAuthStore } from '@/stores'
import { ATTRACTIONS_DIALOG_LABELS, DATABASE_MANAGEMENT_PAGE_LABELS } from '../constants/labels'
import type { TabItem } from '@/components/layout/list-page-layout'

// Lazy load tabs - 只有切換到該 tab 才載入組件
const RegionsTab = lazy(() => import('./tabs/RegionsTab'))
const AttractionsTab = lazy(() => import('./tabs/AttractionsTab'))

// CORNER workspace ID（米其林、頂級體驗專屬）
const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

// 有效的 tab 值
const ALL_TABS = ['regions', 'attractions', 'hotels', 'restaurants'] as const
type TabValue = (typeof ALL_TABS)[number]

// ============================================
// 資料庫管理主頁面（含景點、飯店、餐廳、米其林、體驗）
// ============================================

export default function DatabaseManagementPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()

  const isCorner = user?.workspace_id === CORNER_WORKSPACE_ID

  // 根據 workspace 決定可用 tabs
  const validTabs: readonly TabValue[] = isCorner
    ? ALL_TABS
    : (['regions', 'attractions', 'hotels', 'restaurants'] as const)

  // 從 URL 讀取 tab，預設為 'regions'
  const tabFromUrl = searchParams.get('tab') as TabValue | null
  const initialTab =
    tabFromUrl && (validTabs as readonly string[]).includes(tabFromUrl) ? tabFromUrl : 'regions'

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
    if (
      tabFromUrl &&
      (validTabs as readonly string[]).includes(tabFromUrl) &&
      tabFromUrl !== activeTab
    ) {
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

  // 根據 tab 產生帶預設分類的 initialFormData
  const getInitialFormData = useCallback(() => {
    if (activeTab === 'hotels') {
      return { ...initialFormData, category: '住宿' }
    }
    if (activeTab === 'restaurants') {
      return { ...initialFormData, category: '美食餐廳' }
    }
    return initialFormData
  }, [activeTab, initialFormData])

  // 新增按鈕邏輯
  const handleAdd = useCallback(() => {
    if (activeTab === 'attractions' || activeTab === 'hotels' || activeTab === 'restaurants') {
      openAdd()
    }
  }, [activeTab, openAdd])

  const addLabel =
    activeTab === 'regions'
      ? '新增國家'
      : activeTab === 'hotels'
        ? '新增飯店'
        : activeTab === 'restaurants'
          ? '新增餐廳'
          : ATTRACTIONS_DIALOG_LABELS.新增景點

  // 有新增功能的 tabs
  const tabsWithAdd: TabValue[] = ['regions', 'attractions', 'hotels', 'restaurants']

  // 建立 tabs 配置
  const tabs: TabItem[] = [
    { value: 'regions', label: DATABASE_MANAGEMENT_PAGE_LABELS.國家_區域, icon: Globe },
    { value: 'attractions', label: DATABASE_MANAGEMENT_PAGE_LABELS.景點活動, icon: MapPin },
    { value: 'hotels', label: '飯店', icon: Hotel },
    { value: 'restaurants', label: '餐廳', icon: UtensilsCrossed },
  ]

  return (
    <ContentPageLayout
      title="旅遊資料庫"
      icon={MapPin}
      breadcrumb={[
        { label: DATABASE_MANAGEMENT_PAGE_LABELS.資料庫管理, href: '/database' },
        { label: DATABASE_MANAGEMENT_PAGE_LABELS.旅遊資料庫, href: '/database/attractions' },
      ]}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      showSearch={
        activeTab === 'attractions' || activeTab === 'hotels' || activeTab === 'restaurants'
      }
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={
        activeTab === 'hotels'
          ? '搜尋飯店名稱...'
          : activeTab === 'restaurants'
            ? '搜尋餐廳名稱...'
            : DATABASE_MANAGEMENT_PAGE_LABELS.搜尋景點名稱
      }
      filters={
        activeTab !== 'regions' ? (
          <>
            {/* 國家篩選 - Combobox 可搜尋 */}
            <Combobox
              options={[
                { value: '', label: DATABASE_MANAGEMENT_PAGE_LABELS.LABEL_937 },
                ...countries.map(c => ({ value: c.id, label: c.name })),
              ]}
              value={selectedCountry}
              onChange={setSelectedCountry}
              placeholder={DATABASE_MANAGEMENT_PAGE_LABELS.LABEL_937}
              className="min-w-[140px]"
              showClearButton
            />
            {/* 分類篩選 - 只在景點活動顯示 */}
            {activeTab === 'attractions' && (
              <Combobox
                options={[
                  { value: 'all', label: DATABASE_MANAGEMENT_PAGE_LABELS.LABEL_3573 },
                  { value: 'unverified', label: '⚠ 待驗證' },
                  ...categoryOptions,
                ]}
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder={DATABASE_MANAGEMENT_PAGE_LABELS.LABEL_3573}
                className="min-w-[120px]"
                showClearButton
              />
            )}
          </>
        ) : undefined
      }
      showClearFilters={activeTab !== 'regions' && Boolean(hasActiveFilters)}
      onClearFilters={clearFilters}
      onAdd={tabsWithAdd.includes(activeTab) ? handleAdd : undefined}
      addLabel={addLabel}
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
                  initialFormData={getInitialFormData()}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="hotels" className="h-full mt-0 data-[state=inactive]:hidden">
            {loadedTabs.has('hotels') && (
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
                  selectedCategory="all"
                  setSelectedCategory={() => {}}
                  selectedCountry={selectedCountry}
                  openAdd={openAdd}
                  isAddOpen={isAddOpen}
                  closeAdd={closeAdd}
                  initialFormData={getInitialFormData()}
                  fixedCategory="住宿"
                  tableName="hotels"
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="restaurants" className="h-full mt-0 data-[state=inactive]:hidden">
            {loadedTabs.has('restaurants') && (
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
                  selectedCategory="all"
                  setSelectedCategory={() => {}}
                  selectedCountry={selectedCountry}
                  openAdd={openAdd}
                  isAddOpen={isAddOpen}
                  closeAdd={closeAdd}
                  initialFormData={getInitialFormData()}
                  fixedCategory="美食餐廳"
                  tableName="restaurants"
                />
              </Suspense>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </ContentPageLayout>
  )
}
