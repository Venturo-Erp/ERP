'use client'

/**
 * Designer - 通用設計工具
 *
 * 完整功能：
 * - 設計類型選擇（手冊、IG圖文、布條等）
 * - 左側元素庫面板
 * - 頂部工具列（圖層、對齊、複製貼上等）
 * - 右側屬性面板
 * - 中央畫布編輯區
 *
 * 支援的 URL 參數：
 * - tour_id: 開團後的手冊
 * - package_id: 提案階段的手冊
 * - itinerary_id: 行程表的手冊
 */

import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import { ModuleLoading } from '@/components/module-loading'
import { useDocumentStore, type BrochureEntityType } from '@/stores/document-store'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { SIDEBAR_WIDTH_EXPANDED_PX, SIDEBAR_WIDTH_COLLAPSED_PX } from '@/lib/constants/layout'

// Designer 元件
import { useBrochureEditorV2 } from '@/features/designer/hooks/useBrochureEditorV2'
import { useMaskEditMode } from '@/features/designer/hooks/useMaskEditMode'
import { LoadingOverlay, SavingIndicator } from '@/features/designer/components/LoadingOverlay'
import { ElementLibrary } from '@/features/designer/components/ElementLibrary'
import { ComponentLibrary } from '@/features/designer/components/ComponentLibrary'
import { DesignerToolbar } from '@/features/designer/components/DesignerToolbar'
import { ContextMenu } from '@/features/designer/components/ContextMenu'
import { LayerPanel } from '@/features/designer/components/LayerPanel'
import { TemplateSelector } from '@/features/designer/components/TemplateSelector'
import { PageListSidebar } from '@/features/designer/components/PageListSidebar'
import {
  DesignTypeSelector,
  DESIGN_TYPES,
  type DesignType,
} from '@/features/designer/components/DesignTypeSelector'
import { STICKER_PATHS } from '@/features/designer/components/core/sticker-paths'

// Designer 工具和類型
import { generatePageFromTemplate, styleSeries } from '@/features/designer/templates/engine'
import { generateBrochurePDF } from '@/lib/pdf/brochure-pdf-generator'

// 類型
import type { CanvasPage, CanvasElement } from '@/features/designer/components/types'
import type { TemplateData } from '@/features/designer/templates/engine'
import type { MemoPageContent } from '@/features/designer/components/PageListSidebar'
import type { ImageEditorSettings } from '@/components/ui/image-editor'

// 本地 Hooks & Components
import {
  usePageManagement,
  useCoverImageHandlers,
  useDailyImageHandlers,
  useKeyboardAndPan,
  useVersionLoader,
  useDesignerSetup,
} from './hooks'
import {
  DesignerHeader,
  RightPanel,
  CanvasArea,
  DesignerDialogs,
  createBlockInsertHandler,
} from './components'
import { DESIGNER_LABELS } from './constants/labels'

