'use client'

import { LABELS } from './constants/labels'

import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, Suspense } from 'react'
import useSWR from 'swr'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { useOfficeDocument } from '@/features/office/hooks/useOfficeDocument'
import { alert } from '@/lib/ui/alert-dialog'
import type { IWorkbookData } from '@univerjs/core'
import type { SaveStatus } from '@/features/office/components/UniverSpreadsheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTours } from '@/features/tours/hooks/useTours'

// 動態載入 Univer 編輯器（避免 SSR 問題）
const UniverSpreadsheet = dynamic(
  () =>
    import('@/features/office/components/UniverSpreadsheet').then(m => ({
      default: m.UniverSpreadsheet,
    })),
  { ssr: false, loading: () => <EditorLoading /> }
)

const UniverDocument = dynamic(
  () =>
    import('@/features/office/components/UniverDocument').then(m => ({
      default: m.UniverDocument,
    })),
  { ssr: false, loading: () => <EditorLoading /> }
)

const UniverSlides = dynamic(
  () =>
    import('@/features/office/components/UniverSlides').then(m => ({ default: m.UniverSlides })),
  { ssr: false, loading: () => <EditorLoading /> }
)

function EditorLoading() {
  return (
    <div className="flex items-center justify-center h-full bg-morandi-container">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-morandi-gold mx-auto mb-3"></div>
        <p className="text-sm text-morandi-secondary">{LABELS.LOADING_EDITOR}</p>
      </div>
    </div>
  )
}

