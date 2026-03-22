'use client'

import { COMPANY_NAME } from '@/lib/tenant'

export default function DialogComparePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-center mb-8">Dialog 兩種樣式對比</h1>
      
      <div className="grid grid-cols-2 gap-8 max-w-[1800px] mx-auto">
        {/* 左邊：現代樣式 */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-center bg-blue-100 py-2 rounded">現代樣式（LINE/租戶）</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border scale-75 origin-top">
            <ModernView />
          </div>
        </div>

        {/* 右邊：傳統樣式 */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-center bg-green-100 py-2 rounded">傳統樣式（列印/傳真）</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border scale-75 origin-top">
            <TraditionalView />
          </div>
        </div>
      </div>
    </div>
  )
}

// 現代樣式
function ModernView() {
  return (
    <div>
      <div className="bg-gradient-to-r from-[#c9a96e] to-[#b89960] px-6 py-4 text-white">
        <div className="flex justify-between">
          <div>
            <h2 className="text-2xl font-bold">Liz高爾夫球團</h2>
            <div className="text-sm opacity-90">團號：TW260321A</div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{COMPANY_NAME}</div>
          </div>
        </div>
      </div>

      <div className="bg-[#faf8f5] px-6 py-3 text-sm flex gap-4">
        <span><strong>團號：</strong>TW260321A</span>
        <span><strong>人數：</strong>10人</span>
      </div>

      <div className="p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#c9a96e] text-white">
              <th className="px-2 py-1">日期</th>
              <th className="px-2 py-1">行程</th>
              <th className="px-2 py-1">午餐</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-2 py-1">Day 1</td>
              <td className="border px-2 py-1">台北→台中</td>
              <td className="border px-2 py-1">球場</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex gap-2">
          <button className="px-3 py-1 border rounded text-xs">列印</button>
          <button className="px-3 py-1 border rounded text-xs">LINE</button>
        </div>
      </div>
    </div>
  )
}

// 傳統樣式
function TraditionalView() {
  return (
    <div className="p-6">
      <h1 className="text-center text-xl font-bold mb-4">廠商需求單</h1>
      
      <div className="grid grid-cols-2 gap-4 border border-black p-3 mb-4 text-sm">
        <div>
          <h3 className="font-bold border-b-2 border-black mb-2">我方資訊</h3>
          <div><strong>團號：</strong>TW260321A</div>
          <div><strong>人數：</strong>10人</div>
        </div>
        <div>
          <h3 className="font-bold border-b-2 border-black mb-2">供應商</h3>
          <div><strong>供應商：</strong><span className="text-gray-400">[下拉]</span></div>
          <div><strong>電話：</strong><span className="text-gray-400">(自動)</span></div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-2 py-1">天數</th>
            <th className="border border-black px-2 py-1">行程</th>
            <th className="border border-black px-2 py-1">報價</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1">Day 1</td>
            <td className="border border-black px-2 py-1">台北→台中</td>
            <td className="border border-black px-2 py-1"></td>
          </tr>
        </tbody>
      </table>

      <div className="border-t-2 border-black pt-2 text-xs">
        <div>{COMPANY_NAME}</div>
        <div>電話：02-2345-6789</div>
      </div>
    </div>
  )
}