// ============================================
// 主頁面
// ============================================
export default function DesignerPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // 支援多種參數格式（URL 參數）
  const urlTourId = searchParams.get('tour_id') || searchParams.get('tourId')
  const urlPackageId = searchParams.get('package_id') || searchParams.get('packageId')
  const urlItineraryId = searchParams.get('itinerary_id') || searchParams.get('itineraryId')

  const { user, sidebarCollapsed, _hasHydrated } = useAuthStore()
  const workspaceId = user?.workspace_id

  // 手動選擇的團/行程（當沒有 URL 參數時使用）
  const [manualTourId, setManualTourId] = useState<string | null>(null)
  const [manualItineraryId, setManualItineraryId] = useState<string | null>(null)

  // 實際使用的團/行程 ID（URL 參數優先）
  const tourId = urlTourId || manualTourId
  const packageId = urlPackageId
  const itineraryId = urlItineraryId || manualItineraryId

  // 決定使用哪個 entity
  const { entityId, entityType } = useMemo((): {
    entityId: string | null
    entityType: BrochureEntityType
  } => {
    if (tourId) return { entityId: tourId, entityType: 'tour' }
    if (packageId) return { entityId: packageId, entityType: 'package' }
    if (itineraryId) return { entityId: itineraryId, entityType: 'itinerary' }
    return { entityId: null, entityType: 'tour' }
  }, [tourId, packageId, itineraryId])

  // UI 狀態
  const [selectedDesignType, setSelectedDesignType] = useState<DesignType | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [isCheckingExisting, setIsCheckingExisting] = useState(!!urlTourId)
  const [generatedPages, setGeneratedPages] = useState<CanvasPage[]>([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [templateData, setTemplateData] = useState<Record<string, unknown> | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<(typeof styleSeries)[number] | null>(null)
  const [showPageList, setShowPageList] = useState(true)
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [leftPanelMode, setLeftPanelMode] = useState<'elements' | 'components'>('components')
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showBlockLibrary, setShowBlockLibrary] = useState(false)
  const [isDualPageMode, setIsDualPageMode] = useState(false)
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null)
  const [showImageMaskFill, setShowImageMaskFill] = useState(false)
  const [maskTargetShape, setMaskTargetShape] = useState<fabric.FabricObject | null>(null)

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Document store
  const {
    document: storeDocument,
    currentVersion,
    isLoading,
    loadingStage,
    loadingProgress,
    isDirty,
    isSaving,
    error,
    loadOrCreateDocument,
    saveVersion,
    setLoadingStage,
  } = useDocumentStore()

  // Canvas editor
  const canvasWidth = selectedDesignType?.width ?? 559
  const canvasHeight = selectedDesignType?.height ?? 794

  // 文字編輯雙向綁定：Canvas → templateData
  const handleTextEdit = useCallback(
    (event: { elementId: string; elementName: string; newContent: string }) => {
      const { elementId, elementName, newContent } = event

      const dayContentMatch = (elementId || elementName).match(/el-day-(\d+)-content/)
      if (dayContentMatch) {
        const dayIndex = parseInt(dayContentMatch[1], 10) - 1
        setTemplateData(prev => {
          if (!prev) return prev
          const dailyItineraries = [
            ...((prev.dailyItineraries as Array<Record<string, unknown>>) || []),
          ]
          const dailyDetails = [...((prev.dailyDetails as Array<Record<string, unknown>>) || [])]
          if (dailyItineraries[dayIndex]) {
            dailyItineraries[dayIndex] = { ...dailyItineraries[dayIndex], title: newContent }
          }
          if (dailyDetails[dayIndex]) {
            dailyDetails[dayIndex] = { ...dailyDetails[dayIndex], title: newContent }
          }
          return { ...prev, dailyItineraries, dailyDetails }
        })
        return
      }

      const mealMatch = (elementId || elementName).match(
        /el-day-(\d+)-meal-(breakfast|lunch|dinner)-text/
      )
      if (mealMatch) {
        const dayIndex = parseInt(mealMatch[1], 10) - 1
        const mealType = mealMatch[2] as 'breakfast' | 'lunch' | 'dinner'
        setTemplateData(prev => {
          if (!prev) return prev
          const dailyItineraries = [
            ...((prev.dailyItineraries as Array<Record<string, unknown>>) || []),
          ]
          const dailyDetails = [...((prev.dailyDetails as Array<Record<string, unknown>>) || [])]
          if (dailyItineraries[dayIndex]) {
            const meals = {
              ...((dailyItineraries[dayIndex].meals as Record<string, string>) || {}),
            }
            meals[mealType] = newContent
            dailyItineraries[dayIndex] = { ...dailyItineraries[dayIndex], meals }
          }
          if (dailyDetails[dayIndex]) {
            const meals = { ...((dailyDetails[dayIndex].meals as Record<string, string>) || {}) }
            meals[mealType] = newContent
            dailyDetails[dayIndex] = { ...dailyDetails[dayIndex], meals }
          }
          return { ...prev, dailyItineraries, dailyDetails }
        })
        return
      }

      const accommodationMatch = (elementId || elementName).match(/el-day-(\d+)-accommodation/)
      if (accommodationMatch) {
        const dayIndex = parseInt(accommodationMatch[1], 10) - 1
        setTemplateData(prev => {
          if (!prev) return prev
          const dailyItineraries = [
            ...((prev.dailyItineraries as Array<Record<string, unknown>>) || []),
          ]
          if (dailyItineraries[dayIndex]) {
            dailyItineraries[dayIndex] = {
              ...dailyItineraries[dayIndex],
              accommodation: newContent,
            }
          }
          return { ...prev, dailyItineraries }
        })
        return
      }
    },
    []
  )

  const {
    canvasRef,
    canvas,
    isCanvasReady,
    initCanvas,
    loadCanvasData,
    loadCanvasPage,
    exportCanvasData,
    addText,
    addRectangle,
    addCircle,
    addEllipse,
    addTriangle,
    addLine,
    addImage,
    addSticker,
    addIcon,
    addTimeline,
    addTimelinePoint,
    selectedObjectIds,
    deleteSelected,
    copySelected,
    pasteClipboard,
    cutSelected,
    moveSelected,
    selectAll,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    selectObjectById,
    alignLeft,
    alignCenterH,
    alignRight,
    alignTop,
    alignCenterV,
    alignBottom,
    distributeH,
    distributeV,
    groupSelected,
    ungroupSelected,
    flipHorizontal,
    flipVertical,
    toggleLock,
    undo,
    redo,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToContainer,
    updateElementByName,
    saveCurrentPageHistory,
    loadPageHistory,
    initPageHistory,
  } = useBrochureEditorV2({
    width: canvasWidth,
    height: canvasHeight,
    onTextEdit: handleTextEdit,
  })

  // 遮罩編輯模式
  const { isEditingMask } = useMaskEditMode({
    canvas,
    onUpdate: () => {},
  })

  // 側邊欄寬度
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED_PX : SIDEBAR_WIDTH_EXPANDED_PX

  // ============================================
  // 使用抽出的 Hooks
  // ============================================
  const pageManagement = usePageManagement({
    generatedPages,
    setGeneratedPages,
    currentPageIndex,
    setCurrentPageIndex,
    selectedStyle,
    templateData,
    canvasWidth,
    canvasHeight,
    exportCanvasData,
    loadCanvasData,
    loadCanvasPage,
    saveCurrentPageHistory,
    loadPageHistory,
    initPageHistory,
  })

  const coverImageHandlers = useCoverImageHandlers({
    canvas,
    canvasWidth,
    selectedStyle,
    templateData,
    setTemplateData,
    generatedPages,
    setGeneratedPages,
    currentPageIndex,
    loadCanvasPage,
  })

  const dailyImageHandlers = useDailyImageHandlers({
    canvas,
    canvasWidth,
    canvasHeight,
    selectedStyle,
    templateData,
    setTemplateData,
    generatedPages,
    setGeneratedPages,
    currentPageIndex,
    currentDayIndex: pageManagement.currentDayIndex,
    addImage,
  })

  const { handleSelectDesignType, handleBrochureStart, handleTemplateComplete } = useDesignerSetup({
    entityId,
    entityType,
    workspaceId,
    setManualTourId,
    setManualItineraryId,
    setSelectedDesignType,
    setGeneratedPages,
    setCurrentPageIndex,
    setTemplateData,
    setSelectedStyle,
    setShowTemplateSelector,
    loadOrCreateDocument,
  })

  // ============================================
  // 監聽選取變化
  // ============================================
  useEffect(() => {
    if (!canvas) return

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject()
      setSelectedObject(activeObject || null)
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', () => setSelectedObject(null))

    return () => {
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared')
    }
  }, [canvas])

  // ============================================
  // 雙擊封面占位框時開啟上傳對話框
  // ============================================
  useEffect(() => {
    if (!canvas) return

    const handleDoubleClick = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      const target = e.target
      if (!target) return

      const elementData = (target as fabric.FabricObject & { data?: { elementId?: string } }).data
      if (elementData?.elementId === 'el-cover-placeholder') {
        coverImageHandlers.setShowCoverUpload(true)
      }
    }

    canvas.on('mouse:dblclick', handleDoubleClick)

    return () => {
      canvas.off('mouse:dblclick', handleDoubleClick)
    }
  }, [canvas, coverImageHandlers])

  // ============================================
  // 自動載入已存在的文件
  // ============================================
  useEffect(() => {
    if (!_hasHydrated) return
    if (selectedDesignType) return
    if (!entityId || !workspaceId) return

    const autoLoadDocument = async () => {
      try {
        await loadOrCreateDocument('brochure', entityId, workspaceId, entityType)

        const { currentVersion: loadedVersion } = useDocumentStore.getState()

        if (loadedVersion) {
          const versionData = loadedVersion.data as Record<string, unknown>
          const pages = versionData.pages as
            | Array<{ width?: number; height?: number; templateKey?: string }>
            | undefined
          const firstPage = pages?.[0]

          let matchedType: DesignType | undefined

          if (firstPage?.width && firstPage?.height) {
            matchedType = DESIGN_TYPES.find(
              dt => dt.width === firstPage.width && dt.height === firstPage.height
            )
          }

          if (!matchedType) {
            const isBrochureDocument = pages?.some(
              p =>
                p.templateKey &&
                [
                  'cover',
                  'toc',
                  'daily',
                  'itinerary',
                  'memo',
                  'hotel',
                  'vehicle',
                  'table',
                ].includes(p.templateKey)
            )
            matchedType = isBrochureDocument
              ? DESIGN_TYPES.find(dt => dt.id === 'brochure-a5') || DESIGN_TYPES[0]
              : DESIGN_TYPES[0]
          }

          setSelectedDesignType(matchedType)
        }
      } catch (err) {
        logger.error('Failed to auto-load document:', err)
      } finally {
        setIsCheckingExisting(false)
      }
    }

    autoLoadDocument()
  }, [_hasHydrated, entityId, workspaceId, entityType, selectedDesignType, loadOrCreateDocument])

  // ============================================
  // Version Loading & Page Number Updates
  // ============================================
  useVersionLoader({
    isCanvasReady,
    currentVersion,
    setGeneratedPages,
    setCurrentPageIndex,
    setTemplateData,
    setSelectedStyle,
    setLoadingStage,
    loadCanvasData,
    loadCanvasPage,
    initPageHistory,
    updateElementByName,
    generatedPages,
    currentPageIndex,
  })

  // ============================================
  // Initialize Canvas
  // ============================================
  useEffect(() => {
    if (showTemplateSelector) return
    if (!selectedDesignType) return

    if (!storeDocument && !entityId) {
      initCanvas()
      setLoadingStage('idle', 100)
      return
    }

    if (!storeDocument || isLoading) return

    initCanvas()

    if (!currentVersion) {
      setLoadingStage('idle', 100)
    }
  }, [
    showTemplateSelector,
    selectedDesignType,
    storeDocument,
    isLoading,
    initCanvas,
    currentVersion,
    setLoadingStage,
    entityId,
  ])

  // ============================================
  // 自動適應畫布縮放
  // ============================================
  useEffect(() => {
    if (!isCanvasReady || !canvasContainerRef.current) return

    const container = canvasContainerRef.current
    const { clientWidth, clientHeight } = container
    fitToContainer(clientWidth, clientHeight, 44)

    const handleResize = () => {
      if (canvasContainerRef.current) {
        const { clientWidth, clientHeight } = canvasContainerRef.current
        fitToContainer(clientWidth, clientHeight, 44)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isCanvasReady, fitToContainer])

  // ============================================
  // Save Handler
  // ============================================
  const handleSave = useCallback(async () => {
    if (!isCanvasReady || isSaving) return

    const currentCanvasData = exportCanvasData() as Record<string, unknown>

    const updatedPages = generatedPages.map((page, index) => {
      if (index === currentPageIndex) {
        return { ...page, fabricData: currentCanvasData }
      }
      return page
    })

    const documentData = {
      version: 1,
      pages: updatedPages.map(page => {
        const pageWithExtras = page as CanvasPage & {
          fabricData?: Record<string, unknown>
          memoPageContent?: MemoPageContent
          dayIndex?: number
        }
        return {
          id: page.id,
          name: page.name,
          templateKey: page.templateKey,
          width: page.width,
          height: page.height,
          backgroundColor: page.backgroundColor,
          elements: page.elements,
          fabricData: pageWithExtras.fabricData,
          memoPageContent: pageWithExtras.memoPageContent,
          dayIndex: pageWithExtras.dayIndex,
        }
      }),
      currentPageIndex,
      templateData: templateData || null,
      styleId: selectedStyle?.id || null,
    }

    const dbDesignType = selectedDesignType?.id?.replace(/-/g, '_')

    try {
      await saveVersion(
        documentData as unknown as Parameters<typeof saveVersion>[0],
        undefined,
        dbDesignType
      )
      // 清除 localStorage 備份
      try {
        localStorage.removeItem('designer-backup')
      } catch {
        /* ignore */
      }
    } catch (saveError) {
      // 儲存失敗時備份到 localStorage
      try {
        localStorage.setItem(
          'designer-backup',
          JSON.stringify({
            timestamp: Date.now(),
            data: documentData,
          })
        )
        toast.error('儲存失敗，資料已暫存到本地。請檢查網路連線後重試。')
      } catch {
        /* ignore */
      }
      throw saveError
    }

    setGeneratedPages(updatedPages as CanvasPage[])
  }, [
    isCanvasReady,
    isSaving,
    exportCanvasData,
    saveVersion,
    generatedPages,
    currentPageIndex,
    templateData,
    selectedStyle,
    selectedDesignType,
  ])

  // ============================================
  // PDF Export Handler
  // ============================================
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPDF = useCallback(async () => {
    if (generatedPages.length === 0 || isExporting) return

    setIsExporting(true)

    try {
      const blob = await generateBrochurePDF(generatedPages, {
        filename: `${storeDocument?.name || DESIGNER_LABELS.DEFAULT_FILENAME}.pdf`,
        onProgress: (current, total) => {
          logger.log(`[PDF Export] Progress: ${current}/${total}`)
        },
      })

      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')

      if (!printWindow) {
        const a = document.createElement('a')
        a.href = url
        a.download = `${storeDocument?.name || DESIGNER_LABELS.DEFAULT_FILENAME}.pdf`
        a.click()
      }
    } catch (err) {
      logger.error('[PDF Export] Failed:', err)
      alert('PDF 匯出失敗，請稍後再試')
    } finally {
      setIsExporting(false)
    }
  }, [generatedPages, isExporting, storeDocument?.name])

  // ============================================
  // PNG Export Handler
  // ============================================
  const handleExportPNG = useCallback(() => {
    if (!canvas) return

    try {
      const dataURL = canvas.toDataURL({
        format: 'png',
        multiplier: 2,
      })

      const a = document.createElement('a')
      a.href = dataURL
      a.download = `${storeDocument?.name || '設計'}-第${currentPageIndex + 1}頁.png`
      a.click()
      toast.success('已匯出 PNG 圖片')
    } catch (err) {
      logger.error('[PNG Export] Failed:', err)
      toast.error('PNG 匯出失敗')
    }
  }, [canvas, storeDocument?.name, currentPageIndex])

  // ============================================
  // Template Data Change Handler
  // ============================================
  const handleTemplateDataChange = useCallback((newData: Record<string, unknown>) => {
    setTemplateData(newData)
  }, [])

  // ============================================
  // Image Upload Handler
  // ============================================
  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        await addImage(dataUrl)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [addImage])

  // ============================================
  // 使用鍵盤和平移 Hook
  // ============================================
  useKeyboardAndPan({
    selectedDesignType,
    zoom,
    setZoom,
    handleSave,
    undo,
    redo,
    copySelected,
    pasteClipboard,
    cutSelected,
    deleteSelected,
    moveSelected,
    zoomIn,
    zoomOut,
    resetZoom,
    selectAll,
    groupSelected,
    ungroupSelected,
    canvasContainerRef,
    scrollContainerRef,
  })

  // ============================================
  // Unsaved Changes Warning
  // ============================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = '有未儲存的變更，確定要離開嗎？'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // ============================================
  // 目錄套用
  // ============================================
  const handleApplyToc = useCallback(async () => {
    if (!selectedStyle || !templateData) return

    const tocPageIndex = generatedPages.findIndex(p => p.templateKey === 'toc')
    if (tocPageIndex < 0) return

    const tocItems =
      (templateData.tocItems as Array<{
        pageId: string
        displayName: string
        icon: string
        enabled: boolean
        pageNumber: number
      }>) || []

    const enabledItems = tocItems.filter(item => item.enabled)

    const tocContent = enabledItems.map(item => ({
      name: item.displayName,
      page: item.pageNumber,
      icon: item.icon,
    }))

    const newTemplateData = { ...templateData, tocContent }
    setTemplateData(newTemplateData)

    const templateId = selectedStyle.templates.toc
    if (!templateId) return

    const newTocPage = generatePageFromTemplate(
      templateId,
      newTemplateData as Parameters<typeof generatePageFromTemplate>[1]
    )

    const newPages = [...generatedPages]
    newPages[tocPageIndex] = newTocPage
    setGeneratedPages(newPages)

    if (currentPageIndex === tocPageIndex) {
      await loadCanvasPage(newTocPage)
    }
  }, [selectedStyle, templateData, generatedPages, currentPageIndex, loadCanvasPage])

  // ============================================
  // 尚未選擇設計類型：顯示選擇器或載入中
  // ============================================
  if (!selectedDesignType) {
    if (isCheckingExisting) {
      return (
        <div
          className="fixed inset-0 bg-background transition-all duration-300"
          style={{ left: sidebarWidth }}
        >
          <ModuleLoading fullscreen />
        </div>
      )
    }

    return (
      <DesignTypeSelector
        onSelect={handleSelectDesignType}
        onBrochureStart={handleBrochureStart}
        sidebarWidth={sidebarWidth}
        workspaceId={workspaceId}
        preselectedTourId={urlTourId}
        preselectedItineraryId={urlItineraryId}
      />
    )
  }

  // ============================================
  // 手冊類型：顯示模板選擇器
  // ============================================
  if (showTemplateSelector) {
    return (
      <TemplateSelector
        itineraryId={itineraryId}
        tourId={tourId}
        onBack={() => {
          setShowTemplateSelector(false)
          setSelectedDesignType(null)
        }}
        onComplete={(pages, itinData, style) =>
          handleTemplateComplete(pages, itinData as Record<string, unknown> | null, style)
        }
        sidebarWidth={sidebarWidth}
      />
    )
  }

  // ============================================
  // Error Display
  // ============================================
  if (error) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-background"
        style={{ left: sidebarWidth }}
      >
        <div className="text-center">
          <p className="text-morandi-red mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>{DESIGNER_LABELS.RELOAD}</Button>
        </div>
      </div>
    )
  }

  // ============================================
  // Render Editor
  // ============================================
  return (
    <div
      className="fixed inset-0 flex flex-col bg-morandi-container/30 transition-all duration-300"
      style={{ left: sidebarWidth }}
    >
      {/* Loading Overlay */}
      <LoadingOverlay
        isLoading={isLoading}
        stage={loadingStage}
        progress={loadingProgress}
        isSaving={isSaving}
        documentName={storeDocument?.name}
      />

      {/* Saving Indicator */}
      <SavingIndicator isSaving={isSaving} />

      {/* Header */}
      <DesignerHeader
        selectedDesignType={selectedDesignType}
        isDirty={isDirty}
        isSaving={isSaving}
        entityId={entityId}
        zoom={zoom}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        showPageList={showPageList}
        setShowPageList={setShowPageList}
        showLeftPanel={showLeftPanel}
        setShowLeftPanel={setShowLeftPanel}
        showRightPanel={showRightPanel}
        setShowRightPanel={setShowRightPanel}
        showLayerPanel={showLayerPanel}
        setShowLayerPanel={setShowLayerPanel}
        isDualPageMode={isDualPageMode}
        setIsDualPageMode={setIsDualPageMode}
        setShowBlockLibrary={setShowBlockLibrary}
        leftPanelMode={leftPanelMode}
        setLeftPanelMode={setLeftPanelMode}
        pageCount={generatedPages.length}
        onSave={handleSave}
        onExportPDF={handleExportPDF}
        onExportPNG={handleExportPNG}
      />

      {/* Toolbar */}
      <DesignerToolbar
        selectedElementId={selectedObjectIds[0] || null}
        selectedElement={selectedObject as unknown as CanvasElement}
        selectedCount={selectedObjectIds.length}
        clipboard={[]}
        onAddText={addText}
        onAddRectangle={addRectangle}
        onAddCircle={addCircle}
        onAddEllipse={addEllipse}
        onAddTriangle={addTriangle}
        onAddLine={addLine}
        onAddImage={async (file: File) => {
          const reader = new FileReader()
          reader.onload = async () => {
            const dataUrl = reader.result as string
            await addImage(dataUrl)
          }
          reader.readAsDataURL(file)
        }}
        onCopy={copySelected}
        onPaste={pasteClipboard}
        onCut={cutSelected}
        onDelete={deleteSelected}
        onBringForward={bringForward}
        onSendBackward={sendBackward}
        onBringToFront={bringToFront}
        onSendToBack={sendToBack}
        onToggleLock={toggleLock}
        onGroup={groupSelected}
        onUngroup={ungroupSelected}
        onAlignLeft={alignLeft}
        onAlignCenterH={alignCenterH}
        onAlignRight={alignRight}
        onAlignTop={alignTop}
        onAlignCenterV={alignCenterV}
        onAlignBottom={alignBottom}
        onDistributeH={distributeH}
        onDistributeV={distributeV}
        onFlipHorizontal={flipHorizontal}
        onFlipVertical={flipVertical}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Page List Sidebar */}
        {showPageList &&
          selectedDesignType?.id.startsWith('brochure-') &&
          generatedPages.length > 0 && (
            <PageListSidebar
              pages={generatedPages}
              currentPageIndex={currentPageIndex}
              selectedStyle={selectedStyle}
              totalDays={(templateData as TemplateData | null)?.dailyItineraries?.length || 0}
              memoSettings={pageManagement.memoSettings}
              usedMemoItemIds={pageManagement.usedMemoItemIds}
              onSelectPage={pageManagement.handleSelectPage}
              onAddPage={pageManagement.handleAddPage}
              onAddMemoPage={pageManagement.handleAddMemoPage}
              onAddDailyPages={pageManagement.handleAddDailyPages}
              onDeletePage={pageManagement.handleDeletePage}
              onDuplicatePage={pageManagement.handleDuplicatePage}
              onReorderPages={pageManagement.handleReorderPages}
            />
          )}

        {/* Left Panel - Component Library or Element Library */}
        {showLeftPanel && leftPanelMode === 'components' && (
          <ComponentLibrary
            onInsertComponent={(elements, componentName) => {
              const handler = createBlockInsertHandler(canvas)
              handler(elements, componentName)
            }}
            templateData={templateData}
          />
        )}
        {showLeftPanel && leftPanelMode === 'elements' && (
          <ElementLibrary
            onAddLine={addLine}
            onAddShape={type => {
              if (type === 'rectangle') addRectangle()
              else if (type === 'circle') addCircle()
            }}
            onAddText={addText}
            onAddSticker={stickerId => {
              const sticker = STICKER_PATHS[stickerId]
              if (sticker) {
                addSticker(sticker.path, {
                  fill: sticker.defaultColor,
                  viewBox: sticker.viewBox,
                })
              }
            }}
            onAddIcon={iconName => {
              addIcon(iconName)
            }}
            onAddImage={imageUrl => {
              addImage(imageUrl)
            }}
            onAddColorfulIcon={iconName => {
              addIcon(iconName, { size: 80, keepOriginalColor: true })
            }}
            onAddQRCode={dataUrl => {
              addImage(dataUrl)
            }}
            onAddTimeline={addTimeline}
            onAddTimelinePoint={addTimelinePoint}
            isTimelineSelected={
              selectedObject != null &&
              (selectedObject as unknown as { data?: { timelineId?: string } }).data?.timelineId !=
                null
            }
          />
        )}

        {/* Canvas Area */}
        <CanvasArea
          ref={canvasContainerRef}
          selectedDesignType={selectedDesignType}
          canvas={canvas}
          canvasRef={canvasRef}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          zoom={zoom}
          isDualPageMode={isDualPageMode}
          generatedPages={generatedPages}
          currentPageIndex={currentPageIndex}
          onSelectPage={pageManagement.handleSelectPage}
          setIsDualPageMode={setIsDualPageMode}
          isEditingMask={isEditingMask}
          onImageUpload={handleImageUpload}
          scrollContainerRef={scrollContainerRef}
        />

        {/* Right Panel */}
        {showRightPanel && (
          <RightPanel
            canvas={canvas}
            selectedObject={selectedObject}
            templateData={templateData}
            onTemplateDataChange={handleTemplateDataChange}
            onUploadCoverImage={() => coverImageHandlers.setShowCoverUpload(true)}
            onAdjustCoverPosition={coverImageHandlers.handleAdjustCoverPosition}
            onUploadDailyCoverImage={() => dailyImageHandlers.setShowDailyCoverUpload(true)}
            onAdjustDailyCoverPosition={dailyImageHandlers.handleAdjustDailyCoverPosition}
            currentPageType={generatedPages[currentPageIndex]?.templateKey}
            currentDayIndex={pageManagement.currentDayIndex}
            pages={generatedPages.map(p => ({
              id: p.id,
              name: p.name,
              templateKey: p.templateKey,
            }))}
            onApplyToc={handleApplyToc}
            onImageFill={obj => {
              setMaskTargetShape(obj)
              setShowImageMaskFill(true)
            }}
          />
        )}

        {/* Layer Panel */}
        {showLayerPanel && (
          <LayerPanel
            canvas={canvas}
            selectedObjectIds={selectedObjectIds}
            onSelectObject={selectObjectById}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
          />
        )}
      </div>

      {/* Dialogs */}
      <DesignerDialogs
        showCoverUpload={coverImageHandlers.showCoverUpload}
        setShowCoverUpload={coverImageHandlers.setShowCoverUpload}
        coverImage={templateData?.coverImage as string | undefined}
        onCoverImageSelect={coverImageHandlers.handleImageUploaded}
        showImageEditor={coverImageHandlers.showImageEditor}
        pendingImageUrl={coverImageHandlers.pendingImageUrl}
        coverImagePosition={templateData?.coverImagePosition as ImageEditorSettings | undefined}
        onCloseImageEditor={coverImageHandlers.handleCloseImageEditor}
        onSaveImagePosition={coverImageHandlers.handleImagePositionSaved}
        showDailyCoverUpload={dailyImageHandlers.showDailyCoverUpload}
        setShowDailyCoverUpload={dailyImageHandlers.setShowDailyCoverUpload}
        dailyCoverImage={
          pageManagement.currentDayIndex !== undefined
            ? ((templateData?.dailyDetails as Array<{ coverImage?: string }>) || [])[
                pageManagement.currentDayIndex
              ]?.coverImage
            : undefined
        }
        onDailyCoverImageSelect={dailyImageHandlers.handleDailyImageUploaded}
        showDailyImageEditor={dailyImageHandlers.showDailyImageEditor}
        dailyPendingImageUrl={dailyImageHandlers.dailyPendingImageUrl}
        dailyCoverImagePosition={
          pageManagement.currentDayIndex !== undefined
            ? ((templateData?.dailyDetails as Array<{
                coverImagePosition?: ImageEditorSettings
              }>) || [])[pageManagement.currentDayIndex]?.coverImagePosition
            : undefined
        }
        onCloseDailyImageEditor={dailyImageHandlers.handleCloseDailyImageEditor}
        onSaveDailyImagePosition={dailyImageHandlers.handleDailyImagePositionSaved}
        showImageMaskFill={showImageMaskFill}
        setShowImageMaskFill={setShowImageMaskFill}
        canvas={canvas}
        maskTargetShape={maskTargetShape}
        setMaskTargetShape={setMaskTargetShape}
        showBlockLibrary={showBlockLibrary}
        setShowBlockLibrary={setShowBlockLibrary}
        onInsertBlock={createBlockInsertHandler(canvas)}
      />

      {/* 右鍵選單 */}
      <ContextMenu
        selectedElementId={selectedObjectIds[0] ?? null}
        clipboard={[]}
        onCopy={() => copySelected()}
        onPaste={() => pasteClipboard()}
        onCut={() => cutSelected()}
        onDelete={deleteSelected}
        onBringForward={bringForward}
        onSendBackward={sendBackward}
        onBringToFront={bringToFront}
        onSendToBack={sendToBack}
        onToggleLock={toggleLock}
        onGroup={groupSelected}
        onUngroup={ungroupSelected}
        multipleSelected={selectedObjectIds.length > 1}
        isGroup={selectedObject?.type === 'group'}
        onAlignLeft={alignLeft}
        onAlignCenterH={alignCenterH}
        onAlignRight={alignRight}
      />
    </div>
  )
}
