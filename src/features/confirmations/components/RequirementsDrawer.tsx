/**
 * RequirementsDrawer - 需求單抽屜（整合需求/追蹤/確認）
 * 
 * Morandi 設計風格：表格列表 + 折疊抽屜
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Send, MessageSquare, CheckCircle, FileText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

interface RequirementsDrawerProps {
  requests: RequestItem[]
  onRefresh: () => void
}

const STATUS_CONFIG = {
  draft: {
    label: '草稿',
    icon: FileText,
    bgClass: 'bg-gray-50',
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
    label: '已回覆',
    icon: MessageSquare,
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-200',
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

const TYPE_LABELS: Record<string, string> = {
  mixed: '綜合',
  transport: '交通',
  accommodation: '住宿',
  meal: '餐食',
  activity: '活動',
  cancellation: '取消',
  other: '其他',
}

export function RequirementsDrawer({ requests, onRefresh }: RequirementsDrawerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="border border-morandi-gold/30 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-morandi-container/50 border-b border-morandi-gold/20">
            <th className="px-3 py-3 text-center w-10"></th>
            <th className="px-3 py-3 text-left font-medium text-morandi-primary w-24">類型</th>
            <th className="px-3 py-3 text-left font-medium text-morandi-primary">供應商</th>
            <th className="px-3 py-3 text-center font-medium text-morandi-primary w-20">項目數</th>
            <th className="px-3 py-3 text-center font-medium text-morandi-primary w-28">狀態</th>
            <th className="px-3 py-3 text-left font-medium text-morandi-primary w-32">建立時間</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => {
            const isExpanded = expandedId === req.id
            const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.draft
            const StatusIcon = statusConfig.icon
            const typeLabel = TYPE_LABELS[req.request_type] || req.request_type

            return (
              <>
                {/* 主行 */}
                <tr
                  key={req.id}
                  className={cn(
                    'border-t border-morandi-gold/10 hover:bg-morandi-container/20 cursor-pointer transition-colors',
                    isExpanded && 'bg-morandi-container/30'
                  )}
                  onClick={() => toggleExpand(req.id)}
                >
                  <td className="px-3 py-3 text-center">
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-morandi-secondary" />
                    ) : (
                      <ChevronRight size={16} className="text-morandi-secondary" />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-block px-2 py-1 rounded text-xs bg-morandi-container/50 text-morandi-primary">
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-morandi-primary">
                    {req.supplier_name || '—'}
                  </td>
                  <td className="px-3 py-3 text-center text-morandi-secondary">
                    {Array.isArray(req.items) ? req.items.length : 0}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                        statusConfig.bgClass,
                        statusConfig.textClass
                      )}
                    >
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-morandi-secondary">
                    {req.created_at ? new Date(req.created_at).toLocaleDateString('zh-TW') : '—'}
                  </td>
                </tr>

                {/* 展開抽屜 */}
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="bg-morandi-container/10 border-t border-morandi-gold/10">
                        <div className="p-6 space-y-6">
                          {/* 需求內容 */}
                          <div>
                            <h4 className="text-sm font-semibold text-morandi-primary mb-3 flex items-center gap-2">
                              <FileText size={16} />
                              需求內容
                            </h4>
                            <div className="bg-white border border-morandi-gold/20 rounded-lg p-4">
                              {Array.isArray(req.items) && req.items.length > 0 ? (
                                <ul className="space-y-2 text-sm text-morandi-secondary">
                                  {req.items.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="text-morandi-gold">•</span>
                                      <span>
                                        {item.name || item.title || '項目'}{' '}
                                        {item.quantity && `× ${item.quantity}`}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-morandi-muted">無項目</p>
                              )}
                            </div>
                          </div>

                          {/* 追蹤狀態 */}
                          {req.sent_at && (
                            <div>
                              <h4 className="text-sm font-semibold text-morandi-primary mb-3 flex items-center gap-2">
                                <Send size={16} />
                                追蹤狀態
                              </h4>
                              <div className="bg-white border border-morandi-gold/20 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-morandi-secondary">發送時間：</span>
                                  <span className="text-morandi-primary">
                                    {new Date(req.sent_at).toLocaleString('zh-TW')}
                                  </span>
                                </div>
                                {req.sent_via && (
                                  <div className="flex justify-between">
                                    <span className="text-morandi-secondary">發送方式：</span>
                                    <span className="text-morandi-primary uppercase">{req.sent_via}</span>
                                  </div>
                                )}
                                {req.sent_to && (
                                  <div className="flex justify-between">
                                    <span className="text-morandi-secondary">發送對象：</span>
                                    <span className="text-morandi-primary">{req.sent_to}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 廠商回覆 */}
                          {req.replied_at && (
                            <div>
                              <h4 className="text-sm font-semibold text-morandi-primary mb-3 flex items-center gap-2">
                                <MessageSquare size={16} />
                                廠商回覆
                              </h4>
                              <div className="bg-white border border-morandi-gold/20 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-morandi-secondary">回覆時間：</span>
                                  <span className="text-morandi-primary">
                                    {new Date(req.replied_at).toLocaleString('zh-TW')}
                                  </span>
                                </div>
                                {req.supplier_response && (
                                  <div>
                                    <span className="text-morandi-secondary">報價內容：</span>
                                    <pre className="mt-2 p-3 bg-morandi-container/20 rounded text-xs text-morandi-primary overflow-auto">
                                      {JSON.stringify(req.supplier_response, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 確認狀態 */}
                          {req.confirmed_at && (
                            <div>
                              <h4 className="text-sm font-semibold text-morandi-primary mb-3 flex items-center gap-2">
                                <CheckCircle size={16} />
                                確認狀態
                              </h4>
                              <div className="bg-white border border-morandi-gold/20 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-morandi-secondary">確認時間：</span>
                                  <span className="text-morandi-primary">
                                    {new Date(req.confirmed_at).toLocaleString('zh-TW')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 備註 */}
                          {req.note && (
                            <div>
                              <h4 className="text-sm font-semibold text-morandi-secondary mb-2">備註</h4>
                              <p className="text-sm text-morandi-primary bg-white border border-morandi-gold/20 rounded-lg p-3">
                                {req.note}
                              </p>
                            </div>
                          )}

                          {/* 操作按鈕 */}
                          <div className="flex gap-3 pt-4 border-t border-morandi-gold/10">
                            <button className="px-4 py-2 rounded-lg bg-morandi-gold text-white text-sm font-medium hover:bg-morandi-gold-hover transition-colors">
                              重新發送
                            </button>
                            {req.status === 'replied' && (
                              <button className="px-4 py-2 rounded-lg bg-morandi-green text-white text-sm font-medium hover:opacity-90 transition-opacity">
                                確認訂位
                              </button>
                            )}
                            {req.status === 'outdated' && (
                              <button className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors">
                                更新內容
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedId(null)
                              }}
                              className="px-4 py-2 rounded-lg border border-morandi-gold/30 text-morandi-secondary text-sm font-medium hover:bg-morandi-container/20 transition-colors"
                            >
                              關閉
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>

      {requests.length === 0 && (
        <div className="py-12 text-center text-morandi-muted">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p>尚無需求單</p>
        </div>
      )}
    </div>
  )
}
