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

interface AssignSupplierDialogProps {
  open: boolean
  onClose: () => void
  tour: Tour | null
  tourId: string
  items: SelectedItem[]
  totalPax: number | null
  ageBreakdown: string
  formatDate: (d: string | null | undefined) => string
  onSave?: () => void
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
      const requestItems = items.map(({ category, item }) => ({
        category,
        title: item.title || item.supplierName || '',
        service_date: item.serviceDate || null,
        quantity: item.quantity,
        unit_cost: item.quotedPrice || null,
        itinerary_item_id: item.itinerary_item_id || null,
      }))

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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 size={18} className="text-morandi-gold" />
            發給供應商 — {items.length} 個項目
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 已選項目摘要 */}
          <div className="bg-muted/50 rounded-md p-3 space-y-1">
            {Object.entries(grouped).map(([catKey, catItems]) => (
              <div key={catKey} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-morandi-primary w-12">
                  {CATEGORY_LABELS[catKey] || catKey}
                </span>
                <span className="text-muted-foreground">
                  {catItems.map(i => i.title || i.supplierName).join('、')}
                </span>
              </div>
            ))}
          </div>

          {/* 搜尋供應商 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">供應商</Label>
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

            {/* 搜尋結果 */}
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
                      <span className="text-xs text-muted-foreground ml-2">
                        窗口: {s.contact_person}
                      </span>
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
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!canPrint || saving}
              className="text-muted-foreground cursor-not-allowed opacity-60"
              title="開發中 — Email 發送即將上線"
              onClick={() => toast({ title: '📧 Email 發送', description: '功能開發中，敬請期待' })}
            >
              <Mail size={14} className="mr-1" />
              Email 發送
              <span className="ml-1 text-[10px] bg-muted px-1 rounded">開發中</span>
            </Button>
            <Button
              variant="outline"
              disabled={!canPrint || saving}
              className="text-muted-foreground cursor-not-allowed opacity-60"
              title="開發中 — Line 群組發送即將上線"
              onClick={() => toast({ title: '💬 Line 發送', description: '功能開發中，敬請期待' })}
            >
              <MessageCircle size={14} className="mr-1" />
              Line 發送
              <span className="ml-1 text-[10px] bg-muted px-1 rounded">開發中</span>
            </Button>
            <Button
              variant="outline"
              disabled={!canPrint || saving}
              className="text-muted-foreground cursor-not-allowed opacity-60"
              title="開發中 — 發送至系統內附屬國（Local 租戶）"
              onClick={() => toast({ title: '🌐 系統內發送', description: '功能開發中 — 需要先建立附屬國租戶' })}
            >
              <Globe size={14} className="mr-1" />
              發給租戶
              <span className="ml-1 text-[10px] bg-muted px-1 rounded">開發中</span>
            </Button>
            <Button
              variant="outline"
              disabled={!canPrint || saving}
              className="text-muted-foreground cursor-not-allowed opacity-60"
              title="開發中 — 虛擬傳真發送（目前請用列印後傳真）"
              onClick={() => toast({ title: '📠 傳真發送', description: '開發中 — 目前請先列印後使用傳真機發送' })}
            >
              <Phone size={14} className="mr-1" />
              傳真
              <span className="ml-1 text-[10px] bg-muted px-1 rounded">開發中</span>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button
              onClick={handlePrintAndSave}
              disabled={!canPrint || saving}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Printer size={14} className="mr-1" />}
              儲存並列印
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
