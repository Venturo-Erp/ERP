'use client'

/**
 * TourConfirmationSheetPage - 團確單頁面
 *
 * 正式的出團確認表，類似 Excel 表格風格
 * 用於交接作業
 */

import React, { useState, useCallback } from 'react'
import { Plus, Loader2, RefreshCw, Send, AlertCircle, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { syncTripToOnline } from '../services/syncToOnline'
import { useTourConfirmationSheet } from '../hooks/useTourConfirmationSheet'
import { useTourSheetData } from '../hooks/useTourSheetData'
import { useInlineEditing } from '../hooks/useInlineEditing'
import { useCurrencyConversion } from '../hooks/useCurrencyConversion'
import { useSheetItemActions } from '../hooks/useSheetItemActions'
import { ItemEditDialog } from './ItemEditDialog'
import { CategoryItemRow } from './CategoryItemRow'
import { TransportAddRow, GenericAddRow } from './InlineAddRow'
import {
  TourInfoSection,
  DailyItinerarySection,
  HotelConfirmationSection,
  SettlementSection,
  ExchangeRateDialog,
} from './sections'
import { getDestinationCurrency, getCurrencySymbol, formatCurrency } from '../constants/currency'
import type { Tour } from '@/stores/types'
import type {
  TourConfirmationItem,
  ConfirmationItemCategory,
  CreateConfirmationItem,
} from '@/types/tour-confirmation-sheet.types'
import { COST_SUMMARY_LABELS, TOUR_CONFIRMATION_SHEET_PAGE_LABELS } from '../constants/labels'

// 分類配置
const CATEGORIES: { key: ConfirmationItemCategory; label: string }[] = [
  { key: 'transport', label: COST_SUMMARY_LABELS.交通 },
  { key: 'accommodation', label: COST_SUMMARY_LABELS.住宿 },
  { key: 'meal', label: COST_SUMMARY_LABELS.餐食 },
  { key: 'activity', label: COST_SUMMARY_LABELS.活動 },
  { key: 'other', label: COST_SUMMARY_LABELS.其他 },
]

interface TourConfirmationSheetPageProps {
  tour: Tour
}

export function TourConfirmationSheetPage({ tour }: TourConfirmationSheetPageProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const workspaceId = tour.workspace_id || user?.workspace_id || ''

  // 主要 hook
  const {
    sheet,
    items,
    groupedItems,
    costSummary,
    loading,
    saving,
    error,
    createSheet,
    updateSheet,
    addItem,
    updateItem,
    deleteItem,
    reload,
  } = useTourConfirmationSheet({ tourId: tour.id })

  // 資料載入 hook
  const {
    itinerary,
    itineraryLoading,
    tourRequests,
    requestsLoading,
    vehicleRequests,
    incompleteRequests,
    quoteItems,
    quoteItemsLoading,
    tourOrders,
    ordersLoading,
    primaryContact,
    calculateAgeGroups,
    tourRooms,
    quoteRoomItems,
  } = useTourSheetData({
    tourId: tour.id,
    quoteId: tour.quote_id,
    departureDate: tour.departure_date,
  })

  const ageGroups = calculateAgeGroups(tour.departure_date)
  const destinationCurrency = getDestinationCurrency(tour.location, tour.code)

  // 行內編輯 hook
  const {
    localExpectedCostsRef,
    handleExpectedCostChange,
    handleExpectedCostFormulaChange,
    handleExpectedCostBlur,
    localNotesRef,
    handleNotesChange,
    handleNotesBlur,
  } = useInlineEditing({ updateItem })

  // forceUpdate for currency conversion
  const [, setForceUpdateKey] = useState(0)
  const forceUpdate = useCallback(() => setForceUpdateKey(n => n + 1), [])

  // 匯率 hook
  const {
    effectiveExchangeRate,
    exchangeRateDialog,
    exchangeRateInput,
    setExchangeRateInput,
    setExchangeRateDialog,
    handleCurrencyConvert,
    handleSaveExchangeRate,
    openExchangeRateDialog,
  } = useCurrencyConversion({
    sheet,
    destinationCurrency,
    groupedItems,
    updateItem,
    updateSheet,
    localExpectedCostsRef,
    forceUpdate,
  })

  // 項目操作 hook
  const {
    addingCategory,
    newItemData,
    savingNew,
    firstInputRef,
    transportSubType,
    manualFlightMode,
    manualFlight,
    setManualFlightMode,
    setManualFlight,
    handleAdd,
    handleCancelAdd,
    handleSelectTransportType,
    handleNewItemChange,
    handleAddFlightItems,
    handleSaveManualFlight,
    handleImportMeals,
    handleImportAccommodation,
    handleImportActivities,
    handleImportFromRequests,
    hasRequestsForCategory,
    handleSaveNewItem,
  } = useSheetItemActions({
    tour,
    sheetId: sheet?.id,
    addItem,
    itinerary,
    tourRequests,
  })

  // 編輯對話框狀態
  const [editDialog, setEditDialog] = useState<{
    open: boolean
    category: ConfirmationItemCategory
    item: TourConfirmationItem | null
  }>({
    open: false,
    category: 'transport',
    item: null,
  })

  // 交接狀態
  const [handingOver, setHandingOver] = useState(false)

  // 開啟編輯對話框
  const handleEdit = (item: TourConfirmationItem) => {
    setEditDialog({
      open: true,
      category: item.category as ConfirmationItemCategory,
      item,
    })
  }

  // 儲存編輯的項目
  const handleSave = async (data: CreateConfirmationItem) => {
    if (editDialog.item) {
      await updateItem(editDialog.item.id, data)
    }
    setEditDialog({ open: false, category: 'transport', item: null })
  }

  // 刪除項目
  const handleDelete = async (itemId: string) => {
    if (confirm(TOUR_CONFIRMATION_SHEET_PAGE_LABELS.確定要刪除此項目嗎)) {
      await deleteItem(itemId)
    }
  }

  // 檢查是否已設定領隊
  const hasLeader = sheet?.tour_leader_name && sheet.tour_leader_name.trim() !== ''

  // 交接功能
  const handleHandoff = async () => {
    if (incompleteRequests.length > 0) return

    if (!hasLeader) {
      const proceed = window.confirm(
        TOUR_CONFIRMATION_SHEET_PAGE_LABELS.尚未設定領隊_n_n +
          TOUR_CONFIRMATION_SHEET_PAGE_LABELS.如果此團需要領隊_請先在上方填寫領隊姓名_n +
          TOUR_CONFIRMATION_SHEET_PAGE_LABELS.如果此團不需要領隊_如包車_可以繼續交接_n_n +
          TOUR_CONFIRMATION_SHEET_PAGE_LABELS.確定要繼續交接嗎
      )
      if (!proceed) return
    }

    setHandingOver(true)
    try {
      if (sheet) {
        const { error: sheetError } = await supabase
          .from('tour_confirmation_sheets')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', sheet.id)

        if (sheetError) throw sheetError
      }

      const syncResult = await syncTripToOnline(tour.id)
      if (!syncResult.success) {
        logger.warn('同步到 Online 失敗:', syncResult.message)
      }

      alert(TOUR_CONFIRMATION_SHEET_PAGE_LABELS.交接完成_n_n確認單狀態已更新_n行程已同步到_Onlin)
      reload()
    } catch (err) {
      logger.error('交接失敗:', err)
      alert(TOUR_CONFIRMATION_SHEET_PAGE_LABELS.交接失敗_請稍後再試)
    } finally {
      setHandingOver(false)
    }
  }

  // 列印功能
  const handlePrint = () => {
    window.print()
  }

  // Loading 狀態
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-morandi-secondary" size={32} />
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-morandi-red">
        <p>{TOUR_CONFIRMATION_SHEET_PAGE_LABELS.載入失敗.replace('{0}', error)}</p>
        <Button variant="outline" onClick={reload} className="mt-4 gap-2">
          <RefreshCw size={16} />
          {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.重新載入}
        </Button>
      </div>
    )
  }

  // 缺少 workspace_id
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-morandi-secondary">
        <p>{TOUR_CONFIRMATION_SHEET_PAGE_LABELS.無法取得工作空間資訊請重新登入}</p>
      </div>
    )
  }

  const allItems = Object.values(groupedItems).flat()

  return (
    <div className="space-y-4">
      {/* 工具列 - 列印時隱藏 */}
      <div className="flex items-center justify-between print:hidden">
        <div className="text-sm text-morandi-secondary">
          {tour.code} {tour.name} | {tour.departure_date} ~ {tour.return_date}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer size={16} />
            {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.列印}
          </Button>

          {incompleteRequests.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="gap-2 text-morandi-secondary"
              title={`尚有 ${incompleteRequests.length} 項需求未完成`}
            >
              <AlertCircle size={16} />
              {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.尚有項待處理.replace(
                '{0}',
                incompleteRequests.length.toString()
              )}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleHandoff}
              disabled={handingOver}
              className="gap-2 bg-morandi-green hover:bg-morandi-green/90"
            >
              {handingOver ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.確認交接}
            </Button>
          )}
        </div>
      </div>

      {/* 列印內容區域 */}
      <div
        id="print-content"
        className="border border-border rounded-lg overflow-hidden print:border-0 print:rounded-none print:overflow-visible bg-white"
      >
        {/* 團基本資訊 */}
        <TourInfoSection
          tour={tour}
          sheet={sheet}
          itinerary={itinerary}
          primaryContact={primaryContact}
          ageGroups={ageGroups}
          vehicleRequests={vehicleRequests}
        />

        {/* 每日行程表 */}
        {itinerary && <DailyItinerarySection itinerary={itinerary} />}

        {/* 飯店確認 */}
        {itinerary && (
          <HotelConfirmationSection
            itinerary={itinerary}
            tourRequests={tourRequests}
            tourRooms={tourRooms}
            quoteRoomItems={quoteRoomItems}
          />
        )}

        {/* 統一表格 */}
        <div className="border-t border-border">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-morandi-container/50 border-b border-border">
                <th className="px-2 py-2 text-left font-medium text-morandi-primary w-[4%] border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.分類}
                </th>
                <th className="px-1 py-2 text-left font-medium text-morandi-primary w-[5%] border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.日期}
                </th>
                <th className="px-2 py-2 text-left font-medium text-morandi-primary w-[12%] border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.供應商}
                </th>
                <th className="px-2 py-2 text-left font-medium text-morandi-primary border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.項目說明}
                </th>
                <th className="px-1 py-2 text-right font-medium text-morandi-primary w-[6%] border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.單價}
                </th>
                <th className="px-1 py-2 text-center font-medium text-morandi-primary w-[4%] border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.數量}
                </th>
                <th className="px-1 py-2 text-right font-medium text-morandi-primary w-[6%] border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.小計}
                </th>
                <th className="px-1 py-2 text-right font-medium text-morandi-primary w-[7%] border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.預計支出}
                </th>
                <th className="px-1 py-2 text-right font-medium text-morandi-primary w-[7%] border-r border-border/30">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.實際支出}
                </th>
                <th className="px-2 py-2 text-left font-medium text-morandi-primary w-[28%]">
                  {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.備註}
                </th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(cat => {
                const categoryItems = groupedItems[cat.key]

                return (
                  <React.Fragment key={cat.key}>
                    {/* 分類標題行 */}
                    <tr className="bg-morandi-container/30 border-t border-border print:hidden">
                      <td colSpan={9} className="px-3 py-1.5">
                        <span className="font-medium text-morandi-primary">{cat.label}</span>
                        <span className="ml-2 text-xs text-morandi-secondary">
                          ({categoryItems.length})
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAdd(cat.key)}
                          className="h-6 px-2 text-xs text-morandi-gold hover:text-morandi-gold-hover"
                        >
                          <Plus size={12} className="mr-1" />
                          {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.新增}
                        </Button>
                      </td>
                    </tr>
                    <tr className="bg-morandi-container/30 border-t border-border hidden print:table-row">
                      <td colSpan={10} className="px-3 py-1.5">
                        <span className="font-medium text-morandi-primary">{cat.label}</span>
                      </td>
                    </tr>

                    {/* 項目列表 */}
                    {categoryItems.length === 0 && addingCategory !== cat.key ? (
                      <tr className="border-t border-border/50">
                        <td
                          colSpan={10}
                          className="px-3 py-3 text-center text-morandi-secondary text-xs"
                        >
                          {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.尚無項目.replace('{0}', cat.label)}
                        </td>
                      </tr>
                    ) : (
                      categoryItems.map((item, idx) => (
                        <CategoryItemRow
                          key={item.id}
                          item={item}
                          categoryLabel={cat.label}
                          rowIndex={idx}
                          destinationCurrency={destinationCurrency}
                          localExpectedCostsRef={localExpectedCostsRef}
                          localNotesRef={localNotesRef}
                          onExpectedCostChange={handleExpectedCostChange}
                          onExpectedCostFormulaChange={handleExpectedCostFormulaChange}
                          onExpectedCostBlur={handleExpectedCostBlur}
                          onNotesChange={handleNotesChange}
                          onNotesBlur={handleNotesBlur}
                          onCurrencyConvert={handleCurrencyConvert}
                        />
                      ))
                    )}

                    {/* Inline 新增行 - 交通類別 */}
                    {addingCategory === cat.key && cat.key === 'transport' && (
                      <TransportAddRow
                        tour={tour}
                        newItemData={newItemData}
                        savingNew={savingNew}
                        transportSubType={transportSubType}
                        manualFlightMode={manualFlightMode}
                        manualFlight={manualFlight}
                        onSelectTransportType={handleSelectTransportType}
                        onNewItemChange={handleNewItemChange}
                        onSaveNewItem={handleSaveNewItem}
                        onCancelAdd={handleCancelAdd}
                        onAddFlightItems={handleAddFlightItems}
                        onSaveManualFlight={handleSaveManualFlight}
                        onSetManualFlightMode={setManualFlightMode}
                        onSetManualFlight={setManualFlight}
                      />
                    )}

                    {/* 其他類別的 Inline 新增行 */}
                    {addingCategory === cat.key && cat.key !== 'transport' && (
                      <GenericAddRow
                        categoryLabel={cat.label}
                        newItemData={newItemData}
                        savingNew={savingNew}
                        firstInputRef={firstInputRef}
                        onNewItemChange={handleNewItemChange}
                        onSaveNewItem={handleSaveNewItem}
                        onCancelAdd={handleCancelAdd}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
            {/* 總計 */}
            <tfoot>
              {(() => {
                const expectedForeign = allItems.reduce((sum, item) => {
                  const typeData = item.type_data as { subtotal_currency?: string } | null
                  if (typeData?.subtotal_currency === destinationCurrency) {
                    return sum + (item.expected_cost || 0)
                  }
                  return sum
                }, 0)
                return (
                  <tr className="bg-morandi-container/50 border-t-2 border-border font-medium">
                    <td colSpan={7} className="px-2 py-2 text-right text-morandi-primary">
                      {TOUR_CONFIRMATION_SHEET_PAGE_LABELS.總計}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-morandi-primary">
                      {expectedForeign > 0 && (
                        <div className="text-morandi-gold">
                          {getCurrencySymbol(destinationCurrency)}{' '}
                          {expectedForeign.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-morandi-primary">
                      {formatCurrency(costSummary.total.actual)}
                    </td>
                    <td className="px-2 py-2"></td>
                  </tr>
                )
              })()}
            </tfoot>
          </table>
        </div>

        {/* 結算區塊 */}
        <SettlementSection
          items={allItems}
          destinationCurrency={destinationCurrency}
          effectiveExchangeRate={effectiveExchangeRate}
          onEditExchangeRate={() => openExchangeRateDialog(null)}
          onSetExchangeRate={() => openExchangeRateDialog(null)}
        />
      </div>

      {/* 編輯對話框 */}
      <ItemEditDialog
        open={editDialog.open}
        category={editDialog.category}
        item={editDialog.item}
        sheetId={sheet?.id || ''}
        onClose={() => setEditDialog({ open: false, category: 'transport', item: null })}
        onSave={handleSave}
      />

      {/* 匯率設定對話框 */}
      <ExchangeRateDialog
        open={exchangeRateDialog.open}
        onOpenChange={open => !open && setExchangeRateDialog({ open: false, itemId: null })}
        destinationCurrency={destinationCurrency}
        exchangeRateInput={exchangeRateInput}
        onExchangeRateInputChange={setExchangeRateInput}
        onSave={handleSaveExchangeRate}
      />
    </div>
  )
}
