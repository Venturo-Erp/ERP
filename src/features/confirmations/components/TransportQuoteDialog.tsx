'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Loader2, Printer, Sun, Mail, Phone, Globe, Plus, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/stores'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'
import { UnifiedTraditionalView } from './UnifiedTraditionalView'
import { printTransportRequirement } from '../utils/printTransportRequirement'

interface TransportQuoteDialogProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string; return_date?: string } | null
  transportDays?: { dayNumber: number; date: string; route: string }[]
  totalPax: number | null
  coreItems?: TourItineraryItem[]
  startDate?: string | null
  supplierName: string
  vehicleDesc?: string
}

// 每天的行程結構
interface DaySchedule {
  dayNumber: number
  date: string
  weekday: string
  route: string
  breakfast: string
  lunch: string
  dinner: string
  hotel: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

// 發送方式
type DeliveryMethod = 'print' | 'line' | 'email' | 'fax' | 'tenant'

const DELIVERY_METHODS: { key: DeliveryMethod; label: string; icon: typeof Printer }[] = [
  { key: 'print', label: '列印', icon: Printer },
  { key: 'line', label: 'Line', icon: Send },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'fax', label: '傳真', icon: Phone },
  { key: 'tenant', label: '租戶', icon: Globe },
]

export function TransportQuoteDialog({
  open,
  onClose,
  tour,
  transportDays = [],
  totalPax,
  coreItems = [],
  startDate,
  supplierName,
  vehicleDesc = '',
}: TransportQuoteDialogProps) {
  const { user } = useAuthStore()
  const [note, setNote] = useState('')
  const [paxInput, setPaxInput] = useState<string>(totalPax?.toString() || '')
  const [paxTiers, setPaxTiers] = useState<number[]>([20, 30, 40]) // 人數梯次
  const [newTierInput, setNewTierInput] = useState('')
  const [lineGroups, setLineGroups] = useState<{ group_id: string; group_name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod | null>(null)
  const [viewMode, setViewMode] = useState<'modern' | 'traditional'>('modern')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  // 載入 LINE 群組和供應商
  useEffect(() => {
    if (!open) return
    const load = async () => {
      // LINE 群組
      const { data: lineData } = await supabase
        .from('line_groups')
        .select('group_id, group_name')
        .not('group_name', 'is', null)
      if (lineData) setLineGroups(lineData.filter((g): g is { group_id: string; group_name: string } => !!g.group_name))
      
      // 供應商（transport 類型）
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('id, name, contact_person, phone, fax')
        .eq('type', 'transport')
        .eq('is_active', true)
        .order('name')
      if (supplierData) setSuppliers(supplierData)
    }
    load()
  }, [open])

  // 重置 method
  useEffect(() => {
    if (open) setSelectedMethod(null)
  }, [open])

  // 把核心表資料組成每天行程
  const daySchedules: DaySchedule[] = useMemo(() => {
    if (!coreItems.length) {
      return transportDays.map(d => ({
        dayNumber: d.dayNumber,
        date: d.date,
        weekday: '',
        route: '',
        breakfast: '',
        lunch: '',
        dinner: '',
        hotel: '',
      }))
    }

    const dayMap = new Map<number, DaySchedule>()

    for (const item of coreItems) {
      const dn = item.day_number
      if (!dn) continue
      if (!dayMap.has(dn)) {
        let dateStr = ''
        let weekday = ''
        const baseDate = startDate || tour?.departure_date
        if (baseDate) {
          const d = new Date(baseDate)
          d.setDate(d.getDate() + dn - 1)
          dateStr = `${d.getMonth() + 1}/${d.getDate()}`
          weekday = WEEKDAYS[d.getDay()]
        }
        dayMap.set(dn, {
          dayNumber: dn,
          date: dateStr,
          weekday,
          route: '',
          breakfast: '',
          lunch: '',
          dinner: '',
          hotel: '',
        })
      }
    }

    const sorted = [...coreItems].sort((a, b) => {
      const da = a.day_number || 0
      const db = b.day_number || 0
      if (da !== db) return da - db
      return (a.sort_order || 0) - (b.sort_order || 0)
    })

    for (const item of sorted) {
      const dn = item.day_number
      if (!dn || !dayMap.has(dn)) continue
      const day = dayMap.get(dn)!

      if (item.category === 'accommodation') {
        day.hotel = item.resource_name || item.title || ''
      } else if (item.category === 'meals') {
        const name = item.title || ''
        if (item.sub_category === 'breakfast') day.breakfast = name
        else if (item.sub_category === 'lunch') day.lunch = name
        else if (item.sub_category === 'dinner') day.dinner = name
      } else if (item.category === 'activities' || item.category === 'transport' || item.category === 'group-transport') {
        if (item.title) {
          day.route = day.route ? `${day.route} → ${item.title}` : item.title
        }
      }
    }

    return Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  }, [coreItems, startDate, transportDays])

  // 列印
  const handlePrint = () => {
    // 產生公開頁面 URL
    const publicUrl = `${window.location.origin}/public/transport-quote/${tour?.id}?supplierName=${encodeURIComponent(supplierName)}&note=${encodeURIComponent(note)}&vehicleDesc=${encodeURIComponent(vehicleDesc)}`
    
    // 開啟公開頁面讓供應商填寫
    window.open(publicUrl, '_blank')
  }

  // 梯次管理
  const handleAddTier = () => {
    const num = parseInt(newTierInput)
    if (!num || num <= 0) {
      toast({ title: '請輸入有效的人數', variant: 'destructive' })
      return
    }
    if (paxTiers.includes(num)) {
      toast({ title: '此梯次已存在', variant: 'destructive' })
      return
    }
    setPaxTiers([...paxTiers, num].sort((a, b) => a - b))
    setNewTierInput('')
  }

  const handleRemoveTier = (num: number) => {
    setPaxTiers(paxTiers.filter(t => t !== num))
  }

  // LINE 發送
  const handleSendLine = async () => {
    if (!selectedGroupId || !tour) return
    setSending(true)
    try {
      const pax = paxInput ? parseInt(paxInput) : totalPax
      
      // 1. 先建立需求單，取得 request_id
      if (!user?.workspace_id) {
        toast({ title: '❌ 缺少 workspace_id', variant: 'destructive' })
        return
      }
      
      const createRes = await fetch('/api/create-transport-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: tour.id,
          supplierName: supplierName,
          vehicleDesc: vehicleDesc || '',
          note: note,
          totalPax: pax,
          workspaceId: user.workspace_id,
        }),
      })
      
      const createResult = await createRes.json()
      
      // 處理已存在的情況
      if (createResult.alreadyExists && createResult.hasReplied) {
        const confirmed = window.confirm(
          `此廠商「${supplierName}」已報價，是否重新發送需求？\n\n` +
          `選擇「確定」→ 建立新的需求單\n` +
          `選擇「取消」→ 不發送`
        )
        
        if (!confirmed) {
          setSending(false)
          return
        }
        
        // 使用者確認重新發送 → 強制建立新需求單
        const forceCreateRes = await fetch('/api/create-transport-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourId: tour.id,
            supplierName: `${supplierName} (重送)`,
            vehicleDesc: vehicleDesc || '',
            note: note,
            totalPax: pax,
            workspaceId: user.workspace_id,
          }),
        })
        
        const forceResult = await forceCreateRes.json()
        if (!forceResult.success || !forceResult.requestId) {
          toast({ title: '❌ 建立需求單失敗', description: forceResult.error, variant: 'destructive' })
          return
        }
        
        createResult.requestId = forceResult.requestId
      } else if (!createResult.success || !createResult.requestId) {
        toast({ title: '❌ 建立需求單失敗', description: createResult.error, variant: 'destructive' })
        return
      }
      
      // 如果是更新現有需求單，顯示提示
      if (createResult.updated) {
        toast({ title: '✓ 更新需求單內容' })
      }
      
      // 2. 發送 LINE（帶 requestId）
      const res = await fetch('/api/line/send-transport-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineGroupId: selectedGroupId,
          tourCode: tour.code || '',
          tourName: tour.name || '',
          departureDate: tour.departure_date || '',
          totalPax: pax,
          tourId: tour.id,
          requestId: createResult.requestId, // 傳遞 requestId
          vehicleDesc: vehicleDesc || '',
          note: supplierName || note,
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

  // 發送方式處理
  const handleDelivery = (method: DeliveryMethod) => {
    if (method === 'print' || method === 'fax') {
      // 切換到傳統樣式
      setViewMode('traditional')
      setSelectedMethod(method)
      return
    }
    if (method === 'line') {
      // 保持現代樣式
      setViewMode('modern')
      setSelectedMethod('line')
      return
    }
    // email / tenant 未來擴充
    toast({ title: `${method} 功能開發中`, description: '目前支援列印、傳真和 LINE' })
  }

  // 列印功能（傳統樣式）
  const handleTraditionalPrint = () => {
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId)
    if (!selectedSupplier) {
      toast({ title: '請先選擇供應商', variant: 'destructive' })
      return
    }

    printTransportRequirement({
      supplierName: selectedSupplier.name,
      tourCode: tour?.code || '',
      tourName: tour?.name || '',
      totalPax: totalPax || 0,
      departureDate: tour?.departure_date,
      returnDate: tour?.return_date,
      transportDays: daySchedules.map(d => ({
        dayNumber: d.dayNumber,
        date: d.date,
        route: d.route,
      })),
      vehicleType: vehicleDesc,
      note,
      invoiceSealUrl: '', // TODO: 從 workspace 讀取
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>遊覽車報價</DialogTitle>
        </DialogHeader>
        {/* 中間可滾動內容 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {viewMode === 'traditional' ? (
            <UnifiedTraditionalView
              requestType="transport"
              tour={tour}
              totalPax={totalPax}
              supplierName={supplierName}
              contact={suppliers.find(s => s.id === selectedSupplierId)?.contact_person}
              phone={suppliers.find(s => s.id === selectedSupplierId)?.phone}
              fax={suppliers.find(s => s.id === selectedSupplierId)?.fax}
              items={daySchedules.map(d => ({
                date: d.date,
                route: d.route,
                quantity: '',
                note: vehicleDesc || '',
              }))}
              note={note}
              setNote={setNote}
            />
          ) : (
            <>
          {/* 團資訊條 */}
          <div className="flex items-center gap-6 px-4 py-3 bg-[#faf8f5] rounded-lg border border-[#e8e0d4]">
            <div className="text-sm">
              <span className="text-muted-foreground mr-1">團號</span>
              <span className="font-semibold">{tour?.code || '-'}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground mr-1">團名</span>
              <span className="font-semibold">{tour?.name || '-'}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground mr-1">出發日</span>
              <span className="font-semibold">{tour?.departure_date || '-'}</span>
            </div>
            <div className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">人數</span>
              <Input
                type="number"
                value={paxInput}
                onChange={e => setPaxInput(e.target.value)}
                placeholder={totalPax?.toString() || ''}
                className="h-7 w-20 text-sm"
              />
            </div>
          </div>

          {/* 行程表格（跟公開頁面一樣） */}
          {daySchedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sun size={40} className="mx-auto mb-3 opacity-30" />
              <p>尚無行程資料，請先到「行程」頁籤填寫</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm mb-3">
              <thead>
                <tr className="bg-[#c9a96e] text-white">
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left w-20">日期</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left">行程內容</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">早餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">午餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">晚餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left w-32">住宿</th>
                </tr>
              </thead>
              <tbody>
                {daySchedules.map((day, idx) => (
                  <tr key={day.dayNumber} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf5]'}>
                    <td className="border border-[#e8e5e0] px-3 py-2">
                      <div className="font-semibold text-[#c9a96e]">Day {day.dayNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {day.date}{day.weekday ? ` (${day.weekday})` : ''}
                      </div>
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 font-medium">
                      {day.route || '—'}
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                      {day.breakfast || '-'}
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                      {day.lunch || '-'}
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                      {day.dinner || '-'}
                    </td>
                    <td className="border border-[#e8e5e0] px-3 py-2 text-xs">
                      {day.hotel || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 報價資訊提示（車行填寫） */}
          <div className="pt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-medium mb-2">📋 供應商將填寫以下資訊：</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 車資（總金額）</li>
              <li>• 是否含停車費、過路費</li>
              <li>• 是否含司機住宿（如不含，填寫住宿費金額）</li>
              <li>• 是否含小費（如不含，填寫小費金額）</li>
            </ul>
          </div>

          {/* 備註 */}
          <div className="pt-2">
            <label className="text-sm font-medium mb-1.5 block">備註</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="給 Local 的特殊需求、偏好、注意事項..."
              rows={2}
              className="resize-none"
            />
          </div>

            </>
          )}
        </div>

        {/* 固定底部：發送方式按鈕 */}
        <div className="flex-shrink-0 border-t border-[#c9a96e] pt-4 mt-2">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {DELIVERY_METHODS.map(m => {
                const Icon = m.icon
                return (
                  <button
                    key={m.key}
                    onClick={() => handleDelivery(m.key)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all
                      ${selectedMethod === m.key 
                        ? 'border-[#c9a96e] bg-[#faf8f5] text-[#8B6914]' 
                        : 'border-border hover:border-[#c9a96e] hover:bg-[#faf8f5] text-foreground'
                      }`}
                  >
                    <Icon size={15} />
                    {m.label}
                  </button>
                )
              })}
            </div>
            <Button variant="outline" onClick={onClose}>取消</Button>
          </div>

          {/* LINE 群組選擇（選了 Line 才出現） */}
          {selectedMethod === 'line' && (
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border">
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="選擇 LINE 群組" />
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
              >
                {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                發送
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
