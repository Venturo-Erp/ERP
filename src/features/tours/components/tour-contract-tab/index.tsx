'use client'

import { useState, useMemo, useEffect } from 'react'
import { FileSignature, Plus, Printer, Check, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tour, Order, Member } from '@/stores/types'
import { ContractTemplate } from '@/types/tour.types'
import { ContractDialog } from '@/features/contracts/components/ContractDialog'
import { supabase } from '@/lib/supabase/client'

interface TourContractTabProps {
  tour: Tour
}

interface MemberWithOrder {
  id: string
  name: string
  contract_id?: string | null
  order_code: string
  order_id: string
}

// 自動判斷合約類型
function getContractTemplate(tour: Tour): ContractTemplate {
  const location = tour.location?.toLowerCase() || ''

  // 國內旅遊
  if (
    location.includes('台灣') ||
    location.includes('taiwan') ||
    location.includes('澎湖') ||
    location.includes('金門') ||
    location.includes('馬祖') ||
    location.includes('綠島') ||
    location.includes('蘭嶼')
  ) {
    return 'domestic'
  }

  // 國外旅遊 - 預設團體
  return 'international'
}

const CONTRACT_TEMPLATE_LABELS: Record<ContractTemplate, string> = {
  domestic: '國內旅遊定型化契約',
  international: '國外旅遊定型化契約',
  individual_international: '國外個別旅遊定型化契約',
}

export function TourContractTab({ tour }: TourContractTabProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [contractDialogOpen, setContractDialogOpen] = useState(false)

  // 取得訂單和團員
  useEffect(() => {
    async function fetchOrders() {
      setOrdersLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          code,
          order_members (
            id,
            name,
            contract_id
          )
        `)
        .eq('tour_id', tour.id)
        .order('code')

      if (!error && data) {
        setOrders(data as unknown as Order[])
      }
      setOrdersLoading(false)
    }
    fetchOrders()
  }, [tour.id])

  // 取得所有訂單的團員
  const allMembers = useMemo((): MemberWithOrder[] => {
    return orders.flatMap(order => {
      const members = (order as unknown as { order_members: Array<{ id: string; name: string; contract_id?: string }> }).order_members || []
      return members.map(m => ({
        ...m,
        order_code: order.code,
        order_id: order.id,
      } as MemberWithOrder))
    })
  }, [orders])

  // 已有合約的團員
  const membersWithContract = useMemo((): MemberWithOrder[] => {
    return allMembers.filter(m => m.contract_id)
  }, [allMembers])

  // 尚未簽約的團員
  const membersWithoutContract = useMemo((): MemberWithOrder[] => {
    return allMembers.filter(m => !m.contract_id)
  }, [allMembers])

  // 切換團員選擇
  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    )
  }

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedMemberIds.length === membersWithoutContract.length) {
      setSelectedMemberIds([])
    } else {
      setSelectedMemberIds(membersWithoutContract.map(m => m.id))
    }
  }

  // 自動判斷的合約類型
  const autoContractType = getContractTemplate(tour)

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-morandi-secondary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 合約類型提示 */}
      <div className="bg-morandi-container/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm">
          <FileSignature className="w-4 h-4 text-morandi-gold" />
          <span className="text-morandi-secondary">自動判斷合約類型：</span>
          <span className="font-medium text-morandi-primary">
            {CONTRACT_TEMPLATE_LABELS[autoContractType]}
          </span>
          <span className="text-morandi-secondary">
            （目的地：{tour.location || '未設定'}）
          </span>
        </div>
      </div>

      {/* 已簽約團員 */}
      {membersWithContract.length > 0 && (
        <div className="border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border bg-morandi-container/30">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="font-medium text-morandi-primary">
                已簽約 ({membersWithContract.length})
              </span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {membersWithContract.map(member => (
              <div key={member.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-morandi-primary">{member.name}</span>
                  <span className="text-sm text-morandi-secondary ml-2">
                    {member.order_code}
                  </span>
                </div>
                <Button variant="ghost" size="sm">
                  <Printer className="w-4 h-4 mr-1" />
                  列印
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未簽約團員 */}
      {membersWithoutContract.length > 0 && (
        <div className="border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border bg-morandi-container/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-morandi-secondary" />
              <span className="font-medium text-morandi-primary">
                待簽約 ({membersWithoutContract.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs"
              >
                {selectedMemberIds.length === membersWithoutContract.length
                  ? '取消全選'
                  : '全選'}
              </Button>
              {selectedMemberIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setContractDialogOpen(true)}
                  className="bg-morandi-gold hover:bg-morandi-gold/90"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  產生合約 ({selectedMemberIds.length})
                </Button>
              )}
            </div>
          </div>
          <div className="divide-y divide-border">
            {membersWithoutContract.map(member => (
              <div
                key={member.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-morandi-container/20 cursor-pointer"
                onClick={() => toggleMember(member.id)}
              >
                <Checkbox
                  checked={selectedMemberIds.includes(member.id)}
                  onCheckedChange={() => toggleMember(member.id)}
                />
                <div className="flex-1">
                  <span className="font-medium text-morandi-primary">{member.name}</span>
                  <span className="text-sm text-morandi-secondary ml-2">
                    {member.order_code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 無團員 */}
      {allMembers.length === 0 && (
        <div className="text-center py-12 text-morandi-secondary">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>尚無團員資料</p>
          <p className="text-sm mt-1">請先在「訂單」分頁新增訂單和團員</p>
        </div>
      )}

      {/* 合約對話框 */}
      <ContractDialog
        isOpen={contractDialogOpen}
        onClose={() => {
          setContractDialogOpen(false)
          setSelectedMemberIds([])
        }}
        tour={tour}
        mode="create"
      />
    </div>
  )
}
