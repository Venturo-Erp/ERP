'use client'

import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Tour } from '@/stores/types'
import { Button } from '@/components/ui/button'
import { Copy, Download, Printer, QrCode, Calendar, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateMonthDayChinese } from '@/lib/utils/format-date'
import { COMP_TOURS_LABELS, CHECKIN_QR_CODE_LABELS } from '../../constants/labels'
import { useTourDisplay } from '@/features/tours/utils/tour-display'

interface CheckinQRCodeProps {
  tour: Tour
}

// Online 系統的 URL
const ONLINE_BASE_URL = process.env.NEXT_PUBLIC_ONLINE_URL || 'https://online.venturo.com.tw'

export function CheckinQRCode({ tour }: CheckinQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  const { displayString: tourDestinationDisplay } = useTourDisplay(tour)

  // 產生報到 URL
  const checkinUrl = `${ONLINE_BASE_URL}/checkin/${tour.code}`

  // 複製連結
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkinUrl)
      toast.success(COMP_TOURS_LABELS.連結已複製)
    } catch {
      toast.error(COMP_TOURS_LABELS.複製失敗)
    }
  }

  // 下載 QR Code
  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    // 建立 canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()

    img.onload = () => {
      canvas.width = 400
      canvas.height = 400
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 400, 400)

      const link = document.createElement('a')
      link.download = `${tour.code}-checkin-qrcode.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success(COMP_TOURS_LABELS.QR_Code_已下載)
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  // 列印 QR Code
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error(COMP_TOURS_LABELS.無法開啟列印視窗)
      return
    }

    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${CHECKIN_QR_CODE_LABELS.報到_QR_Code_標題(tour.code)}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 400px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 8px;
              color: var(--morandi-primary);
            }
            .info {
              font-size: 14px;
              color: var(--morandi-secondary);
              margin-bottom: 20px;
            }
            .qr-wrapper {
              padding: 20px;
              background: white;
              border: 2px solid #eee;
              border-radius: 12px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .url {
              font-size: 12px;
              color: #999;
              word-break: break-all;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: var(--morandi-secondary);
              text-align: left;
              padding: 16px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .instructions li {
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="title">${tour.name}</div>
            <div class="info">
              ${CHECKIN_QR_CODE_LABELS.團號} ${tour.code}<br/>
              ${CHECKIN_QR_CODE_LABELS.出發} ${formatDateMonthDayChinese(tour.departure_date)}
            </div>
            <div class="qr-wrapper">
              ${svgData}
            </div>
            <div class="url">${checkinUrl}</div>
            <div class="instructions">
              <strong>${CHECKIN_QR_CODE_LABELS.報到說明}</strong>
              <ol>
                <li>${CHECKIN_QR_CODE_LABELS.使用手機掃描上方_QR_Code}</li>
                <li>${CHECKIN_QR_CODE_LABELS.輸入您的姓名和身分證末4碼}</li>
                <li>${CHECKIN_QR_CODE_LABELS.確認資訊後點擊確認報到}</li>
              </ol>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium text-morandi-secondary mb-4 flex items-center gap-2">
        <QrCode size={16} />
        {CHECKIN_QR_CODE_LABELS.報到_QR_Code}
      </h3>

      <div className="flex flex-col md:flex-row gap-6">
        {/* QR Code */}
        <div className="flex-shrink-0">
          <div ref={qrRef} className="bg-card p-4 rounded-lg border border-border inline-block">
            <QRCodeSVG value={checkinUrl} size={160} level="M" includeMargin={false} />
          </div>
        </div>

        {/* 資訊 */}
        <div className="flex-1 space-y-4">
          {/* 團資訊 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-morandi-primary">
              <span className="font-mono font-medium">{tour.code}</span>
            </div>
            <div className="text-morandi-secondary">{tour.name}</div>
            <div className="flex items-center gap-4 text-sm text-morandi-secondary">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDateMonthDayChinese(tour.departure_date)}
              </span>
              {tourDestinationDisplay && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {tourDestinationDisplay}
                </span>
              )}
            </div>
          </div>

          {/* URL */}
          <div className="text-xs text-morandi-muted font-mono break-all bg-morandi-container/50 p-2 rounded">
            {checkinUrl}
          </div>

          {/* 按鈕 */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1">
              <Copy size={14} />
              {CHECKIN_QR_CODE_LABELS.複製連結}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
              <Download size={14} />
              {CHECKIN_QR_CODE_LABELS.下載}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
              <Printer size={14} />
              {CHECKIN_QR_CODE_LABELS.列印}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
