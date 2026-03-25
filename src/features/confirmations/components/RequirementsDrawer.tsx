/**
 * RequirementsDrawer - 需求追蹤列表
 *
 * 欄位：項目 | 備註 | 報價 | 狀態/供應商 | 操作
 * 
 * 狀態流程：
 * - 待作業：還沒發給任何供應商
 * - 作業中：已發出去，等待回覆
 * - 待確認：有供應商回覆了
 * - 已確認：選定了供應商
 * - 已完成：供應商確認 OK
 */

'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface RequestItem {
  id: string
  title: string  // 項目名稱
  category: string  // 類型（accommodation, transport, etc）
  note?: string | null  // 備註
  quoted_price?: number | null  // 報價金額（業務報給客戶的）
  status: 'pending' | 'in_progress' | 'awaiting_confirmation' | 'confirmed' | 'completed'
  supplier_name?: string | null  // 選定的供應商（確認後才有）
  supplier_count?: number  // 已發送給幾個供應商
  replied_count?: number  // 幾個供應商已回覆
}

interface RequirementsDrawerProps {
  items: RequestItem[]
  onSendRequest?: (itemId: string) => void
  onViewReplies?: (itemId: string) => void
  onConfirm?: (itemId: string) => void
}

// 狀態配置
const STATUS_CONFIG = {
  pending: {
    label: '待作業',
    icon: Clock,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
  },
  in_progress: {
    label: '作業中',
    icon: Send,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
  },
  awaiting_confirmation: {
    label: '待確認',
    icon: AlertCircle,
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  confirmed: {
    label: '已確認',
    icon: CheckCircle,
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
  },
  completed: {
    label: '已完成',
    icon: CheckCircle,
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
  },
} as const

export function RequirementsDrawer({ 
  items, 
  onSendRequest, 
  onViewReplies,
  onConfirm 
}: RequirementsDrawerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-morandi-muted border border-dashed border-morandi-gold/30 rounded-lg">
        <FileText size={48} className="mx-auto mb-3 opacity-30" />
        <p>尚無需求項目</p>
      </div>
    )
  }

  return (
    <div className="border border-morandi-gold/30 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-morandi-container/50 border-b border-morandi-gold/20">
            <th className="px-4 py-3 text-left font-medium text-morandi-primary">項目</th>
            <th className="px-4 py-3 text-left font-medium text-morandi-primary w-48">備註</th>
            <th className="px-4 py-3 text-right font-medium text-morandi-primary w-28">報價</th>
            <th className="px-4 py-3 text-center font-medium text-morandi-primary w-36">狀態/供應商</th>
            <th className="px-4 py-3 text-center font-medium text-morandi-primary w-32">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
            const StatusIcon = statusConfig.icon

            return (
              <tr
                key={item.id}
                className="border-t border-morandi-gold/10 hover:bg-morandi-container/10 transition-colors"
              >
                {/* 項目 */}
                <td className="px-4 py-3">
                  <span className="font-medium text-morandi-primary">
                    {item.title}
                  </span>
                </td>

                {/* 備註 */}
                <td className="px-4 py-3">
                  <span className="text-morandi-secondary text-sm truncate block max-w-[180px]">
                    {item.note || '—'}
                  </span>
                </td>

                {/* 報價 */}
                <td className="px-4 py-3 text-right">
                  {item.quoted_price ? (
                    <span className="font-semibold text-morandi-primary">
                      ${item.quoted_price.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-morandi-muted">—</span>
                  )}
                </td>

                {/* 狀態/供應商 */}
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        statusConfig.bgClass,
                        statusConfig.textClass
                      )}
                    >
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </span>
                    
                    {/* 供應商資訊 */}
                    {item.status === 'confirmed' || item.status === 'completed' ? (
                      <span className="text-xs text-morandi-secondary">
                        {item.supplier_name}
                      </span>
                    ) : item.status === 'in_progress' ? (
                      <span className="text-xs text-morandi-muted">
                        已發 {item.supplier_count || 0} 家
                      </span>
                    ) : item.status === 'awaiting_confirmation' ? (
                      <span className="text-xs text-amber-600">
                        {item.replied_count || 0} 家回覆
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* 操作 */}
                <td className="px-4 py-3 text-center">
                  {item.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSendRequest?.(item.id)}
                    >
                      <Send size={14} className="mr-1" />
                      發送
                    </Button>
                  )}
                  
                  {item.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewReplies?.(item.id)}
                    >
                      <Clock size={14} className="mr-1" />
                      等待中
                    </Button>
                  )}
                  
                  {item.status === 'awaiting_confirmation' && (
                    <Button
                      size="sm"
                      onClick={() => onViewReplies?.(item.id)}
                    >
                      <AlertCircle size={14} className="mr-1" />
                      查看報價
                    </Button>
                  )}
                  
                  {(item.status === 'confirmed' || item.status === 'completed') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewReplies?.(item.id)}
                    >
                      <MoreHorizontal size={14} />
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
