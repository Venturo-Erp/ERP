'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { Building2, Plane, Search, CalendarDays, Loader2, X, Check, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import {
  useItineraries,
  createItinerary,
  updateItinerary,
  deleteItinerary,
  useQuotes,
  createQuote,
  updateQuote,
  useEmployeesSlim,
  useToursSlim,
  useCountries,
} from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores'
import type { Itinerary } from '@/stores/types'
import type { Quote } from '@/types/quote.types'
import { useItineraryPageState } from './hooks/useItineraryPageState'
import { useItineraryForm } from './hooks/useItineraryForm'
import { useFlightSearch } from '@/hooks'
import { useItineraryActions } from './hooks/useItineraryActions'
import { useItineraryTableColumns } from './hooks/useItineraryTableColumns'
import { useItineraryFilters } from './hooks/useItineraryFilters'
import { stripHtml } from '@/lib/utils/string-utils'
import { LABELS } from './constants/labels'

const statusFilters = [
  LABELS.ALL,
  LABELS.STATUS_TEMPLATE,
  LABELS.STATUS_PROPOSAL,
]

export default function ItineraryPage() {
  const router = useRouter()
  const { items: itineraries } = useItineraries()
  const { items: quotes } = useQuotes()
  const { items: employees } = useEmployeesSlim()
  const { items: tours } = useToursSlim()
  const { user, isAdmin } = useAuthStore()
  // 🔧 優化：countries 只用於新增對話框，cities 已不需要（Itinerary 有 denormalized 欄位）
  const { items: countries } = useCountries()

  // 🔧 優化：移除無條件 fetchAll，改為 Dialog 開啟時才載入
  // regionsStore.fetchAll() 移到 CreateItineraryDialog 內

  // Custom hooks
  const pageState = useItineraryPageState()
  const formState = useItineraryForm({ createItinerary, userId: user?.id })
  const flightSearch = useFlightSearch({
    outboundFlight: formState.newItineraryOutboundFlight,
    setOutboundFlight: formState.setNewItineraryOutboundFlight,
    returnFlight: formState.newItineraryReturnFlight,
    setReturnFlight: formState.setNewItineraryReturnFlight,
    departureDate: formState.newItineraryDepartureDate,
    days: formState.newItineraryDays,
  })

  const actions = useItineraryActions({
    updateItinerary: updateItinerary as (
      id: string,
      data: Partial<Itinerary>
    ) => Promise<Itinerary | void>,
    deleteItinerary: deleteItinerary as unknown as (id: string) => Promise<void>,
    createItinerary: createItinerary as (data: Partial<Itinerary>) => Promise<Itinerary | null>,
    createQuote: createQuote as (data: Partial<Quote>) => Promise<Quote | null>,
    updateQuote: updateQuote as (id: string, data: Partial<Quote>) => Promise<Quote | void>,
    quotes: quotes as Quote[],
    userId: user?.id,
    userName: user?.name,
    pageState,
  })

  // 🔧 優化：移除 countries/cities 參數，Itinerary 已有 denormalized 欄位
  const { tableColumns } = useItineraryTableColumns({
    employees,
    tours,
    handleDelete: actions.handleDelete,
    handleOpenDuplicateDialog: actions.handleOpenDuplicateDialog,
    handleArchive: actions.handleArchive,
    handleUnarchive: actions.handleUnarchive,
    handleSetTemplate: actions.handleSetTemplate,
    handleClose: actions.handleClose,
    handleReopen: actions.handleReopen,
    isItineraryClosed: actions.isItineraryClosed,
  })

  const { filteredItineraries } = useItineraryFilters({
    itineraries,
    statusFilter: pageState.statusFilter,
    searchTerm: pageState.searchTerm,
    authorFilter: pageState.authorFilter,
    viewMode: pageState.viewMode,
    userId: user?.id,
    isItineraryClosed: actions.isItineraryClosed,
  })

  // 打開新增行程對話框
  const handleOpenTypeSelect = useCallback(() => {
    formState.resetForm()
    // 🔧 優化：SWR 自動載入 regions，不需要手動 fetchAll()
    pageState.setIsTypeSelectOpen(true)
  }, [formState, pageState])

  // 建立行程
  const handleCreateItinerary = useCallback(async () => {
    const success = await formState.handleCreateItinerary()
    if (success) {
      pageState.setIsTypeSelectOpen(false)
    }
  }, [formState, pageState])

  // Memoize filtered employees for author select to prevent infinite re-renders
  const filteredEmployeesForSelect = useMemo(() => {
    return employees.filter(
      emp => emp.id !== user?.id && itineraries.some(it => it.created_by === emp.id)
    )
  }, [employees, user?.id, itineraries])

  return (
    <ContentPageLayout
      title={LABELS.ITINERARY_MANAGEMENT}
      showSearch={true}
      searchTerm={pageState.searchTerm}
      onSearchChange={pageState.setSearchTerm}
      searchPlaceholder={LABELS.SEARCH_ITINERARY}
      contentClassName="flex-1 overflow-hidden"
      headerActions={
        <Button
          onClick={handleOpenTypeSelect}
          className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
        >
          <CalendarDays size={16} />
          {LABELS.NEW_ITINERARY_TABLE}
        </Button>
      }
      headerChildren={
        <div className="flex items-center gap-4">
          {/* 分頁選擇 */}
          <div className="flex gap-2">
            <button
              onClick={() => pageState.setViewMode('all')}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                pageState.viewMode === 'all'
                  ? 'bg-morandi-gold text-white'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/30'
              )}
            >
              團體
            </button>
            <button
              onClick={() => pageState.setViewMode('templates')}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                pageState.viewMode === 'templates'
                  ? 'bg-morandi-gold text-white'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/30'
              )}
            >
              模板
            </button>
            <button
              onClick={() => pageState.setViewMode('proposals')}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                pageState.viewMode === 'proposals'
                  ? 'bg-morandi-gold text-white'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/30'
              )}
            >
              提案
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={pageState.authorFilter} onValueChange={pageState.setAuthorFilter}>
              <SelectTrigger className="w-auto min-w-[100px] h-8 text-sm">
                <SelectValue placeholder={LABELS.MY_ITINERARY} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__mine__">{LABELS.MY_ITINERARY}</SelectItem>
                <SelectItem value="all">{LABELS.ALL_AUTHORS}</SelectItem>
                {filteredEmployeesForSelect.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.display_name || emp.chinese_name || emp.english_name || emp.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
      }
    >
      {/* 新增行程對話框 */}
      <CreateItineraryDialog
        isOpen={pageState.isTypeSelectOpen}
        onOpenChange={pageState.setIsTypeSelectOpen}
        formState={formState}
        flightSearch={flightSearch}
        countries={countries}
        onCreateItinerary={handleCreateItinerary}
      />

      {/* 密碼解鎖對話框 */}
      <PasswordDialog
        isOpen={pageState.isPasswordDialogOpen}
        onOpenChange={pageState.setIsPasswordDialogOpen}
        passwordInput={pageState.passwordInput}
        onPasswordChange={pageState.setPasswordInput}
        onSubmit={actions.handlePasswordSubmit}
      />

      {/* 複製行程對話框 */}
      <DuplicateDialog
        isOpen={pageState.isDuplicateDialogOpen}
        onOpenChange={pageState.setIsDuplicateDialogOpen}
        duplicateSource={pageState.duplicateSource}
        duplicateTourCode={pageState.duplicateTourCode}
        duplicateTitle={pageState.duplicateTitle}
        isDuplicating={pageState.isDuplicating}
        onTourCodeChange={pageState.setDuplicateTourCode}
        onTitleChange={pageState.setDuplicateTitle}
        onSubmit={actions.handleDuplicateSubmit}
      />

      <div className="h-full">
        <EnhancedTable
          columns={tableColumns as TableColumn[]}
          data={filteredItineraries}
          onRowClick={itinerary => actions.handleRowClick(itinerary as Itinerary)}
          rowClassName={row => {
            const itinerary = row as Itinerary
            if (itinerary.tour_id) {
              return 'bg-morandi-blue/5 hover:bg-morandi-blue/10'
            }
            if (!itinerary.tour_id && !itinerary.is_template) {
              return 'bg-status-danger-bg hover:bg-status-danger-bg'
            }
            return ''
          }}
        />
      </div>
    </ContentPageLayout>
  )
}

