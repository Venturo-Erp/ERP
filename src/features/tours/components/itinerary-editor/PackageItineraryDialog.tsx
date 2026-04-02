'use client'
/**
 * PackageItineraryDialog - 行程表對話框
 * 功能：建立新行程表 / 查看已關聯行程表
 */

import { FileText, Loader2, Save, AlertCircle, Eye, Wand2, FilePlus, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PackageItineraryDialogProps } from './types'
import { usePackageItinerary } from './usePackageItinerary'
import { FlightSection } from './FlightSection'
import { DailyScheduleEditor } from './DailyScheduleEditor'
import { TimelineEditor } from './TimelineEditor'
import { ItineraryPreviewContent } from './ItineraryPreview'
import { AiGenerateDialog } from './AiGenerateDialog'
import { VersionDropdown } from './VersionDropdown'
import { PACKAGE_ITINERARY_DIALOG_LABELS } from './labels'

export function PackageItineraryDialog({
  isOpen,
  onClose,
  context: ctx,
  onItineraryCreated,
}: PackageItineraryDialogProps) {
  const hook = usePackageItinerary({
    isOpen,
    context: ctx,
    onClose,
    onItineraryCreated,
  })

  return (
    <>
      {/* 主對話框 */}
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent level={2} className="max-w-5xl max-h-[90vh] overflow-hidden">
          {/* 載入中 */}
          {hook.isDataLoading ? (
            <div className="h-64 flex items-center justify-center">
              <VisuallyHidden>
                <DialogTitle>{PACKAGE_ITINERARY_DIALOG_LABELS.LOADING_6912}</DialogTitle>
              </VisuallyHidden>
              <Loader2 className="w-6 h-6 animate-spin text-morandi-gold" />
            </div>
          ) : hook.viewMode === 'preview' ? (
            /* 預覽模式 */
            <ItineraryPreviewContent
              title={hook.formData.title || ctx.title}
              destination={ctx.destination || ctx.country_id || ''}
              startDate={ctx.start_date ?? null}
              outboundFlight={hook.formData.outboundFlight}
              returnFlight={hook.formData.returnFlight}
              dailyData={hook.getPreviewDailyData()}
              companyName={
                hook.currentUser?.workspace_code || PACKAGE_ITINERARY_DIALOG_LABELS.旅行社
              }
              isDomestic={hook.isDomestic}
              onEdit={() => hook.setViewMode('edit')}
              onPrint={hook.handlePrintPreview}
            />
          ) : (
            /* 編輯模式 */
            <div className="flex h-full max-h-[80vh]">
              {/* 左側：基本資訊 */}
              <div className="w-1/2 pr-6 border-r border-border overflow-y-auto">
                <DialogHeader className="mb-4">
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-morandi-gold" />
                    {hook.isEditMode
                      ? PACKAGE_ITINERARY_DIALOG_LABELS.編輯行程表
                      : PACKAGE_ITINERARY_DIALOG_LABELS.建立行程表}
                    <span className="text-sm font-normal text-morandi-secondary">
                      {ctx.version_name} - {ctx.title}
                    </span>
                    {/* 預覽按鈕 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => hook.setViewMode('preview')}
                      className="ml-auto h-6 px-2 text-[10px] gap-1"
                    >
                      <Eye size={10} />
                      {PACKAGE_ITINERARY_DIALOG_LABELS.PREVIEW}
                    </Button>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-morandi-primary">
                      {PACKAGE_ITINERARY_DIALOG_LABELS.LABEL_5957}
                    </Label>
                    <Input
                      value={hook.formData.title}
                      onChange={e => hook.setFormData({ ...hook.formData, title: e.target.value })}
                      placeholder={PACKAGE_ITINERARY_DIALOG_LABELS.行程表標題}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-morandi-primary">
                        {PACKAGE_ITINERARY_DIALOG_LABELS.LABEL_5475}
                      </Label>
                      <Input
                        value={
                          ctx.country_id && ctx.airport_code
                            ? `${ctx.country_id} (${ctx.airport_code})`
                            : ctx.country_id || PACKAGE_ITINERARY_DIALOG_LABELS.未設定_2
                        }
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-morandi-primary">
                        {PACKAGE_ITINERARY_DIALOG_LABELS.LABEL_6915}
                      </Label>
                      <Input value={`${hook.calculateDays()} 天`} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-morandi-primary">
                        {PACKAGE_ITINERARY_DIALOG_LABELS.LABEL_4513}
                      </Label>
                      <Input value={ctx.start_date || '(未設定)'} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-morandi-primary">
                        {PACKAGE_ITINERARY_DIALOG_LABELS.LABEL_2731}
                      </Label>
                      <Input value={ctx.end_date || '(未設定)'} disabled className="bg-muted" />
                    </div>
                  </div>

                  {/* 航班資訊（國內旅遊隱藏） */}
                  {!hook.isDomestic && (
                    <FlightSection
                      outboundFlight={hook.formData.outboundFlight}
                      outboundFlightNumber={hook.outboundFlightNumber}
                      outboundFlightDate={hook.outboundFlightDate}
                      searchingOutbound={hook.flightSearch.loadingOutboundFlight}
                      outboundSegments={hook.flightSearch.outboundSegments}
                      onOutboundFlightNumberChange={hook.setOutboundFlightNumber}
                      onOutboundFlightDateChange={hook.setOutboundFlightDate}
                      onSearchOutbound={hook.flightSearch.handleSearchOutboundFlight}
                      onSelectOutboundSegment={hook.flightSearch.handleSelectOutboundSegment}
                      onClearOutboundSegments={hook.flightSearch.clearOutboundSegments}
                      onRemoveOutbound={() =>
                        hook.setFormData(prev => ({ ...prev, outboundFlight: null }))
                      }
                      returnFlight={hook.formData.returnFlight}
                      returnFlightNumber={hook.returnFlightNumber}
                      returnFlightDate={hook.returnFlightDate}
                      searchingReturn={hook.flightSearch.loadingReturnFlight}
                      returnSegments={hook.flightSearch.returnSegments}
                      onReturnFlightNumberChange={hook.setReturnFlightNumber}
                      onReturnFlightDateChange={hook.setReturnFlightDate}
                      onSearchReturn={hook.flightSearch.handleSearchReturnFlight}
                      onSelectReturnSegment={hook.flightSearch.handleSelectReturnSegment}
                      onClearReturnSegments={hook.flightSearch.clearReturnSegments}
                      onRemoveReturn={() =>
                        hook.setFormData(prev => ({ ...prev, returnFlight: null }))
                      }
                    />
                  )}

                  {/* 錯誤訊息 */}
                  {hook.createError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-morandi-red/10 border border-morandi-red/30 text-morandi-red text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{hook.createError}</span>
                    </div>
                  )}

                  {/* 底部按鈕 */}
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    {/* 左側：AI 排行程 + 版本選擇器 */}
                    <div className="flex items-center gap-2">
                      {hook.showAiGenerate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={hook.openAiDialog}
                          className="h-7 px-2 text-[11px] gap-1 text-morandi-gold border-morandi-gold/50 hover:bg-morandi-gold/10"
                        >
                          <Wand2 size={12} />
                          AI 排行程
                        </Button>
                      )}
                      {hook.isEditMode && (
                        <VersionDropdown
                          existingItinerary={hook.existingItinerary}
                          versionRecords={hook.versionRecords}
                          selectedVersionIndex={hook.selectedVersionIndex}
                          currentVersionName={hook.getCurrentVersionName()}
                          onVersionChange={hook.handleVersionChange}
                        />
                      )}
                    </div>

                    {/* 右側：操作按鈕 */}
                    <div className="flex gap-1.5">
                      {hook.isEditMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={hook.handleSaveAsNewVersion}
                          disabled={hook.isCreating || !hook.formData.title.trim()}
                          className="h-7 px-2 text-[11px] gap-1 border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
                        >
                          <FilePlus size={12} />
                          {PACKAGE_ITINERARY_DIALOG_LABELS.LABEL_6621}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={hook.handleSubmit}
                        disabled={hook.isCreating || !hook.formData.title.trim()}
                        className="h-7 px-2 text-[11px] bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-1"
                      >
                        {hook.isCreating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        {hook.isEditMode
                          ? PACKAGE_ITINERARY_DIALOG_LABELS.更新行程
                          : PACKAGE_ITINERARY_DIALOG_LABELS.建立行程}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右側：每日行程輸入 */}
              <div className="w-1/2 pl-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-morandi-primary">
                    {hook.isTimelineMode
                      ? PACKAGE_ITINERARY_DIALOG_LABELS.時間軸行程
                      : PACKAGE_ITINERARY_DIALOG_LABELS.每日行程}
                  </h3>
                  {/* 時間軸模式切換 */}
                  <button
                    type="button"
                    onClick={() => hook.setIsTimelineMode(!hook.isTimelineMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full transition-all ${
                      hook.isTimelineMode
                        ? 'bg-morandi-gold text-white shadow-sm'
                        : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50 border border-morandi-container'
                    }`}
                    title={
                      hook.isTimelineMode
                        ? PACKAGE_ITINERARY_DIALOG_LABELS.切換簡易模式
                        : PACKAGE_ITINERARY_DIALOG_LABELS.切換時間軸模式
                    }
                  >
                    <Clock size={12} />
                    <span>
                      {hook.isTimelineMode
                        ? PACKAGE_ITINERARY_DIALOG_LABELS.簡易模式
                        : PACKAGE_ITINERARY_DIALOG_LABELS.時間軸}
                    </span>
                  </button>
                </div>

                {/* 簡易模式 */}
                {!hook.isTimelineMode && (
                  <DailyScheduleEditor
                    dailySchedule={hook.dailySchedule}
                    startDate={ctx.start_date ?? null}
                    onUpdateDay={hook.updateDaySchedule}
                    getPreviousAccommodation={hook.getPreviousAccommodation}
                  />
                )}

                {/* 時間軸模式 */}
                {hook.isTimelineMode && (
                  <TimelineEditor
                    dailySchedule={hook.dailySchedule}
                    selectedDayIndex={hook.selectedDayIndex}
                    startDate={ctx.start_date ?? null}
                    tourCountryName={ctx.destination || ctx.country_id || ''}
                    onSelectDay={hook.setSelectedDayIndex}
                    onUpdateDay={hook.updateDaySchedule}
                    onAddActivity={hook.addActivity}
                    onRemoveActivity={hook.removeActivity}
                    onUpdateActivity={hook.updateActivity}
                    onAddActivitiesFromAttractions={hook.addActivitiesFromAttractions}
                    getPreviousAccommodation={hook.getPreviousAccommodation}
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI 排行程對話框 */}
      <AiGenerateDialog
        isOpen={hook.aiDialogOpen}
        onClose={() => hook.setAiDialogOpen(false)}
        destination={ctx.destination || ctx.country_id || ''}
        numDays={hook.dailySchedule.length}
        accommodationStatus={hook.getAccommodationStatus()}
        arrivalTime={hook.aiArrivalTime}
        departureTime={hook.aiDepartureTime}
        theme={hook.aiTheme}
        isGenerating={hook.aiGenerating}
        onArrivalTimeChange={hook.setAiArrivalTime}
        onDepartureTimeChange={hook.setAiDepartureTime}
        onThemeChange={hook.setAiTheme}
        onGenerate={hook.handleAiGenerate}
      />
    </>
  )
}
