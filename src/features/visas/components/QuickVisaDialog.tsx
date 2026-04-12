'use client'

/**
 * QuickVisaDialog - 從訂單團員一鍵辦簽證
 * 預填姓名、團、訂單、聯絡人，使用者只需補國家、類型、費用
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { createVisa } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { tourService } from '@/features/tours/services/tour.service'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { Plane, Loader2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface QuickVisaDialogProps {
  open: boolean
  onClose: () => void
  /** 預填的成員資料 */
  member: {
    id: string
    name?: string
    chinese_name?: string | null
    english_name?: string | null
    customer_id?: string | null
  }
  /** 所屬團（選填 — 沒有的話會自動建立 ad-hoc 簽證團） */
  tour?: {
    id: string
    code: string
    name?: string
  }
  /** 所屬訂單（選填） */
  order?: {
    id: string
    order_number: string
    contact_person?: string | null
    contact_phone?: string | null
  }
  /** 建立成功後的 callback */
  onSuccess?: () => void
}

const COMMON_COUNTRIES = [
  '日本', '韓國', '泰國', '越南', '新加坡', '馬來西亞',
  '印尼', '菲律賓', '美國', '加拿大', '英國', '法國',
  '德國', '義大利', '西班牙', '澳洲', '紐西蘭', '中國',
]

const VISA_TYPES = [
  { value: 'tourist', label: '觀光簽證' },
  { value: 'business', label: '商務簽證' },
  { value: 'student', label: '學生簽證' },
  { value: 'work', label: '工作簽證' },
  { value: 'transit', label: '過境簽證' },
  { value: 'visa_on_arrival', label: '落地簽' },
  { value: 'e_visa', label: '電子簽證' },
]

export function QuickVisaDialog({
  open,
  onClose,
  member,
  tour,
  order,
  onSuccess,
}: QuickVisaDialogProps) {
  const { user } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [country, setCountry] = useState('')
  const [visaType, setVisaType] = useState('tourist')
  const [fee, setFee] = useState<number>(0)
  const [cost, setCost] = useState<number>(0)
  const [isUrgent, setIsUrgent] = useState(false)
  const [submissionDate, setSubmissionDate] = useState('')
  const [notes, setNotes] = useState('')

  const applicantName = member.chinese_name || member.name || member.english_name || ''

  useEffect(() => {
    if (open) {
      // 重置表單
      setCountry('')
      setVisaType('tourist')
      setFee(0)
      setCost(0)
      setIsUrgent(false)
      setSubmissionDate(new Date().toISOString().split('T')[0])
      setNotes('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!country || !applicantName || !user) {
      toast.error('請填寫國家')
      return
    }

    setSubmitting(true)
    try {
      // 沒綁團的話，自動建立 ad-hoc 簽證團
      let effectiveTour = tour
      if (!effectiveTour) {
        const newTour = await tourService.createAdHocTour('visa', applicantName)
        effectiveTour = { id: newTour.id, code: newTour.code, name: newTour.name }
        toast.success(`已建立簽證團：${newTour.code}`)
      }

      // 產生簽證單號：V{團號}-{隨機4碼}
      const visaCode = `V${effectiveTour.code}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

      const { error } = await (supabase.from('visas') as unknown as {
        insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>
      }).insert({
        code: visaCode,
        applicant_name: applicantName,
        country,
        visa_type: visaType,
        status: 'pending',
        tour_id: effectiveTour.id,
        order_id: order?.id || null,
        order_number: order?.order_number || '',
        contact_person: order?.contact_person || '',
        contact_phone: order?.contact_phone || '',
        fee,
        cost,
        is_urgent: isUrgent,
        submission_date: submissionDate || null,
        notes: notes || null,
        workspace_id: user.workspace_id,
        created_by: user.id,
        is_active: true,
      })

      if (error) throw error

      toast.success(`已建立 ${applicantName} 的簽證申請`)
      onSuccess?.()
      onClose()
    } catch (error) {
      logger.error('建立簽證失敗:', error)
      toast.error('建立失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent level={2} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane size={18} className="text-morandi-gold" />
            辦簽證
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 預填資訊（唯讀） */}
          <div className="bg-morandi-container/30 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-morandi-muted text-xs">申請人</span>
              <span className="font-medium">{applicantName}</span>
            </div>
            {tour ? (
              <div className="flex items-center gap-2">
                <span className="text-morandi-muted text-xs">所屬團</span>
                <span>
                  {tour.code} {tour.name}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-morandi-muted text-xs">
                <span>未綁定團</span>
                <span>— 送出時將自動建立簽證團</span>
              </div>
            )}
            {order && (
              <div className="flex items-center gap-2">
                <span className="text-morandi-muted text-xs">訂單</span>
                <span>{order.order_number}</span>
              </div>
            )}
            {order?.contact_person && (
              <div className="flex items-center gap-2">
                <span className="text-morandi-muted text-xs">聯絡人</span>
                <span>
                  {order.contact_person} {order.contact_phone && `(${order.contact_phone})`}
                </span>
              </div>
            )}
          </div>

          {/* 國家 */}
          <div className="space-y-1.5">
            <Label>國家 *</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder="選擇國家" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 簽證類型 */}
          <div className="space-y-1.5">
            <Label>簽證類型</Label>
            <Select value={visaType} onValueChange={setVisaType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISA_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 費用 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>收費（給客戶）</Label>
              <Input
                type="number"
                value={fee || ''}
                onChange={e => setFee(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>成本</Label>
              <Input
                type="number"
                value={cost || ''}
                onChange={e => setCost(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* 送件日期 */}
          <div className="space-y-1.5">
            <Label>預計送件日期</Label>
            <DatePicker value={submissionDate} onChange={setSubmissionDate} placeholder="選擇日期" />
          </div>

          {/* 急件 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={isUrgent}
              onCheckedChange={checked => setIsUrgent(checked as boolean)}
            />
            <span className="text-sm font-medium text-morandi-primary">急件</span>
          </label>

          {/* 備註 */}
          <div className="space-y-1.5">
            <Label>備註</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="特殊需求或備註..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!country || submitting}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plane size={16} />}
            建立簽證申請
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
