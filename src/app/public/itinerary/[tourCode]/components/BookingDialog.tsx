'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Traveler {
  id: string
  chineseName: string
  pinyinName: string
  dateOfBirth: string
}

export function BookingDialog({
  open,
  onClose,
  itinerary,
  salesPersonId,
}: {
  open: boolean
  onClose: () => void
  itinerary: { tour_id?: string; title?: string }
  salesPersonId?: string
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    memberCount: 1,
  })
  const [travelers, setTravelers] = useState<Traveler[]>([
    { id: '1', chineseName: '', pinyinName: '', dateOfBirth: '' },
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/orders/create-from-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: itinerary.tour_id,
          contact_person: formData.name,
          contact_phone: formData.phone,
          contact_email: formData.email,
          member_count: formData.memberCount,
          sales_person_id: salesPersonId,
          travelers,
        }),
      })

      if (!res.ok) throw new Error('建立訂單失敗')
      toast.success('報名成功！我們會盡快與您聯繫')
      onClose()
    } catch (error) {
      toast.error('報名失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const addTraveler = () => {
    setTravelers([
      ...travelers,
      { id: String(Date.now()), chineseName: '', pinyinName: '', dateOfBirth: '' },
    ])
  }

  const removeTraveler = (id: string) => {
    setTravelers(travelers.filter(t => t.id !== id))
  }

  const updateTraveler = (id: string, field: keyof Traveler, value: string) => {
    setTravelers(travelers.map(t => (t.id === id ? { ...t, [field]: value } : t)))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent level={1} className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <form onSubmit={handleSubmit} className="space-y-8 p-6">
          {/* Hero */}
          <div className="text-center border-b border-border pb-6">
            <p className="text-morandi-primary font-medium tracking-widest uppercase text-xs mb-2">
              Registration Portal
            </p>
            <h1 className="text-4xl font-serif tracking-tight leading-tight mb-4">
              {itinerary.title}
            </h1>
            <p className="text-gray-600 text-sm">
              Complete your dossier for the upcoming excursion
            </p>
          </div>

          {/* Contact Info */}
          <section className="bg-gray-50 p-8 rounded-xl border-l-4 border-morandi-primary">
            <h2 className="text-xl font-serif mb-6 flex items-center gap-2">
              <span className="text-2xl">👤</span> Contact Intelligence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-morandi-primary uppercase tracking-widest">
                  Full Name
                </label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="姓名"
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-morandi-primary uppercase tracking-widest">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-morandi-primary uppercase tracking-widest">
                  Mobile Number
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+886 912 345 678"
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-morandi-primary uppercase tracking-widest">
                  Total Participants
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.memberCount}
                  onChange={e =>
                    setFormData({ ...formData, memberCount: parseInt(e.target.value) })
                  }
                  className="bg-white"
                />
              </div>
            </div>
          </section>

          {/* Travelers */}
          <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-border pb-4">
              <h2 className="text-2xl font-serif italic">Traveler Dossiers</h2>
              <p className="text-sm text-gray-500">Entry {travelers.length} total</p>
            </div>

            {travelers.map((traveler, index) => (
              <div
                key={traveler.id}
                className="bg-white p-8 rounded-xl ring-1 ring-gray-200 shadow-sm relative"
              >
                <div className="absolute top-4 right-4 text-8xl font-serif font-bold text-gray-100 select-none">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-morandi-primary uppercase tracking-widest">
                      中文姓名
                    </label>
                    <Input
                      value={traveler.chineseName}
                      onChange={e => updateTraveler(traveler.id, 'chineseName', e.target.value)}
                      placeholder="王小明"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-morandi-primary uppercase tracking-widest">
                      Passport Pinyin
                    </label>
                    <Input
                      value={traveler.pinyinName}
                      onChange={e => updateTraveler(traveler.id, 'pinyinName', e.target.value)}
                      placeholder="WANG XIAO MING"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-morandi-primary uppercase tracking-widest">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={traveler.dateOfBirth}
                      onChange={e => updateTraveler(traveler.id, 'dateOfBirth', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>

                {travelers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTraveler(traveler.id)}
                    className="absolute top-4 left-4 text-red-500 text-sm hover:underline"
                  >
                    移除
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addTraveler}
              className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-morandi-primary hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-2"
            >
              <span className="text-2xl">+</span>
              <span className="text-sm font-bold uppercase tracking-widest text-gray-600">
                Add Traveler Dossier
              </span>
            </button>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between gap-6 pt-8 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="px-8"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-12 py-6 bg-morandi-primary text-white font-bold uppercase tracking-[0.2em] rounded-md shadow-lg hover:bg-morandi-primary"
            >
              {loading ? '提交中...' : 'Finalize Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
