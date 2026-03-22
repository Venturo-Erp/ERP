'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface TeamConfirmationSheetProps {
  open: boolean
  onClose: () => void
  tour: {
    code: string
    name: string
    departure_date: string
    return_date: string
    current_participants: number
  } | null
  confirmedRequests: Array<{
    id: string
    request_type: string
    supplier_name: string
    items: any[]
    note?: string
    sent_to?: string
    supplier_response?: any
    metadata?: any
    status?: string
  }>
}

export function TeamConfirmationSheet({
  open,
  onClose,
  tour,
  confirmedRequests,
}: TeamConfirmationSheetProps) {
  if (!tour) return null

  // 計算天數
  const totalDays =
    tour.departure_date && tour.return_date
      ? Math.ceil(
          (new Date(tour.return_date).getTime() - new Date(tour.departure_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0

  // 按天分組（從 metadata.dayNumber 或 items 推斷）
  const requestsByDay = new Map<number, typeof confirmedRequests>()

  for (const req of confirmedRequests) {
    // 嘗試從不同地方取得 day
    let day = 0
    if (req.metadata?.dayNumber) {
      day = req.metadata.dayNumber
    } else if (req.items && req.items[0]) {
      // 從 items 的日期推斷
      const firstItem = req.items[0]
      if (firstItem.check_in_date || firstItem.meal_time || firstItem.activity_time) {
        // TODO: 從日期推斷 day number（需要 tour.departure_date 計算）
        day = 1 // 暫時預設 Day 1
      }
    }

    if (!requestsByDay.has(day)) {
      requestsByDay.set(day, [])
    }
    requestsByDay.get(day)!.push(req)
  }

  // 排序（Day 0 放最後，其他按順序）
  const sortedDays = Array.from(requestsByDay.keys()).sort((a, b) => {
    if (a === 0) return 1
    if (b === 0) return -1
    return a - b
  })

  const handlePrint = () => {
    window.print()
  }

  const TYPE_LABELS: Record<string, string> = {
    accommodation: '🏨 住宿',
    meal: '🍽️ 餐食',
    transport: '🚌 交通',
    activity: '🎉 活動',
    other: '📋 其他',
  }

  const TYPE_ORDER = ['accommodation', 'meal', 'transport', 'activity', 'other']

  // 狀態配置
  const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
    draft: { label: '草稿', bgClass: 'bg-morandi-container', textClass: 'text-morandi-primary' },
    sent: { label: '已發送', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
    replied: { label: '已回覆', bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
    confirmed: { label: '✓ 已確認', bgClass: 'bg-green-100', textClass: 'text-green-700' },
    cancelled: { label: '已取消', bgClass: 'bg-red-100', textClass: 'text-red-700' },
    outdated: { label: '需更新', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
  }

  // 統計各狀態數量
  const statusCounts = confirmedRequests.reduce(
    (acc, req) => {
      const status = req.status || 'draft'
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col print:max-w-none print:h-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle>需求追蹤表（領隊核對用）</DialogTitle>
        </DialogHeader>

        {/* 可列印內容 */}
        <div className="flex-1 overflow-y-auto pr-2 print:overflow-visible">
          <div className="print:p-8">
            {/* 標頭 */}
            <div className="mb-6 pb-4 border-b-2 border-[#c9a96e]">
              <h1 className="text-2xl font-bold text-[#c9a96e] mb-2">需求追蹤表（領隊核對用）</h1>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div>
                  <span className="font-medium">團號：</span>
                  {tour.code}
                </div>
                <div>
                  <span className="font-medium">人數：</span>
                  {tour.current_participants} 人
                </div>
                <div>
                  <span className="font-medium">團名：</span>
                  {tour.name}
                </div>
                <div>
                  <span className="font-medium">天數：</span>
                  {totalDays} 天
                </div>
                <div className="col-span-2">
                  <span className="font-medium">出發日期：</span>
                  {tour.departure_date} ~ {tour.return_date}
                </div>
              </div>
              {/* 狀態統計 */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-medium">狀態統計：</span>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
                  return (
                    <span
                      key={status}
                      className={`px-2 py-0.5 rounded ${config.bgClass} ${config.textClass}`}
                    >
                      {config.label} {count}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* 按天分組 */}
            {sortedDays.map(day => {
              const dayRequests = requestsByDay.get(day) || []

              // 按類型排序
              const sortedRequests = [...dayRequests].sort((a, b) => {
                const aIndex = TYPE_ORDER.indexOf(a.request_type)
                const bIndex = TYPE_ORDER.indexOf(b.request_type)
                return aIndex - bIndex
              })

              return (
                <div key={day} className="mb-6 break-inside-avoid">
                  <h2 className="text-lg font-bold bg-[#c9a96e] text-white px-3 py-2 rounded-t">
                    {day === 0 ? '全程項目' : `Day ${day}`}
                  </h2>

                  <div className="border border-[#c9a96e] border-t-0 rounded-b p-4 space-y-4">
                    {sortedRequests.map(req => {
                      const status = req.status || 'draft'
                      const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft

                      return (
                        <div key={req.id} className="border-l-4 border-[#c9a96e]/30 pl-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="font-semibold text-[#c9a96e]">
                                {TYPE_LABELS[req.request_type] || req.request_type}
                              </span>
                              <span className="ml-3 font-medium">{req.supplier_name}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${statusConfig.bgClass} ${statusConfig.textClass}`}
                            >
                              {statusConfig.label}
                            </span>
                          </div>

                          {/* 需求明細 */}
                          {req.request_type === 'accommodation' && req.items && (
                            <div className="text-sm space-y-1">
                              {req.items.map((item: any, idx: number) => (
                                <div key={idx} className="text-morandi-primary">
                                  • {item.room_type} × {item.quantity} 間
                                  {item.check_in_date && ` (入住 ${item.check_in_date})`}
                                </div>
                              ))}
                            </div>
                          )}

                          {req.request_type === 'meal' && req.items && (
                            <div className="text-sm space-y-1">
                              {req.items.map((item: any, idx: number) => (
                                <div key={idx} className="text-morandi-primary">
                                  • {item.meal_time || ''} {item.meal_content || item.name || ''}
                                  {item.quantity && ` (${item.quantity} 人)`}
                                </div>
                              ))}
                            </div>
                          )}

                          {req.request_type === 'transport' && req.metadata?.vehicleDesc && (
                            <div className="text-sm text-morandi-primary">
                              • {req.metadata.vehicleDesc}
                            </div>
                          )}

                          {req.request_type === 'activity' && req.items && (
                            <div className="text-sm space-y-1">
                              {req.items.map((item: any, idx: number) => (
                                <div key={idx} className="text-morandi-primary">
                                  • {item.activity_name || item.name || ''}
                                  {item.activity_time && ` (${item.activity_time})`}
                                  {item.quantity && ` (${item.quantity} 人)`}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 聯絡資訊 */}
                          {req.supplier_response && (
                            <div className="mt-2 text-sm text-morandi-secondary">
                              {req.supplier_response.contact && (
                                <div>聯絡人：{req.supplier_response.contact}</div>
                              )}
                              {req.supplier_response.phone && (
                                <div>電話：{req.supplier_response.phone}</div>
                              )}
                            </div>
                          )}

                          {/* 備註 */}
                          {req.note && (
                            <div className="mt-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                              備註：{req.note}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {sortedRequests.length === 0 && (
                      <p className="text-sm text-morandi-secondary">本日無需求項目</p>
                    )}
                  </div>
                </div>
              )
            })}

            {confirmedRequests.length === 0 && (
              <div className="text-center py-12 text-morandi-secondary">
                <p>尚無需求單</p>
                <p className="text-sm mt-2">請先在需求總覽發送需求單給供應商</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex-shrink-0 border-t pt-4 mt-2 flex items-center justify-between print:hidden">
          <div className="text-sm text-morandi-secondary">
            總需求單：{confirmedRequests.length} 筆
            {statusCounts.confirmed && (
              <span className="ml-3 text-green-600 font-medium">
                已確認 {statusCounts.confirmed} 筆
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handlePrint}
              variant="default"
              className="bg-[#c9a96e] hover:bg-[#b8960e]"
            >
              <Printer className="w-4 h-4 mr-2" />
              列印
            </Button>
            <Button variant="outline" onClick={onClose}>
              關閉
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* 列印樣式 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:overflow-visible,
          .print\\:overflow-visible * {
            visibility: visible;
          }
          .print\\:overflow-visible {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </Dialog>
  )
}
