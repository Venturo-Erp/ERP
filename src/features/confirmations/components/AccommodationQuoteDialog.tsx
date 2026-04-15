'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, X, Printer } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { UnifiedTraditionalView } from './UnifiedTraditionalView'

interface AccommodationQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string } | null
  totalPax: number | null
  accommodations: Array<{
    checkIn: string
    roomType: string
    bedType?: string
    quantity: number
    note?: string
  }>
  supplierName: string
}

export function AccommodationQuoteDialog({
  open,
  onClose,
  tour,
  totalPax,
  accommodations,
  supplierName,
}: AccommodationQuoteDialogProps) {
  const [note, setNote] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [fax, setFax] = useState('')
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const printContentRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 載入 LINE 群組 + 供應商聯絡資訊（並行）
  useEffect(() => {
    if (!open) return
    setSelectedMethod(null)
    setLoadingData(true)

    const loadLineGroups = supabase
      .from('line_groups')
      .select('group_id, group_name')
      .not('group_name', 'is', null)
      .then(({ data }) => {
        if (data)
          setLineGroups(
            data.filter((g): g is { group_id: string; group_name: string } => !!g.group_name)
          )
      })

    const loadSupplier = supplierName
      ? supabase
          .from('suppliers')
          .select('contact_person, phone, fax')
          .eq('name', supplierName)
          .limit(1)
          .single()
          .then(({ data }) => {
            if (data) {
              setContact(data.contact_person || '')
              setPhone(data.phone || '')
              setFax(data.fax || '')
            }
          })
      : Promise.resolve()

    Promise.all([loadLineGroups, loadSupplier]).finally(() => setLoadingData(false))
  }, [open, supplierName, supabase])

  // LINE 發送
  const handleSendLine = async () => {
    if (!selectedGroupId || !tour) return
    setSending(true)
    try {
      const res = await fetch('/api/line/send-accommodation-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineGroupId: selectedGroupId,
          tourCode: tour.code || '',
          tourName: tour.name || '',
          departureDate: tour.departure_date || '',
          totalPax,
          tourId: tour.id,
          supplierName,
          accommodations,
          note,
        }),
      })
      const result = await res.json()
      if (result.success || res.ok) {
        const groupName = lineGroups.find(g => g.group_id === selectedGroupId)?.group_name
        toast({ title: `✅ 已發送到 LINE「${groupName}」` })
        onClose()
      } else {
        toast({ title: '❌ LINE 發送失敗', description: result.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: '❌ 發送失敗', description: String(err), variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  // 使用 iframe 列印（同 PrintableQuickQuote）
  const handlePrint = useCallback(() => {
    if (!printContentRef.current) return

    const originalTitle = document.title
    const printTitle = `${supplierName}-住宿需求單`
    document.title = printTitle

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

    // 複製所有 stylesheets
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n')
        } catch {
          return ''
        }
      })
      .join('\n')

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${printTitle}</title>
        <style>
          ${styles}
        </style>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            font-size: 13px;
            line-height: 1.5;
            color: #333;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* 主容器 */
          .bg-card {
            background: white;
            min-height: calc(297mm - 30mm);
            display: flex;
            flex-direction: column;
          }

          /* 標題區 */
          .flex.justify-between {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #a8a29e;
          }

          h2 {
            font-size: 22px;
            font-weight: bold;
            color: #5d5348;
          }

          .text-right {
            text-align: right;
          }

          .font-semibold {
            font-weight: 600;
          }

          .text-xs {
            font-size: 11px;
          }

          .text-sm {
            font-size: 13px;
          }

          /* 資訊區 */
          .info-grid {
            border: 2px solid #a8a29e;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            background: linear-gradient(to bottom right, #faf8f5, #f5f1ea);
          }

          .info-grid > div {
            display: grid;
            grid-template-columns: 80px 1fr 80px 1fr;
            gap: 12px 16px;
            align-items: center;
          }

          .info-grid span {
            font-weight: 600;
            color: #78716c;
          }

          .info-grid input {
            padding: 4px 8px;
            border: 1px solid #a8a29e;
            border-radius: 4px;
            background: white;
            font-size: 13px;
          }

          .info-grid input[readonly] {
            background: #f3f4f6;
          }

          /* 表格標題 */
          h3 {
            font-size: 16px;
            font-weight: 600;
            color: #78716c;
            margin-bottom: 12px;
          }

          /* 表格 */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 13px;
          }

          th {
            background: linear-gradient(to right, #d4c5b9, #c9b8a8);
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: #5d5348;
            border: 1px solid #a8a29e;
          }

          td {
            padding: 8px 12px;
            border: 1px solid #a8a29e;
          }

          tr:nth-child(even) {
            background-color: #fafaf8;
          }

          /* 備註區 */
          .mt-6 {
            margin-top: 20px;
          }

          label {
            display: block;
            font-weight: 600;
            color: #78716c;
            margin-bottom: 8px;
          }

          textarea {
            width: 100%;
            min-height: 60px;
            padding: 8px;
            border: 1px solid #a8a29e;
            border-radius: 4px;
            resize: none;
          }

          /* 頁尾 */
          .flex-1 {
            flex: 1;
          }

          .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            border-top: 1px solid #a8a29e;
            padding-top: 16px;
            margin-top: auto;
          }

          .footer-grid > div {
            font-size: 13px;
          }

          .footer-grid .font-medium {
            font-weight: 500;
            color: #78716c;
          }

          .border-b {
            border-bottom: 1px solid #a8a29e;
            height: 32px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        ${printContentRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
        document.title = originalTitle
      }, 1000)
    }, 100)
  }, [supplierName])

  const handleDelivery = (method: string) => {
    if (method === 'print' || method === 'fax') {
      handlePrint()
    } else if (method === 'line') {
      setSelectedMethod('line')
    } else {
      toast({ title: `${method} 功能開發中`, description: '目前支援列印和 LINE' })
    }
  }

  if (!open || !isMounted) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg max-w-[900px] w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 頂部按鈕 */}
        <div className="flex justify-between items-center gap-2 p-4 border-b bg-morandi-container/30">
          <h2 className="text-lg font-semibold text-morandi-primary">住宿需求單預覽</h2>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" size="sm" className="gap-1">
              <X className="h-4 w-4" />
              關閉
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-1 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Printer className="h-4 w-4" />
              列印
            </Button>
          </div>
        </div>

        {/* A4 預覽區 */}
        <div className="flex-1 overflow-y-auto p-6 bg-morandi-container/50">
          {loadingData ? (
            <div
              className="bg-card mx-auto shadow-lg p-8 space-y-6"
              style={{ width: '210mm', minHeight: '297mm' }}
            >
              <Skeleton className="h-8 w-[200px] mx-auto" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div
              ref={printContentRef}
              className="bg-card mx-auto shadow-lg"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '1.5cm',
              }}
            >
              <UnifiedTraditionalView
                requestType="accommodation"
                tour={tour}
                totalPax={totalPax}
                supplierName={supplierName}
                contact={contact}
                phone={phone}
                fax={fax}
                items={accommodations}
                note={note}
                setNote={setNote}
                onInfoChange={(field, value) => {
                  if (field === 'contact') setContact(value)
                  else if (field === 'phone') setPhone(value)
                  else if (field === 'fax') setFax(value)
                }}
              />
            </div>
          )}
        </div>

        {/* 底部發送按鈕 */}
        <div className="flex-shrink-0 border-t border-border p-4 bg-card space-y-3">
          {/* LINE 群組選擇 */}
          {selectedMethod === 'line' && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">選擇 LINE 群組：</span>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="請選擇群組" />
                </SelectTrigger>
                <SelectContent>
                  {lineGroups.map(g => (
                    <SelectItem key={g.group_id} value={g.group_id}>
                      {g.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSendLine}
                disabled={!selectedGroupId || sending}
                className="bg-brand-line hover:bg-brand-line-hover text-white"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    發送中...
                  </>
                ) : (
                  '發送'
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedMethod(null)}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
            </div>
          )}

          {/* 發送方式按鈕 */}
          {!selectedMethod && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDelivery('line')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
              >
                LINE
              </button>
              <button
                onClick={() => handleDelivery('email')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
              >
                Email
              </button>
              <button
                onClick={() => handleDelivery('fax')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
              >
                傳真
              </button>
              <button
                onClick={() => handleDelivery('tenant')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-morandi-container"
              >
                租戶
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
