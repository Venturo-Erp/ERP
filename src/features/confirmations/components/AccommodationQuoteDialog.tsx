'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const printContentRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 載入 LINE 群組
  useEffect(() => {
    if (!open) return
    const load = async () => {
      const { data } = await supabase
        .from('line_groups')
        .select('group_id, group_name')
        .not('group_name', 'is', null)
      if (data)
        setLineGroups(
          data.filter((g): g is { group_id: string; group_name: string } => !!g.group_name)
        )
    }
    load()
  }, [open, supabase])

  // 重置 method
  useEffect(() => {
    if (open) setSelectedMethod(null)
  }, [open])

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

  // 列印
  const handlePrint = () => {
    if (!printContentRef.current) return
    
    const printTitle = `${supplierName}-住宿需求單`
    const originalTitle = document.title
    document.title = printTitle

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${printTitle}</title>
        <style>
          @page { size: A4; margin: 1.5cm; }
          body { 
            margin: 0; 
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            color: #333;
          }
          * { box-sizing: border-box; }
          
          /* 容器撐滿頁面 */
          .print-container {
            min-height: calc(297mm - 3cm);
            display: flex;
            flex-direction: column;
          }
          
          /* 標題區 */
          h2 { font-size: 20px; margin: 0 0 16px 0; }
          
          /* 資訊區 */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            border: 1px solid #a8a29e;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .info-row { display: flex; align-items: center; gap: 8px; }
          .info-label { font-weight: 500; color: #78716c; min-width: 70px; }
          .info-value { flex: 1; }
          input { border: none; background: transparent; width: 100%; }
          
          /* 表格 */
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #a8a29e; padding: 8px 12px; text-align: left; }
          th { background-color: #d4c5b9; font-weight: 600; }
          tr:nth-child(even) { background-color: #fafaf8; }
          
          /* 備註 */
          textarea { 
            width: 100%; 
            min-height: 60px; 
            border: 1px solid #a8a29e; 
            border-radius: 4px; 
            padding: 8px;
            resize: none;
          }
          
          /* 頁尾固定在底部 */
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            border-top: 1px solid #a8a29e;
            padding-top: 16px;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
          }
          
          /* 容器相對定位 */
          .print-container {
            position: relative;
            min-height: calc(297mm - 3cm);
            padding-bottom: 80px;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${printContentRef.current.innerHTML}
        </div>
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
  }

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
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div
            ref={printContentRef}
            className="bg-white mx-auto shadow-lg"
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
              items={accommodations}
              note={note}
              setNote={setNote}
            />
          </div>
        </div>

        {/* 底部發送按鈕 */}
        <div className="flex-shrink-0 border-t p-4 bg-white space-y-3">
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
                className="bg-[#06c755] hover:bg-[#05b34c] text-white"
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
