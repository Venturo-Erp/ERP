'use client'

import { useState, useMemo } from 'react'
import { Search, Receipt, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOrdersSlim } from '@/data'
import { useWorkspaceWidgets } from '@/stores/workspace-store'
import { useAuthStore } from '@/stores/auth-store'
import { Order } from '@/stores/types'
import { useRequireAuthSync } from '@/hooks/useRequireAuth'
import { alert } from '@/lib/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { CurrencyCell } from '@/components/table-cells'
import { COMP_WORKSPACE_LABELS } from './constants/labels'

interface ShareOrdersDialogProps {
  channelId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ShareOrdersDialog({ channelId, open, onClose, onSuccess }: ShareOrdersDialogProps) {
  const { items: orders } = useOrdersSlim()
  const { shareOrderList } = useWorkspaceWidgets()
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())

  // 計算訂單的收款率和缺口
  const ordersWithGap = useMemo(() => {
    return orders
      .map(order => {
        const totalCost = order.total_amount || 0
        const collected = order.paid_amount || 0
        const gap = totalCost - collected
        const collectionRate = totalCost > 0 ? (collected / totalCost) * 100 : 0

        return {
          ...order,
          gap,
          collectionRate,
        }
      })
      .filter(order => {
        // 過濾：有缺口的訂單（待收款）
        return order.gap > 0
      })
      .sort((a, b) => {
        // 排序優先級：
        // 1. 成本 > 0 且收款 = 0（完全沒收）
        // 2. 收款率 < 30%
        // 3. 缺口金額大的優先
        const aFullyUnpaid = (a.total_amount || 0) > 0 && (a.paid_amount || 0) === 0
        const bFullyUnpaid = (b.total_amount || 0) > 0 && (b.paid_amount || 0) === 0

        if (aFullyUnpaid && !bFullyUnpaid) return -1
        if (!aFullyUnpaid && bFullyUnpaid) return 1

        const aLowRate = a.collectionRate < 30
        const bLowRate = b.collectionRate < 30

        if (aLowRate && !bLowRate) return -1
        if (!aLowRate && bLowRate) return 1

        return b.gap - a.gap
      })
  }, [orders])

  // 搜尋過濾
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return ordersWithGap