// 另存新檔對話框
function SaveAsDialog({
  isOpen,
  onClose,
  onConfirm,
  defaultName,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string, tourId: string | null) => void
  defaultName: string
}) {
  const [name, setName] = useState(defaultName)
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null)
  const { tours } = useTours()

  useEffect(() => {
    if (isOpen) {
      setName(defaultName + ' (副本)')
      setSelectedTourId(null)
    }
  }, [isOpen, defaultName])

  const handleConfirm = () => {
    if (!name.trim()) {
      void alert(LABELS.ALERT_ENTER_FILENAME, 'warning')
      return
    }
    onConfirm(name.trim(), selectedTourId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{LABELS.SAVE_AS}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="filename">{LABELS.FILE_NAME}</Label>
            <Input
              id="filename"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={LABELS.LABEL_1344}
              className="mt-2"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleConfirm()
              }}
            />
          </div>
          <div>
            <Label htmlFor="tour">{LABELS.SAVE_LOCATION}</Label>
            <Select
              value={selectedTourId || 'private'}
              onValueChange={value => setSelectedTourId(value === 'private' ? null : value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={LABELS.SAVING_1081} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">{LABELS.PRIVATE_FILES}</SelectItem>
                {tours && tours.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground border-t border-border mt-1 pt-1">
                      {LABELS.LABEL_7842}
                    </div>
                    {tours.map(tour => (
                      <SelectItem key={tour.id} value={tour.id}>
                        {tour.code} - {tour.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTourId
                ? '存到旅遊團後，團隊成員都能看到此文件'
                : '僅存在我的文件，只有自己能看到'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {LABELS.CANCEL}
          </Button>
          <Button onClick={handleConfirm}>{LABELS.SAVE}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditorContent() {
  const router = useRouter()
  const { sidebarCollapsed } = useAuthStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const searchParams = useSearchParams()

  const docId = searchParams.get('id')
  const docType = searchParams.get('type') || 'spreadsheet'
  const docName = searchParams.get('name') || '未命名文件'

  const { fetchDocument, createDocument, saveDocument, saveAsDocument } = useOfficeDocument()

  const { data: fetchedDoc, isLoading: isDocLoading } = useSWR(
    docId ? `office-doc-${docId}` : null,
    () => fetchDocument(docId!)
  )

  const documentData = (fetchedDoc?.data as unknown as IWorkbookData) ?? null
  const [currentDocId, setCurrentDocId] = useState<string | null>(docId)
  const [currentDocName, setCurrentDocName] = useState(docName)
  const isLoading = !!docId && isDocLoading
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false)
  const [pendingSaveAsData, setPendingSaveAsData] = useState<IWorkbookData | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // 從 SWR 資料同步 docId 和 docName
  useEffect(() => {
    if (fetchedDoc) {
      setCurrentDocName(fetchedDoc.name)
      setCurrentDocId(fetchedDoc.id)
    }
  }, [fetchedDoc])

  // 儲存（自動儲存用，不顯示 alert）
  const handleSave = useCallback(
    async (data: IWorkbookData): Promise<void> => {
      if (currentDocId) {
        // 更新現有文件
        await saveDocument(currentDocId, data)
      } else {
        // 新文件，先建立（私人文件，tour_id = null）
        const newDoc = await createDocument({
          name: currentDocName,
          type: docType as 'spreadsheet' | 'document' | 'slides',
          data,
        })
        if (newDoc) {
          setCurrentDocId(newDoc.id)
          // 更新 URL（不觸發重新載入）
          window.history.replaceState(
            null,
            '',
            `/office/editor?id=${newDoc.id}&name=${encodeURIComponent(newDoc.name)}&type=${docType}`
          )
        }
      }
    },
    [currentDocId, currentDocName, docType, saveDocument, createDocument]
  )

  // 另存新檔
  const handleSaveAs = useCallback((data: IWorkbookData) => {
    setPendingSaveAsData(data)
    setSaveAsDialogOpen(true)
  }, [])

  const handleSaveAsConfirm = useCallback(
    async (newName: string, tourId: string | null) => {
      if (!pendingSaveAsData) return

      const newDoc = await saveAsDocument(currentDocId || '', newName, pendingSaveAsData, tourId)

      if (newDoc) {
        if (tourId) {
          // 存到旅遊團，導航回列表
          router.push('/office')
          void alert('已存到旅遊團', 'success')
        } else {
          // 私人文件，導航到新文件
          router.push(
            `/office/editor?id=${newDoc.id}&name=${encodeURIComponent(newDoc.name)}&type=${docType}`
          )
          void alert('另存成功', 'success')
        }
      } else {
        void alert('另存失敗', 'error')
      }

      setSaveAsDialogOpen(false)
      setPendingSaveAsData(null)
    },
    [pendingSaveAsData, currentDocId, docType, saveAsDocument, router]
  )

  // 匯出 Excel
  const handleExportExcel = useCallback(
    async (data: IWorkbookData) => {
      try {
        // 動態載入 xlsx
        const XLSX = await import('xlsx')

        // 從 Univer 資料轉換為 xlsx 格式
        const workbook = XLSX.utils.book_new()

        // 處理每個 sheet
        if (data.sheets) {
          Object.entries(data.sheets).forEach(([sheetId, sheet]) => {
            const sheetName = sheet.name || sheetId

            // 從 cellData 建立資料陣列
            const rows: (string | number | null)[][] = []
            const cellData = sheet.cellData || {}

            // 找出最大行列
            let maxRow = 0
            let maxCol = 0
            Object.keys(cellData).forEach(rowKey => {
              const rowIndex = parseInt(rowKey, 10)
              if (rowIndex > maxRow) maxRow = rowIndex
              const row = cellData[rowIndex]
              if (row) {
                Object.keys(row).forEach(colKey => {
                  const colIndex = parseInt(colKey, 10)
                  if (colIndex > maxCol) maxCol = colIndex
                })
              }
            })

            // 建立二維陣列
            for (let r = 0; r <= maxRow; r++) {
              const rowData: (string | number | null)[] = []
              for (let c = 0; c <= maxCol; c++) {
                const cell = cellData[r]?.[c]
                if (cell && cell.v !== undefined) {
                  rowData.push(cell.v as string | number)
                } else {
                  rowData.push(null)
                }
              }
              rows.push(rowData)
            }

            const worksheet = XLSX.utils.aoa_to_sheet(rows)
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31)) // Excel sheet name max 31 chars
          })
        }

        // 下載
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const fileName = `${currentDocName}_${today}.xlsx`
        XLSX.writeFile(workbook, fileName)

        void alert('匯出成功', 'success')
      } catch (error) {
        logger.error('匯出 Excel 失敗:', error)
        void alert('匯出失敗', 'error')
      }
    },
    [currentDocName]
  )

  // 儲存狀態變化
  const handleSaveStatusChange = useCallback((status: SaveStatus) => {
    setSaveStatus(status)
  }, [])

  const renderEditor = () => {
    if (isLoading) {
      return <EditorLoading />
    }

    switch (docType) {
      case 'spreadsheet':
        return (
          <UniverSpreadsheet
            className="h-full"
            documentId={currentDocId}
            documentName={currentDocName}
            initialData={documentData}
            autoSave={true}
            autoSaveDelay={2000}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onExportExcel={handleExportExcel}
            onSaveStatusChange={handleSaveStatusChange}
          />
        )
      case 'document':
        return <UniverDocument className="h-full" />
      case 'slides':
        return <UniverSlides className="h-full" />
      default:
        return (
          <UniverSpreadsheet
            className="h-full"
            documentId={currentDocId}
            documentName={currentDocName}
            initialData={documentData}
            autoSave={true}
            autoSaveDelay={2000}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onExportExcel={handleExportExcel}
            onSaveStatusChange={handleSaveStatusChange}
          />
        )
    }
  }

  return (
    <>
      {/* 手機版頂部標題列 */}
      <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
      <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      {/* 主內容區域 - 類似工作空間的全屏佈局 */}
      <main
        className={cn(
          'fixed right-0 bottom-0 overflow-hidden',
          // 手機模式：全寬，頂部扣除標題列
          'top-14 left-0 p-2',
          // 桌面模式：扣除 sidebar 寬度，從頂部開始
          'lg:top-0 lg:p-4',
          sidebarCollapsed ? 'lg:left-16' : 'lg:left-[190px]'
        )}
      >
        <div className="h-full rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          {renderEditor()}
        </div>
      </main>

      {/* 另存新檔對話框 */}
      <SaveAsDialog
        isOpen={saveAsDialogOpen}
        onClose={() => {
          setSaveAsDialogOpen(false)
          setPendingSaveAsData(null)
        }}
        onConfirm={handleSaveAsConfirm}
        defaultName={currentDocName}
      />
    </>
  )
}

export default function OfficeEditorPage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorContent />
    </Suspense>
  )
}
