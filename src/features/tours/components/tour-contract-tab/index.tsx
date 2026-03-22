'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  FileSignature,
  Plus,
  Printer,
  Check,
  Users,
  Loader2,
  Link,
  Send,
  Copy,
  ExternalLink,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tour, Order } from '@/stores/types'
import { ContractTemplate } from '@/types/tour.types'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TourContractTabProps {
  tour: Tour
}

interface MemberWithOrder {
  id: string
  name: string
  chinese_name?: string
  id_number?: string
  phone?: string
  contract_id?: string | null
  order_code: string
  order_id: string
  line_user_id?: string | null
}

interface Contract {
  id: string
  code: string
  template: string
  signer_name: string
  status: string
  signed_at?: string
  member_ids: string[]
}

// 自動判斷合約類型
function getContractTemplate(tour: Tour): ContractTemplate {
  const location = tour.location?.toLowerCase() || ''

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

  return 'international'
}

const CONTRACT_TEMPLATE_LABELS: Record<ContractTemplate, string> = {
  domestic: '國內旅遊定型化契約',
  international: '國外旅遊定型化契約',
  individual_international: '國外個別旅遊定型化契約',
}

export function TourContractTab({ tour }: TourContractTabProps) {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentContract, setCurrentContract] = useState<Contract | null>(null)

  // 表單狀態
  const [signerType, setSignerType] = useState<'individual' | 'company'>('individual')
  const [signerName, setSignerName] = useState('')
  const [signerPhone, setSignerPhone] = useState('')

  // 載入訂單和團員
  const loadData = useCallback(async () => {
    setLoading(true)

    // 載入訂單和團員
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id,
        code,
        contact_person,
        contact_phone,
        order_members (
          id,
          chinese_name,
          id_number,
          phone,
          contract_id,
          line_user_id
        )
      `)
      .eq('tour_id', tour.id)
      .order('code')

    if (ordersData) {
      setOrders(ordersData as unknown as Order[])
    }

    // 載入合約（contracts 表尚未加入 TypeScript types，使用 fetch）
    try {
      const contractsRes = await fetch(`/api/contracts/list?tourId=${tour.id}`)
      if (contractsRes.ok) {
        const contractsJson = await contractsRes.json()
        setContracts(contractsJson.contracts || [])
      }
    } catch {
      // 忽略錯誤
    }

    setLoading(false)
  }, [tour.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 取得所有團員
  const allMembers = useMemo((): MemberWithOrder[] => {
    return orders.flatMap(order => {
      const members =
        (
          order as unknown as {
            order_members: Array<{
              id: string
              chinese_name?: string
              id_number?: string
              phone?: string
              contract_id?: string
              line_user_id?: string
            }>
          }
        ).order_members || []
      return members.map(m => ({
        id: m.id,
        name: m.chinese_name || '',
        chinese_name: m.chinese_name,
        id_number: m.id_number,
        phone: m.phone,
        contract_id: m.contract_id,
        line_user_id: m.line_user_id,
        order_code: order.code,
        order_id: order.id,
      }))
    })
  }, [orders])

  // 已有合約的團員
  const membersWithContract = useMemo(() => {
    return allMembers.filter(m => m.contract_id)
  }, [allMembers])

  // 尚未簽約的團員
  const membersWithoutContract = useMemo(() => {
    return allMembers.filter(m => !m.contract_id)
  }, [allMembers])

  // 選中的團員中有 LINE 的
  const selectedMembersWithLine = useMemo(() => {
    return allMembers.filter(
      m => selectedMemberIds.includes(m.id) && m.line_user_id
    )
  }, [allMembers, selectedMemberIds])

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

  // 開啟產生合約對話框
  const openCreateDialog = () => {
    // 預設帶入第一個選中團員的資訊
    const firstMember = allMembers.find(m => selectedMemberIds.includes(m.id))
    if (firstMember) {
      setSignerName(firstMember.name)
      setSignerPhone(firstMember.phone || '')
    }
    setCreateDialogOpen(true)
  }

  // 產生合約
  const handleCreateContract = async () => {
    if (!signerName.trim()) {
      toast({ title: '請輸入簽約人姓名', variant: 'destructive' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/contracts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: tour.id,
          workspaceId: tour.workspace_id,
          memberIds: selectedMemberIds,
          signerType,
          signerName: signerName.trim(),
          signerPhone: signerPhone.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      toast({ title: '合約已建立' })
      setCreateDialogOpen(false)
      setSelectedMemberIds([])
      setCurrentContract(data.contract)
      setSendDialogOpen(true)
      loadData()
    } catch (error) {
      toast({
        title: '建立合約失敗',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  // 複製連結
  const copyLink = (contract: Contract) => {
    const url = `${window.location.origin}/public/contract/sign/${contract.code}`
    navigator.clipboard.writeText(url)
    toast({ title: '已複製連結' })
  }

  // 自動判斷的合約類型
  const autoContractType = getContractTemplate(tour)

  if (loading) {
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
          <span className="text-morandi-secondary">（目的地：{tour.location || '未設定'}）</span>
        </div>
      </div>

      {/* 已建立的合約 */}
      {contracts.length > 0 && (
        <div className="border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border bg-morandi-container/30">
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-morandi-gold" />
              <span className="font-medium text-morandi-primary">已建立合約 ({contracts.length})</span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {contracts.map(contract => (
              <div key={contract.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-morandi-primary">{contract.signer_name}</span>
                    {contract.member_ids?.length > 1 && (
                      <span className="text-sm text-morandi-secondary">
                        等 {contract.member_ids.length} 人
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        contract.status === 'signed'
                          ? 'bg-green-100 text-green-700'
                          : contract.status === 'sent'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {contract.status === 'signed'
                        ? '已簽署'
                        : contract.status === 'sent'
                          ? '已發送'
                          : '草稿'}
                    </span>
                  </div>
                  <div className="text-xs text-morandi-secondary mt-1">
                    {CONTRACT_TEMPLATE_LABELS[contract.template as ContractTemplate]} · {contract.code}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copyLink(contract)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/public/contract/sign/${contract.code}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
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
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs">
                {selectedMemberIds.length === membersWithoutContract.length ? '取消全選' : '全選'}
              </Button>
              {selectedMemberIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={openCreateDialog}
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
                  <span className="text-sm text-morandi-secondary ml-2">{member.order_code}</span>
                  {member.line_user_id && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      LINE
                    </span>
                  )}
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

      {/* 產生合約對話框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-morandi-gold" />
              產生合約
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>簽約對象</Label>
              <Select
                value={signerType}
                onValueChange={(v: 'individual' | 'company') => setSignerType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">個人</SelectItem>
                  <SelectItem value="company">公司行號</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{signerType === 'company' ? '公司名稱' : '簽約人姓名'}</Label>
              <Input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder={signerType === 'company' ? '公司名稱' : '姓名'}
              />
            </div>

            <div>
              <Label>聯絡電話</Label>
              <Input
                value={signerPhone}
                onChange={e => setSignerPhone(e.target.value)}
                placeholder="電話"
              />
            </div>

            <div className="bg-morandi-container/50 rounded-lg p-3 text-sm">
              <div className="text-morandi-secondary mb-1">合約類型</div>
              <div className="font-medium text-morandi-primary">
                {CONTRACT_TEMPLATE_LABELS[autoContractType]}
              </div>
              <div className="text-morandi-secondary mt-2 mb-1">簽約團員</div>
              <div className="font-medium text-morandi-primary">
                {selectedMemberIds.length} 人
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateContract} disabled={creating}>
              {creating ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              建立合約
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 發送合約對話框 */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-morandi-gold" />
              發送合約
            </DialogTitle>
          </DialogHeader>

          {currentContract && (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="font-medium text-green-800">合約已建立</div>
                <div className="text-sm text-green-600 mt-1">{currentContract.code}</div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => copyLink(currentContract)}
                >
                  <Link className="w-4 h-4 mr-2" />
                  複製簽約連結
                </Button>

                {selectedMembersWithLine.length > 0 && (
                  <Button variant="outline" className="w-full justify-start">
                    <Send className="w-4 h-4 mr-2 text-green-600" />
                    LINE 發送給 {selectedMembersWithLine[0].name}
                  </Button>
                )}

                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Email 發送
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    window.open(`/public/contract/sign/${currentContract.code}`, '_blank')
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  開啟簽約頁面
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSendDialogOpen(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
