'use client'

/**
 * 供應商批次匯入 Dialog
 *
 * 流程：選擇檔案 → 解析預覽 → 確認匯入
 */

import React, { useState, useCallback, useRef, useMemo } from 'react'
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  parseImportFile,
  downloadImportTemplate,
  emailValidator,
  phoneValidator,
  type ColumnMapping,
  type ImportConfig,
  type ParsedRow,
} from '@/lib/excel/import-parser'
import { createSupplier, useSuppliersSlim } from '@/data'
import type { Supplier, SupplierType } from '@/types/supplier.types'
import { SUPPLIER_IMPORT_LABELS as L } from '../constants/labels'

// ─── Types ───────────────────────────────────────────────

interface ImportSuppliersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SupplierImportRow {
  name: string | null
  english_name: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  type: string | null
  notes: string | null
}

// ─── Supplier type mapping ───────────────────────────────

const SUPPLIER_TYPE_MAP: Record<string, SupplierType> = {
  [L.type_hotel]: 'hotel',
  [L.type_restaurant]: 'restaurant',
  [L.type_transport]: 'transport',
  [L.type_attraction]: 'attraction',
  [L.type_guide]: 'guide',
  [L.type_agency]: 'agency',
  [L.type_ticketing]: 'ticketing',
  [L.type_other]: 'other',
  // Also support English values
  hotel: 'hotel',
  restaurant: 'restaurant',
  transport: 'transport',
  attraction: 'attraction',
  guide: 'guide',
  agency: 'agency',
  ticketing: 'ticketing',
  other: 'other',
}

function normalizeSupplierType(value: string): string | null {
  if (!value) return null
  return SUPPLIER_TYPE_MAP[value.trim()] ?? 'other'
}

// ─── Config ──────────────────────────────────────────────

const SUPPLIER_COLUMNS: ColumnMapping[] = [
  { header: L.tpl_name, field: 'name', required: true, width: 20 },
  { header: L.tpl_english_name, field: 'english_name', width: 20 },
  { header: L.tpl_contact_person, field: 'contact_person', width: 12 },
  { header: L.tpl_phone, field: 'phone', width: 15 },
  { header: L.tpl_email, field: 'email', width: 25 },
  { header: L.tpl_address, field: 'address', width: 30 },
  { header: L.tpl_type, field: 'type', width: 10, transform: normalizeSupplierType },
  { header: L.tpl_notes, field: 'notes', width: 30 },
]

const IMPORT_CONFIG: ImportConfig<SupplierImportRow> = {
  columns: SUPPLIER_COLUMNS,
  validators: {
    email: [emailValidator],
    phone: [phoneValidator],
  },
}

// ─── Preview row type ────────────────────────────────────

interface PreviewTableRow {
  id: string
  row_number: number
  status: 'ok' | 'error' | 'warning' | 'duplicate'
  status_text: string
  name: string
  english_name: string
  contact_person: string
  phone: string
  email: string
  address: string
  type: string
  notes: string
  errors: Record<string, string>
  warnings: string[]
}

// ─── Component ───────────────────────────────────────────