    const query = searchQuery.toLowerCase()
    return ordersWithGap.filter(
      order =>
        order.order_number?.toLowerCase().includes(query) ||
        order.contact_person?.toLowerCase().includes(query) ||
        order.tour_name?.toLowerCase().includes(query)
    )
  }, [ordersWithGap, searchQuery])

  // 切換訂單選擇
  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  // 計算已選訂單的總缺口
  const selectedStats = useMemo(() => {
    const selected = filteredOrders.filter(order => selectedOrders.has(order.id))
    const totalGap = selected.reduce((sum, order) => sum + order.gap, 0)
    return {
      count: selected.length,
      totalGap,
    }
  }, [filteredOrders, selectedOrders])

  const handleShare = async () => {
    if (selectedOrders.size === 0) {
      void alert(COMP_WORKSPACE_LABELS.請至少選擇一筆訂單, 'warning')
      return
    }

    const auth = useRequireAuthSync()

    if (!auth.isAuthenticated) {
      auth.showLoginRequired()
      return
    }

    try {
      await shareOrderList(channelId, Array.from(selectedOrders), auth.user!.id)
      onSuccess()
      onClose()
    } catch (error) {
      void alert(COMP_WORKSPACE_LABELS.分享訂單失敗_請稍後再試, 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent level={1} className="max-w-[900px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b border-morandi-gold/20">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="text-morandi-gold" size={20} />
            <span>{COMP_WORKSPACE_LABELS.SELECT_5876}</span>
          </DialogTitle>
        </DialogHeader>

        {/* 搜尋列 */}
        <div className="my-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-secondary"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={COMP_WORKSPACE_LABELS.搜尋訂單號_客戶名稱}
              className="input-morandi pl-10"
            />
          </div>
        </div>

        {/* 訂單列表 */}
        <div className="flex-1 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary">
              {searchQuery
                ? COMP_WORKSPACE_LABELS.沒有符合搜尋條件的訂單
                : COMP_WORKSPACE_LABELS.目前沒有待收款訂單}
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-card border-b border-morandi-gold/20">
                <tr>
                  <th className="w-10 py-2.5 px-4 text-xs"></th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-morandi-secondary">
                    {COMP_WORKSPACE_LABELS.LABEL_5978}
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-morandi-secondary">
                    {COMP_WORKSPACE_LABELS.LABEL_565}
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-morandi-secondary">
                    {COMP_WORKSPACE_LABELS.TOTAL_9340}
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-morandi-secondary">
                    {COMP_WORKSPACE_LABELS.LABEL_8095}
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-morandi-secondary">
                    {COMP_WORKSPACE_LABELS.LABEL_3379}
                  </th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-morandi-secondary">
                    {COMP_WORKSPACE_LABELS.STATUS}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const isSelected = selectedOrders.has(order.id)
                  const isFullyUnpaid =
                    (order.total_amount || 0) > 0 && (order.paid_amount || 0) === 0
                  const isLowRate = order.collectionRate < 30

                  return (
                    <tr
                      key={order.id}
                      className={`border-b border-morandi-container/20 hover:bg-morandi-gold/5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-morandi-gold/10' : ''
                      }`}
                      onClick={() => toggleOrderSelection(order.id)}
                    >
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="w-4 h-4 rounded border-morandi-gold/20 text-morandi-gold focus:ring-morandi-gold/20"
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2 px-2 text-sm text-morandi-primary font-medium">
                        {order.order_number}
                      </td>
                      <td className="py-2 px-2 text-sm text-morandi-primary">
                        {order.contact_person || '-'}
                      </td>
                      <td className="py-2 px-2 text-sm text-right text-morandi-primary">
                        <CurrencyCell amount={order.total_amount || 0} className="justify-end" />
                      </td>
                      <td className="py-2 px-2 text-sm text-right text-morandi-primary">
                        <CurrencyCell amount={order.paid_amount || 0} className="justify-end" />
                      </td>
                      <td className="py-2 px-2 text-sm text-right">
                        <CurrencyCell
                          amount={order.gap}
                          variant="expense"
                          className="justify-end font-semibold"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isFullyUnpaid ? (
                          <span className="text-xs bg-status-danger-bg text-status-danger px-2 py-0.5 rounded">
                            ❌❌ 未收款
                          </span>
                        ) : isLowRate ? (
                          <span className="text-xs bg-status-warning-bg text-status-warning px-2 py-0.5 rounded">
                            ⚠️ 收款率低
                          </span>
                        ) : (
                          <span className="text-xs bg-status-warning-bg text-status-warning px-2 py-0.5 rounded">
                            {COMP_WORKSPACE_LABELS.部分收款}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 底部：統計與操作按鈕 */}
        <DialogFooter className="pt-3 border-t border-morandi-gold/20 flex-col gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-morandi-secondary">
              已選擇{' '}
              <span className="font-semibold text-morandi-primary">{selectedStats.count}</span>{' '}
              {COMP_WORKSPACE_LABELS.LABEL_3592}
            </div>
            <div className="text-right">
              <div className="text-xs text-morandi-secondary">
                {COMP_WORKSPACE_LABELS.TOTAL_4384}
              </div>
              <CurrencyCell
                amount={selectedStats.totalGap}
                variant="expense"
                className="text-lg font-semibold"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={onClose}>
              <X size={16} />
              {COMP_WORKSPACE_LABELS.CANCEL}
            </Button>
            <Button onClick={handleShare} disabled={selectedOrders.size === 0}>
              <Check size={16} />
              {COMP_WORKSPACE_LABELS.LABEL_903}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
