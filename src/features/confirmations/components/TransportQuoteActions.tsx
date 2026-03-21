'use client'

/**
 * 交通報價確認/拒絕操作
 * 用於 ERP 端確認車行報價
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Check, X, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TransportQuote {
  id: string
  tour_id: string
  supplier_name: string
  status: string
  supplier_response?: {
    totalFare?: number
    contact?: string
    phone?: string
    includesParking?: boolean
    includesToll?: boolean
    includesAccommodation?: boolean
    accommodationFee?: number
    includesTip?: boolean
    tipAmount?: number
    supplierNote?: string
  }
  replied_at?: string
}

interface Props {
  quote: TransportQuote
  itemId?: string  // 對應的 tour_itinerary_items.id
  onUpdate?: () => void
  // 發預訂確認用
  sentVia?: string  // 'line' | 'fax' | 'email'
  groupId?: string  // LINE 群組 ID
  tourCode?: string
  tourName?: string
  departureDate?: string
  participants?: number
}

export function TransportQuoteActions({ 
  quote, 
  itemId, 
  onUpdate,
  sentVia,
  groupId,
  tourCode,
  tourName,
  departureDate,
  participants,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const response = quote.supplier_response
  
  const handleAction = async (action: 'accept' | 'reject') => {
    setIsProcessing(true)
    
    try {
      // 更新 tour_requests 狀態
      const newStatus = action === 'accept' ? 'accepted' : 'rejected'
      const { error: reqError } = await supabase
        .from('tour_requests')
        .update({ 
          status: newStatus,
          accepted_at: action === 'accept' ? new Date().toISOString() : null,
        })
        .eq('id', quote.id)
      
      if (reqError) throw reqError
      
      // 如果有 itemId，也更新核心表
      if (itemId) {
        const { error: itemError } = await supabase
          .from('tour_itinerary_items')
          .update({ 
            request_status: newStatus,
            estimated_cost: action === 'accept' ? response?.totalFare : null,
          })
          .eq('id', itemId)
        
        if (itemError) throw itemError
      }
      
      // 成交後：檢查是否需要發預訂確認
      if (action === 'accept') {
        const wasAlreadyReserved = quote.status === 'confirmed' // 車行選了「報價+留車」
        
        if (!wasAlreadyReserved && sentVia === 'line' && groupId) {
          // LINE 且是「僅報價」→ 自動發預訂確認
          try {
            await fetch('/api/transport/send-booking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                item_id: itemId,
                group_id: groupId,
                tour_code: tourCode,
                tour_name: tourName,
                departure_date: departureDate,
                participants: participants,
                supplier_name: quote.supplier_name,
                total_cost: response?.totalFare,
              }),
            })
            toast.success('已確認成交，預訂確認已發送')
          } catch {
            toast.success('已確認成交（預訂確認發送失敗，請手動發送）')
          }
        } else if (wasAlreadyReserved) {
          toast.success('已確認成交（車行已留車）')
        } else {
          toast.success('已確認成交')
        }
      } else {
        toast.success('已拒絕報價')
      }
      
      setOpen(false)
      onUpdate?.()
      
    } catch (error) {
      console.error('Action failed:', error)
      toast.error('操作失敗，請稍後再試')
    } finally {
      setIsProcessing(false)
    }
  }

  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // 取消預訂
  const handleCancel = async () => {
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('tour_requests')
        .update({ 
          status: 'cancelled',
          note: cancelReason ? `取消原因：${cancelReason}` : '已取消預訂',
        })
        .eq('id', quote.id)
      
      if (error) throw error
      
      // 更新核心表
      if (itemId) {
        await supabase
          .from('tour_itinerary_items')
          .update({ request_status: 'cancelled' })
          .eq('id', itemId)
      }
      
      // LINE 通知車行（如果有 groupId）
      if (sentVia === 'line' && groupId) {
        try {
          await fetch('/api/line/send-cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              group_id: groupId,
              tour_code: tourCode,
              tour_name: tourName,
              supplier_name: quote.supplier_name,
              reason: cancelReason,
            }),
          })
        } catch {
          // 忽略發送失敗
        }
      }
      
      toast.success('已取消預訂')
      setOpen(false)
      setShowCancel(false)
      onUpdate?.()
    } catch (error) {
      console.error('Cancel failed:', error)
      toast.error('取消失敗')
    } finally {
      setIsProcessing(false)
    }
  }

  // 根據狀態決定顯示內容
  const isAccepted = quote.status === 'accepted'
  const isQuoted = quote.status === 'quoted' || quote.status === 'replied'
  
  if (!isQuoted && !isAccepted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Truck size={14} />
          查看報價
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🚌 {quote.supplier_name} 報價
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 報價資訊 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">車資</span>
              <span className="text-xl font-bold text-blue-600">
                ¥{response?.totalFare?.toLocaleString() || '-'}
              </span>
            </div>
            
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">停車費</span>
                <span>{response?.includesParking ? '✓ 含' : '✗ 不含'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">過路費</span>
                <span>{response?.includesToll ? '✓ 含' : '✗ 不含'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">司機住宿</span>
                <span>
                  {response?.includesAccommodation 
                    ? '✓ 含' 
                    : response?.accommodationFee 
                      ? `✗ 不含（另計 ¥${response.accommodationFee.toLocaleString()}）`
                      : '✗ 不含'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">司機小費</span>
                <span>
                  {response?.includesTip 
                    ? '✓ 含' 
                    : response?.tipAmount 
                      ? `✗ 不含（另計 ¥${response.tipAmount.toLocaleString()}）`
                      : '✗ 不含'
                  }
                </span>
              </div>
            </div>
            
            {response?.supplierNote && (
              <div className="border-t pt-3">
                <span className="text-gray-500 text-sm">備註</span>
                <p className="text-sm mt-1">{response.supplierNote}</p>
              </div>
            )}
            
            <div className="border-t pt-3 text-xs text-gray-400">
              <div>聯絡人：{response?.contact || '-'}</div>
              <div>電話：{response?.phone || '-'}</div>
              <div>報價時間：{quote.replied_at ? new Date(quote.replied_at).toLocaleString('zh-TW') : '-'}</div>
            </div>
          </div>
          
          {/* 操作按鈕 */}
          {showCancel ? (
            // 取消確認
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">取消原因（選填）</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="例：行程取消、改用其他車行"
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancel(false)}
                  disabled={isProcessing}
                >
                  返回
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleCancel}
                  disabled={isProcessing}
                >
                  確認取消
                </Button>
              </div>
            </div>
          ) : isAccepted ? (
            // 已成交：顯示取消按鈕 + 發預訂確認（列印用）
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <span className="text-green-700 font-medium">✅ 已成交</span>
              </div>
              <div className="flex gap-3">
                {sentVia !== 'line' && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // TODO: 手動發預訂確認（列印/傳真用）
                      toast.info('請手動聯繫車行確認預訂')
                    }}
                    disabled={isProcessing}
                  >
                    📄 發預訂確認
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowCancel(true)}
                  disabled={isProcessing}
                >
                  <X size={16} className="mr-1" />
                  取消預訂
                </Button>
              </div>
            </div>
          ) : (
            // 未成交：確認/拒絕
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => handleAction('reject')}
                disabled={isProcessing}
              >
                <X size={16} className="mr-1" />
                拒絕
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleAction('accept')}
                disabled={isProcessing}
              >
                <Check size={16} className="mr-1" />
                確認成交
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
