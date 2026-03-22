'use client'

import { useState } from 'react'
import { getCompanyName, getCompanyNameEn } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function DialogModesTestPage() {
  const [mode, setMode] = useState<'modern' | 'traditional'>('modern')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dialog 兩種模式切換測試</h1>

        {/* 切換按鈕 */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'modern' | 'traditional')} className="mb-6">
          <TabsList>
            <TabsTrigger value="modern">現代樣式（LINE/租戶）</TabsTrigger>
            <TabsTrigger value="traditional">傳統樣式（列印/傳真）</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 模擬 Dialog 內容 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
          {mode === 'modern' ? (
            <ModernView />
          ) : (
            <TraditionalView />
          )}
        </div>
      </div>
    </div>
  )
}

// 現代樣式（金色行程表）
function ModernView() {
  const companyName = getCompanyName()
  const companyNameEn = getCompanyNameEn()
  return (
    <div>
      {/* 金色標頭 */}
      <div className="bg-gradient-to-r from-[#c9a96e] to-[#b89960] px-6 py-4 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Liz高爾夫球團</h2>
            <div className="text-sm opacity-90 mt-1">團號：TW260321A</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-lg">{companyName}</div>
            <div className="text-xs opacity-80 mt-1">{companyNameEn}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6 text-sm opacity-90">
          <span>出發日期：2026-03-21</span>
          <span>行程天數：3 天</span>
          <span>團隊人數：10 人</span>
        </div>
      </div>

      {/* 米黃色團資訊條 */}
      <div className="bg-[#faf8f5] px-6 py-3 border-b flex items-center gap-6 text-sm">
        <span><strong>團號：</strong>TW260321A</span>
        <span><strong>團名：</strong>Liz高爾夫球團</span>
        <span><strong>出發：</strong>2026-03-21</span>
        <span><strong>人數：</strong>10人</span>
      </div>

      {/* 金色行程表 */}
      <div className="p-6">
        <table className="w-full border-collapse text-sm">
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
            <tr className="bg-white">
              <td className="border border-[#e8e5e0] px-3 py-2">
                <div className="font-semibold text-[#c9a96e]">Day 1</div>
                <div className="text-xs text-gray-500">3/21 (五)</div>
              </td>
              <td className="border border-[#e8e5e0] px-3 py-2">台北 → 新竹 → 台中</td>
              <td className="border border-[#e8e5e0] px-3 py-2 text-center">—</td>
              <td className="border border-[#e8e5e0] px-3 py-2 text-center">球場簡餐</td>
              <td className="border border-[#e8e5e0] px-3 py-2 text-center">米其林</td>
              <td className="border border-[#e8e5e0] px-3 py-2">台中洲際酒店</td>
            </tr>
            <tr className="bg-[#fafaf5]">
              <td className="border border-[#e8e5e0] px-3 py-2">
                <div className="font-semibold text-[#c9a96e]">Day 2</div>
                <div className="text-xs text-gray-500">3/22 (六)</div>
              </td>
              <td className="border border-[#e8e5e0] px-3 py-2">台中 → 日月潭 → 台中</td>
              <td className="border border-[#e8e5e0] px-3 py-2 text-center">飯店早餐</td>
              <td className="border border-[#e8e5e0] px-3 py-2 text-center">日月潭</td>
              <td className="border border-[#e8e5e0] px-3 py-2 text-center">飯店晚餐</td>
              <td className="border border-[#e8e5e0] px-3 py-2">台中洲際酒店</td>
            </tr>
          </tbody>
        </table>

        {/* 5 個按鈕 */}
        <div className="mt-6 flex gap-3">
          <Button variant="outline">列印</Button>
          <Button variant="outline">LINE</Button>
          <Button variant="outline">Email</Button>
          <Button variant="outline">傳真</Button>
          <Button variant="outline">租戶</Button>
        </div>
      </div>
    </div>
  )
}

// 傳統樣式（A4 列印格式）
function TraditionalView() {
  const companyName = getCompanyName()
  return (
    <div className="p-8 max-w-[21cm] mx-auto bg-white">
      {/* 標題 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">廠商需求單</h1>
      </div>

      {/* 雙欄資訊 */}
      <div className="grid grid-cols-2 gap-6 mb-6 border border-black p-4">
        {/* 左欄 */}
        <div>
          <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">我方資訊</h3>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="font-bold min-w-[3cm]">團號：</span>
              <span>TW260321A</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[3cm]">團體名稱：</span>
              <span>Liz高爾夫球團</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[3cm]">總人數：</span>
              <span>10 人</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[3cm]">出發日期：</span>
              <span>2026-03-21</span>
            </div>
          </div>
        </div>

        {/* 右欄 */}
        <div>
          <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">供應商資訊</h3>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="font-bold min-w-[3cm]">供應商：</span>
              <span className="text-gray-400">[下拉選單]</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[3cm]">聯絡人：</span>
              <span className="text-gray-400">(自動帶入)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[3cm]">電話：</span>
              <span className="text-gray-400">(自動帶入)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold min-w-[3cm]">傳真：</span>
              <span className="text-gray-400">(自動帶入)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 交通表 */}
      <h3 className="text-lg font-bold mb-3">交通表</h3>
      <table className="w-full border-collapse mb-6 text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-3 py-2 text-left w-[3cm]">天數</th>
            <th className="border border-black px-3 py-2 text-left w-[3cm]">日期</th>
            <th className="border border-black px-3 py-2 text-left">行程內容</th>
            <th className="border border-black px-3 py-2 text-left w-[3cm]">車資報價</th>
            <th className="border border-black px-3 py-2 text-left w-[3cm]">備註</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-3 py-2">Day 1</td>
            <td className="border border-black px-3 py-2">3/21 (五)</td>
            <td className="border border-black px-3 py-2">台北 → 新竹 → 台中</td>
            <td className="border border-black px-3 py-2"></td>
            <td className="border border-black px-3 py-2"></td>
          </tr>
          <tr>
            <td className="border border-black px-3 py-2">Day 2</td>
            <td className="border border-black px-3 py-2">3/22 (六)</td>
            <td className="border border-black px-3 py-2">台中 → 日月潭 → 台中</td>
            <td className="border border-black px-3 py-2"></td>
            <td className="border border-black px-3 py-2"></td>
          </tr>
        </tbody>
      </table>

      {/* 頁尾 */}
      <div className="border-t-2 border-black pt-4 mt-8 text-sm">
        <div className="font-bold mb-2">敬請確認回傳資訊</div>
        <div>{companyName}</div>
        <div>電話：02-2345-6789</div>
        <div>傳真：02-2345-6788</div>
      </div>
    </div>
  )
}
