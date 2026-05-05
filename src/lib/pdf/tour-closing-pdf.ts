/**
 * 結帳明細 PDF 生成（重寫 2026-05-04）
 *
 * 設計重點：
 * - A4 直式、視覺風格參考出納單（白底 header + 細灰線 + grid theme）
 * - 不強制分頁、能塞一頁就一頁、超過 A4 才讓 autoTable 自動分頁
 * - 收入 / 支出 / 利潤計算 三段在同一份文件流裡、用 ensureSpace 控制段落換頁
 * - 回傳 Blob、由呼叫端決定要直接下載還是 in-app preview
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Tour, PaymentRequest } from '@/stores/types'
import type { ProfitCalculationResult } from '@/types/bonus.types'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import { formatDate } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format-currency'
import { loadChineseFonts } from './pdf-fonts'
import { CLOSING_REPORT_PDF_LABELS as L } from './constants/pdf-labels'

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number }
}

interface OrderForReport {
  code?: string | null
  contact_person?: string | null
  member_count?: number | null
  total_amount?: number | null
}

interface ReceiptForReport {
  receipt_number?: string
  receipt_date?: string
  receipt_amount?: number
  amount?: number
  payment_method?: string
  receipt_type?: number
}

export interface TourClosingPDFData {
  tour: Tour
  orders: OrderForReport[]
  receipts: ReceiptForReport[]
  costs: PaymentRequest[]
  profitResult: ProfitCalculationResult
  preparedBy?: string
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  transfer: '匯款',
  cash: '現金',
  card: '信用卡',
  check: '支票',
  linkpay: 'LinkPay',
}

function getPaymentMethodLabel(method: string | undefined): string {
  if (!method) return '-'
  return PAYMENT_METHOD_MAP[method] || method
}

// 出納單風格的共用 styles（grid theme + 細灰線 + 白底 header）
const SHARED_TABLE_STYLES = {
  font: 'ChironHeiHK',
  fontSize: 9,
  cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
  lineWidth: 0.1,
  lineColor: [200, 200, 200] as [number, number, number],
  textColor: [60, 60, 60] as [number, number, number],
  valign: 'middle' as const,
}

const SHARED_HEAD_STYLES = {
  fillColor: [255, 255, 255] as [number, number, number],
  textColor: [80, 80, 80] as [number, number, number],
  fontStyle: 'bold' as const,
  lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 },
  lineColor: [150, 150, 150] as [number, number, number],
}

const SHARED_FOOT_STYLES = {
  fillColor: [255, 255, 255] as [number, number, number],
  textColor: [80, 80, 80] as [number, number, number],
  fontStyle: 'bold' as const,
  lineWidth: { top: 0.3, bottom: 0, left: 0, right: 0 },
  lineColor: [150, 150, 150] as [number, number, number],
}

/**
 * 生成結帳明細 PDF、回傳 Blob
 */