// ===== 子組件 =====

interface CreateItineraryDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  formState: ReturnType<typeof useItineraryForm>
  flightSearch: ReturnType<typeof useFlightSearch>
  countries: Array<{ id: string; name: string }>
  onCreateItinerary: () => Promise<void>
}

function CreateItineraryDialog({
  isOpen,
  onOpenChange,
  formState,
  flightSearch,
  countries,
  onCreateItinerary,
}: CreateItineraryDialogProps) {
  const [step, setStep] = useState<
    'selectType' | 'selectTour' | 'createTemplate' | 'createItinerary'
  >('selectType')
  const [selectedTourId, setSelectedTourId] = useState('')
  const { items: tours } = useToursSlim()
  const [loadingTourData, setLoadingTourData] = useState(false)

  // 模板資料
  const [templateCode, setTemplateCode] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateDays, setTemplateDays] = useState('')

  // 重置步驟當對話框關閉
  useEffect(() => {
    if (!isOpen) {
      setStep('selectType')
      setSelectedTourId('')
      setTemplateCode('')
      setTemplateName('')
      setTemplateDays('')
    }
  }, [isOpen])

  // 選擇團後進入行程規劃
  const handleTourSelected = async () => {
    if (!selectedTourId) return

    setLoadingTourData(true)
    try {
      // 查詢選中的團資料
      const selectedTour = tours.find(t => t.id === selectedTourId)
      if (!selectedTour) return

      // 帶入基本資訊
      formState.setNewItineraryTitle(selectedTour.name)
      formState.setNewItineraryTourCode(selectedTour.code)
      formState.setNewItineraryDepartureDate(selectedTour.departure_date || '')

      // 計算天數
      const departureDate = selectedTour.departure_date
        ? new Date(selectedTour.departure_date)
        : new Date()
      const returnDate = selectedTour.return_date ? new Date(selectedTour.return_date) : new Date()
      const days = Math.ceil(
        (returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      formState.setNewItineraryDays(String(days))

      // 查詢該團的 tour_itinerary_items（核心表格）
      const { supabase } = await import('@/lib/supabase/client')

      const { data: itineraryItems } = await supabase
        .from('tour_itinerary_items')
        .select('*')
        .eq('tour_id', selectedTourId)
        .order('day_number', { ascending: true })

      // 將 itinerary_items 資料轉換為每日行程格式
      if (itineraryItems && itineraryItems.length > 0) {
        const dailyData: Array<{
          title: string
          breakfast: string
          lunch: string
          dinner: string
          accommodation: string
          isSameAccommodation: boolean
        }> = []

        for (let day = 1; day <= days; day++) {
          const dayItems = itineraryItems.filter((item: any) => item.day_number === day)

          dailyData.push({
            title:
              dayItems.find((item: any) => item.resource_type === 'attraction')?.resource_name ||
              '',
            breakfast:
              dayItems.find(
                (item: any) => item.resource_type === 'meal' && item.meal_type === 'breakfast'
              )?.resource_name || '',
            lunch:
              dayItems.find(
                (item: any) => item.resource_type === 'meal' && item.meal_type === 'lunch'
              )?.resource_name || '',
            dinner:
              dayItems.find(
                (item: any) => item.resource_type === 'meal' && item.meal_type === 'dinner'
              )?.resource_name || '',
            accommodation:
              dayItems.find((item: any) => item.resource_type === 'hotel')?.resource_name || '',
            isSameAccommodation: false,
          })
        }

        formState.setNewItineraryDailyData(dailyData)
      }

      setStep('createItinerary')
    } catch (error) {
      console.error('Failed to load tour data:', error)
    } finally {
      setLoadingTourData(false)
    }
  }

  // Step 1: 選擇類型（開團 / 新增模板）
  if (step === 'selectType') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-morandi-gold" />
              請選擇建立方式
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-3">
            <button
              onClick={() => setStep('selectTour')}
              className="w-full p-6 border border-border rounded-lg hover:bg-morandi-container/30 text-left transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <CalendarDays className="w-6 h-6 text-morandi-gold" />
                <h3 className="text-lg font-medium">開團</h3>
              </div>
              <p className="text-sm text-morandi-secondary">從現有團號建立行程</p>
            </button>

            <button
              onClick={() => setStep('createTemplate')}
              className="w-full p-6 border border-border rounded-lg hover:bg-morandi-container/30 text-left transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-morandi-gold" />
                <h3 className="text-lg font-medium">新增模板</h3>
              </div>
              <p className="text-sm text-morandi-secondary">建立可重複使用的範本</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Step 2A: 選擇團號
  if (step === 'selectTour') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-morandi-gold" />
              選擇團號
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Label className="mb-2 block">選擇團號</Label>
            <Select value={selectedTourId} onValueChange={setSelectedTourId}>
              <SelectTrigger>
                <SelectValue placeholder="請選擇團號" />
              </SelectTrigger>
              <SelectContent>
                {tours.map(tour => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.code} - {tour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loadingTourData}
            >
              取消
            </Button>
            <Button
              onClick={handleTourSelected}
              disabled={!selectedTourId || loadingTourData}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
            >
              {loadingTourData ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  載入中...
                </>
              ) : (
                '下一步'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Step 2B: 建立模板
  if (step === 'createTemplate') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-morandi-gold" />
              建立行程模板
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div>
              <Label className="mb-2 block">模板代號</Label>
              <Input
                value={templateCode}
                onChange={e => setTemplateCode(e.target.value)}
                placeholder="例如：TPL-JPN-001"
              />
              <p className="text-xs text-morandi-secondary mt-1">建議格式：TPL-[國家代碼]-[編號]</p>
            </div>

            <div>
              <Label className="mb-2 block">模板名稱</Label>
              <Input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="例如：日本東京經典 5 日遊"
              />
            </div>

            <div>
              <Label className="mb-2 block">天數</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={templateDays}
                onChange={e => setTemplateDays(e.target.value)}
                placeholder="請輸入天數"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('selectType')}>
              返回
            </Button>
            <Button
              onClick={() => {
                // TODO: 建立模板並進入行程規劃頁面
                formState.setNewItineraryTitle(templateName)
                formState.setNewItineraryDays(templateDays)
                setStep('createItinerary')
              }}
              disabled={!templateCode || !templateName || !templateDays}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              下一步
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Step 3: 行程規劃頁面（開團和模板共用）
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-5xl h-[90vh] overflow-hidden p-0">
        <div className="flex h-full">
          {/* 左側：基本資訊 */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-morandi-gold" />
                {LABELS.NEW_ITINERARY_TABLE}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newItineraryTitle">{LABELS.ITINERARY_NAME_REQUIRED}</Label>
                <Input
                  id="newItineraryTitle"
                  placeholder={LABELS.EXAMPLE_OKINAWA}
                  value={formState.newItineraryTitle}
                  onChange={e => formState.setNewItineraryTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newItineraryTourCode">{LABELS.ITINERARY_CODE_OPTIONAL}</Label>
                <Input
                  id="newItineraryTourCode"
                  placeholder={LABELS.EXAMPLE_TOUR_CODE}
                  value={formState.newItineraryTourCode}
                  onChange={e => formState.setNewItineraryTourCode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{LABELS.COUNTRY}</Label>
                <Select
                  value={formState.newItineraryCountry}
                  onValueChange={formState.setNewItineraryCountry}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={LABELS.SELECT_COUNTRY} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{LABELS.DEPARTURE_DATE_REQUIRED}</Label>
                  <DatePicker
                    value={formState.newItineraryDepartureDate}
                    onChange={date => formState.setNewItineraryDepartureDate(date)}
                    placeholder={LABELS.SELECT_DEPARTURE_DATE}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{LABELS.DAYS_REQUIRED}</Label>
                  <Select
                    value={formState.newItineraryDays}
                    onValueChange={formState.setNewItineraryDays}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={LABELS.SELECT_DAYS} />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7, 8, 9, 10].map(day => (
                        <SelectItem key={day} value={String(day)}>
                          {day} {LABELS.DAY_SUFFIX}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 航班資訊 */}
              <FlightInputSection formState={formState} flightSearch={flightSearch} />

              {/* 按鈕 */}
              <div className="flex justify-end gap-2 pt-4 mt-2 relative">
                <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-morandi-muted/40 to-transparent" />
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={formState.isCreatingItinerary}
                  className="gap-2"
                >
                  <X size={16} />
                  {LABELS.CANCEL}
                </Button>
                <Button
                  onClick={onCreateItinerary}
                  disabled={
                    formState.isCreatingItinerary ||
                    !formState.newItineraryTitle.trim() ||
                    !formState.newItineraryDepartureDate ||
                    !formState.newItineraryDays
                  }
                  className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-1"
                >
                  {formState.isCreatingItinerary ? (
                    <>{LABELS.CREATING}</>
                  ) : (
                    <>
                      <Plane size={14} />
                      {LABELS.CREATE_ITINERARY}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 中間分隔線 */}
          <div className="flex items-center py-8">
            <div className="w-px h-full bg-gradient-to-b from-transparent via-morandi-muted/40 to-transparent" />
          </div>

          {/* 右側：每日行程預覽 */}
          <DailyItineraryPreview formState={formState} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface FlightInputSectionProps {
  formState: ReturnType<typeof useItineraryForm>
  flightSearch: ReturnType<typeof useFlightSearch>
}

function FlightInputSection({ formState, flightSearch }: FlightInputSectionProps) {
  return (
    <div className="pt-4 mt-4 relative">
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-morandi-muted/40 to-transparent" />
      <Label className="text-morandi-primary mb-3 block">{LABELS.FLIGHT_INFO_OPTIONAL}</Label>
      <div className="space-y-3">
        {/* 去程航班 */}
        <div className="p-2 rounded-lg border border-morandi-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-morandi-primary">{LABELS.OUTBOUND}</span>
              {formState.newItineraryOutboundFlight?.departureDate && (
                <span className="text-xs text-morandi-gold font-medium">
                  ({formState.newItineraryOutboundFlight.departureDate})
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={flightSearch.handleSearchOutboundFlight}
              disabled={
                flightSearch.loadingOutboundFlight ||
                !formState.newItineraryOutboundFlight?.flightNumber
              }
              className="h-5 text-[10px] gap-1 px-2"
            >
              {flightSearch.loadingOutboundFlight ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Search size={10} />
              )}
              {LABELS.SEARCH_BUTTON}
            </Button>
          </div>
          {/* 多航段選擇器 */}
          {flightSearch.outboundSegments.length > 0 && (
            <div className="bg-card p-2 rounded border border-morandi-gold/30 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-morandi-secondary">
                  {LABELS.MULTIPLE_SEGMENTS_SELECT}
                </p>
                <button
                  type="button"
                  onClick={flightSearch.clearOutboundSegments}
                  className="text-[10px] text-morandi-secondary hover:text-morandi-primary"
                >
                  {LABELS.CANCEL}
                </button>
              </div>
              {flightSearch.outboundSegments.map((seg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => flightSearch.handleSelectOutboundSegment(seg)}
                  className="w-full text-left p-1.5 rounded border border-border hover:border-morandi-gold hover:bg-morandi-gold/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-morandi-primary">
                      {seg.departureAirport} → {seg.arrivalAirport}
                    </span>
                    <span className="text-[10px] text-morandi-secondary">
                      {seg.departureTime} - {seg.arrivalTime}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-6 gap-1">
            <Input
              placeholder={LABELS.FLIGHT}
              value={formState.newItineraryOutboundFlight?.flightNumber || ''}
              onChange={e =>
                formState.setNewItineraryOutboundFlight(prev => ({
                  ...prev,
                  flightNumber: e.target.value,
                  airline: prev?.airline || '',
                  departureAirport: prev?.departureAirport || 'TPE',
                  arrivalAirport: prev?.arrivalAirport || '',
                  departureTime: prev?.departureTime || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.AIRLINE}
              value={formState.newItineraryOutboundFlight?.airline || ''}
              onChange={e =>
                formState.setNewItineraryOutboundFlight(prev => ({
                  ...prev,
                  airline: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  departureAirport: prev?.departureAirport || 'TPE',
                  arrivalAirport: prev?.arrivalAirport || '',
                  departureTime: prev?.departureTime || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.DEPARTURE}
              value={formState.newItineraryOutboundFlight?.departureAirport || ''}
              onChange={e =>
                formState.setNewItineraryOutboundFlight(prev => ({
                  ...prev,
                  departureAirport: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  airline: prev?.airline || '',
                  arrivalAirport: prev?.arrivalAirport || '',
                  departureTime: prev?.departureTime || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.ARRIVAL}
              value={formState.newItineraryOutboundFlight?.arrivalAirport || ''}
              onChange={e =>
                formState.setNewItineraryOutboundFlight(prev => ({
                  ...prev,
                  arrivalAirport: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  airline: prev?.airline || '',
                  departureAirport: prev?.departureAirport || 'TPE',
                  departureTime: prev?.departureTime || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.TAKEOFF}
              value={formState.newItineraryOutboundFlight?.departureTime || ''}
              onChange={e =>
                formState.setNewItineraryOutboundFlight(prev => ({
                  ...prev,
                  departureTime: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  airline: prev?.airline || '',
                  departureAirport: prev?.departureAirport || 'TPE',
                  arrivalAirport: prev?.arrivalAirport || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.LANDING}
              value={formState.newItineraryOutboundFlight?.arrivalTime || ''}
              onChange={e =>
                formState.setNewItineraryOutboundFlight(prev => ({
                  ...prev,
                  arrivalTime: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  airline: prev?.airline || '',
                  departureAirport: prev?.departureAirport || 'TPE',
                  arrivalAirport: prev?.arrivalAirport || '',
                  departureTime: prev?.departureTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
          </div>
        </div>

        {/* 回程航班 */}
        <div className="p-2 rounded-lg border border-morandi-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-morandi-primary">{LABELS.RETURN}</span>
              {formState.newItineraryReturnFlight?.departureDate && (
                <span className="text-xs text-morandi-gold font-medium">
                  ({formState.newItineraryReturnFlight.departureDate})
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={flightSearch.handleSearchReturnFlight}
              disabled={
                flightSearch.loadingReturnFlight ||
                !formState.newItineraryReturnFlight?.flightNumber
              }
              className="h-5 text-[10px] gap-1 px-2"
            >
              {flightSearch.loadingReturnFlight ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Search size={10} />
              )}
              {LABELS.SEARCH_BUTTON}
            </Button>
          </div>
          {/* 多航段選擇器 */}
          {flightSearch.returnSegments.length > 0 && (
            <div className="bg-card p-2 rounded border border-morandi-gold/30 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-morandi-secondary">
                  {LABELS.MULTIPLE_SEGMENTS_SELECT}
                </p>
                <button
                  type="button"
                  onClick={flightSearch.clearReturnSegments}
                  className="text-[10px] text-morandi-secondary hover:text-morandi-primary"
                >
                  {LABELS.CANCEL}
                </button>
              </div>
              {flightSearch.returnSegments.map((seg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => flightSearch.handleSelectReturnSegment(seg)}
                  className="w-full text-left p-1.5 rounded border border-border hover:border-morandi-gold hover:bg-morandi-gold/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-morandi-primary">
                      {seg.departureAirport} → {seg.arrivalAirport}
                    </span>
                    <span className="text-[10px] text-morandi-secondary">
                      {seg.departureTime} - {seg.arrivalTime}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-6 gap-1">
            <Input
              placeholder={LABELS.FLIGHT}
              value={formState.newItineraryReturnFlight?.flightNumber || ''}
              onChange={e =>
                formState.setNewItineraryReturnFlight(prev => ({
                  ...prev,
                  flightNumber: e.target.value,
                  airline: prev?.airline || '',
                  departureAirport: prev?.departureAirport || '',
                  arrivalAirport: prev?.arrivalAirport || 'TPE',
                  departureTime: prev?.departureTime || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.AIRLINE}
              value={formState.newItineraryReturnFlight?.airline || ''}
              onChange={e =>
                formState.setNewItineraryReturnFlight(prev => ({
                  ...prev,
                  airline: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  departureAirport: prev?.departureAirport || '',
                  arrivalAirport: prev?.arrivalAirport || 'TPE',
                  departureTime: prev?.departureTime || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.DEPARTURE}
              value={formState.newItineraryReturnFlight?.departureAirport || ''}
              onChange={e =>
                formState.setNewItineraryReturnFlight(prev => ({
                  ...prev,
                  departureAirport: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  airline: prev?.airline || '',
                  arrivalAirport: prev?.arrivalAirport || 'TPE',
                  departureTime: prev?.departureTime || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.ARRIVAL}
              value={formState.newItineraryReturnFlight?.arrivalAirport || ''}
              onChange={e =>
                formState.setNewItineraryReturnFlight(prev => ({
                  ...prev,
                  arrivalAirport: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  airline: prev?.airline || '',
                  departureAirport: prev?.departureAirport || '',
                  departureTime: prev?.departureTime || '',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.TAKEOFF}
              value={formState.newItineraryReturnFlight?.departureTime || ''}
              onChange={e =>
                formState.setNewItineraryReturnFlight(prev => ({
                  ...prev,
                  departureTime: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  airline: prev?.airline || '',
                  departureAirport: prev?.departureAirport || '',
                  arrivalAirport: prev?.arrivalAirport || 'TPE',
                  arrivalTime: prev?.arrivalTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
            <Input
              placeholder={LABELS.LANDING}
              value={formState.newItineraryReturnFlight?.arrivalTime || ''}
              onChange={e =>
                formState.setNewItineraryReturnFlight(prev => ({
                  ...prev,
                  arrivalTime: e.target.value,
                  flightNumber: prev?.flightNumber || '',
                  airline: prev?.airline || '',
                  departureAirport: prev?.departureAirport || '',
                  arrivalAirport: prev?.arrivalAirport || 'TPE',
                  departureTime: prev?.departureTime || '',
                  departureDate: prev?.departureDate || '',
                }))
              }
              className="text-[10px] h-7"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface DailyItineraryPreviewProps {
  formState: ReturnType<typeof useItineraryForm>
}

function DailyItineraryPreview({ formState }: DailyItineraryPreviewProps) {
  // 取得實際住宿（處理續住邏輯）
  const getEffectiveAccommodation = (dayIndex: number): string => {
    const dayData = formState.newItineraryDailyData[dayIndex]
    if (!dayData) return ''

    // 如果不是續住，直接返回當天住宿
    if (!dayData.isSameAccommodation) {
      return dayData.accommodation || ''
    }

    // 續住：往前找到最近的非續住住宿
    for (let i = dayIndex - 1; i >= 0; i--) {
      const prevDay = formState.newItineraryDailyData[i]
      if (!prevDay?.isSameAccommodation) {
        return prevDay?.accommodation || ''
      }
    }
    return ''
  }

  // 處理續住勾選
  const handleSameAccommodationChange = (dayIndex: number, checked: boolean) => {
    formState.setNewItineraryDailyData(prev => {
      const updated = [...prev]
      if (checked) {
        // 勾選續住：複製前一天的住宿
        const prevAccommodation = getEffectiveAccommodation(dayIndex - 1)
        updated[dayIndex] = {
          ...updated[dayIndex],
          isSameAccommodation: true,
          accommodation: prevAccommodation,
        }
      } else {
        // 取消續住：清空住宿讓用戶重新填寫
        updated[dayIndex] = {
          ...updated[dayIndex],
          isSameAccommodation: false,
          accommodation: '',
        }
      }
      return updated
    })
  }

  // 當住宿變更時，更新所有續住的後續天數
  const updateDayData = (dayIndex: number, field: string, value: string) => {
    formState.setNewItineraryDailyData(prev => {
      const updated = [...prev]
      updated[dayIndex] = { ...updated[dayIndex], [field]: value }

      // 如果修改的是住宿，更新後續所有續住的天數
      if (field === 'accommodation') {
        for (let i = dayIndex + 1; i < updated.length; i++) {
          if (updated[i]?.isSameAccommodation) {
            updated[i] = { ...updated[i], accommodation: value }
          } else {
            break // 遇到非續住的就停止
          }
        }
      }

      return updated
    })
  }

  return (
    <div className="w-1/2 p-6 overflow-y-auto">
      <h3 className="text-sm font-bold text-morandi-primary mb-4">{LABELS.DAILY_ITINERARY}</h3>
      {formState.newItineraryDays ? (
        <div className="space-y-3">
          {Array.from({ length: parseInt(formState.newItineraryDays) }, (_, i) => {
            const dayNum = i + 1
            const isFirst = dayNum === 1
            const isLast = dayNum === parseInt(formState.newItineraryDays)
            let dateLabel = ''
            if (formState.newItineraryDepartureDate) {
              const date = new Date(formState.newItineraryDepartureDate)
              date.setDate(date.getDate() + i)
              dateLabel = `${date.getMonth() + 1}/${date.getDate()}`
            }
            const dayData = formState.newItineraryDailyData[i] || {
              title: '',
              breakfast: '',
              lunch: '',
              dinner: '',
              accommodation: '',
              isSameAccommodation: false,
            }
            const effectiveAccommodation = getEffectiveAccommodation(i)

            return (
              <div key={dayNum} className="p-3 rounded-lg border border-morandi-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-morandi-gold text-white text-xs font-bold px-2 py-0.5 rounded">
                    Day {dayNum}
                  </span>
                  {dateLabel && (
                    <span className="text-xs text-morandi-secondary">({dateLabel})</span>
                  )}
                </div>
                <Input
                  placeholder={
                    isFirst
                      ? LABELS.ARRIVE_DESTINATION
                      : isLast
                        ? LABELS.RETURN_TAIWAN
                        : LABELS.DAILY_TITLE
                  }
                  className="h-8 text-sm mb-2"
                  value={dayData.title}
                  onChange={e => updateDayData(i, 'title', e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder={isFirst ? LABELS.WARM_HOME : LABELS.BREAKFAST}
                    className="h-8 text-xs"
                    value={dayData.breakfast}
                    onChange={e => updateDayData(i, 'breakfast', e.target.value)}
                  />
                  <Input
                    placeholder={LABELS.LUNCH}
                    className="h-8 text-xs"
                    value={dayData.lunch}
                    onChange={e => updateDayData(i, 'lunch', e.target.value)}
                  />
                  <Input
                    placeholder={LABELS.DINNER}
                    className="h-8 text-xs"
                    value={dayData.dinner}
                    onChange={e => updateDayData(i, 'dinner', e.target.value)}
                  />
                </div>
                {!isLast && (
                  <div className="mt-2 space-y-1">
                    {/* 續住勾選（第二天以後才顯示） */}
                    {!isFirst && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dayData.isSameAccommodation || false}
                          onChange={e => handleSameAccommodationChange(i, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-morandi-muted text-morandi-gold focus:ring-morandi-gold"
                        />
                        <span className="text-xs text-morandi-secondary">
                          {LABELS.SAME_ACCOMMODATION}
                          {dayData.isSameAccommodation && effectiveAccommodation && (
                            <span className="text-morandi-gold ml-1">
                              （{effectiveAccommodation}）
                            </span>
                          )}
                        </span>
                      </label>
                    )}
                    {/* 住宿輸入欄位 */}
                    {!dayData.isSameAccommodation && (
                      <Input
                        placeholder={LABELS.ACCOMMODATION_HOTEL}
                        className="h-8 text-xs"
                        value={dayData.accommodation}
                        onChange={e => updateDayData(i, 'accommodation', e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-morandi-secondary text-sm">
          {LABELS.SELECT_DAYS_FIRST}
        </div>
      )}
    </div>
  )
}

interface PasswordDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  passwordInput: string
  onPasswordChange: (value: string) => void
  onSubmit: () => void
}

function PasswordDialog({
  isOpen,
  onOpenChange,
  passwordInput,
  onPasswordChange,
  onSubmit,
}: PasswordDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{LABELS.EDIT_ONGOING_ITINERARY}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-morandi-secondary mb-4">{LABELS.EDIT_PASSWORD_WARNING}</p>
          <Input
            type="password"
            placeholder={LABELS.ENTER_COMPANY_PASSWORD}
            value={passwordInput}
            onChange={e => onPasswordChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSubmit()
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X size={16} />
            {LABELS.CANCEL}
          </Button>
          <Button onClick={onSubmit} className="gap-2">
            <Check size={16} />
            {LABELS.APPLY}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DuplicateDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  duplicateSource: Itinerary | null
  duplicateTourCode: string
  duplicateTitle: string
  isDuplicating: boolean
  onTourCodeChange: (value: string) => void
  onTitleChange: (value: string) => void
  onSubmit: () => Promise<void>
}

function DuplicateDialog({
  isOpen,
  onOpenChange,
  duplicateSource,
  duplicateTourCode,
  duplicateTitle,
  isDuplicating,
  onTourCodeChange,
  onTitleChange,
  onSubmit,
}: DuplicateDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{LABELS.COPY_ITINERARY}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-morandi-secondary">
            {LABELS.COPYING_PREFIX}
            <span className="font-medium text-morandi-primary">
              {stripHtml(duplicateSource?.title)}
            </span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="duplicateTourCode">{LABELS.ITINERARY_CODE_REQUIRED}</Label>
            <Input
              id="duplicateTourCode"
              placeholder={LABELS.ENTER_NEW_CODE}
              value={duplicateTourCode}
              onChange={e => onTourCodeChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duplicateTitle">{LABELS.ITINERARY_NAME_REQUIRED}</Label>
            <Input
              id="duplicateTitle"
              placeholder={LABELS.ENTER_NEW_NAME}
              value={duplicateTitle}
              onChange={e => onTitleChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && duplicateTourCode.trim() && duplicateTitle.trim()) {
                  onSubmit()
                }
              }}
            />
          </div>
          <p className="text-xs text-morandi-muted">
            {LABELS.COPY_DESCRIPTION1}
            <br />
            {LABELS.COPY_DESCRIPTION2}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDuplicating}
            className="gap-2"
          >
            <X size={16} />
            {LABELS.CANCEL}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isDuplicating || !duplicateTourCode.trim() || !duplicateTitle.trim()}
            className="gap-2"
          >
            <Check size={16} />
            {isDuplicating ? LABELS.COPYING : LABELS.CONFIRM_COPY}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