export function ImportSuppliersDialog({ open, onOpenChange }: ImportSuppliersDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [parsed_rows, setParsedRows] = useState<ParsedRow<SupplierImportRow>[]>([])
  const [global_errors, setGlobalErrors] = useState<string[]>([])
  const [selected_file, setSelectedFile] = useState<File | null>(null)
  const [is_importing, setIsImporting] = useState(false)
  const file_input_ref = useRef<HTMLInputElement>(null)

  const { items: existing_suppliers } = useSuppliersSlim()

  // 重置狀態
  const resetState = useCallback(() => {
    setStep('upload')
    setParsedRows([])
    setGlobalErrors([])
    setSelectedFile(null)
    setIsImporting(false)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setTimeout(resetState, 200)
  }, [onOpenChange, resetState])

  // 重複檢查
  const checkDuplicates = useCallback(
    (rows: ParsedRow<SupplierImportRow>[]): ParsedRow<SupplierImportRow>[] => {
      return rows.map(row => {
        const warnings = [...row.warnings]
        const name = row.data.name

        if (name) {
          const dup = existing_suppliers.find((s: Supplier) => s.name === name)
          if (dup) {
            warnings.push(L.msg_duplicate_name(name))
          }
        }

        return { ...row, warnings }
      })
    },
    [existing_suppliers]
  )

  // 解析檔案
  const handleFileParse = useCallback(
    async (file: File) => {
      setSelectedFile(file)
      try {
        const result = await parseImportFile<SupplierImportRow>(file, IMPORT_CONFIG)
        setGlobalErrors(result.global_errors)

        const rows_with_dup_check = checkDuplicates(result.rows)
        setParsedRows(rows_with_dup_check)
        setStep('preview')
      } catch (err) {
        logger.error('供應商匯入解析失敗', err)
        toast.error(L.error_parse_failed)
      }
    },
    [checkDuplicates]
  )

  // 檔案選擇
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        void handleFileParse(file)
      }
      if (e.target) e.target.value = ''
    },
    [handleFileParse]
  )

  // 拖放
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        void handleFileParse(file)
      }
    },
    [handleFileParse]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // 下載模板
  const handleDownloadTemplate = useCallback(async () => {
    await downloadImportTemplate(SUPPLIER_COLUMNS, L.template_filename, L.template_sheet)
  }, [])

  // 匯入
  const handleImport = useCallback(async () => {
    const valid_rows = parsed_rows.filter(r => Object.keys(r.errors).length === 0)
    if (valid_rows.length === 0) {
      toast.error(L.error_no_data_to_import)
      return
    }

    setIsImporting(true)
    let success_count = 0

    try {
      for (const row of valid_rows) {
        try {
          await createSupplier({
            name: row.data.name || '',
            english_name: row.data.english_name || null,
            contact_person: row.data.contact_person || null,
            phone: row.data.phone || null,
            email: row.data.email || null,
            address: row.data.address || null,
            type: (row.data.type as SupplierType) || 'other',
            notes: row.data.notes || null,
          })
          success_count++
        } catch (err) {
          logger.error(`匯入第 ${row.row_number} 列供應商失敗`, err)
        }
      }

      if (success_count === valid_rows.length) {
        toast.success(L.msg_import_success(success_count))
      } else {
        toast.warning(L.msg_import_partial(success_count, valid_rows.length))
      }
      handleClose()
    } catch (err) {
      logger.error('供應商批次匯入失敗', err)
      toast.error(L.msg_import_failed)
    } finally {
      setIsImporting(false)
    }
  }, [parsed_rows, handleClose])

  // 預覽資料
  const preview_data: PreviewTableRow[] = useMemo(() => {
    return parsed_rows.map((row, idx) => {
      const has_errors = Object.keys(row.errors).length > 0
      const has_warnings = row.warnings.length > 0
      let status: PreviewTableRow['status'] = 'ok'
      let status_text = L.status_ok
      if (has_errors) {
        status = 'error'
        status_text = L.status_error
      } else if (has_warnings) {
        status = 'warning'
        status_text = L.status_duplicate
      }

      return {
        id: String(idx),
        row_number: row.row_number,
        status,
        status_text,
        name: row.data.name || '',
        english_name: row.data.english_name || '',
        contact_person: row.data.contact_person || '',
        phone: row.data.phone || '',
        email: row.data.email || '',
        address: row.data.address || '',
        type: row.data.type || '',
        notes: row.data.notes || '',
        errors: row.errors,
        warnings: row.warnings,
      }
    })
  }, [parsed_rows])

  const error_count = useMemo(
    () => parsed_rows.filter(r => Object.keys(r.errors).length > 0).length,
    [parsed_rows]
  )

  const valid_count = useMemo(
    () => parsed_rows.filter(r => Object.keys(r.errors).length === 0).length,
    [parsed_rows]
  )

  // 表格欄位
  const table_columns: TableColumn<PreviewTableRow>[] = useMemo(
    () => [
      {
        key: 'row_number',
        label: L.col_row,
        width: '60px',
        render: (value: unknown) => (
          <span className="text-xs text-morandi-secondary font-mono">{String(value)}</span>
        ),
      },
      {
        key: 'status',
        label: L.col_status,
        width: '80px',
        render: (_value: unknown, row: PreviewTableRow) => {
          if (row.status === 'error') {
            return (
              <span
                className="inline-flex items-center gap-1 text-xs text-morandi-red"
                title={Object.values(row.errors).join('\n')}
              >
                <AlertCircle size={12} />
                {row.status_text}
              </span>
            )
          }
          if (row.status === 'warning') {
            return (
              <span
                className="inline-flex items-center gap-1 text-xs text-status-warning"
                title={row.warnings.join('\n')}
              >
                <AlertTriangle size={12} />
                {row.status_text}
              </span>
            )
          }
          return (
            <span className="inline-flex items-center gap-1 text-xs text-morandi-green">
              <CheckCircle2 size={12} />
              {row.status_text}
            </span>
          )
        },
      },
      {
        key: 'name',
        label: L.col_name,
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-sm ${row.errors['name'] ? 'text-morandi-red font-medium' : 'text-morandi-primary'}`}
          >
            {row.name || '-'}
          </span>
        ),
      },
      {
        key: 'english_name',
        label: L.col_english_name,
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs text-morandi-secondary">{row.english_name || '-'}</span>
        ),
      },
      {
        key: 'contact_person',
        label: L.col_contact_person,
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs text-morandi-primary">{row.contact_person || '-'}</span>
        ),
      },
      {
        key: 'phone',
        label: L.col_phone,
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-xs ${row.errors['phone'] ? 'text-morandi-red' : 'text-morandi-primary'}`}
          >
            {row.phone || '-'}
          </span>
        ),
      },
      {
        key: 'email',
        label: L.col_email,
        render: (_value: unknown, row: PreviewTableRow) => (
          <span
            className={`text-xs ${row.errors['email'] ? 'text-morandi-red' : 'text-morandi-primary'}`}
          >
            {row.email || '-'}
          </span>
        ),
      },
      {
        key: 'type',
        label: L.col_type,
        render: (_value: unknown, row: PreviewTableRow) => (
          <span className="text-xs text-morandi-secondary">{row.type || '-'}</span>
        ),
      },
    ],
    []
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent level={1} className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-morandi-sky" />
            {L.title}
          </DialogTitle>
          <DialogDescription>{L.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {step === 'upload' && (
            <>
              {/* 上傳區域 */}
              <div
                className="border-2 border-dashed border-morandi-secondary/30 rounded-lg p-8 text-center cursor-pointer hover:border-morandi-sky/50 transition-colors"
                onClick={() => file_input_ref.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="mx-auto h-10 w-10 text-morandi-secondary/50 mb-3" />
                <p className="text-sm text-morandi-primary font-medium">{L.file_drop}</p>
                <p className="text-xs text-morandi-secondary mt-1">{L.file_hint}</p>
                <input
                  ref={file_input_ref}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* 下載模板 */}
              <div className="flex justify-center">
                <Button
                  variant="soft-gold"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="gap-2"
                >
                  <Download size={16} />
                  {L.btn_download_template}
                </Button>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              {/* 全域錯誤 */}
              {global_errors.length > 0 && (
                <div className="bg-morandi-red/10 border border-morandi-red/30 rounded-lg p-3">
                  {global_errors.map((err, i) => (
                    <p key={i} className="text-sm text-morandi-red flex items-center gap-1">
                      <AlertCircle size={14} />
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {/* 摘要 */}
              <div className="flex items-center justify-between bg-morandi-container/10 rounded-lg px-4 py-2">
                <div className="text-sm text-morandi-primary">
                  {L.preview_summary(parsed_rows.length, error_count)}
                </div>
                {selected_file && (
                  <span className="text-xs text-morandi-secondary">
                    {L.file_selected(selected_file.name)}
                  </span>
                )}
              </div>

              {/* 預覽表格 */}
              <div className="flex-1 overflow-hidden border rounded-lg">
                <EnhancedTable
                  columns={table_columns}
                  data={preview_data}
                  initialPageSize={20}
                  rowClassName={(row: PreviewTableRow) =>
                    row.status === 'error'
                      ? 'bg-morandi-red/10'
                      : row.status === 'warning'
                        ? 'bg-status-warning-bg'
                        : ''
                  }
                />
              </div>
            </>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <div>
            {step === 'preview' && (
              <Button variant="soft-gold" size="sm" onClick={resetState} className="gap-2">
                <ArrowLeft size={16} />
                {L.btn_back}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="soft-gold" size="sm" onClick={handleClose}>
              {L.btn_cancel}
            </Button>
            {step === 'preview' && (
              <Button variant="soft-gold"
                size="sm"
                onClick={handleImport}
                disabled={is_importing || valid_count === 0}
 className="gap-2"
              >
                <Upload size={16} />
                {is_importing ? L.btn_importing : `${L.btn_import}（${valid_count} 筆）`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
