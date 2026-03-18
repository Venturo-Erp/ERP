/**
 * 交通需求單 - 傳統樣式（列印/傳真用）
 * 莫蘭迪色系、雙欄資訊、供應商下拉
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface DaySchedule {
  dayNumber: number
  date: string
  route: string
}

interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  fax: string | null
}

interface TransportTraditionalViewProps {
  tour: { code: string; name: string; departure_date?: string } | null
  totalPax: number | null
  daySchedules: DaySchedule[]
  vehicleDesc?: string
  note: string
  setNote: (note: string) => void
  suppliers: Supplier[]
  selectedSupplierId: string
  setSelectedSupplierId: (id: string) => void
  invoiceSealUrl?: string
  onPrint: () => void
  onBackToModern: () => void
  onClose: () => void
}

export function TransportTraditionalView({
  tour,
  totalPax,
  daySchedules,
  vehicleDesc,
  note,
  setNote,
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  invoiceSealUrl,
  onPrint,
  onBackToModern,
  onClose,
}: TransportTraditionalViewProps) {
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId)

  return (
    <div className="bg-white p-6">
      {/* 標題 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">廠商需求單</h2>
        <div className="text-right text-sm text-gray-600">
          <div className="font-semibold">角落旅行社</div>
          <div className="text-xs">Corner Travel</div>
        </div>
      </div>

      {/* 雙欄資訊 */}
      <div className="grid grid-cols-2 gap-6 mb-6 p-4 border-2 border-[#a8a29e] rounded-lg bg-gradient-to-br from-[#faf8f5] to-[#f5f1ea]">
        {/* 左欄 */}
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">團號：</span>
            <span className="text-gray-800">{tour?.code || '—'}</span>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">團名：</span>
            <span className="text-gray-800">{tour?.name || '—'}</span>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">人數：</span>
            <span className="text-gray-800">{totalPax || '—'} 人</span>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">出發日：</span>
            <span className="text-gray-800">{tour?.departure_date || '—'}</span>
          </div>
        </div>

        {/* 右欄 - 供應商 */}
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[5rem_1fr] gap-2 items-center">
            <span className="font-semibold text-[#78716c]">供應商：</span>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="h-8 bg-white">
                <SelectValue placeholder="選擇供應商" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">聯絡人：</span>
            <span className="text-gray-600">{selectedSupplier?.contact_person || '—'}</span>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">電話：</span>
            <span className="text-gray-600">{selectedSupplier?.phone || '—'}</span>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">傳真：</span>
            <span className="text-gray-600">{selectedSupplier?.fax || '—'}</span>
          </div>
        </div>
      </div>

      {/* 交通表 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#78716c] mb-3">交通表</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-gray-800">
              <th className="border border-[#a8a29e] px-3 py-2 text-left w-20">天數</th>
              <th className="border border-[#a8a29e] px-3 py-2 text-left w-24">日期</th>
              <th className="border border-[#a8a29e] px-3 py-2 text-left">行程內容</th>
            </tr>
          </thead>
          <tbody>
            {daySchedules.map((day, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
                <td className="border border-[#a8a29e] px-3 py-2 font-medium">Day {day.dayNumber}</td>
                <td className="border border-[#a8a29e] px-3 py-2 text-gray-600">{day.date}</td>
                <td className="border border-[#a8a29e] px-3 py-2">{day.route}</td>
              </tr>
            ))}
            {vehicleDesc && (
              <tr>
                <td colSpan={3} className="border border-[#a8a29e] px-3 py-2 bg-[#f5f1ea]">
                  <strong className="text-[#78716c]">車型需求：</strong>
                  <span className="ml-2">{vehicleDesc}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 報價欄位 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#78716c] mb-3">報價欄位</h3>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="bg-white">
              <td className="border border-[#a8a29e] px-3 py-3 font-semibold text-[#78716c] w-48">車資（總金額）</td>
              <td className="border border-[#a8a29e] px-3 py-3">NT$ _________________</td>
            </tr>
            <tr className="bg-[#fafaf8]">
              <td className="border border-[#a8a29e] px-3 py-3 font-semibold text-[#78716c]">是否含停車費</td>
              <td className="border border-[#a8a29e] px-3 py-3">
                <span className="inline-flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-400 inline-block"></span>
                    是
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-400 inline-block"></span>
                    否
                  </label>
                </span>
              </td>
            </tr>
            <tr className="bg-white">
              <td className="border border-[#a8a29e] px-3 py-3 font-semibold text-[#78716c]">是否含過路費</td>
              <td className="border border-[#a8a29e] px-3 py-3">
                <span className="inline-flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-400 inline-block"></span>
                    是
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-400 inline-block"></span>
                    否
                  </label>
                </span>
              </td>
            </tr>
            <tr className="bg-[#fafaf8]">
              <td className="border border-[#a8a29e] px-3 py-3 font-semibold text-[#78716c]">是否含司機住宿</td>
              <td className="border border-[#a8a29e] px-3 py-3">
                <span className="inline-flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-400 inline-block"></span>
                    是
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-400 inline-block"></span>
                    否，住宿費：NT$ __________
                  </label>
                </span>
              </td>
            </tr>
            <tr className="bg-white">
              <td className="border border-[#a8a29e] px-3 py-3 font-semibold text-[#78716c]">是否含小費</td>
              <td className="border border-[#a8a29e] px-3 py-3">
                <span className="inline-flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-400 inline-block"></span>
                    是
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-400 inline-block"></span>
                    否，小費：NT$ __________
                  </label>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 備註 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#78716c] mb-2">備註</label>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="其他說明或備註事項"
          className="min-h-[80px] bg-white border-[#a8a29e]"
        />
      </div>

      {/* 頁尾 + 發票章 */}
      <div className="flex justify-between items-end pt-4 border-t-2 border-[#a8a29e]">
        <div className="text-sm text-gray-600">
          <div className="font-semibold text-gray-800 mb-2">敬請確認回傳資訊</div>
          <div>角落旅行社</div>
          <div>電話：02-2345-6789</div>
          <div>傳真：02-2345-6788</div>
          <div>Email：service@cornertravel.com.tw</div>
          <div>台北市信義區信義路五段7號</div>
        </div>
        {invoiceSealUrl && (
          <div>
            <img src={invoiceSealUrl} alt="發票章" className="max-w-[8rem] max-h-[8rem]" />
          </div>
        )}
      </div>

      {/* 底部按鈕 */}
      <div className="mt-6 flex justify-between items-center pt-4 border-t-2 border-[#a8a29e]">
        <Button onClick={onPrint} className="bg-[#a8a29e] hover:bg-[#78716c]">
          <Printer className="mr-2 h-4 w-4" />
          列印需求單
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBackToModern}>
            返回現代樣式
          </Button>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}
