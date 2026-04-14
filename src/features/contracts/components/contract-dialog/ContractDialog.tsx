'use client'

import { CONTRACT_DIALOG_LABELS } from '../constants/labels'

import React, { useEffect, useState } from 'react'
import {
  FileSignature,
  Save,
  Printer,
  X,
  Plus,
  ArrowLeft,
  Edit2,
  Loader2,
  Users,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateCell } from '@/components/table-cells'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { ContractTemplate } from '@/types/tour.types'
import { ContractDialogProps } from './types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useContractForm } from './useContractForm'
import { useTourDisplay } from '@/features/tours/utils/tour-display'
import { ContractFormFields } from './ContractFormFields'
import { COMP_CONTRACTS_LABELS } from '../constants/labels'

const CONTRACT_TEMPLATES = [
  { value: 'domestic' as ContractTemplate, label: COMP_CONTRACTS_LABELS.國內旅遊定型化契約 },
  { value: 'international' as ContractTemplate, label: COMP_CONTRACTS_LABELS.國外旅遊定型化契約 },
  {
    value: 'individual_international' as ContractTemplate,
    label: COMP_CONTRACTS_LABELS.國外個別旅遊定型化契約,
  },
]

const CONTRACT_TEMPLATE_LABELS: Record<ContractTemplate, string> = {
  domestic: COMP_CONTRACTS_LABELS.國內旅遊定型化契約,
  international: COMP_CONTRACTS_LABELS.國外旅遊定型化契約,
  individual_international: COMP_CONTRACTS_LABELS.國外個別旅遊定型化契約,
}

