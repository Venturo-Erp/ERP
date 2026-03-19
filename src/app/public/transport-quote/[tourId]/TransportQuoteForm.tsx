'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

export function TransportQuoteForm({
  tourId,
  requestId,
  vehicleDesc,
}: {
  tourId: string
  requestId?: string
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
          requestId, // 單一性：綁定到特定需求單
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
        }),
      })

      if (!res.ok) {
        throw new Error('提交失敗')
      }

      setSubmitted(true)
    } catch (error) {
      alert('提交失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-green-900 mb-2">報價已提交</h3>
        <p className="text-green-700 mb-4">感謝您的報價，我們會盡快與您聯繫</p>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="border-green-600 text-green-700"
        >
          下載此報價
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t-4 border-[#c9a96e] pt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        📋 供應商報價回填
      </h2>
      <p className="text-sm text-gray-600 mb-6">請填寫以下報價資訊</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 車資 */}
        <div>
          <Label htmlFor="totalFare" className="text-base font-semibold">
            車資（總金額）<span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="totalFare"
              type="number"
              value={totalFare}
              onChange={(e) => setTotalFare(e.target.value)}
              placeholder="請輸入車資總金額"
              className="flex-1"
              required
            />
            <span className="text-gray-600">元</span>
          </div>
        </div>

        {/* 勾選項目 */}
        <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              id="includesParking"
              checked={includesParking}
              onCheckedChange={(checked) => setIncludesParking(checked as boolean)}
            />
            <Label htmlFor="includesParking" className="cursor-pointer">
              是否含停車費
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="includesToll"
              checked={includesToll}
              onCheckedChange={(checked) => setIncludesToll(checked as boolean)}
            />
            <Label htmlFor="includesToll" className="cursor-pointer">
              是否含過路費
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="includesAccommodation"
              checked={includesAccommodation}
              onCheckedChange={(checked) => {
                setIncludesAccommodation(checked as boolean)
                if (checked) setAccommodationFee('')
              }}
            />
            <Label htmlFor="includesAccommodation" className="cursor-pointer flex-shrink-0">
              是否含司機住宿
            </Label>
            {!includesAccommodation && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">不含請填：</span>
                <Input
                  type="number"
                  value={accommodationFee}
                  onChange={(e) => {
                    setAccommodationFee(e.target.value)
                    if (e.target.value) setIncludesAccommodation(false)
                  }}
                  placeholder="金額"
                  className="w-32 h-8"
                />
                <span className="text-gray-600">元</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="includesTip"
              checked={includesTip}
              onCheckedChange={(checked) => {
                setIncludesTip(checked as boolean)
                if (checked) setTipAmount('')
              }}
            />
            <Label htmlFor="includesTip" className="cursor-pointer flex-shrink-0">
              是否含小費
            </Label>
            {!includesTip && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">不含請填：</span>
                <Input
                  type="number"
                  value={tipAmount}
                  onChange={(e) => {
                    setTipAmount(e.target.value)
                    if (e.target.value) setIncludesTip(false)
                  }}
                  placeholder="金額"
                  className="w-32 h-8"
                />
                <span className="text-gray-600">元</span>
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
              onChange={(e) => setContact(e.target.value)}
              placeholder="您的姓名"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="phone">聯絡電話</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            onChange={(e) => setSupplierNote(e.target.value)}
            placeholder="其他說明或備註事項"
            className="mt-2"
            rows={3}
          />
        </div>

        {/* 提交按鈕 */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-[#c9a96e] to-[#b89960] hover:from-[#b89960] hover:to-[#a88850] text-white font-semibold py-3"
        >
          {submitting ? '提交中...' : '提交報價'}
        </Button>
      </form>
    </div>
  )
}
