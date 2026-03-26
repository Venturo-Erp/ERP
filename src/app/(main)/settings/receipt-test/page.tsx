'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Printer } from 'lucide-react'

interface ReceiptItem {
  id: string
  desc: string
  qty: number
  price: number
  note: string
}

/**
 * 收據列印測試頁
 * 用來校正針式打印機的定位
 */
export default function ReceiptTestPage() {
  // 可調整的偏移量（微調用）
  const [offsetLeft, setOffsetLeft] = useState(0) // mm
  const [offsetTop, setOffsetTop] = useState(0) // mm
  
  // 基本資料
  const [buyer, setBuyer] = useState('永弘旅行社')
  const [taxId, setTaxId] = useState('12345678')
  const [year, setYear] = useState('114')
  const [month, setMonth] = useState('03')
  const [day, setDay] = useState('26')
  const [handler, setHandler] = useState('王小明')
  
  // 明細（固定 7 行）
  const [items, setItems] = useState<ReceiptItem[]>([
    { id: '1', desc: '', qty: 0, price: 0, note: '' },
    { id: '2', desc: '', qty: 0, price: 0, note: '' },
    { id: '3', desc: '', qty: 0, price: 0, note: '' },
    { id: '4', desc: '', qty: 0, price: 0, note: '' },
    { id: '5', desc: '', qty: 0, price: 0, note: '' },
    { id: '6', desc: '', qty: 0, price: 0, note: '' },
    { id: '7', desc: '', qty: 0, price: 0, note: '' },
  ])

  // 顯示用：0 顯示為空
  const displayValue = (val: number) => val === 0 ? '' : val

  // 計算金額和總計
  const itemsWithAmount = useMemo(() => 
    items.map(item => ({
      ...item,
      amount: item.qty * item.price
    }))
  , [items])

  const total = useMemo(() => 
    itemsWithAmount.reduce((sum, item) => sum + item.amount, 0)
  , [itemsWithAmount])

  // 數字轉大寫
  const numToChinese = (num: number): Record<string, string> => {
    const digits = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖']
    const str = num.toString().padStart(8, '0')
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

  const chineseAmount = numToChinese(total)

  // 更新明細
  const updateItem = (id: string, field: keyof ReceiptItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // 生成列印 HTML（共用於預覽和列印）
  const generatePrintHtml = () => {
    const itemsHtml = itemsWithAmount.map((item, idx) => {
      const topPos = 48 + idx * 8
      return `
        <div style="position: absolute; top: ${topPos}mm; left: 15mm; width: 38mm; overflow: hidden;">${item.desc}</div>
        <div style="position: absolute; top: ${topPos}mm; left: 53mm; width: 12mm; text-align: left;">${item.qty || ''}</div>
        <div style="position: absolute; top: ${topPos}mm; left: 65mm; width: 25mm; text-align: left;">${item.price || ''}</div>
        <div style="position: absolute; top: ${topPos}mm; left: 90mm; width: 20mm; text-align: left;">${item.amount || ''}</div>
        <div style="position: absolute; top: ${topPos}mm; left: 110mm; width: 85mm;">${item.note}</div>
      `
    }).join('')

    const totalTopPos = 104

    return `
      <div style="position: absolute; left: ${10 + offsetLeft}mm; top: ${offsetTop}mm;">
        <!-- 買受人 -->
        <div style="position: absolute; top: 17mm; left: 15mm; letter-spacing: 2px;">${buyer}</div>
        <!-- 統編 -->
        <div style="position: absolute; top: 22mm; left: 15mm; letter-spacing: 3px;">${taxId}</div>
        <!-- 年月日 -->
        <div style="position: absolute; top: 17mm; left: 100mm;">${year}</div>
        <div style="position: absolute; top: 17mm; left: 115mm;">${month}</div>
        <div style="position: absolute; top: 17mm; left: 130mm;">${day}</div>
        <!-- 明細 -->
        ${itemsHtml}
        <!-- 總計 -->
        <div style="position: absolute; top: ${totalTopPos}mm; left: 90mm; width: 20mm; text-align: left;">${total || ''}</div>
        <!-- 大寫金額 -->
        <div style="position: absolute; top: 116mm; left: 23.5mm;">${chineseAmount.千萬}</div>
        <div style="position: absolute; top: 116mm; left: 40mm;">${chineseAmount.百萬}</div>
        <div style="position: absolute; top: 116mm; left: 55mm;">${chineseAmount.十萬}</div>
        <div style="position: absolute; top: 116mm; left: 68mm;">${chineseAmount.萬}</div>
        <div style="position: absolute; top: 116mm; left: 83mm;">${chineseAmount.千}</div>
        <div style="position: absolute; top: 116mm; left: 98mm;">${chineseAmount.百}</div>
        <div style="position: absolute; top: 116mm; left: 112mm;">${chineseAmount.十}</div>
        <div style="position: absolute; top: 116mm; left: 125mm;">${chineseAmount.元}</div>
        <!-- 經手人 -->
        <div style="position: absolute; top: 128mm; left: 170mm;">${handler}</div>
      </div>
    `
  }

  const handlePrint = () => {
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
            font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
            font-size: 14px;
            font-weight: 300;
            background: white;
            width: 214mm;
            height: 140mm;
            position: relative;
            transform: rotate(180deg);
            transform-origin: center center;
          }
          div {
            white-space: nowrap !important;
          }
        </style>
      </head>
      <body>
        ${generatePrintHtml()}
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
    <div className="p-6 grid grid-cols-2 gap-6">
      {/* 左邊：輸入區 */}
      <div>
        <h1 className="text-2xl font-bold mb-6">收據列印測試</h1>
        
        {/* 基本資料 */}
        <div className="bg-card p-4 rounded-lg mb-4">
          <h2 className="font-semibold mb-4">基本資料</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">買受人</label>
              <Input value={buyer} onChange={e => setBuyer(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">統編</label>
              <Input value={taxId} onChange={e => setTaxId(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">日期（民國）</label>
              <div className="flex gap-1">
                <Input value={year} onChange={e => setYear(e.target.value)} className="w-16" placeholder="年" />
                <Input value={month} onChange={e => setMonth(e.target.value)} className="w-12" placeholder="月" />
                <Input value={day} onChange={e => setDay(e.target.value)} className="w-12" placeholder="日" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">經手人</label>
              <Input value={handler} onChange={e => setHandler(e.target.value)} />
            </div>
          </div>
        </div>

        {/* 明細 */}
        <div className="bg-card p-4 rounded-lg mb-4">
          <h2 className="font-semibold mb-4">明細（固定 7 行）</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">摘要</th>
                <th className="text-center py-2 w-20">數量</th>
                <th className="text-right py-2 w-24">單價</th>
                <th className="text-right py-2 w-24">金額</th>
                <th className="text-left py-2">備註</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">
                    <Input 
                      value={item.desc} 
                      onChange={e => updateItem(item.id, 'desc', e.target.value)}
                      className="h-8"
                    />
                  </td>
                  <td className="py-2">
                    <Input 
                      type="number"
                      value={displayValue(item.qty)} 
                      onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                      className="h-8 text-center"
                      placeholder=""
                    />
                  </td>
                  <td className="py-2">
                    <Input 
                      type="number"
                      value={displayValue(item.price)} 
                      onChange={e => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                      className="h-8 text-right"
                      placeholder=""
                    />
                  </td>
                  <td className="py-2 text-right font-medium">
                    {item.qty * item.price > 0 ? (item.qty * item.price).toLocaleString() : ''}
                  </td>
                  <td className="py-2">
                    <Input 
                      value={item.note} 
                      onChange={e => updateItem(item.id, 'note', e.target.value)}
                      className="h-8"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={3} className="py-2 text-right">總計：</td>
                <td className="py-2 text-right">{total > 0 ? total.toLocaleString() : ''}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* 調整面板 */}
        <div className="bg-card p-4 rounded-lg mb-6">
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

        {/* 大寫金額預覽 */}
        <div className="bg-muted p-4 rounded-lg">
          <h2 className="font-semibold mb-2">大寫金額預覽</h2>
          <div className="flex gap-4 text-lg">
            <span>{chineseAmount.千萬}</span>
            <span>{chineseAmount.百萬}</span>
            <span>{chineseAmount.十萬}</span>
            <span>{chineseAmount.萬}</span>
            <span>{chineseAmount.千}</span>
            <span>{chineseAmount.百}</span>
            <span>{chineseAmount.十}</span>
            <span>{chineseAmount.元}</span>
          </div>
        </div>
      </div>

      {/* 右邊：預覽區 */}
      <div>
        <h2 className="font-semibold mb-4">列印預覽</h2>
        <div 
          className="bg-white border-2 border-dashed border-gray-300 overflow-hidden"
          style={{
            width: '214mm',
            height: '140mm',
            transform: 'scale(0.7) rotate(180deg)',
            transformOrigin: 'top left',
            position: 'relative',
            fontFamily: '"PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif',
            fontSize: '14px',
            fontWeight: 300,
            whiteSpace: 'nowrap',
            marginLeft: '150mm',
            marginTop: '98mm',
          }}
        >
          <div 
            style={{ position: 'absolute', left: `${10 + offsetLeft}mm`, top: `${offsetTop}mm` }}
          >
            {/* 買受人 */}
            <div style={{ position: 'absolute', top: '17mm', left: '15mm', whiteSpace: 'nowrap', letterSpacing: '2px' }}>{buyer}</div>
            {/* 統編 */}
            <div style={{ position: 'absolute', top: '22mm', left: '15mm', whiteSpace: 'nowrap', letterSpacing: '3px' }}>{taxId}</div>
            {/* 年月日 */}
            <div style={{ position: 'absolute', top: '17mm', left: '100mm' }}>{year}</div>
            <div style={{ position: 'absolute', top: '17mm', left: '115mm' }}>{month}</div>
            <div style={{ position: 'absolute', top: '17mm', left: '130mm' }}>{day}</div>
            {/* 明細 */}
            {itemsWithAmount.map((item, idx) => {
              const topPos = 48 + idx * 8
              return (
                <div key={item.id}>
                  <div style={{ position: 'absolute', top: `${topPos}mm`, left: '15mm', width: '38mm', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.desc}</div>
                  <div style={{ position: 'absolute', top: `${topPos}mm`, left: '53mm', width: '12mm', textAlign: 'left' }}>{item.qty || ''}</div>
                  <div style={{ position: 'absolute', top: `${topPos}mm`, left: '65mm', width: '25mm', textAlign: 'left' }}>{item.price || ''}</div>
                  <div style={{ position: 'absolute', top: `${topPos}mm`, left: '90mm', width: '20mm', textAlign: 'left' }}>{item.amount || ''}</div>
                  <div style={{ position: 'absolute', top: `${topPos}mm`, left: '110mm', width: '85mm', whiteSpace: 'nowrap' }}>{item.note}</div>
                </div>
              )
            })}
            {/* 總計 */}
            <div style={{ position: 'absolute', top: '104mm', left: '90mm', width: '20mm', textAlign: 'left' }}>{total || ''}</div>
            {/* 大寫金額 */}
            <div style={{ position: 'absolute', top: '116mm', left: '23.5mm' }}>{chineseAmount.千萬}</div>
            <div style={{ position: 'absolute', top: '116mm', left: '40mm' }}>{chineseAmount.百萬}</div>
            <div style={{ position: 'absolute', top: '116mm', left: '55mm' }}>{chineseAmount.十萬}</div>
            <div style={{ position: 'absolute', top: '116mm', left: '68mm' }}>{chineseAmount.萬}</div>
            <div style={{ position: 'absolute', top: '116mm', left: '83mm' }}>{chineseAmount.千}</div>
            <div style={{ position: 'absolute', top: '116mm', left: '98mm' }}>{chineseAmount.百}</div>
            <div style={{ position: 'absolute', top: '116mm', left: '112mm' }}>{chineseAmount.十}</div>
            <div style={{ position: 'absolute', top: '116mm', left: '125mm' }}>{chineseAmount.元}</div>
            {/* 經手人 */}
            <div style={{ position: 'absolute', top: '128mm', left: '170mm', whiteSpace: 'nowrap' }}>{handler}</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">* 預覽為 70% 縮放</p>
      </div>
    </div>
  )
}
