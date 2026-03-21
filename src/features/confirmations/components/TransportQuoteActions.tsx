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
}

export function TransportQuoteActions({ quote, itemId, onUpdate }: Props) {
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
      
      toast.success(action === 'accept' ? '已確認成交' : '已拒絕報價')
      setOpen(false)
      onUpdate?.()
      
    } catch (error) {
      console.error('Action failed:', error)
      toast.error('操作失敗，請稍後再試')
    } finally {
      setIsProcessing(false)
    }
  }

  // 如果不是已報價狀態，不顯示
  if (quote.status !== 'quoted' && quote.status !== 'replied') {
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
