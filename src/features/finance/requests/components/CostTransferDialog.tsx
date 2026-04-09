'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { useToursSlim } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils/format-currency'

interface CostTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 來源請款單資訊 */
  sourceRequest: {
    id: string
    code: string
    tourId: string
    tourCode: string
    tourName: string
    amount: number
    items: Array<{
      id: string
      description: string
      subtotal: number
      supplier_name?: string
    }>
  } | null
  onSuccess?: () => void
}

export function CostTransferDialog({
  open,
  onOpenChange,
  sourceRequest,
  onSuccess,
}: CostTransferDialogProps) {
  const { items: tours } = useToursSlim()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [targetTourId, setTargetTourId] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [transferring, setTransferring] = useState(false)

  // 排除來源團的選項
  const tourOptions = useMemo(() => {
    return tours
      .filter(t => t.id !== sourceRequest?.tourId && !t.archived)
      .map(t => ({
        value: t.id,
        label: `${t.code || ''} - ${t.name || ''}`,
      }))
  }, [tours, sourceRequest?.tourId])

  // 選中的總金額
  const selectedTotal = useMemo(() => {
    if (!sourceRequest) return 0
    return sourceRequest.items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + (item.subtotal || 0), 0)
  }, [sourceRequest, selectedItems])

  // 全選/取消全選
  const toggleAll = () => {
    if (!sourceRequest) return
    if (selectedItems.size === sourceRequest.items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(sourceRequest.items.map(i => i.id)))
    }
  }

  // 執行轉移
  const handleTransfer = async () => {
    if (!sourceRequest || selectedItems.size === 0 || !targetTourId) return

    const targetTour = tours.find(t => t.id === targetTourId)
    if (!targetTour) return

    setTransferring(true)
    try {
      const itemIds = Array.from(selectedItems)

      // 更新 payment_request_items 的 tour_id + 記錄轉移資訊
      const { error } = await supabase
        .from('payment_request_items')
        .update({
          tour_id: targetTourId,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .in('id', itemIds)

      if (error) throw error

      toast({
        title: '成本轉移成功',
        description: `${itemIds.length} 筆項目已從 ${sourceRequest.tourCode} 轉移至 ${targetTour.code}`,
      })

      setTargetTourId('')
      setSelectedItems(new Set())
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('成本轉移失敗:', error)
      toast({
        title: '轉移失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setTransferring(false)
    }
  }

  // Dialog 開啟時預設全選
  const handleOpenChange = (open: boolean) => {
    if (open && sourceRequest) {
      setSelectedItems(new Set(sourceRequest.items.map(i => i.id)))
      setTargetTourId('')
    }
    onOpenChange(open)
  }

  if (!sourceRequest) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent level={2} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft size={18} />
            成本轉移
          </DialogTitle>
        </DialogHeader>

        {/* 來源資訊 */}
        <div className="text-sm text-morandi-secondary mb-2">
          從 <span className="font-medium text-morandi-primary">{sourceRequest.tourCode}</span>{' '}
          {sourceRequest.tourName} 轉移至其他團
        </div>

        {/* 選擇目標團 */}
        <div className="mb-4">
          <label className="text-sm font-medium text-morandi-primary mb-1 block">
            目標團 <span className="text-morandi-red">*</span>
          </label>
          <Combobox
            options={tourOptions}
            value={targetTourId}
            onChange={setTargetTourId}
            placeholder="搜尋團號或團名..."
            emptyMessage="找不到團"
            className="w-full"
            maxHeight="200px"
          />
        </div>

        {/* 項目列表 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-morandi-primary">選擇轉移項目</label>
            <button
              onClick={toggleAll}
              className="text-xs text-morandi-gold hover:text-morandi-gold-hover"
            >
              {selectedItems.size === sourceRequest.items.length ? '取消全選' : '全選'}
            </button>
          </div>
          <div className="border border-border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
            {sourceRequest.items.map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-morandi-gold/5 cursor-pointer border-b border-border/30 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => {
                    setSelectedItems(prev => {
                      const next = new Set(prev)
                      if (next.has(item.id)) next.delete(item.id)
                      else next.add(item.id)
                      return next
                    })
                  }}
                  className="rounded border-morandi-secondary w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {item.supplier_name && (
                      <span className="text-morandi-secondary mr-1">{item.supplier_name}</span>
                    )}
                    {item.description}
                  </div>
                </div>
                <span className="text-sm font-medium text-morandi-primary shrink-0">
                  {formatCurrency(item.subtotal)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-sm text-morandi-secondary">
            已選 {selectedItems.size} 筆，共{' '}
            <span className="font-semibold text-morandi-primary">
              {formatCurrency(selectedTotal)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={transferring || selectedItems.size === 0 || !targetTourId}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
            >
              {transferring ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowRightLeft size={14} />
              )}
              確認轉移
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
