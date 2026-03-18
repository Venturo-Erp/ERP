'use client'

import { printTransportRequirement } from '@/features/confirmations/utils/printTransportRequirement'
import { Button } from '@/components/ui/button'

export default function TestPrintTransportPage() {
  const handlePrint = () => {
    printTransportRequirement({
      supplierName: '中興遊覽車',
      tourCode: 'TW260321A',
      tourName: 'Liz高爾夫球團',
      totalPax: 10,
      departureDate: '2026-03-21',
      returnDate: '2026-03-23',
      transportDays: [
        {
          dayNumber: 1,
          date: '3/21 (週五)',
          route: '台北 → 新竹 → 台中',
        },
        {
          dayNumber: 2,
          date: '3/22 (週六)',
          route: '台中 → 日月潭 → 台中',
        },
        {
          dayNumber: 3,
          date: '3/23 (週日)',
          route: '台中 → 台北',
        },
      ],
      vehicleType: '43人座遊覽車',
      note: '需要冷氣車\n司機需配合行程調整',
      invoiceSealUrl: '', // 測試時先不顯示
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">測試交通需求單列印</h1>
        <p className="text-gray-600 mb-6">
          點擊下方按鈕測試列印效果。
        </p>
        <Button onClick={handlePrint} className="w-full">
          列印交通需求單
        </Button>
        <div className="mt-6 text-sm text-gray-500">
          <p>測試資料：</p>
          <ul className="list-disc list-inside mt-2">
            <li>供應商：中興遊覽車</li>
            <li>團號：TW260321A</li>
            <li>團名：Liz高爾夫球團</li>
            <li>人數：10人</li>
            <li>天數：3天</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
