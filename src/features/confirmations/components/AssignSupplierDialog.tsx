'use client'

import { useState, useEffect, useCallback } from 'react'
import { Printer, Search, Building2, Loader2, Mail, MessageCircle, Globe, Phone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/stores/types'
import type { QuoteItem } from './requirements-list.types'

interface SelectedItem {
  category: string
  item: QuoteItem
}

export interface AssignSupplierDialogProps {
  open: boolean
  onClose: () => void
  tour: Tour | null
  tourId: string
  items: SelectedItem[]
  totalPax: number | null
  ageBreakdown: string
  formatDate: (d: string | null | undefined) => string
  onSave?: () => void
  existingRequests?: { items?: { rooms?: { room_type: string; quantity: number }[] }[]; supplier_name?: string }[]
}

interface Supplier {
  id: string
  name: string
  contact_person?: string | null
  phone?: string | null
  address?: string | null
  email?: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: '交通',
  accommodation: '住宿',
  meal: '餐食',
  activity: '活動',
  other: '其他',
}

export function AssignSupplierDialog({
  open,
  onClose,
  tour,
  tourId,
  items,
  totalPax,
  ageBreakdown,
  formatDate,
  onSave,
  existingRequests = [],
}: AssignSupplierDialogProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [supplierSearch, setSupplierSearch] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [customName, setCustomName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const supabase = createSupabaseBrowserClient()

  // 搜尋供應商
  useEffect(() => {
    if (!open || supplierSearch.length < 1) {
      setSuppliers([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('suppliers')
        .select('id, name, contact_person, phone, address, email')
        .ilike('name', `%${supplierSearch}%`)
        .limit(10)
      setSuppliers((data as Supplier[]) || [])
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [supplierSearch, open])

  const supplierName = selectedSupplier?.name || customName
  const canPrint = supplierName.trim().length > 0

  // 分類整理
  const grouped = items.reduce<Record<string, QuoteItem[]>>((acc, { category, item }) => {
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {})

  // 存入 tour_requests
  const handleSaveRequest = useCallback(async () => {
    if (!canPrint || !tourId || !user?.workspace_id) return

    setSaving(true)
    try {
      const requestItems = items.map(({ category, item }) => {
        const rooms = roomDetails[item.key]?.filter(r => r.name.trim() && r.qty > 0) || []
        return {
          category,
          title: item.title || item.supplierName || '',
          service_date: item.serviceDate || null,
          quantity: item.quantity,
          unit_cost: item.quotedPrice || null,
          itinerary_item_id: item.itinerary_item_id || null,
          ...(rooms.length > 0 ? { rooms: rooms.map(r => ({ room_type: r.name, quantity: r.qty })) } : {}),
        }
      })

      const { error } = await supabase.from('tour_requests').insert({
        workspace_id: user.workspace_id,
        tour_id: tourId,
        request_type: 'mixed',
        supplier_id: selectedSupplier?.id || null,
        supplier_name: supplierName,
        supplier_contact: selectedSupplier?.contact_person || null,
        items: requestItems,
        status: 'draft',
        note: null,
        created_by: user.id,
      } as never)

      if (error) throw error

      toast({ title: `委託已儲存：${supplierName}（${items.length} 項）` })
      onSave?.()
    } catch (err) {
      logger.error('儲存委託失敗:', err)
      toast({ title: '儲存委託失敗', variant: 'destructive' })
      setSaving(false)
      return false
    } finally {
      setSaving(false)
    }
    return true
  }, [canPrint, tourId, user, items, selectedSupplier, supplierName, supabase, toast, onSave])

  const handlePrintAndSave = useCallback(async () => {
    if (!canPrint) return

    // 先存再印
    const saved = await handleSaveRequest()
    if (saved === false) return

    handlePrint()
  }, [canPrint, handleSaveRequest])

  const handlePrint = useCallback(() => {
    if (!canPrint) return

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>需求單 - ${supplierName}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { margin: 0; } }
  body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 12pt; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 22pt; margin-bottom: 10px; border-bottom: 3px double #333; padding-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .info-section { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
  .info-section h3 { margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .info-row { display: flex; margin-bottom: 5px; }
  .info-label { font-weight: bold; min-width: 80px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  th, td { border: 1px solid #333; padding: 8px 10px; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .cat-header { background: #e8e8e8; font-weight: bold; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10pt; color: #666; }
  .confirm-section { margin-top: 30px; border: 1px solid #ddd; padding: 15px; }
  .confirm-section h3 { margin-top: 0; }
  .sign-line { display: flex; justify-content: space-between; margin-top: 30px; }
  .sign-box { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; }
</style></head><body>
  <h1>需求單</h1>
  <div class="info-grid">
    <div class="info-section">
      <h3>我方資訊</h3>
      <div class="info-row"><span class="info-label">公司：</span><span>角落旅行社</span></div>
      <div class="info-row"><span class="info-label">團號：</span><span>${tour?.code || ''}</span></div>
      <div class="info-row"><span class="info-label">團名：</span><span>${tour?.name || ''}</span></div>
      <div class="info-row"><span class="info-label">出發日：</span><span>${tour?.departure_date || ''}</span></div>
      <div class="info-row"><span class="info-label">總人數：</span><span>${totalPax || '-'} 人</span></div>
      ${ageBreakdown ? `<div class="info-row"><span class="info-label">年齡分類：</span><span>${ageBreakdown}</span></div>` : ''}
    </div>
    <div class="info-section">
      <h3>供應商資訊</h3>
      <div class="info-row"><span class="info-label">名稱：</span><span>${supplierName}</span></div>
      ${selectedSupplier?.contact_person ? `<div class="info-row"><span class="info-label">窗口：</span><span>${selectedSupplier.contact_person}</span></div>` : ''}
      ${selectedSupplier?.phone ? `<div class="info-row"><span class="info-label">電話：</span><span>${selectedSupplier.phone}</span></div>` : ''}
      ${selectedSupplier?.email ? `<div class="info-row"><span class="info-label">Email：</span><span>${selectedSupplier.email}</span></div>` : ''}
      ${selectedSupplier?.address ? `<div class="info-row"><span class="info-label">地址：</span><span>${selectedSupplier.address}</span></div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th style="width:60px">日期</th><th>類別</th><th>項目</th><th style="width:80px">預算</th><th style="width:100px">回覆金額</th><th style="width:60px">確認</th></tr></thead>
    <tbody>
      ${Object.entries(grouped).map(([catKey, catItems]) => {
        const label = CATEGORY_LABELS[catKey] || catKey
        const rows = catItems.map(item => `
          <tr>
            <td style="text-align:center">${formatDate(item.serviceDate)}</td>
            <td style="text-align:center">${label}</td>
            <td>${item.title || item.supplierName || ''}</td>
            <td style="text-align:right">${item.quotedPrice ? 'NT$ ' + item.quotedPrice.toLocaleString() : ''}</td>
            <td></td>
            <td></td>
          </tr>`).join('')
        return rows
      }).join('')}
    </tbody>
  </table>

  <div class="confirm-section">
    <h3>供應商回覆</h3>
    <p>備註：____________________________________________________________</p>
    <div class="sign-line">
      <div class="sign-box">供應商簽章</div>
      <div class="sign-box">日期</div>
    </div>
  </div>

  <div class="footer">
    <p>列印時間：${new Date().toLocaleString('zh-TW')}</p>
    <p>此需求單由 Venturo ERP 產生</p>
  </div>
</body></html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
    onClose()
  }, [canPrint, supplierName, selectedSupplier, tour, totalPax, ageBreakdown, grouped, formatDate, onClose])

  const [step, setStep] = useState<'rooms' | 'preview' | 'send'>('preview')
  const [roomDetails, setRoomDetails] = useState<Record<string, { name: string; qty: number }[]>>({})
  const [sendMethod, setSendMethod] = useState<'print' | 'line' | 'email' | 'fax' | 'tenant' | null>(null)
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string; supplier_id?: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [loadingGroups, setLoadingGroups] = useState(false)

  // 重置 step
  useEffect(() => {
    if (open) {
      // 有住宿 → 先填房型，否則 → 直接預覽
      const accItems = items.filter(({ category }) => category === 'accommodation')
      const hasAcc = accItems.length > 0

      if (hasAcc) {
        // 初始化房型（從 existingRequests 讀或預設）
        const init: Record<string, { name: string; qty: number }[]> = {}
        let allHaveRooms = true

        accItems.forEach(({ item }) => {
          let foundRooms = false
          const itemTitle = item.title || item.supplierName || ''

          for (const req of existingRequests) {
            if (!req.items || !Array.isArray(req.items)) continue

            // 格式 A: 混合需求 — items[].rooms[]
            const matchItem = req.items.find((ri: Record<string, unknown>) =>
              (ri.rooms as { room_type: string; quantity: number }[])?.length > 0 &&
              itemTitle.includes(String(ri.title || ''))
            )
            if (matchItem?.rooms) {
              init[item.key] = (matchItem.rooms as { room_type: string; quantity: number }[]).map(r => ({ name: r.room_type, qty: r.quantity }))
              foundRooms = true
              break
            }

            // 格式 B: 單獨住宿需求 — items[] = [{ room_type, quantity, nights }]
            const roomItems = req.items.filter((ri: Record<string, unknown>) =>
              ri.room_type && typeof ri.quantity === 'number'
            )
            if (roomItems.length > 0 && (req as Record<string, unknown>).supplier_name && itemTitle.includes(String((req as Record<string, unknown>).supplier_name || ''))) {
              init[item.key] = roomItems.map((r: Record<string, unknown>) => ({ name: String(r.room_type), qty: Number(r.quantity) }))
              foundRooms = true
              break
            }
          }

          if (!foundRooms) {
            init[item.key] = [{ name: '雙人房', qty: 1 }]
            allHaveRooms = false
          }
        })

        setRoomDetails(init)
        setStep(allHaveRooms ? 'preview' : 'rooms')
      } else {
        setRoomDetails({})
        setStep('preview')
      }

      setSendMethod(null)
      setSelectedSupplier(null)
      setSupplierSearch('')
      setCustomName('')
    }
  }, [open])

  // 載入 LINE 群組列表
  useEffect(() => {
    if (step === 'send' && sendMethod === 'line' && lineGroups.length === 0) {
      setLoadingGroups(true)
      fetch('/api/line/groups')
        .then(res => res.json())
        .then(data => {
          setLineGroups(Array.isArray(data) ? data : [])
          if (Array.isArray(data) && data.length > 0) setSelectedGroupId(data[0].group_id)
        })
        .catch(() => {})
        .finally(() => setLoadingGroups(false))
    }
  }, [step, sendMethod])

  // 有沒有住宿項目
  const accommodationItems = items.filter(({ category }) => category === 'accommodation')
  const hasAccommodation = accommodationItems.length > 0

  // 住宿房型編輯 helpers
  const addRoom = (itemKey: string) => {
    setRoomDetails(prev => ({
      ...prev,
      [itemKey]: [...(prev[itemKey] || [{ name: '雙人房', qty: 1 }]), { name: '', qty: 1 }],
    }))
  }
  const updateRoom = (itemKey: string, idx: number, field: 'name' | 'qty', value: string | number) => {
    setRoomDetails(prev => ({
      ...prev,
      [itemKey]: (prev[itemKey] || []).map((r, i) =>
        i === idx ? { ...r, [field]: value } : r
      ),
    }))
  }
  const removeRoom = (itemKey: string, idx: number) => {
    setRoomDetails(prev => ({
      ...prev,
      [itemKey]: (prev[itemKey] || []).filter((_, i) => i !== idx),
    }))
  }

  // 生成 PDF HTML
  const generateHtml = useCallback(() => {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>需求單 - ${supplierName}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { margin: 0; } }
  body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 12pt; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 22pt; margin-bottom: 10px; border-bottom: 3px double #333; padding-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .info-section { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
  .info-section h3 { margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .info-row { display: flex; margin-bottom: 5px; }
  .info-label { font-weight: bold; min-width: 80px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  th, td { border: 1px solid #333; padding: 8px 10px; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10pt; color: #666; }
  .confirm-section { margin-top: 30px; border: 1px solid #ddd; padding: 15px; }
  .confirm-section h3 { margin-top: 0; }
  .sign-line { display: flex; justify-content: space-between; margin-top: 30px; }
  .sign-box { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; }
</style></head><body>
  <h1>需求單</h1>
  <div class="info-grid">
    <div class="info-section">
      <h3>我方資訊</h3>
      <div class="info-row"><span class="info-label">公司：</span><span>角落旅行社</span></div>
      <div class="info-row"><span class="info-label">團號：</span><span>${tour?.code || ''}</span></div>
      <div class="info-row"><span class="info-label">團名：</span><span>${tour?.name || ''}</span></div>
      <div class="info-row"><span class="info-label">出發日：</span><span>${tour?.departure_date || ''}</span></div>
      <div class="info-row"><span class="info-label">總人數：</span><span>${totalPax || '-'} 人</span></div>
      ${ageBreakdown ? `<div class="info-row"><span class="info-label">年齡分類：</span><span>${ageBreakdown}</span></div>` : ''}
    </div>
    <div class="info-section">
      <h3>供應商資訊</h3>
      <div class="info-row"><span class="info-label">名稱：</span><span>${supplierName}</span></div>
      ${selectedSupplier?.contact_person ? `<div class="info-row"><span class="info-label">窗口：</span><span>${selectedSupplier.contact_person}</span></div>` : ''}
      ${selectedSupplier?.phone ? `<div class="info-row"><span class="info-label">電話：</span><span>${selectedSupplier.phone}</span></div>` : ''}
      ${selectedSupplier?.email ? `<div class="info-row"><span class="info-label">Email：</span><span>${selectedSupplier.email}</span></div>` : ''}
      ${selectedSupplier?.address ? `<div class="info-row"><span class="info-label">地址：</span><span>${selectedSupplier.address}</span></div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th style="width:60px">日期</th><th>類別</th><th>項目</th><th style="width:80px">預算</th><th style="width:100px">回覆金額</th><th style="width:60px">確認</th></tr></thead>
    <tbody>
      ${Object.entries(grouped).map(([catKey, catItems]) => {
        const label = CATEGORY_LABELS[catKey] || catKey
        return catItems.map(item => {
          const rooms = roomDetails[item.key]?.filter(r => r.name.trim() && r.qty > 0) || []
          const roomLine = rooms.length > 0
            ? `<br/><span style="font-size:10pt;color:#666">房型：${rooms.map(r => `${r.name} × ${r.qty} 間`).join('、')}</span>`
            : ''
          return `
          <tr>
            <td style="text-align:center">${formatDate(item.serviceDate)}</td>
            <td style="text-align:center">${label}</td>
            <td>${item.title || item.supplierName || ''}${roomLine}</td>
            <td style="text-align:right">${item.quotedPrice ? 'NT$ ' + item.quotedPrice.toLocaleString() : ''}</td>
            <td></td>
            <td></td>
          </tr>`
        }).join('')
      }).join('')}
    </tbody>
  </table>
  <div class="confirm-section">
    <h3>供應商回覆</h3>
    <p>備註：____________________________________________________________</p>
    <div class="sign-line">
      <div class="sign-box">供應商簽章</div>
      <div class="sign-box">日期</div>
    </div>
  </div>
  <div class="footer">
    <p>列印時間：${new Date().toLocaleString('zh-TW')}</p>
    <p>此需求單由 Venturo ERP 產生</p>
  </div>
</body></html>`
  }, [supplierName, selectedSupplier, tour, totalPax, ageBreakdown, grouped, formatDate])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className={step === 'preview' || step === 'send' ? 'max-w-4xl max-h-[90vh] overflow-hidden flex flex-col' : 'max-w-lg'}>
        {step === 'rooms' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 size={18} className="text-morandi-gold" />
                Step 1 · 填寫房型需求 — {accommodationItems.length} 間住宿
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-auto">
              {accommodationItems.map(({ item }) => (
                <div key={item.key} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{item.title || item.supplierName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDate(item.serviceDate)} · {item.quantity || 1} 晚
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => addRoom(item.key)}
                    >
                      + 新增房型
                    </Button>
                  </div>
                  {(roomDetails[item.key] || []).map((room, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={room.name}
                        onChange={e => updateRoom(item.key, idx, 'name', e.target.value)}
                        placeholder="房型名稱（如：雙人房、三人房）"
                        className="h-7 text-sm flex-1"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">×</span>
                      <Input
                        type="number"
                        min={1}
                        value={room.qty}
                        onChange={e => updateRoom(item.key, idx, 'qty', parseInt(e.target.value) || 1)}
                        className="h-7 text-sm w-16"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">間</span>
                      {(roomDetails[item.key] || []).length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => removeRoom(item.key, idx)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                  {(roomDetails[item.key] || []).filter(r => r.name.trim() && r.qty > 0).length > 0 && (
                    <div className="text-xs text-muted-foreground border-t pt-1 mt-1">
                      小計：{(roomDetails[item.key] || []).filter(r => r.name.trim() && r.qty > 0).map(r => `${r.name} × ${r.qty}`).join('、')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>取消</Button>
              <Button
                onClick={() => setStep('preview')}
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                下一步：預覽需求單
              </Button>
            </DialogFooter>
          </>
        ) : step === 'preview' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 size={18} className="text-morandi-gold" />
                需求單預覽 — {items.length} 個項目
              </DialogTitle>
            </DialogHeader>

            {/* PDF 預覽 */}
            <div className="flex-1 overflow-auto border rounded-md bg-white min-h-0">
              <iframe
                srcDoc={generateHtml()}
                className="w-full h-[50vh] border-0"
                title="需求單預覽"
              />
            </div>

            {/* 發送方式選擇 */}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">選擇發送方式</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Button
                  size="sm"
                  variant={sendMethod === 'print' ? 'default' : 'outline'}
                  onClick={() => setSendMethod('print')}
                  className={sendMethod === 'print' ? 'bg-morandi-gold hover:bg-morandi-gold-hover text-white' : ''}
                >
                  <Printer size={14} className="mr-1.5" />
                  列印
                </Button>
                <Button
                  size="sm"
                  variant={sendMethod === 'line' ? 'default' : 'outline'}
                  onClick={() => setSendMethod('line')}
                  className={sendMethod === 'line' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                >
                  <MessageCircle size={14} className="mr-1.5" />
                  Line
                </Button>
                <Button
                  size="sm"
                  variant={sendMethod === 'email' ? 'default' : 'outline'}
                  onClick={() => setSendMethod('email')}
                  className={sendMethod === 'email' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                >
                  <Mail size={14} className="mr-1.5" />
                  Email
                </Button>
                <Button
                  size="sm"
                  variant={sendMethod === 'fax' ? 'default' : 'outline'}
                  onClick={() => setSendMethod('fax')}
                  className={sendMethod === 'fax' ? 'bg-gray-700 hover:bg-gray-800 text-white' : ''}
                >
                  <Phone size={14} className="mr-1.5" />
                  傳真
                </Button>
                <Button
                  size="sm"
                  variant={sendMethod === 'tenant' ? 'default' : 'outline'}
                  onClick={() => setSendMethod('tenant')}
                  className={sendMethod === 'tenant' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                >
                  <Globe size={14} className="mr-1.5" />
                  租戶
                </Button>
              </div>
            </div>

            <DialogFooter>
              {hasAccommodation && (
                <Button variant="outline" onClick={() => setStep('rooms')}>← 房型</Button>
              )}
              <Button variant="outline" onClick={onClose}>取消</Button>
              {sendMethod === 'print' ? (
                <Button
                  onClick={() => {
                    const w = window.open('', '_blank', 'width=900,height=700')
                    if (w) { w.document.write(generateHtml()); w.document.close() }
                  }}
                  className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                >
                  <Printer size={14} className="mr-1.5" />
                  直接列印
                </Button>
              ) : sendMethod === 'line' ? (
                <Button
                  onClick={() => setStep('send')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle size={14} className="mr-1.5" />
                  下一步：選群組發送
                </Button>
              ) : sendMethod ? (
                <Button
                  onClick={() => setStep('send')}
                  className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                >
                  下一步：選擇供應商
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : (
          /* step === 'send' */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {sendMethod === 'line' ? (
                  <><MessageCircle size={18} className="text-green-600" /> 💬 Line 發送</>
                ) : sendMethod === 'email' ? (
                  <><Mail size={18} className="text-blue-600" /> 📧 Email 發送</>
                ) : sendMethod === 'fax' ? (
                  <><Phone size={18} className="text-gray-600" /> 📠 傳真發送</>
                ) : (
                  <><Globe size={18} className="text-purple-600" /> 🌐 發給租戶</>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* LINE：只選群組 */}
              {sendMethod === 'line' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">發送到哪個群組？</Label>
                  {loadingGroups ? (
                    <div className="text-sm text-muted-foreground">載入群組中...</div>
                  ) : lineGroups.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
                      尚無群組。請先將 VENTURO 數位助理加入 LINE 群組。
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {lineGroups.map(g => (
                          <button
                            key={g.group_id}
                            className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                              selectedGroupId === g.group_id
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                            }`}
                            onClick={() => setSelectedGroupId(g.group_id)}
                          >
                            <div className="font-medium">{g.group_name || g.group_id.slice(0, 12)}</div>
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Flex 卡片將發送到此群組，含需求摘要 + 線上回覆連結
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 其他發送方式：需要選供應商 */}
              {sendMethod !== 'line' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">發送給哪個供應商？</Label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2 text-muted-foreground" />
                    <Input
                      value={supplierSearch}
                      onChange={e => {
                        setSupplierSearch(e.target.value)
                        setSelectedSupplier(null)
                        setCustomName(e.target.value)
                      }}
                      placeholder="搜尋或輸入供應商名稱..."
                      className="h-8 text-sm pl-8"
                    />
                  </div>

                  {suppliers.length > 0 && !selectedSupplier && (
                    <div className="border rounded-md max-h-36 overflow-y-auto">
                      {suppliers.map(s => (
                        <button
                          key={s.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b border-border/50 last:border-0"
                          onClick={() => {
                            setSelectedSupplier(s)
                            setSupplierSearch(s.name)
                            setCustomName('')
                          }}
                        >
                          <span className="font-medium">{s.name}</span>
                          {s.contact_person && (
                            <span className="text-xs text-muted-foreground ml-2">窗口: {s.contact_person}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedSupplier && (
                    <div className="bg-blue-50/50 border border-blue-200 rounded-md p-2 text-xs space-y-0.5">
                      <div className="font-medium text-blue-700">{selectedSupplier.name}</div>
                      {selectedSupplier.contact_person && <div>窗口: {selectedSupplier.contact_person}</div>}
                      {selectedSupplier.phone && <div>電話: {selectedSupplier.phone}</div>}
                      {selectedSupplier.email && <div>Email: {selectedSupplier.email}</div>}
                    </div>
                  )}

                  {loading && <div className="text-xs text-muted-foreground">搜尋中...</div>}

                  {sendMethod === 'email' && (
                    <div className="text-xs text-blue-500 mt-2">📧 功能開發中 — 需要設定 Email 寄件帳號</div>
                  )}
                  {sendMethod === 'fax' && (
                    <div className="text-xs text-gray-500 mt-2">📠 功能開發中 — 需要設定虛擬傳真服務</div>
                  )}
                  {sendMethod === 'tenant' && (
                    <div className="text-xs text-purple-500 mt-2">🌐 功能開發中 — 需要先建立附屬國租戶</div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('preview')}>← 返回</Button>
              <Button
                disabled={
                  saving ||
                  (sendMethod === 'line' && !selectedGroupId) ||
                  (sendMethod !== 'line' && !canPrint)
                }
                onClick={async () => {
                  if (sendMethod === 'line') {
                    // Line 發送：用群組名稱當供應商名，不需要另選
                    const groupName = lineGroups.find(g => g.group_id === selectedGroupId)?.group_name || ''
                    const senderName = user?.display_name || user?.chinese_name || '業務員'

                    // 儲存委託（供應商名 = 群組名）
                    setSaving(true)
                    try {
                      if (tourId && user?.workspace_id) {
                        const requestItems = items.map(({ category, item }) => {
                          const rooms = roomDetails[item.key]?.filter(r => r.name.trim() && r.qty > 0) || []
                          return {
                            category,
                            title: item.title || item.supplierName || '',
                            service_date: item.serviceDate || null,
                            quantity: item.quantity,
                            unit_cost: item.quotedPrice || null,
                            ...(rooms.length > 0 ? { rooms: rooms.map(r => ({ room_type: r.name, quantity: r.qty })) } : {}),
                          }
                        })

                        await supabase.from('tour_requests').insert({
                          workspace_id: user.workspace_id,
                          tour_id: tourId,
                          request_type: 'mixed',
                          supplier_name: groupName,
                          items: requestItems,
                          status: 'sent',
                          sent_at: new Date().toISOString(),
                          sent_via: 'line',
                          created_by: user.id,
                        } as never)
                      }

                      const res = await fetch('/api/line/send-requirement', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          lineGroupId: selectedGroupId,
                          senderName,
                          tourCode: tour?.code || '',
                          tourName: tour?.name || '',
                          departureDate: tour?.departure_date || '',
                          totalPax,
                          supplierName: groupName,
                          items: items.map(({ category, item }) => ({
                            category,
                            title: item.title || item.supplierName || '',
                            serviceDate: formatDate(item.serviceDate),
                            rooms: roomDetails[item.key]?.filter(r => r.name.trim() && r.qty > 0).map(r => ({
                              room_type: r.name,
                              quantity: r.qty,
                            })) || [],
                          })),
                        }),
                      })
                      if (res.ok) {
                        toast({ title: '💬 Line 已發送', description: `需求單已發送到「${groupName}」群組` })
                        onSave?.()
                        onClose()
                      } else {
                        const err = await res.json()
                        toast({ title: 'Line 發送失敗', description: err.error, variant: 'destructive' })
                      }
                    } catch (err) {
                      toast({ title: 'Line 發送失敗', description: String(err), variant: 'destructive' })
                    } finally {
                      setSaving(false)
                    }
                  } else {
                    toast({ title: '功能開發中', description: '此發送方式尚未上線' })
                  }
                }}
                className={sendMethod === 'line' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-morandi-gold hover:bg-morandi-gold-hover text-white'}
              >
                {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                {sendMethod === 'line' ? '發送到群組' : '確認發送'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