export function ContractDialog({ isOpen, onClose, tour, mode }: ContractDialogProps) {
  // SSOT：目的地顯示字串
  const { displayString: tourDestinationDisplay } = useTourDisplay(tour)
  // 視圖狀態：'main' | 'form' | 'select-members'
  const [viewMode, setViewMode] = useState<'main' | 'form' | 'select-members'>('main')
  // 多選旅客的 IDs
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  // 附件選項
  const [includeMemberList, setIncludeMemberList] = useState(false)
  const [includeItinerary, setIncludeItinerary] = useState(false)

  const {
    selectedTemplate,
    setSelectedTemplate,
    contractNotes,
    setContractNotes,
    contractCompleted,
    setContractCompleted,
    archivedDate,
    setArchivedDate,
    saving,
    contractData,
    handleFieldChange,
    handleSave,
    handlePrint,
    firstOrder,
    tourMembers,
    tourOrders,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrder,
    ordersLoading,
    membersWithoutContract,
    membersWithContract,
    setSelectedMemberId,
    setIsCorporateContract,
  } = useContractForm({ tour, mode, isOpen })

  // 判斷是否已有合約
  const hasContract = !!tour.contract_template

  // 當對話框開啟時，重置狀態
  useEffect(() => {
    if (isOpen) {
      setViewMode('main')
      setSelectedMemberIds([])
    }
  }, [isOpen])

  // 切換旅客選擇
  const toggleMemberSelection = (memberId: string) => {
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

  // 進入新增合約流程 - 直接進入表單，在表單內選擇成員
  const handleStartNewContract = () => {
    // 預設為公司代表簽約，用戶可在表單內選擇成員
    setIsCorporateContract(true)
    setViewMode('form')
  }

  // 確認選擇旅客後進入表單
  const handleConfirmMemberSelection = () => {
    if (selectedMemberIds.length > 0) {
      setSelectedMemberId(selectedMemberIds[0])
      setIsCorporateContract(false)
    } else {
      setIsCorporateContract(true)
    }
    setViewMode('form')
  }

  // 儲存合約
  const onSave = async () => {
    const success = await handleSave(selectedMemberIds)
    if (success) {
      setViewMode('main')
      setSelectedMemberIds([])
    }
  }

  // 編輯現有合約
  const handleEditContract = () => {
    setViewMode('form')
  }

  // 返回主視圖
  const handleBackToMain = () => {
    setViewMode('main')
    setSelectedMemberIds([])
  }

  // 按訂單分組的成員（用於選擇視圖）
  const membersByOrder = tourOrders.map(order => ({
    order,
    members: membersWithoutContract.filter(m => m.order_id === order.id),
  }))

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={2}
        className={
          viewMode === 'form'
            ? 'max-w-4xl max-h-[90vh] overflow-hidden'
            : 'max-w-md h-[500px] flex flex-col overflow-hidden'
        }
      >
        {/* ==================== 主視圖 ==================== */}
        {viewMode === 'main' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-morandi-gold" />
                <span>{CONTRACT_DIALOG_LABELS.MANAGEMENT}</span>
                <span className="text-sm text-morandi-secondary font-normal">- {tour.code}</span>
              </DialogTitle>
            </DialogHeader>

            {/* 合約卡片 */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden border border-border rounded-lg">
              {/* 卡片標題 */}
              <div className="flex-shrink-0 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-morandi-primary" />
                  <span className="text-sm font-medium text-morandi-primary">
                    {CONTRACT_DIALOG_LABELS.CONTRACT}
                  </span>
                </div>
                <p className="text-xs text-morandi-secondary mt-1">
                  {CONTRACT_DIALOG_LABELS.MANAGE_DESC}
                </p>
              </div>

              {/* 分割線 */}
              <div className="mx-4">
                <div className="border-t border-border" />
              </div>

              {/* 列表區域 */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-morandi-secondary" />
                  </div>
                ) : hasContract ? (
                  // 已有合約：顯示合約資訊
                  <div className="space-y-4">
                    <button
                      onClick={handleEditContract}
                      className="w-full group flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-morandi-gold/50 hover:bg-morandi-gold/5 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-morandi-container/50 text-xs text-morandi-secondary shrink-0">
                          1
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-morandi-primary truncate">
                            {tour.contract_template &&
                              CONTRACT_TEMPLATE_LABELS[tour.contract_template as ContractTemplate]}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-morandi-secondary mt-0.5">
                            {membersWithContract.length > 0 && (
                              <span>{membersWithContract.length} 位旅客</span>
                            )}
                            {tour.contract_created_at && (
                              <DateCell
                                date={tour.contract_created_at}
                                format="short"
                                showIcon={false}
                                className="text-xs"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      <Edit2 className="w-4 h-4 text-morandi-secondary shrink-0" />
                    </button>

                    {/* 列印按鈕 */}
                    <button
                      onClick={handlePrint}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-morandi-gold hover:bg-morandi-gold/5 rounded-lg transition-colors"
                    >
                      <Printer size={16} />
                      {CONTRACT_DIALOG_LABELS.PRINT_8406}
                    </button>
                  </div>
                ) : (
                  // 沒有合約
                  <div className="text-center py-8 text-sm text-morandi-secondary">
                    {CONTRACT_DIALOG_LABELS.EMPTY_3762}
                  </div>
                )}
              </div>

              {/* 分割線 */}
              <div className="mx-4">
                <div className="border-t border-border" />
              </div>

              {/* 新增按鈕 */}
              <div className="flex-shrink-0 p-4">
                <button
                  onClick={handleStartNewContract}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-morandi-gold hover:bg-morandi-gold-hover rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  {hasContract && membersWithoutContract.length > 0
                    ? `新增旅客 (${membersWithoutContract.length} 人未加入)`
                    : COMP_CONTRACTS_LABELS.新增}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ==================== 選擇旅客視圖 ==================== */}
        {viewMode === 'select-members' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  onClick={handleBackToMain}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Users className="w-5 h-5 text-morandi-gold" />
                <span>{CONTRACT_DIALOG_LABELS.SELECT_PASSENGERS}</span>
              </DialogTitle>
            </DialogHeader>

            {/* 旅客列表卡片 */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden border border-border rounded-lg">
              {/* 卡片標題 */}
              <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-morandi-primary" />
                    <span className="text-sm font-medium text-morandi-primary">
                      {CONTRACT_DIALOG_LABELS.PASSENGER}
                    </span>
                  </div>
                  <p className="text-xs text-morandi-secondary mt-1">
                    {CONTRACT_DIALOG_LABELS.SELECT_DESC}
                  </p>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-morandi-gold hover:underline"
                >
                  {selectedMemberIds.length === membersWithoutContract.length
                    ? COMP_CONTRACTS_LABELS.取消全選
                    : COMP_CONTRACTS_LABELS.全選}
                </button>
              </div>

              {/* 分割線 */}
              <div className="mx-4">
                <div className="border-t border-border" />
              </div>

              {/* 列表內容 */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {membersByOrder.map(
                    ({ order, members }) =>
                      members.length > 0 && (
                        <div key={order.id}>
                          <div className="text-xs text-morandi-secondary mb-2 px-1">
                            {order.order_number} - {order.contact_person}
                          </div>
                          <div className="space-y-1">
                            {members.map(member => {
                              const memberData = member as unknown as {
                                chinese_name?: string
                                passport_name?: string
                                id_number?: string
                              }
                              const displayName =
                                memberData.chinese_name ||
                                memberData.passport_name ||
                                COMP_CONTRACTS_LABELS.未命名
                              const isSelected = selectedMemberIds.includes(member.id)

                              return (
                                <button
                                  key={member.id}
                                  onClick={() => toggleMemberSelection(member.id)}
                                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                                    isSelected
                                      ? 'border-morandi-gold bg-morandi-gold/5'
                                      : 'border-border/50 hover:border-morandi-gold/50'
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? 'bg-morandi-gold border-morandi-gold'
                                        : 'border-border'
                                    }`}
                                  >
                                    {isSelected && <Check size={14} className="text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-morandi-primary truncate">
                                      {displayName}
                                    </div>
                                    {memberData.id_number && (
                                      <div className="text-xs text-morandi-secondary">
                                        {memberData.id_number}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                  )}
                </div>
              </div>

              {/* 分割線 */}
              <div className="mx-4">
                <div className="border-t border-border" />
              </div>

              {/* 確認按鈕 */}
              <div className="flex-shrink-0 p-4">
                <button
                  onClick={handleConfirmMemberSelection}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-morandi-gold hover:bg-morandi-gold-hover rounded-lg transition-colors"
                >
                  <Check size={16} />
                  確認 ({selectedMemberIds.length} 人)
                </button>
              </div>
            </div>
          </>
        )}

        {/* ==================== 表單視圖 ==================== */}
        {viewMode === 'form' && (
          <>
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <button
                  onClick={handleBackToMain}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <FileSignature size={20} />
                {hasContract ? COMP_CONTRACTS_LABELS.編輯合約 : COMP_CONTRACTS_LABELS.建立合約}
                {selectedMemberIds.length > 0 && (
                  <span className="text-sm font-normal text-morandi-secondary">
                    ({selectedMemberIds.length} 位旅客)
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 py-4">
                {/* 旅遊團資訊 */}
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  <div className="bg-morandi-container/50 border-b border-border/60 px-4 py-2">
                    <span className="text-sm font-medium text-morandi-primary">
                      {CONTRACT_DIALOG_LABELS.TOUR_INFO}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-morandi-secondary">
                        {CONTRACT_DIALOG_LABELS.TOUR_CODE}
                      </div>
                      <div className="text-sm text-morandi-primary font-medium">{tour.code}</div>
                    </div>
                    <div>
                      <div className="text-xs text-morandi-secondary">
                        {CONTRACT_DIALOG_LABELS.LABEL_4272}
                      </div>
                      <div className="text-sm text-morandi-primary font-medium">{tour.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-morandi-secondary">
                        {CONTRACT_DIALOG_LABELS.LABEL_4513}
                      </div>
                      <div className="text-sm text-morandi-primary font-medium">
                        <DateCell date={tour.departure_date} showIcon={false} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-morandi-secondary">
                        {CONTRACT_DIALOG_LABELS.LABEL_5475}
                      </div>
                      <div className="text-sm text-morandi-primary font-medium">
                        {tourDestinationDisplay}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 選擇訂單 */}
                {tourOrders.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-morandi-primary mb-2 block">
                      {CONTRACT_DIALOG_LABELS.SELECT_1070}
                    </label>
                    <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                      <SelectTrigger>
                        <SelectValue placeholder={COMP_CONTRACTS_LABELS.選擇訂單} />
                      </SelectTrigger>
                      <SelectContent>
                        {tourOrders.map(order => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_number} - {order.contact_person}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 選擇範本 */}
                {!hasContract && (
                  <div>
                    <label className="text-sm font-medium text-morandi-primary mb-3 block">
                      {CONTRACT_DIALOG_LABELS.SELECT_4327}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {CONTRACT_TEMPLATES.map(template => (
                        <button
                          key={template.value}
                          onClick={() => setSelectedTemplate(template.value)}
                          className={`p-3 border-2 rounded-lg transition-all text-center ${
                            selectedTemplate === template.value
                              ? 'border-morandi-gold bg-morandi-gold/10'
                              : 'border-border hover:border-morandi-gold/50'
                          }`}
                        >
                          <FileSignature className="mx-auto mb-1" size={20} />
                          <div className="text-xs font-medium text-morandi-primary">
                            {template.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 合約填寫欄位 */}
                <ContractFormFields
                  contractData={contractData}
                  onFieldChange={handleFieldChange}
                  members={tourMembers.map(m => ({
                    id: m.id,
                    name:
                      (m as unknown as { chinese_name?: string; passport_name?: string })
                        .chinese_name ||
                      (m as unknown as { chinese_name?: string; passport_name?: string })
                        .passport_name ||
                      COMP_CONTRACTS_LABELS.未命名,
                    idNumber: (m as unknown as { id_number?: string }).id_number || undefined,
                    phone: (m as unknown as { phone?: string }).phone || undefined,
                  }))}
                  selectedMemberIds={selectedMemberIds}
                  onSelectMembers={memberIds => {
                    setSelectedMemberIds(memberIds)
                    if (memberIds.length > 0) {
                      setSelectedMemberId(memberIds[0])
                      setIsCorporateContract(false)
                    } else {
                      setSelectedMemberId(null)
                      setIsCorporateContract(true)
                    }
                  }}
                />

                {/* 備註 */}
                <div>
                  <label className="text-sm font-medium text-morandi-primary mb-2 block">
                    {CONTRACT_DIALOG_LABELS.REMARKS}
                  </label>
                  <textarea
                    value={contractNotes}
                    onChange={e => setContractNotes(e.target.value)}
                    placeholder={COMP_CONTRACTS_LABELS.請輸入備註}
                    className="w-full h-20 p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50 resize-none text-sm"
                  />
                </div>

                {/* 附件選項 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-morandi-primary block">合約附件</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMemberList}
                        onChange={e => setIncludeMemberList(e.target.checked)}
                        className="w-4 h-4 text-morandi-gold focus:ring-morandi-gold/50 rounded"
                      />
                      <span className="text-sm text-morandi-primary">附上團員名單</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeItinerary}
                        onChange={e => setIncludeItinerary(e.target.checked)}
                        className="w-4 h-4 text-morandi-gold focus:ring-morandi-gold/50 rounded"
                      />
                      <span className="text-sm text-morandi-primary">附上行程表</span>
                    </label>
                  </div>
                </div>

                {/* 完成狀態 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contractCompleted}
                        onChange={e => setContractCompleted(e.target.checked)}
                        className="w-4 h-4 text-morandi-gold focus:ring-morandi-gold/50 rounded"
                      />
                      <span className="text-sm text-morandi-primary">
                        {CONTRACT_DIALOG_LABELS.LABEL_7282}
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-morandi-primary mb-2 block">
                      {CONTRACT_DIALOG_LABELS.LABEL_815}
                    </label>
                    <DatePicker
                      value={archivedDate}
                      onChange={date => setArchivedDate(date)}
                      placeholder={COMP_CONTRACTS_LABELS.選擇日期}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={handleBackToMain}
                disabled={saving}
                className="gap-2"
              >
                <X size={16} />
                {CONTRACT_DIALOG_LABELS.CANCEL}
              </Button>
              <Button
                onClick={onSave}
                disabled={saving || (!hasContract && !selectedTemplate)}
                className="gap-2"
              >
                <Save size={16} />
                {saving
                  ? COMP_CONTRACTS_LABELS.儲存中
                  : hasContract
                    ? COMP_CONTRACTS_LABELS.儲存
                    : COMP_CONTRACTS_LABELS.建立合約}
              </Button>
              <Button
                onClick={handlePrint}
                disabled={saving || (!hasContract && !selectedTemplate)}
                className="bg-morandi-gold hover:bg-morandi-gold-hover gap-2"
              >
                <Printer size={16} />
                {CONTRACT_DIALOG_LABELS.PRINT}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
