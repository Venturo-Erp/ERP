'use client'
/**
 * BatchReceiptConfirmDialog - 收款批次確認對話框
 * 
 * 支援同一批次（batch_id）的多筆收款逐筆確認
 * 狀態：0=待確認, 1=已確認, 2=異常
 */

import { useState, useEffect, useCallback } from 'react'
import { Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { RECEIPT_TYPE_OPTIONS } from '../types'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import type { Receipt } from '@/types/receipt.types'

interface BatchReceiptConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 批次的主要收款單（用來取得 batch_id 或單筆時直接用） */
  receipt: Receipt | null
  onSuccess?: () => void
}

interface ReceiptItemState {
  receipt: Receipt
  status: 'pending' | 'confirmed' | 'abnormal'
  actualAmount: number
  abnormalNote: string
  isEditing: boolean
}

export function BatchReceiptConfirmDialog({
  open,
  onOpenChange,
  receipt,
  onSuccess,
}: BatchReceiptConfirmDialogProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<ReceiptItemState[]>([])

  // 載入批次內所有收款單
  const loadBatchReceipts = useCallback(async () => {
    if (!receipt) return

    setLoading(true)
    try {
      let receiptsToShow: Receipt[] = []

      // 如果有 batch_id，查詢同批次的所有收款單
      if (receipt.batch_id) {
        const { data, error } = await supabase
          .from('receipts')
          .select('*')
          .eq('batch_id', receipt.batch_id)
          .order('receipt_number', { ascending: true })

        if (error) throw error
        receiptsToShow = (data as unknown as Receipt[]) || []
      } else {
        // 單筆收款
        receiptsToShow = [receipt]
      }

      // 轉換成 state 格式
      setItems(
        receiptsToShow.map(r => ({
          receipt: r,
          status: r.status === '1' ? 'confirmed' : r.status === '2' ? 'abnormal' : 'pending',
          actualAmount: r.actual_amount || r.receipt_amount || 0,
          abnormalNote: r.notes || '',
          isEditing: false,
        }))
      )
    } catch (error) {
      console.error('載入收款單失敗:', error)
      toast({
        title: '載入失敗',
        description: '無法載入收款單資料',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [receipt, toast])

  useEffect(() => {
    if (open && receipt) {
      loadBatchReceipts()
    }
  }, [open, receipt, loadBatchReceipts])

  // 確認金額正確
  const handleConfirm = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              status: 'confirmed',
              actualAmount: item.receipt.receipt_amount || 0,
              isEditing: false,
            }
          : item
      )
    )
  }

  // 標記異常
  const handleMarkAbnormal = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              isEditing: true,
            }
          : item
      )
    )
  }

  // 確認異常金額
  const handleConfirmAbnormal = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              status: 'abnormal',
              isEditing: false,
            }
          : item
      )
    )
  }

  // 取消編輯
  const handleCancelEdit = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              isEditing: false,
              actualAmount: item.receipt.receipt_amount || 0,
              abnormalNote: '',
            }
          : item
      )
    )
  }

  // 更新實際金額
  const handleAmountChange = (index: number, value: string) => {
    const amount = parseFloat(value) || 0
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, actualAmount: amount } : item))
    )
  }

  // 更新異常備註
  const handleNoteChange = (index: number, value: string) => {
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, abnormalNote: value } : item))
    )
  }

  // 儲存所有變更
  const handleSave = async () => {
    setSaving(true)
    try {
      for (const item of items) {
        // 只更新有變更的
        const originalStatus = item.receipt.status === '1' ? 'confirmed' : item.receipt.status === '2' ? 'abnormal' : 'pending'
        if (item.status === originalStatus && item.actualAmount === (item.receipt.actual_amount || item.receipt.receipt_amount)) {
          continue
        }

        const updateData: Record<string, unknown> = {
          status: item.status === 'confirmed' ? '1' : item.status === 'abnormal' ? '2' : '0',
          actual_amount: item.actualAmount,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }

        if (item.status === 'confirmed') {
          updateData.confirmed_at = new Date().toISOString()
          updateData.confirmed_by = user?.id
        }

        if (item.status === 'abnormal' && item.abnormalNote) {
          updateData.notes = item.abnormalNote
        }

        const { error } = await supabase
          .from('receipts')
          .update(updateData)
          .eq('id', item.receipt.id)

        if (error) throw error
      }

      toast({
        title: '確認成功',
        description: `已更新 ${items.length} 筆收款單`,
      })
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('儲存失敗:', error)
      toast({
        title: '儲存失敗',
        description: '無法更新收款單',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // 計算批次狀態
  const getBatchStatus = () => {
    const statuses = items.map(i => i.status)
    if (statuses.every(s => s === 'confirmed')) return { label: '已確認', color: 'text-green-600' }
    if (statuses.every(s => s === 'abnormal')) return { label: '異常', color: 'text-red-600' }
    if (statuses.some(s => s === 'abnormal')) return { label: '部分異常', color: 'text-orange-600' }
    if (statuses.some(s => s === 'confirmed')) return { label: '部分確認', color: 'text-blue-600' }
    return { label: '待確認', color: 'text-gray-600' }
  }

  // 取得收款方式標籤
  const getReceiptTypeLabel = (type: number | string | undefined) => {
    const numType = typeof type === 'string' ? parseInt(type, 10) : type
    return RECEIPT_TYPE_OPTIONS.find(opt => opt.value === numType)?.label || '未知'
  }

  if (!receipt) return null

  const batchStatus = getBatchStatus()
  const totalAmount = items.reduce((sum, i) => sum + (i.receipt.receipt_amount || 0), 0)
  const totalActual = items.reduce((sum, i) => sum + i.actualAmount, 0)
  const baseReceiptNumber = receipt.receipt_number?.replace(/-[A-Z]$/, '') || ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>收款確認</span>
            <span className="text-lg font-mono">{baseReceiptNumber}</span>
            {items.length > 1 && (
              <span className="text-sm text-muted-foreground">({items.length} 筆)</span>
            )}
            <span className={cn('text-sm font-medium', batchStatus.color)}>
              {batchStatus.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : (
          <>
            {/* 基本資訊 */}
            <div className="flex gap-6 text-sm border-b pb-3">
              <div>
                <span className="text-muted-foreground mr-2">團名</span>
                <span className="font-medium">{receipt.tour_name || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground mr-2">訂單</span>
                <span className="font-medium">{receipt.order_number || '-'}</span>
              </div>
            </div>

            {/* 收款項目列表 */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 text-sm">
                    <th className="text-left py-2.5 px-3 font-medium">編號</th>
                    <th className="text-left py-2.5 px-3 font-medium">收款方式</th>
                    <th className="text-left py-2.5 px-3 font-medium">日期</th>
                    <th className="text-right py-2.5 px-3 font-medium">應收金額</th>
                    <th className="text-right py-2.5 px-3 font-medium">實收金額</th>
                    <th className="text-center py-2.5 px-3 font-medium" style={{ width: 120 }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={item.receipt.id}
                      className={cn(
                        'border-t',
                        item.status === 'confirmed' && 'bg-green-50',
                        item.status === 'abnormal' && 'bg-red-50'
                      )}
                    >
                      <td className="py-3 px-3 font-mono text-sm">
                        {item.receipt.receipt_number?.replace(baseReceiptNumber, '') || '-'}
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {getReceiptTypeLabel(item.receipt.receipt_type)}
                      </td>
                      <td className="py-3 px-3 text-sm">{item.receipt.receipt_date || '-'}</td>
                      <td className="py-3 px-3 text-sm text-right font-medium">
                        ${(item.receipt.receipt_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.isEditing ? (
                          <Input
                            type="number"
                            value={item.actualAmount}
                            onChange={e => handleAmountChange(index, e.target.value)}
                            className="w-28 text-right"
                            autoFocus
                          />
                        ) : (
                          <span
                            className={cn(
                              'font-medium',
                              item.status === 'abnormal' &&
                                item.actualAmount !== item.receipt.receipt_amount &&
                                'text-red-600'
                            )}
                          >
                            ${item.actualAmount.toLocaleString()}
                            {item.status === 'abnormal' &&
                              item.actualAmount !== item.receipt.receipt_amount && (
                                <AlertCircle size={14} className="inline ml-1" />
                              )}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleConfirmAbnormal(index)}
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-100"
                              title="確認異常"
                            >
                              <Check size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelEdit(index)}
                              className="h-7 w-7 p-0"
                              title="取消"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ) : item.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleConfirm(index)}
                              className="h-7 w-7 p-0 text-green-600 hover:bg-green-100"
                              title="確認正確"
                            >
                              <Check size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAbnormal(index)}
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-100"
                              title="標記異常"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-1 rounded',
                              item.status === 'confirmed' && 'bg-green-100 text-green-700',
                              item.status === 'abnormal' && 'bg-red-100 text-red-700'
                            )}
                          >
                            {item.status === 'confirmed' ? '已確認' : '異常'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* 合計列 */}
                {items.length > 1 && (
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td colSpan={3} className="py-2.5 px-3 text-sm font-medium">
                        合計
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        ${totalAmount.toLocaleString()}
                      </td>
                      <td
                        className={cn(
                          'py-2.5 px-3 text-right font-medium',
                          totalActual !== totalAmount && 'text-red-600'
                        )}
                      >
                        ${totalActual.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* 異常備註（如果有異常項目） */}
            {items.some(i => i.isEditing) && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-red-700">異常說明</span>
                </div>
                <Textarea
                  placeholder="請說明金額異常的原因..."
                  value={items.find(i => i.isEditing)?.abnormalNote || ''}
                  onChange={e => {
                    const editingIndex = items.findIndex(i => i.isEditing)
                    if (editingIndex >= 0) {
                      handleNoteChange(editingIndex, e.target.value)
                    }
                  }}
                  className="bg-white"
                  rows={2}
                />
              </div>
            )}

            {/* 底部按鈕 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || items.some(i => i.isEditing)}
                className="bg-morandi-gold hover:bg-morandi-gold-hover"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    儲存中...
                  </>
                ) : (
                  '儲存確認結果'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