export async function generateTourClosingPDF(data: TourClosingPDFData): Promise<Blob> {
  const { tour, receipts, costs, profitResult, preparedBy } = data

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  await loadChineseFonts(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  /** 確認剩餘空間夠下個區塊；不夠就換頁、回傳新 yPos */
  const ensureSpace = (current: number, needed: number): number => {
    if (current + needed > pageHeight - 22) {
      doc.addPage()
      return 18
    }
    return current
  }

  // ============================================================
  // 標題區（出納單風格：置中、單行）
  // ============================================================
  let yPos = 18

  doc.setFontSize(16)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text(`${L.REPORT_TITLE} ${tour.code || ''}`.trim(), pageWidth / 2, yPos, {
    align: 'center',
  })
  yPos += 7

  if (tour.name) {
    doc.setFontSize(10)
    doc.setFont('ChironHeiHK', 'normal')
    doc.text(tour.name, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6
  }

  // 兩行 meta：日期 / 製表人 / 列印日
  doc.setFontSize(9)
  doc.setFont('ChironHeiHK', 'normal')
  doc.setTextColor(80, 80, 80)
  if (tour.departure_date || tour.return_date) {
    doc.text(
      `${L.DEPARTURE_DATE}：${formatDate(tour.departure_date)} ~ ${formatDate(tour.return_date)}`,
      margin,
      yPos
    )
  }
  doc.text(`${L.PRINT_DATE}：${formatDate(new Date().toISOString())}`, pageWidth - margin, yPos, {
    align: 'right',
  })
  yPos += 5

  if (preparedBy) {
    doc.text(`${L.PREPARED_BY}：${preparedBy}`, margin, yPos)
    yPos += 5
  }
  yPos += 3
  doc.setTextColor(60, 60, 60)

  // ============================================================
  // 收入明細
  // ============================================================
  yPos = ensureSpace(yPos, 24)
  doc.setFontSize(11)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text(L.SECTION_INCOME, margin, yPos)
  yPos += 3

  const incomeBody: string[][] =
    receipts.length > 0
      ? receipts.map((r, idx) => [
          String(idx + 1),
          r.receipt_number || '-',
          r.receipt_date ? formatDate(r.receipt_date) : '-',
          getPaymentMethodLabel(r.payment_method),
          formatCurrency(r.receipt_amount ?? r.amount ?? 0),
        ])
      : [['', L.NO_INCOME_RECORDS, '', '', '']]

  autoTable(doc, {
    startY: yPos,
    head: [['#', L.COL_RECEIPT_NO, L.COL_DATE, L.COL_PAYMENT_METHOD, L.COL_AMOUNT]],
    body: incomeBody,
    foot: [['', '', '', L.INCOME_SUBTOTAL, formatCurrency(profitResult.receipt_total)]],
    theme: 'grid',
    styles: SHARED_TABLE_STYLES,
    headStyles: SHARED_HEAD_STYLES,
    footStyles: { ...SHARED_FOOT_STYLES, halign: 'right' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 'auto', halign: 'right' },
    },
    margin: { left: margin, right: margin },
    showFoot: 'lastPage',
  })
  yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 8

  // ============================================================
  // 支出明細
  // ============================================================
  yPos = ensureSpace(yPos, 24)
  doc.setFontSize(11)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text(L.SECTION_EXPENSE, margin, yPos)
  yPos += 3

  const expenseBody: string[][] =
    costs.length > 0
      ? costs.map((c, idx) => [
          String(idx + 1),
          c.code || '-',
          c.supplier_name || '-',
          c.request_type || '-',
          formatCurrency(c.amount || 0),
        ])
      : [['', L.NO_EXPENSE_RECORDS, '', '', '']]

  autoTable(doc, {
    startY: yPos,
    head: [['#', L.COL_REQUEST_NO, L.COL_SUPPLIER, L.COL_CATEGORY, L.COL_AMOUNT]],
    body: expenseBody,
    foot: [['', '', '', L.EXPENSE_SUBTOTAL, formatCurrency(profitResult.expense_total)]],
    theme: 'grid',
    styles: SHARED_TABLE_STYLES,
    headStyles: SHARED_HEAD_STYLES,
    footStyles: { ...SHARED_FOOT_STYLES, halign: 'right' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 42 },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 'auto', halign: 'right' },
    },
    margin: { left: margin, right: margin },
    showFoot: 'lastPage',
  })
  yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 8

  // ============================================================
  // 利潤計算
  // ============================================================
  yPos = ensureSpace(yPos, 60)
  doc.setFontSize(11)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text(L.SECTION_PROFIT, margin, yPos)
  yPos += 3

  const profitRows: Array<[string, string]> = [
    [L.RECEIPT_TOTAL, formatCurrency(profitResult.receipt_total)],
    [L.EXPENSE_TOTAL, `- ${formatCurrency(profitResult.expense_total)}`],
    [
      L.ADMIN_COST(profitResult.admin_cost_per_person, profitResult.member_count),
      `- ${formatCurrency(profitResult.administrative_cost)}`,
    ],
    [L.PROFIT_BEFORE_TAX, formatCurrency(profitResult.profit_before_tax)],
    [L.PROFIT_TAX(profitResult.tax_rate), `- ${formatCurrency(profitResult.profit_tax)}`],
    [L.NET_PROFIT, formatCurrency(profitResult.net_profit)],
  ]
  const netProfitRowIndex = profitRows.length - 1

  if (profitResult.net_profit >= 0) {
    for (const b of profitResult.employee_bonuses) {
      if (b.amount === 0) continue
      const bonusVal = Number(b.setting.bonus)
      const pctLabel =
        b.setting.bonus_type === BonusCalculationType.PERCENT
          ? L.PERCENT_LABEL(bonusVal)
          : L.FIXED_LABEL(bonusVal)
      const suffix = b.employee_name ? L.EMPLOYEE_SUFFIX(b.employee_name) : ''
      const typeName =
        b.setting.type === BonusSettingType.OP_BONUS
          ? L.OP_BONUS
          : b.setting.type === BonusSettingType.SALE_BONUS
            ? L.SALE_BONUS
            : ''
      profitRows.push([`${typeName}${pctLabel}${suffix}`, `- ${formatCurrency(b.amount)}`])
    }
    for (const b of profitResult.team_bonuses) {
      if (b.amount === 0) continue
      const bonusVal = Number(b.setting.bonus)
      const pctLabel =
        b.setting.bonus_type === BonusCalculationType.PERCENT
          ? L.PERCENT_LABEL(bonusVal)
          : L.FIXED_LABEL(bonusVal)
      profitRows.push([`${L.TEAM_BONUS}${pctLabel}`, `- ${formatCurrency(b.amount)}`])
    }
  } else {
    profitRows.push([L.NO_BONUS, ''])
  }

  autoTable(doc, {
    startY: yPos,
    body: profitRows,
    foot: [[L.COMPANY_PROFIT, formatCurrency(profitResult.company_profit)]],
    theme: 'plain',
    styles: {
      font: 'ChironHeiHK',
      fontSize: 10,
      cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
      textColor: [60, 60, 60],
    },
    footStyles: {
      font: 'ChironHeiHK',
      fontSize: 12,
      fontStyle: 'bold',
      textColor: [60, 60, 60],
      lineWidth: { top: 0.5, bottom: 0, left: 0, right: 0 },
      lineColor: [100, 100, 100],
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 'auto', halign: 'right' },
    },
    margin: { left: margin, right: margin },
    didParseCell: hookData => {
      if (hookData.section === 'body' && hookData.row.index === netProfitRowIndex) {
        hookData.cell.styles.fontStyle = 'bold'
      }
      if (hookData.section === 'foot') {
        hookData.cell.styles.halign = hookData.column.index === 1 ? 'right' : 'left'
      }
    },
    didDrawCell: hookData => {
      // 淨利行底線
      if (hookData.section === 'body' && hookData.row.index === netProfitRowIndex) {
        const cell = hookData.cell
        doc.setDrawColor(150, 150, 150)
        doc.setLineWidth(0.3)
        doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height)
      }
    },
  })

  // ============================================================
  // 頁尾（slogan + 頁碼）
  // ============================================================
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('ChironHeiHK', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(L.GENERATED_AT(formatDate(new Date().toISOString())), margin, pageHeight - 10)
    doc.text(L.PAGE_NUMBER(i, pageCount), pageWidth - margin, pageHeight - 10, { align: 'right' })
  }

  return doc.output('blob')
}
