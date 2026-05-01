'use client'
/**
 * ExportDialog - 匯出成員對話框
 * 從 OrderMembersExpandable.tsx 拆分出來
 */

import React from 'react'
import { Printer, X, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { OrderMember, ExportColumnsConfig } from '../types/order-member.types'
import { useTranslations } from 'next-intl'

interface ExportDialogProps {
  isOpen: boolean
  columns: ExportColumnsConfig
  members: OrderMember[]
  departureDate: string | null
  tourName?: string
  onClose: () => void
  onColumnsChange: (columns: ExportColumnsConfig) => void
}

// 欄位標籤對照
const COLUMN_LABELS: Record<keyof ExportColumnsConfig, string> = {
  identity: t('exportDialog.colIdentity'),
  chinese_name: t('exportDialog.colChineseName'),
  passport_name: t('exportDialog.colPassportName'),
  birth_date: t('exportDialog.colBirthday'),
  gender: t('exportDialog.colGender'),
  id_number: t('exportDialog.colIdNumber'),
  passport_number: t('exportDialog.colPassportNumber'),
  passport_expiry: t('exportDialog.colPassportExpiry'),
  special_meal: t('exportDialog.colSpecialMeal'),
  remarks: t('exportDialog.colRemarks'),
  // 金額相關欄位放最後
  total_payable: t('exportDialog.colTotalPayable'),
  deposit_amount: t('exportDialog.colDepositAmount'),
  balance: t('exportDialog.colBalance'),
}

export function ExportDialog({
  isOpen,
  columns,
  members,
  departureDate,
  tourName,
  onClose,
  onColumnsChange,
}: ExportDialogProps) {
  const t = useTranslations('orders')

  // 切換單一欄位
  const toggleColumn = (key: keyof ExportColumnsConfig) => {
    onColumnsChange({
      ...columns,
      [key]: !columns[key],
    })
  }

  // 全選/取消全選
  const toggleAll = () => {
    const allSelected = Object.values(columns).every(v => v)
    const newValue = !allSelected
    const newColumns = Object.keys(columns).reduce(
      (acc, key) => ({
        ...acc,
        [key]: newValue,
      }),
      {} as ExportColumnsConfig
    )
    onColumnsChange(newColumns)
  }

  // 產生列印內容
  const handlePrint = () => {
    const selectedColumns = Object.entries(columns)
      .filter(([, selected]) => selected)
      .map(([key]) => key as keyof ExportColumnsConfig)

    // 產生表格 HTML
    const tableRows = members
      .map((member, index) => {
        const cells = selectedColumns.map(col => {
          let value = ''
          switch (col) {
            case 'identity':
              value = member.identity || ''
              break
            case 'chinese_name':
              value = member.chinese_name || ''
              break
            case 'passport_name':
              value = member.passport_name || ''
              break
            case 'birth_date':
              value = member.birth_date || ''
              break
            case 'gender':
              value =
                member.gender === 'M'
                  ? t('exportDialog.genderMale')
                  : member.gender === 'F'
                    ? t('exportDialog.genderFemale')
                    : ''
              break
            case 'id_number':
              value = member.id_number || ''
              break
            case 'passport_number':
              value = member.passport_number || ''
              break
            case 'passport_expiry':
              value = member.passport_expiry || ''
              break
            case 'special_meal':
              value = member.special_meal || ''
              break
            case 'total_payable':
              value = member.total_payable?.toLocaleString() || ''
              break
            case 'deposit_amount':
              value = member.deposit_amount?.toLocaleString() || ''
              break
            case 'balance':
              value = member.balance_amount?.toLocaleString() || ''
              break
            case 'remarks':
              value = member.remarks || ''
              break
          }
          return `<td style="border: 1px solid #ddd; padding: 8px;">${value}</td>`
        })

        return `<tr><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>${cells.join('')}</tr>`
      })
      .join('')

    const headerCells = selectedColumns
      .map(
        col =>
          `<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">${COLUMN_LABELS[col]}</th>`
      )
      .join('')

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>{t('orders.label1942')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            .info { font-size: 12px; color: #666; margin-bottom: 15px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>{t('orders.label1942')}</h1>
          <div class="info">
            ${t('exportDialog.departureDate')}${departureDate || t('exportDialog.notSet')} | ${t('exportDialog.totalCount')}${members.length}${t('exportDialog.peopleUnit')}
          </div>
          <table>
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; width: 40px;">#</th>
                ${headerCells}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }

    onClose()
  }

  // 匯出 Excel
  const handleExportExcel = async () => {
    const selectedColumns = Object.entries(columns)
      .filter(([, selected]) => selected)
      .map(([key]) => key as keyof ExportColumnsConfig)

    if (selectedColumns.length === 0) return

    // 動態載入 xlsx（避免污染首屏 bundle）
    const XLSX = await import('xlsx')

    // 轉換資料
    const data = members.map((member, idx) => {
      const row: Record<string, string | number> = { 序: idx + 1 }
      selectedColumns.forEach(col => {
        const label = COLUMN_LABELS[col]
        switch (col) {
          case 'gender':
            row[label] =
              member.gender === 'M'
                ? t('exportDialog.genderMale')
                : member.gender === 'F'
                  ? t('exportDialog.genderFemale')
                  : ''
            break
          case 'balance':
            row[label] = (member.total_payable || 0) - (member.deposit_amount || 0)
            break
          case 'total_payable':
          case 'deposit_amount':
            row[label] = member[col] || 0
            break
          default:
            row[label] = member[col] || ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '團員名單')

    // 設定欄寬
    const colWidths = [{ wch: 5 }] // 序號欄
    selectedColumns.forEach(col => {
      if (['chinese_name', 'passport_name'].includes(col)) {
        colWidths.push({ wch: 20 })
      } else if (['remarks', 'special_meal'].includes(col)) {
        colWidths.push({ wch: 25 })
      } else if (['total_payable', 'deposit_amount', 'balance'].includes(col)) {
        colWidths.push({ wch: 12 })
      } else {
        colWidths.push({ wch: 15 })
      }
    })
    worksheet['!cols'] = colWidths

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const fileName = tourName ? `${tourName}_團員名單_${today}.xlsx` : `團員名單_${today}.xlsx`
    XLSX.writeFile(workbook, fileName)

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent nested level={2} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer size={18} />
            {t('orders.export8916')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-morandi-secondary">{t('orders.select6160')}</span>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {Object.values(columns).every(v => v)
                ? t('exportDialog.deselectAll')
                : t('exportDialog.selectAll')}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(columns) as (keyof ExportColumnsConfig)[]).map(key => (
              <label
                key={key}
                className="flex items-center gap-2 p-2 rounded hover:bg-morandi-bg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={columns[key]}
                  onChange={() => toggleColumn(key)}
                  className="rounded border-border"
                />
                <span className="text-sm">{COLUMN_LABELS[key]}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              <X size={16} className="mr-1" />
              {t('orders.cancel')}
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet size={16} className="mr-1" />
              Excel
            </Button>
            <Button onClick={handlePrint}>
              <Printer size={16} className="mr-1" />
              {t('orders.print')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
