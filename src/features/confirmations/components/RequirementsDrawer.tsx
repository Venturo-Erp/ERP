/**
 * RequirementsDrawer - 需求單卡片列表
 *
 * 一目了然的卡片式 UI：
 * - 每個供應商一張卡片
 * - 顯示供應商、需求摘要、狀態、金額
 * - 可展開查看詳細內容
 */

'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Send,
  MessageSquare,
  CheckCircle,
  FileText,
  Clock,
  Hotel,
  Bus,
  Utensils,
  Ticket,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TransportQuoteActions } from './TransportQuoteActions'

interface RequestItem {
  id: string
  request_type: string
  supplier_name: string
  items: any[]
  status: 'draft' | 'sent' | 'replied' | 'confirmed' | 'cancelled' | 'outdated'
  created_at: string
  sent_at?: string | null
  sent_via?: string | null
  sent_to?: string | null
  replied_at?: string | null
  supplier_response?: any
  confirmed_at?: string | null
  note?: string | null
  is_selected?: boolean
  // 比價組專用
  _isComparisonGroup?: boolean
  _comparisonRequests?: RequestItem[]
  _sourceId?: string
}

interface RequirementsDrawerProps {
  requests: RequestItem[]
  onRefresh: () => void
  onSelect?: (requestId: string) => void
}

