'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

// 內嵌司機資訊表單
function DriverInfoFormInline({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    driver_name: '',
    driver_phone: '',
    vehicle_plate: '',
    vehicle_type: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.driver_name.trim() || !form.driver_phone.trim()) {
      setError('請填寫司機姓名和電話')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/transport/${itemId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('提交失敗')
      setSubmitted(true)
    } catch {
      setError('提交失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-morandi-green/10 border border-morandi-green/30 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="text-lg font-semibold text-morandi-green">預訂完成！</h3>
        <p className="text-morandi-green text-sm mt-1">感謝您的配合</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>
            司機姓名 <span className="text-morandi-red">*</span>
          </Label>
          <Input
            value={form.driver_name}
            onChange={e => setForm({ ...form, driver_name: e.target.value })}
            placeholder="例：田中太郎"
            className="mt-1"
          />
        </div>
        <div>
          <Label>
            司機電話 <span className="text-morandi-red">*</span>
          </Label>
          <Input
            value={form.driver_phone}
            onChange={e => setForm({ ...form, driver_phone: e.target.value })}
            placeholder="例：090-1234-5678"
            className="mt-1"
          />
        </div>
        <div>
          <Label>車牌號碼</Label>
          <Input
            value={form.vehicle_plate}
            onChange={e => setForm({ ...form, vehicle_plate: e.target.value })}
            placeholder="例：福岡 200 あ 1234"
            className="mt-1"
          />
        </div>
        <div>
          <Label>車款</Label>
          <Input
            value={form.vehicle_type}
            onChange={e => setForm({ ...form, vehicle_type: e.target.value })}
            placeholder="例：45人座大巴"
            className="mt-1"
          />
        </div>
      </div>
      {error && <div className="text-morandi-red text-sm">{error}</div>}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-morandi-gold hover:bg-morandi-gold-hover"
      >
        {isSubmitting ? '提交中...' : '✓ 確認提交司機資訊'}
      </Button>
    </form>
  )
}

export function TransportQuoteForm({
  tourId,
  requestId,
  itemId,
  vehicleDesc,
}: {
  tourId: string
  requestId?: string
  itemId?: string
  vehicleDesc?: string
}) {
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [totalFare, setTotalFare] = useState('')
  const [includesParking, setIncludesParking] = useState(false)
  const [includesToll, setIncludesToll] = useState(false)
  const [includesAccommodation, setIncludesAccommodation] = useState(false)
  const [accommodationFee, setAccommodationFee] = useState('')
  const [includesTip, setIncludesTip] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [supplierNote, setSupplierNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [submittedStatus, setSubmittedStatus] = useState<'quoted' | 'confirmed' | null>(null)

  const handleSubmitWithStatus = async (status: 'quoted' | 'confirmed') => {
    if (!totalFare) {
      alert('請填寫車資')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/public/submit-transport-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          requestId,
          itemId,
          contact,
          phone,
          totalFare: parseFloat(totalFare),
          includesParking,
          includesToll,
          includesAccommodation,
          accommodationFee: includesAccommodation ? 0 : parseFloat(accommodationFee || '0'),
          includesTip,
          tipAmount: includesTip ? 0 : parseFloat(tipAmount || '0'),
          supplierNote,
          status, // 新增：quoted 或 confirmed
        }),
      })

      if (!res.ok) {
        throw new Error('提交失敗')
      }

      setSubmittedStatus(status)
      setSubmitted(true)
    } catch (error) {
      alert('提交失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  // 保留舊的 handleSubmit 給 form onSubmit（防止 Enter 鍵提交）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  if (submitted) {
    if (submittedStatus === 'confirmed') {
      // 報價+留車 → 顯示填司機資訊
      return (
        <div className="bg-status-info-bg border border-status-info/30 rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-semibold text-status-info">報價+留車已提交</h3>
            <p className="text-status-info mt-1">請填寫司機資訊以完成預訂</p>
          </div>
          <DriverInfoFormInline itemId={itemId || ''} />
        </div>
      )
    }

    // 僅報價
    return (
      <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-morandi-primary mb-2">報價已提交</h3>
        <p className="text-status-warning mb-4">等待旅行社確認，確認後會通知您留車</p>
      </div>
    )
  }

  return (
    <div className="border-t-4 border-morandi-gold pt-6">
      <h2 className="text-xl font-bold text-morandi-primary mb-1 flex items-center gap-2">
        📋 供應商報價回填
      </h2>
      <p className="text-sm text-morandi-secondary mb-6">請填寫以下報價資訊</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 車資 */}
        <div>
          <Label htmlFor="totalFare" className="text-base font-semibold">
            車資（總金額）<span className="text-morandi-red">*</span>
          </Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="totalFare"
              type="number"
              value={totalFare}
              onChange={e => setTotalFare(e.target.value)}
              placeholder="請輸入車資總金額"
              className="flex-1"
              required
            />
            <span className="text-morandi-secondary">元</span>
          </div>
        </div>

        {/* 勾選項目 */}
        <div className="space-y-2 bg-morandi-container p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              id="includesParking"
              checked={includesParking}
              onCheckedChange={checked => setIncludesParking(checked as boolean)}
            />
            <Label htmlFor="includesParking" className="cursor-pointer">
              是否含停車費
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="includesToll"
              checked={includesToll}
              onCheckedChange={checked => setIncludesToll(checked as boolean)}
            />
            <Label htmlFor="includesToll" className="cursor-pointer">
              是否含過路費
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="includesAccommodation"
              checked={includesAccommodation}
              onCheckedChange={checked => {
                setIncludesAccommodation(checked as boolean)
                if (checked) setAccommodationFee('')
              }}
            />
            <Label htmlFor="includesAccommodation" className="cursor-pointer flex-shrink-0">
              是否含司機住宿
            </Label>
            {!includesAccommodation && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-morandi-secondary">不含請填：</span>
                <Input
                  type="number"
                  value={accommodationFee}
                  onChange={e => {
                    setAccommodationFee(e.target.value)
                    if (e.target.value) setIncludesAccommodation(false)
                  }}
                  placeholder="金額"
                  className="w-32 h-8"
                />
                <span className="text-morandi-secondary">元</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="includesTip"
              checked={includesTip}
              onCheckedChange={checked => {
                setIncludesTip(checked as boolean)
                if (checked) setTipAmount('')
              }}
            />
            <Label htmlFor="includesTip" className="cursor-pointer flex-shrink-0">
              是否含小費
            </Label>
            {!includesTip && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-morandi-secondary">不含請填：</span>
                <Input
                  type="number"
                  value={tipAmount}
                  onChange={e => {
                    setTipAmount(e.target.value)
                    if (e.target.value) setIncludesTip(false)
                  }}
                  placeholder="金額"
                  className="w-32 h-8"
                />
                <span className="text-morandi-secondary">元</span>
              </div>
            )}
          </div>
        </div>

        {/* 聯絡資訊 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contact">聯絡人</Label>
            <Input
              id="contact"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="您的姓名"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="phone">聯絡電話</Label>
            <Input
              id="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="您的電話"
              className="mt-2"
            />
          </div>
        </div>

        {/* 備註 */}
        <div>
          <Label htmlFor="supplierNote">供應商備註（選填）</Label>
          <Textarea
            id="supplierNote"
            value={supplierNote}
            onChange={e => setSupplierNote(e.target.value)}
            placeholder="其他說明或備註事項"
            className="mt-2"
            rows={3}
          />
        </div>

        {/* 提交按鈕 - 兩個選項 */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmitWithStatus('quoted')}
            variant="outline"
            className="py-6 border-2 border-border hover:border-border text-morandi-primary font-semibold"
          >
            <div className="text-center">
              <div className="text-lg">📋 僅報價</div>
              <div className="text-xs text-morandi-secondary mt-1">（未留車）</div>
            </div>
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmitWithStatus('confirmed')}
            className="py-6 bg-gradient-to-r from-morandi-gold to-morandi-gold-hover hover:from-green-700 hover:to-green-800 text-white font-semibold"
          >
            <div className="text-center">
              <div className="text-lg">✅ 報價+留車</div>
              <div className="text-xs text-morandi-green/80 mt-1">（已預訂）</div>
            </div>
          </Button>
        </div>
        {submitting && (
          <div className="text-center text-morandi-secondary text-sm mt-2">提交中...</div>
        )}
      </form>
    </div>
  )
}
