/**
 * TransportQuoteDialog - 遊覽車報價請求（基於 LocalQuoteDialog 修改）
 */

'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Printer, Mail, Phone, Fax, Users } from 'lucide-react'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

interface TransportQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: {
    id: string
    code: string
    name: string
    departure_date: string | null
    return_date: string | null
    current_participants: number | null
  }
  coreItems: TourItineraryItem[]
  supplierName: string
  vehicleDesc?: string
}

export function TransportQuoteDialog({
  open,
  onClose,
  tour,
  coreItems,
  supplierName,
  vehicleDesc = '',
}: TransportQuoteDialogProps) {
  const [note, setNote] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  // 按天分組核心表項目
  const daySchedule = useMemo(() => {
    const grouped = new Map<number, {
      date: string | null
      weekday: string | null
      items: TourItineraryItem[]
      hotel: TourItineraryItem | null
    }>()

    for (const item of coreItems) {
      const day = item.day_number ?? 0
      if (!grouped.has(day)) {
        grouped.set(day, {
          date: null,
          weekday: null,
          items: [],
          hotel: null,
        })
      }
      const group = grouped.get(day)!

      // 設定日期和星期
      if (!group.date && item.service_date) {
        group.date = item.service_date
        const d = new Date(item.service_date)
        const weekdays = ['日', '一', '二', '三', '四', '五', '六']
        group.weekday = weekdays[d.getDay()]
      }

      // 住宿單獨儲存
      if (item.category === 'accommodation') {
        group.hotel = item
      } else {
        group.items.push(item)
      }
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dayNumber, data]) => ({ dayNumber, ...data }))
  }, [coreItems])

  const handleSend = () => {
    if (!selectedMethod) {
      alert('請選擇發送方式')
      return
    }

    if (selectedMethod === '列印') {
      handlePrint()
      onClose()
    } else {
      // TODO: LINE/Email/傳真/租戶
      alert(`${selectedMethod} 功能開發中...`)
    }
  }

  const handlePrint = () => {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>遊覽車報價請求 - ${tour.code}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { margin: 0; } }
  body { font-family: 'Microsoft JhengHei', sans-serif; font-size: 11pt; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 20pt; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .info-box { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
  .info-row { display: flex; margin-bottom: 5px; }
  .info-label { font-weight: bold; min-width: 100px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #333; padding: 8px; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .quote-section { background: #fffbf0; border: 2px solid #f59e0b; padding: 20px; margin-top: 30px; border-radius: 8px; }
  .quote-section h3 { margin-top: 0; color: #f59e0b; border-bottom: 1px solid #f59e0b; padding-bottom: 10px; }
  .quote-field { margin-bottom: 15px; }
  .quote-field label { display: block; font-weight: bold; margin-bottom: 5px; }
  .quote-field input[type="text"], .quote-field input[type="number"] { border: none; border-bottom: 1px solid #333; width: 200px; padding: 5px 0; font-size: 11pt; }
  .quote-field input[type="checkbox"] { width: 18px; height: 18px; margin-right: 8px; vertical-align: middle; }
  .conditional-field { margin-left: 30px; margin-top: 8px; }
</style></head><body>
  <h1>遊覽車報價請求</h1>
  <div class="info-box">
    <div class="info-row"><span class="info-label">團號：</span><span>${tour.code}</span></div>
    <div class="info-row"><span class="info-label">團名：</span><span>${tour.name}</span></div>
    <div class="info-row"><span class="info-label">出發：</span><span>${tour.departure_date || '-'}</span></div>
    <div class="info-row"><span class="info-label">人數：</span><span>${tour.current_participants || '-'} 人</span></div>
    <div class="info-row"><span class="info-label">車型：</span><span>${vehicleDesc || '-'}</span></div>
    <div class="info-row"><span class="info-label">車行：</span><span>${supplierName}</span></div>
  </div>
  <table>
    <thead><tr><th>日期</th><th>行程內容</th><th>早餐</th><th>午餐</th><th>晚餐</th><th>住宿</th></tr></thead>
    <tbody>
      ${daySchedule.map(day => {
        const meals = { breakfast: '', lunch: '', dinner: '' }
        day.items.filter(i => i.category === 'meals').forEach(m => {
          const sub = m.sub_category as keyof typeof meals
          if (sub && meals[sub] !== undefined) meals[sub] = m.title || '-'
        })
        const activities = day.items.filter(i => i.category === 'activities').map(a => a.title).join(' → ')
        const content = activities || day.items.map(i => i.title).filter(Boolean).join('、')
        return `<tr>
          <td style="white-space:nowrap">Day ${day.dayNumber}<br/>${day.date || ''} (${day.weekday || ''})</td>
          <td>${content || '-'}</td>
          <td style="text-align:center">${meals.breakfast || '-'}</td>
          <td style="text-align:center">${meals.lunch || '-'}</td>
          <td style="text-align:center">${meals.dinner || '-'}</td>
          <td>${day.hotel?.title || '-'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
  ${note ? `<p><strong>備註：</strong>${note}</p>` : ''}
  
  <div class="quote-section">
    <h3>📋 請填寫報價</h3>
    
    <div class="quote-field">
      <label>車資（總金額）：</label>
      <input type="number" placeholder="請填寫金額" /> 元
    </div>
    
    <div class="quote-field">
      <input type="checkbox" id="parking" />
      <label for="parking" style="display: inline;">是否含停車費</label>
    </div>
    
    <div class="quote-field">
      <input type="checkbox" id="toll" />
      <label for="toll" style="display: inline;">是否含過路費</label>
    </div>
    
    <div class="quote-field">
      <input type="checkbox" id="accommodation" />
      <label for="accommodation" style="display: inline;">是否含司機住宿</label>
      <div class="conditional-field">
        如不含，請填寫住宿費：<input type="number" placeholder="金額" style="width:150px" /> 元
      </div>
    </div>
    
    <div class="quote-field">
      <input type="checkbox" id="tip" />
      <label for="tip" style="display: inline;">是否含小費</label>
      <div class="conditional-field">
        如不含，請填寫小費：<input type="number" placeholder="金額" style="width:150px" /> 元
      </div>
    </div>
    
    <div class="quote-field">
      <label>聯絡人：</label>
      <input type="text" placeholder="姓名" />
    </div>
    
    <div class="quote-field">
      <label>聯絡電話：</label>
      <input type="text" placeholder="電話號碼" />
    </div>
  </div>
  
  <p style="margin-top:30px;font-size:10pt;color:#666;">列印時間：${new Date().toLocaleString('zh-TW')}</p>
  <p style="font-size:9pt;color:#999;">請填寫完畢後回傳至角落旅行社</p>
</body></html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>給車行報價 — {supplierName}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* 團資訊 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-4 text-sm">
          <span><strong>團號：</strong>{tour.code}</span>
          <span><strong>團名：</strong>{tour.name}</span>
          <span><strong>出發：</strong>{tour.departure_date || '-'}</span>
          <span><strong>人數：</strong>{tour.current_participants || '-'}</span>
        </div>

        {/* 行程表 */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-amber-100 border-b">
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">日期</th>
                <th className="text-left px-3 py-2 font-semibold">行程內容</th>
                <th className="text-center px-3 py-2 font-semibold whitespace-nowrap">早餐</th>
                <th className="text-center px-3 py-2 font-semibold whitespace-nowrap">午餐</th>
                <th className="text-center px-3 py-2 font-semibold whitespace-nowrap">晚餐</th>
                <th className="text-center px-3 py-2 font-semibold whitespace-nowrap">住宿</th>
              </tr>
            </thead>
            <tbody>
              {daySchedule.map((day, idx) => {
                const meals = { breakfast: '', lunch: '', dinner: '' }
                day.items.filter(i => i.category === 'meals').forEach(m => {
                  const sub = m.sub_category as keyof typeof meals
                  if (sub && meals[sub] !== undefined) {
                    meals[sub] = m.title || MEAL_LABELS[sub] || '-'
                  }
                })

                const activities = day.items.filter(i => i.category === 'activities')
                const content = activities.length > 0
                  ? activities.map(a => a.title).filter(Boolean).join(' → ')
                  : day.items.map(i => i.title).filter(Boolean).join('、')

                return (
                  <tr key={idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-3 py-2 whitespace-nowrap align-top">
                      <div className="font-medium">Day {day.dayNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {day.date} ({day.weekday})
                      </div>
                    </td>
                    <td className="px-3 py-2">{content || '-'}</td>
                    <td className="px-3 py-2 text-center">{meals.breakfast || '-'}</td>
                    <td className="px-3 py-2 text-center">{meals.lunch || '-'}</td>
                    <td className="px-3 py-2 text-center">{meals.dinner || '-'}</td>
                    <td className="px-3 py-2">{day.hotel?.title || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 備註 */}
        <div>
          <Label htmlFor="note">備註</Label>
          <Textarea
            id="note"
            placeholder="給車行的特殊需求、備註..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-2"
            rows={3}
          />
        </div>

        {/* 選擇發送方式 */}
        <div>
          <Label>選擇發送方式</Label>
          <div className="flex gap-2 mt-2">
            {[
              { id: '列印', icon: Printer, label: '列印' },
              { id: 'Line', icon: Phone, label: 'Line' },
              { id: 'Email', icon: Mail, label: 'Email' },
              { id: '傳真', icon: Fax, label: '傳真' },
              { id: '租戶', icon: Users, label: '租戶' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setSelectedMethod(id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  selectedMethod === id
                    ? 'border-amber-600 bg-amber-50 text-amber-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 取消 / 發送 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedMethod}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            發送
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
