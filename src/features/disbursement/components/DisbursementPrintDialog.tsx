'use client'
/**
 * DisbursementPrintDialog
 * 出納單列印預覽對話框
 *
 * 功能：
 * - 顯示出納單即時預覽
 * - 提供列印和下載 PDF 功能
 * - 使用 iframe 列印確保穩定
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, Loader2 } from 'lucide-react'
import type { DisbursementOrder, PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { supabase } from '@/lib/supabase/client'
import { PrintDisbursementPreview } from './PrintDisbursementPreview'
import { generateDisbursementPDF } from '@/lib/pdf/disbursement-pdf'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { DISBURSEMENT_LABELS } from '../constants/labels'
import { updateDisbursementOrder } from '@/data'

interface DisbursementPrintDialogProps {
  order: DisbursementOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisbursementPrintDialog({
  order,
  open,
  onOpenChange,
}: DisbursementPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [paymentRequestItems, setPaymentRequestItems] = useState<PaymentRequestItem[]>([])

  // 直接從 Supabase 取得關聯的請款單和項目
  useEffect(() => {
    if (!open || !order?.payment_request_ids?.length) {
      setPaymentRequests([])
      setPaymentRequestItems([])
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const requestIds = order.payment_request_ids || []
        if (requestIds.length === 0) {
          setPaymentRequests([])
          setPaymentRequestItems([])
          return
        }

        // 取得請款單
        const { data: requests } = await supabase
          .from('payment_requests')
          .select('id, code, request_number, request_type, amount, total_amount, status, tour_id, tour_code, supplier_name, expense_type, notes, workspace_id, created_at')
          .in('id', requestIds)
          .limit(500)

        // 取得請款項目
        const { data: items } = await supabase
          .from('payment_request_items')
          .select('id, request_id, description, quantity, unitprice, subtotal, category, tour_id, supplier_name, sort_order, item_number, notes, workspace_id')
          .in('request_id', requestIds)
          .limit(500)

        setPaymentRequests((requests || []) as unknown as PaymentRequest[])
        setPaymentRequestItems((items || []) as unknown as PaymentRequestItem[])
      } catch (error) {
        logger.error(DISBURSEMENT_LABELS.載入資料失敗, error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [open, order])

  // 使用 iframe 列印（最可靠的方式）
  const handlePrint = useCallback(() => {
    if (!printRef.current) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      return
    }

    // 寫入列印內容（橫向 A4）
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${DISBURSEMENT_LABELS.DISBURSEMENT_TITLE} - ${order?.order_number}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #4B5563;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          /* 不設定全局 border，讓 inline style 控制 */
          th, td {
            vertical-align: middle;
          }

          .tour-name {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 100)
  }, [order?.order_number])

  // 下載 PDF 並上傳到 Storage
  const handleDownloadPDF = useCallback(async () => {
    if (!order) return

    try {
      const blob = await generateDisbursementPDF({
        order,
        paymentRequests,
        paymentRequestItems,
      })

      // 上傳到 Supabase Storage
      const filename = `disbursement/${order.order_number || order.id}.pdf`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filename, blob, { contentType: 'application/pdf', upsert: true })

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename)
        if (urlData?.publicUrl) {
          await updateDisbursementOrder(order.id, { pdf_url: urlData.publicUrl })
        }
      } else if (uploadError) {
        logger.error('Upload disbursement PDF failed:', uploadError)
      }
    } catch (error) {
      logger.error(DISBURSEMENT_LABELS.下載_PDF_失敗_2, error)
      void alert(DISBURSEMENT_LABELS.下載_PDF_失敗, 'error')
    }
  }, [order, paymentRequests, paymentRequestItems])

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        level={1}
        className="w-[95vw] max-w-[1200px] h-[90vh] overflow-hidden flex flex-col p-0"
      >
        {/* 標題列 */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-morandi-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {DISBURSEMENT_LABELS.PRINT_PREVIEW} - {order.order_number}
            </DialogTitle>
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer size={16} />
                {DISBURSEMENT_LABELS.PRINT}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
                <Download size={16} />
                {DISBURSEMENT_LABELS.LABEL_3604}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 預覽區域 - A4 比例容器 */}
        <div className="flex-1 overflow-auto bg-morandi-container p-4 flex items-start justify-center">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-morandi-secondary" />
              <span className="ml-2 text-morandi-secondary">
                {DISBURSEMENT_LABELS.LOADING_2648}
              </span>
            </div>
          ) : (
            <div
              className="shadow-lg bg-white"
              style={{
                width: '210mm',
                minHeight: '297mm',
                maxWidth: '100%',
              }}
            >
              <PrintDisbursementPreview
                ref={printRef}
                order={order}
                paymentRequests={paymentRequests}
                paymentRequestItems={paymentRequestItems}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DisbursementPrintDialog
