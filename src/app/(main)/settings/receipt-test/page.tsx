'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Printer } from 'lucide-react'

/**
 * 收據列印測試頁
 * 用來校正針式打印機的定位
 */
export default function ReceiptTestPage() {
  // 可調整的偏移量（微調用）
  const [offsetLeft, setOffsetLeft] = useState(0) // mm
  const [offsetTop, setOffsetTop] = useState(0) // mm
  
  // 測試資料
  const [testData, setTestData] = useState({
    buyer: '永弘旅行社',
    taxId: '12345678',
    year: '114',
    month: '03',
    day: '26',
    items: [
      { desc: '日本大阪住宿費用', qty: '1', price: '15000', amount: '15000', note: 'A001' },
    ],
    total: 15000,
    handler: '王小明',
  })

  const printRef = useRef<HTMLDivElement>(null)

  // 數字轉大寫
  const numToChinese = (num: number): Record<string, string> => {
    const digits = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖']
    const str = num.toString().padStart(8, '0') // 最多到千萬
    return {
      千萬: digits[parseInt(str[0])],
      百萬: digits[parseInt(str[1])],
      十萬: digits[parseInt(str[2])],
      萬: digits[parseInt(str[3])],
      千: digits[parseInt(str[4])],
      百: digits[parseInt(str[5])],
      十: digits[parseInt(str[6])],
      元: digits[parseInt(str[7])],
    }
  }

  const chineseAmount = numToChinese(testData.total)

  const handlePrint = () => {
    // 生成明細行 HTML
    const itemsHtml = testData.items.map((item, idx) => {
      const topPos = 48 + idx * 8
      return `
        <div style="position: absolute; top: ${topPos}mm; left: 15mm; width: 38mm; overflow: hidden;">${item.desc}</div>
        <div style="position: absolute; top: ${topPos}mm; left: 53mm; width: 27mm; text-align: center;">${item.qty}</div>
        <div style="position: absolute; top: ${topPos}mm; left: 80mm; width: 25mm; text-align: right;">${item.price}</div>
        <div style="position: absolute; top: ${topPos}mm; left: 105mm; width: 15mm; text-align: right;">${item.amount}</div>
        <div style="position: absolute; top: ${topPos}mm; left: 120mm; width: 75mm;">${item.note}</div>
      `
    }).join('')

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

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>收據列印</title>
        <style>
          @page { size: 214mm 140mm; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: "MS Gothic", "Noto Sans Mono CJK TC", monospace;
            font-size: 12px;
            font-weight: normal;
            background: white;
            width: 214mm;
            height: 140mm;
            position: relative;
          }
          div {
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <!-- 偏移容器 -->
        <div style="position: absolute; left: ${10 + offsetLeft}mm; top: ${offsetTop}mm;">
          <!-- 買受人 -->
          <div style="position: absolute; top: 20mm; left: 15mm;">${testData.buyer}</div>
          <!-- 統編 -->
          <div style="position: absolute; top: 25mm; left: 15mm;">${testData.taxId}</div>
          <!-- 年月日 -->
          <div style="position: absolute; top: 20mm; left: 100mm;">${testData.year}</div>
          <div style="position: absolute; top: 20mm; left: 115mm;">${testData.month}</div>
          <div style="position: absolute; top: 20mm; left: 130mm;">${testData.day}</div>
          <!-- 明細 -->
          ${itemsHtml}
          <!-- 大寫金額 -->
          <div style="position: absolute; top: 108mm; left: 23.5mm;">${chineseAmount.千萬}</div>
          <div style="position: absolute; top: 108mm; left: 40mm;">${chineseAmount.百萬}</div>
          <div style="position: absolute; top: 108mm; left: 55mm;">${chineseAmount.十萬}</div>
          <div style="position: absolute; top: 108mm; left: 68mm;">${chineseAmount.萬}</div>
          <div style="position: absolute; top: 108mm; left: 83mm;">${chineseAmount.千}</div>
          <div style="position: absolute; top: 108mm; left: 98mm;">${chineseAmount.百}</div>
          <div style="position: absolute; top: 108mm; left: 112mm;">${chineseAmount.十}</div>
          <div style="position: absolute; top: 108mm; left: 125mm;">${chineseAmount.元}</div>
          <!-- 經手人 -->
          <div style="position: absolute; top: 128mm; left: 170mm;">${testData.handler}</div>
        </div>
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
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">收據列印測試</h1>
      
      {/* 調整面板 */}
      <div className="bg-card p-4 rounded-lg mb-6 print:hidden">
        <h2 className="font-semibold mb-4">位置微調（mm）</h2>
        <div className="flex gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground">左偏移</label>
            <Input
              type="number"
              value={offsetLeft}
              onChange={e => setOffsetLeft(parseFloat(e.target.value) || 0)}
              className="w-24"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">上偏移</label>
            <Input
              type="number"
              value={offsetTop}
              onChange={e => setOffsetTop(parseFloat(e.target.value) || 0)}
              className="w-24"
            />
          </div>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer size={16} />
          列印測試
        </Button>
      </div>

      {/* 列印內容 - 只顯示填入的文字，不顯示框線 */}
      <div
        ref={printRef}
        className="print-area bg-white border border-dashed border-gray-300"
        style={{
          width: '214mm',
          height: '140mm',
          position: 'relative',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        {/* 偏移容器 */}
        <div
          style={{
            position: 'absolute',
            left: `${10 + offsetLeft}mm`, // 基準 1cm + 微調
            top: `${offsetTop}mm`,
            width: '100%',
            height: '100%',
          }}
        >
          {/* 買受人 - 上 2cm, 左 2.5cm（已含基準1cm，所以是 1.5cm） */}
          <div style={{ position: 'absolute', top: '20mm', left: '15mm' }}>
            {testData.buyer}
          </div>

          {/* 統編 - 上 2.5cm */}
          <div style={{ position: 'absolute', top: '25mm', left: '15mm' }}>
            {testData.taxId}
          </div>

          {/* 年月日 */}
          <div style={{ position: 'absolute', top: '20mm', left: '100mm' }}>
            {testData.year}
          </div>
          <div style={{ position: 'absolute', top: '20mm', left: '115mm' }}>
            {testData.month}
          </div>
          <div style={{ position: 'absolute', top: '20mm', left: '130mm' }}>
            {testData.day}
          </div>

          {/* 明細行 - 從 4.8cm 開始，每行約 0.8cm */}
          {testData.items.map((item, idx) => {
            const topPos = 48 + idx * 8 // mm
            return (
              <div key={idx}>
                {/* 摘要 2.5-6.3cm → 15-53mm (已扣基準) */}
                <div style={{ position: 'absolute', top: `${topPos}mm`, left: '15mm', width: '38mm', overflow: 'hidden' }}>
                  {item.desc}
                </div>
                {/* 數量 6.3-9cm → 53-80mm */}
                <div style={{ position: 'absolute', top: `${topPos}mm`, left: '53mm', width: '27mm', textAlign: 'center' }}>
                  {item.qty}
                </div>
                {/* 單價 9-11.5cm → 80-105mm */}
                <div style={{ position: 'absolute', top: `${topPos}mm`, left: '80mm', width: '25mm', textAlign: 'right' }}>
                  {item.price}
                </div>
                {/* 金額 11.5-13cm → 105-120mm */}
                <div style={{ position: 'absolute', top: `${topPos}mm`, left: '105mm', width: '15mm', textAlign: 'right' }}>
                  {item.amount}
                </div>
                {/* 備註 13-20.5cm → 120-195mm */}
                <div style={{ position: 'absolute', top: `${topPos}mm`, left: '120mm', width: '75mm' }}>
                  {item.note}
                </div>
              </div>
            )
          })}

          {/* 大寫金額 - 約在 11cm 處 */}
          <div style={{ position: 'absolute', top: '108mm', left: '23.5mm' }}>{chineseAmount.千萬}</div>
          <div style={{ position: 'absolute', top: '108mm', left: '40mm' }}>{chineseAmount.百萬}</div>
          <div style={{ position: 'absolute', top: '108mm', left: '55mm' }}>{chineseAmount.十萬}</div>
          <div style={{ position: 'absolute', top: '108mm', left: '68mm' }}>{chineseAmount.萬}</div>
          <div style={{ position: 'absolute', top: '108mm', left: '83mm' }}>{chineseAmount.千}</div>
          <div style={{ position: 'absolute', top: '108mm', left: '98mm' }}>{chineseAmount.百}</div>
          <div style={{ position: 'absolute', top: '108mm', left: '112mm' }}>{chineseAmount.十}</div>
          <div style={{ position: 'absolute', top: '108mm', left: '125mm' }}>{chineseAmount.元}</div>

          {/* 經手人 - 左 18cm, 下緣 1.2cm → 上 12.8cm */}
          <div style={{ position: 'absolute', top: '128mm', left: '170mm' }}>
            {testData.handler}
          </div>
        </div>

        {/* 校正標記（只在螢幕顯示） */}
        <div className="no-print absolute inset-0 pointer-events-none">
          {/* 左邊界線 */}
          <div style={{ position: 'absolute', left: '25mm', top: 0, bottom: 0, borderLeft: '1px dashed red' }} />
          {/* 上邊界線 - 買受人 */}
          <div style={{ position: 'absolute', top: '20mm', left: 0, right: 0, borderTop: '1px dashed blue' }} />
          {/* 明細開始線 */}
          <div style={{ position: 'absolute', top: '48mm', left: 0, right: 0, borderTop: '1px dashed green' }} />
        </div>
      </div>

      {/* 列印專用 CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: 214mm 140mm;
            margin: 0;
          }
          
          /* 隱藏不需要的元素 */
          body > *:not(.print-area) {
            display: none !important;
          }
          
          .print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 214mm !important;
            height: 140mm !important;
            background: white !important;
          }
          
          .print-area * {
            visibility: visible !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
