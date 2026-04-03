'use client'

import { useState } from 'react'
import { useDestinations } from '@/data/entities/destinations'
import { DestinationReviewCard } from '@/features/destinations/components/DestinationReviewCard'
import { VerificationProgress } from '@/features/destinations/components/VerificationProgress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function DestinationReviewPage() {
  const { items: destinations, loading: isLoading } = useDestinations()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-gold mx-auto mb-4"></div>
          <p className="text-morandi-secondary">載入景點資料中...</p>
        </div>
      </div>
    )
  }

  // 過濾景點
  const filteredDestinations = destinations?.filter((dest) => {
    // 狀態篩選
    if (filterStatus !== 'all' && dest.verification_status !== filterStatus) {
      return false
    }

    // 搜尋篩選
    if (searchQuery && !dest.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    return true
  })

  // 統計
  const stats = {
    total: destinations?.length || 0,
    verified: destinations?.filter(d => d.verification_status === 'verified').length || 0,
    pending: destinations?.filter(d => d.verification_status === 'pending').length || 0,
    reviewing: destinations?.filter(d => d.verification_status === 'reviewing').length || 0,
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">景點資料確認</h1>
        <p className="text-morandi-secondary">
          人工確認 Nova 爬取的資料，補齊必填欄位後即可進行距離計算
        </p>
      </div>

      {/* 進度總覽 */}
      <VerificationProgress stats={stats} />

      {/* 篩選工具列 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜尋 */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="搜尋景點名稱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* 狀態篩選 */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="篩選狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部（{stats.total}）</SelectItem>
              <SelectItem value="pending">待確認（{stats.pending}）</SelectItem>
              <SelectItem value="reviewing">確認中（{stats.reviewing}）</SelectItem>
              <SelectItem value="verified">已確認（{stats.verified}）</SelectItem>
            </SelectContent>
          </Select>

          {/* 排序 */}
          <Button variant="outline" className="w-full md:w-auto">
            依優先級排序
          </Button>
        </div>
      </div>

      {/* 景點列表 */}
      <div className="space-y-6">
        {filteredDestinations?.map((destination) => (
          <DestinationReviewCard
            key={destination.id}
            destination={destination}
          />
        ))}

        {filteredDestinations?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">沒有符合條件的景點</p>
          </div>
        )}
      </div>
    </div>
  )
}