const STATUS_CONFIG = {
  draft: {
    label: '草稿',
    icon: FileText,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-200',
  },
  sent: {
    label: '已發送',
    icon: Send,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
  },
  replied: {
    label: '已報價',
    icon: MessageSquare,
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  confirmed: {
    label: '已確認',
    icon: CheckCircle,
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
  },
  cancelled: {
    label: '已取消',
    icon: FileText,
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
  outdated: {
    label: '需更新',
    icon: Clock,
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
} as const

const TYPE_ICONS: Record<string, typeof Hotel> = {
  accommodation: Hotel,
  transport: Bus,
  'group-transport': Bus,
  meal: Utensils,
  activity: Ticket,
  other: FileText,
}

// 格式化需求摘要
function formatRequestSummary(req: RequestItem): string {
  const items = req.items || []
  
  if (req.request_type === 'accommodation') {
    // 住宿：顯示房型 × 數量
    const roomSummary = items
      .filter(item => item.room_type || item.name)
      .map(item => `${item.room_type || item.name} ×${item.quantity || 1}`)
      .join('、')
    return roomSummary || '—'
  }
  
  if (req.request_type === 'transport' || req.request_type === 'group-transport') {
    // 交通：顯示車型 × 數量
    const transportSummary = items
      .map(item => `${item.vehicle_type || item.name || '車輛'} ×${item.quantity || 1}`)
      .join('、')
    return transportSummary || '—'
  }
  
  // 其他：顯示項目名稱
  const otherSummary = items
    .map(item => item.name || item.title || '項目')
    .slice(0, 3)
    .join('、')
  return items.length > 3 ? `${otherSummary}...等 ${items.length} 項` : otherSummary || '—'
}

// 取得報價金額
function getQuotedPrice(req: RequestItem): number | null {
  const response = req.supplier_response
  if (!response) return null
  
  // 嘗試各種可能的金額欄位
  return response.quotedCost || response.total || response.price || response.amount || null
}

export function RequirementsDrawer({ requests, onRefresh, onSelect }: RequirementsDrawerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center text-morandi-muted border border-dashed border-morandi-gold/30 rounded-lg">
        <FileText size={48} className="mx-auto mb-3 opacity-30" />
        <p>尚無需求單</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map(req => {
        const isExpanded = expandedId === req.id
        const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.draft
        const StatusIcon = statusConfig.icon
        const TypeIcon = TYPE_ICONS[req.request_type] || FileText
        const quotedPrice = getQuotedPrice(req)
        const summary = formatRequestSummary(req)

        return (
          <div
            key={req.id}
            className={cn(
              'border rounded-lg overflow-hidden transition-all',
              req.is_selected
                ? 'border-green-500 bg-green-50/30'
                : 'border-morandi-gold/30 bg-white',
              isExpanded && 'shadow-md'
            )}
          >
            {/* 卡片主體 - 一目了然 */}
            <div
              className="p-4 cursor-pointer hover:bg-morandi-container/10 transition-colors"
              onClick={() => toggleExpand(req.id)}
            >
              <div className="flex items-start justify-between gap-4">
                {/* 左側：供應商 + 摘要 */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    'p-2 rounded-lg',
                    statusConfig.bgClass
                  )}>
                    <TypeIcon size={20} className={statusConfig.textClass} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-morandi-primary truncate">
                        {req.supplier_name || '未指定供應商'}
                      </h4>
                      {req.is_selected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                          <Star size={10} fill="currentColor" />
                          已選定
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-morandi-secondary mt-1 truncate">
                      {summary}
                    </p>
                    
                    <p className="text-xs text-morandi-muted mt-1">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString('zh-TW') : '—'}
                    </p>
                  </div>
                </div>

                {/* 右側：狀態 + 金額 */}
                <div className="flex items-center gap-4 shrink-0">
                  {quotedPrice && (
                    <span className="text-lg font-bold text-morandi-primary">
                      ${quotedPrice.toLocaleString()}
                    </span>
                  )}
                  
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                      statusConfig.bgClass,
                      statusConfig.textClass
                    )}
                  >
                    <StatusIcon size={14} />
                    {statusConfig.label}
                  </span>
                  
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-morandi-muted" />
                  ) : (
                    <ChevronRight size={20} className="text-morandi-muted" />
                  )}
                </div>
              </div>
            </div>

            {/* 展開內容 */}
            {isExpanded && (
              <div className="border-t border-morandi-gold/20 bg-morandi-container/5 p-4 space-y-4">
                {/* 需求內容 */}
                <div>
                  <h5 className="text-sm font-medium text-morandi-primary mb-2">需求內容</h5>
                  <div className="bg-white border border-morandi-gold/20 rounded-lg p-3">
                    {Array.isArray(req.items) && req.items.length > 0 ? (
                      <div className="space-y-2 text-sm">
                        {req.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-morandi-secondary">
                              {item.room_type || item.vehicle_type || item.name || item.title || '項目'}
                            </span>
                            <span className="text-morandi-primary font-medium">
                              ×{item.quantity || 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-morandi-muted">無項目</p>
                    )}
                  </div>
                </div>

                {/* 追蹤資訊 */}
                {req.sent_at && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-morandi-muted">發送時間：</span>
                      <span className="text-morandi-primary ml-1">
                        {new Date(req.sent_at).toLocaleString('zh-TW')}
                      </span>
                    </div>
                    {req.sent_via && (
                      <div>
                        <span className="text-morandi-muted">發送方式：</span>
                        <span className="text-morandi-primary ml-1 uppercase">
                          {req.sent_via}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 廠商回覆 */}
                {req.replied_at && req.supplier_response && (
                  <div>
                    <h5 className="text-sm font-medium text-morandi-primary mb-2">廠商回覆</h5>
                    <div className="bg-white border border-morandi-gold/20 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-morandi-muted">
                          回覆時間：{new Date(req.replied_at).toLocaleString('zh-TW')}
                        </span>
                        {quotedPrice && (
                          <span className="text-lg font-bold text-green-600">
                            ${quotedPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      {/* 交通報價專用組件 */}
                      {(req.request_type === 'transport' || req.request_type === 'group-transport') && (
                        <TransportQuoteActions
                          quote={{
                            id: req.id,
                            tour_id: '',
                            supplier_name: req.supplier_name,
                            status: req.status,
                            supplier_response: req.supplier_response,
                            replied_at: req.replied_at || undefined,
                          }}
                          onUpdate={onRefresh}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* 備註 */}
                {req.note && (
                  <div>
                    <h5 className="text-sm font-medium text-morandi-primary mb-2">備註</h5>
                    <p className="text-sm text-morandi-secondary bg-white border border-morandi-gold/20 rounded-lg p-3">
                      {req.note}
                    </p>
                  </div>
                )}

                {/* 操作按鈕 */}
                <div className="flex gap-2 pt-2 border-t border-morandi-gold/10">
                  {req.status === 'replied' && !req.is_selected && onSelect && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(req.id)
                      }}
                    >
                      <Star size={14} className="mr-1" />
                      選定此供應商
                    </Button>
                  )}
                  
                  {req.status === 'draft' && (
                    <Button size="sm" variant="outline">
                      <Send size={14} className="mr-1" />
                      發送
                    </Button>
                  )}
                  
                  {req.status === 'sent' && (
                    <Button size="sm" variant="outline">
                      <Send size={14} className="mr-1" />
                      重新發送
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedId(null)
                    }}
                  >
                    收合
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
