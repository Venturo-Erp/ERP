/**
 * 收款單 PDF 生成
 *
 * 功能：
 * 1. 生成收款單 PDF
 * 2. 包含收款單基本資訊、訂單資訊、收款明細
 * 3. 根據不同收款方式顯示對應欄位
 * 4. 支援中英文雙語顯示
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Receipt } from '@/types/receipt.types'
import type { Order } from '@/types'
import { formatDate } from '@/lib/utils'
import { RECEIPT_TYPE_LABELS, RECEIPT_STATUS_LABELS, ReceiptType } from '@/types/receipt.types'
import { loadChineseFonts } from './pdf-fonts'

interface ReceiptPDFData {
  receipt: Receipt
  order?: Order
}

/**
 * 生成收款單 PDF
 */
export async function generateReceiptPDF(data: ReceiptPDFData): Promise<void> {
  const { receipt, order } = data

  // 初始化 PDF (A4 直式)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // 載入中文字體
  await loadChineseFonts(doc)

  let yPos = 20

  // ========== 標題 ==========
  doc.setFontSize(18)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text('Receipt / 收款單', 105, yPos, { align: 'center' })
  yPos += 15

  // ========== 基本資訊 ==========
  doc.setFontSize(10)
  doc.setFont('ChironHeiHK', 'normal')

  const infoLeft = 20
  const infoRight = 110

  // 左欄
  doc.text(`Receipt No. / 收款單號: ${receipt.receipt_number}`, infoLeft, yPos)
  yPos += 6
  doc.text(`Receipt Date / 收款日期: ${formatDate(receipt.receipt_date)}`, infoLeft, yPos)
  yPos += 6
  doc.text(
    `Receipt Type / 收款方式: ${RECEIPT_TYPE_LABELS[receipt.receipt_type as ReceiptType]}`,
    infoLeft,
    yPos
  )
  yPos += 6
  doc.text(
    `Status / 狀態: ${RECEIPT_STATUS_LABELS[receipt.status] || receipt.status}`,
    infoLeft,
    yPos
  )
  yPos += 10

  // 訂單資訊
  if (order) {
    doc.setFontSize(11)
    doc.setFont('ChironHeiHK', 'bold')
    doc.text('Order Information / 訂單資訊', infoLeft, yPos)
    yPos += 6

    doc.setFontSize(10)
    doc.setFont('ChironHeiHK', 'normal')
    doc.text(`Order No. / 訂單編號: ${order.order_number || '-'}`, infoLeft, yPos)
    yPos += 6
    doc.text(`Contact Person / 聯絡人: ${order.contact_person || '-'}`, infoLeft, yPos)
    yPos += 6
    doc.text(`Contact Phone / 電話: ${order.contact_phone || '-'}`, infoLeft, yPos)
    yPos += 10
  }

  // ========== 收款明細 ==========
  doc.setFontSize(12)
  doc.setFont('ChironHeiHK', 'bold')
  doc.text('Payment Details / 收款明細', infoLeft, yPos)
  yPos += 8

  // 金額資訊表格
  const amountData = [
    ['Expected Amount / 應收金額', `NT$ ${receipt.receipt_amount.toLocaleString()}`],
    [
      'Actual Amount / 實收金額',
      receipt.actual_amount ? `NT$ ${receipt.actual_amount.toLocaleString()}` : 'Pending / 待確認',
    ],
  ]

  autoTable(doc, {
    startY: yPos,
    body: amountData,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 10,
      textColor: 60,
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 80, halign: 'right' },
    },
    margin: { left: infoLeft, right: 20 },
    didDrawPage: data => {
      yPos = data.cursor!.y
    },
  })

  yPos += 10

  // ========== 收款方式詳細資訊 ==========
  const paymentDetailsData: string[][] = []

  // 根據不同收款方式顯示對應欄位
  switch (receipt.receipt_type) {
    case ReceiptType.BANK_TRANSFER: // 匯款
      if (receipt.account_info) {
        paymentDetailsData.push(['Account Info / 匯入帳戶', receipt.account_info])
      }
      if (receipt.fees !== null && receipt.fees !== undefined) {
        paymentDetailsData.push(['Fees / 手續費', `NT$ ${receipt.fees.toLocaleString()}`])
      }
      if (receipt.receipt_account) {
        paymentDetailsData.push(['Payer Name / 付款人', receipt.receipt_account])
      }
      break

    case ReceiptType.CASH: // 現金
      if (receipt.handler_name) {
        paymentDetailsData.push(['Handler / 經手人', receipt.handler_name])
      }
      if (receipt.receipt_account) {
        paymentDetailsData.push(['Payer Name / 付款人', receipt.receipt_account])
      }
      break

    case ReceiptType.CREDIT_CARD: // 刷卡
      if (receipt.card_last_four) {
        paymentDetailsData.push(['Card Last 4 Digits / 卡號後四碼', receipt.card_last_four])
      }
      if (receipt.auth_code) {
        paymentDetailsData.push(['Authorization Code / 授權碼', receipt.auth_code])
      }
      if (receipt.receipt_account) {
        paymentDetailsData.push(['Cardholder / 持卡人', receipt.receipt_account])
      }
      break

    case ReceiptType.CHECK: // 支票
      if (receipt.check_number) {
        paymentDetailsData.push(['Check Number / 支票號碼', receipt.check_number])
      }
      if (receipt.check_bank) {
        paymentDetailsData.push(['Bank / 開票銀行', receipt.check_bank])
      }
      if (receipt.receipt_account) {
        paymentDetailsData.push(['Payer Name / 付款人', receipt.receipt_account])
      }
      break

    case ReceiptType.LINK_PAY: // LinkPay
      if (receipt.payment_name) {
        paymentDetailsData.push(['Payment Name / 付款名稱', receipt.payment_name])
      }
      if (receipt.email) {
        paymentDetailsData.push(['Email', receipt.email])
      }
      if (receipt.pay_dateline) {
        paymentDetailsData.push(['Payment Deadline / 付款截止日', formatDate(receipt.pay_dateline)])
      }
      break
  }

  // 繪製收款方式詳細資訊表格
  if (paymentDetailsData.length > 0) {
    doc.setFontSize(11)
    doc.setFont('ChironHeiHK', 'bold')
    doc.text('Payment Method Details / 收款方式詳細資訊', infoLeft, yPos)
    yPos += 6

    autoTable(doc, {
      startY: yPos,
      body: paymentDetailsData,
      theme: 'grid',
      bodyStyles: {
        fontSize: 9,
        textColor: 60,
      },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold', fillColor: [240, 240, 240] },
        1: { cellWidth: 90 },
      },
      margin: { left: infoLeft, right: 20 },
      didDrawPage: data => {
        yPos = data.cursor!.y
      },
    })

    yPos += 8
  }

  // ========== 備註 ==========
  if (receipt.notes) {
    doc.setFontSize(11)
    doc.setFont('ChironHeiHK', 'bold')
    doc.text('Note / 備註', infoLeft, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setFont('ChironHeiHK', 'normal')
    const noteLines = doc.splitTextToSize(receipt.notes || '', 170)
    doc.text(noteLines, infoLeft, yPos)
    yPos += noteLines.length * 5
  }

  // ========== 頁尾 ==========
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('ChironHeiHK', 'normal')
    doc.setTextColor(150)
    doc.text(
      `Generated on ${formatDate(new Date().toISOString())} - Page ${i} of ${pageCount}`,
      105,
      287,
      { align: 'center' }
    )
  }

  // ========== 儲存 PDF ==========
  const filename = `Receipt_${receipt.receipt_number}_${formatDate(receipt.receipt_date)}.pdf`
  doc.save(filename)
}
