'use client'
/**
 * CreateDisbursementDialog
 * 新增/編輯出納單對話框
 *
 * 參考 cornerERP 設計：
 * - 上方：出帳日期、出納單號、狀態篩選
 * - 中間：請款編號列表，可搜尋、可勾選
 * - 下方：建立/儲存出納單按鈕
 */

import { useCallback, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { PaymentRequest, DisbursementOrder } from '@/stores/types'
import { useCreateDisbursement } from '../hooks/useCreateDisbursement'
import { DisbursementForm } from './create-dialog/DisbursementForm'
import { DisbursementItemList } from './create-dialog/DisbursementItemList'
import { DISBURSEMENT_LABELS } from '../constants/labels'
import { RequestDetailDialog } from '@/features/finance/requests/components/RequestDetailDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'

interface BankAccount {
  id: string
  code: string
  name: string
  bank_name: string | null
  account_number: string | null
  is_default: boolean
}

interface CreateDisbursementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingRequests: PaymentRequest[]
  onSuccess: () => void
  editingOrder?: DisbursementOrder | null
}

export function CreateDisbursementDialog({
  open,
  onOpenChange,
  pendingRequests,
  onSuccess,
  editingOrder,
}: CreateDisbursementDialogProps) {
  // 使用自定義 Hook 管理狀態和邏輯
  const {
    isEditMode,
    disbursementDate,
    selectedRequestIds,
    searchTerm,
    dateFilter,
    statusFilter,
    isSubmitting,
    filteredRequests,
    selectedAmount,
    setDisbursementDate,
    setSearchTerm,
    setDateFilter,
    setStatusFilter,
    toggleSelect,
    toggleSelectAll,
    setToday,
    clearFilters,
    handleCreate,
    handleUpdate,
    resetForm,
  } = useCreateDisbursement({ pendingRequests, onSuccess, editingOrder })

  // 請款單詳情視窗
  const [viewingRequest, setViewingRequest] = useState<PaymentRequest | null>(null)

  // 銀行帳戶
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  // 載入銀行帳戶
  useEffect(() => {
    if (open && workspaceId) {
      fetch(`/api/bank-accounts?workspace_id=${workspaceId}`)
        .then(res => res.json())
        .then(data => {
          setBankAccounts(data || [])
          // 預設選擇 is_default 的銀行
          const defaultBank = data?.find((b: BankAccount) => b.is_default)
          setSelectedBankId(defaultBank?.id || data?.[0]?.id || '')
        })
        .catch(err => console.error('載入銀行帳戶失敗:', err))
    }
  }, [open, workspaceId])

  // 關閉時重置
  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetForm()
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, resetForm]
  )

  // 包裝 handleCreate，傳入銀行帳戶
  const handleSubmitWithBank = async () => {
    if (isEditMode) {
      await handleUpdate()
    } else {
      await handleCreate(selectedBankId)
    }
  }
  const title = isEditMode
    ? `${DISBURSEMENT_LABELS.編輯出納單} ${editingOrder?.order_number || ''}`
    : DISBURSEMENT_LABELS.新增出納單
  const submitLabel = isEditMode
    ? isSubmitting
      ? DISBURSEMENT_LABELS.儲存中
      : DISBURSEMENT_LABELS.儲存變更.replace('{count}', selectedRequestIds.length.toString())
    : isSubmitting
      ? DISBURSEMENT_LABELS.建立中
      : DISBURSEMENT_LABELS.建立出納單數量.replace('{count}', selectedRequestIds.length.toString())

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent level={1} size="full" className="h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          {/* 表單區塊 */}
          <div className="flex items-end gap-4">
            <DisbursementForm
              disbursementDate={disbursementDate}
              statusFilter={statusFilter}
              onDateChange={setDisbursementDate}
              onStatusChange={setStatusFilter}
            />
            
            {/* 付款銀行選擇 */}
            {!isEditMode && (
              <div className="space-y-1.5">
                <Label className="text-sm text-morandi-muted">付款銀行</Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="選擇付款來源" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                        {bank.is_default && ' (預設)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 項目列表區塊 */}
          <DisbursementItemList
            filteredRequests={filteredRequests}
            selectedRequestIds={selectedRequestIds}
            selectedAmount={selectedAmount}
            searchTerm={searchTerm}
            dateFilter={dateFilter}
            onSearchChange={setSearchTerm}
            onDateFilterChange={setDateFilter}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onSetToday={setToday}
            onClearFilters={clearFilters}
            onViewRequest={setViewingRequest}
          />
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => handleClose(false)} className="gap-1">
            <X size={16} />
            {DISBURSEMENT_LABELS.取消}
          </Button>
          <Button
            onClick={handleSubmitWithBank}
            disabled={(!isEditMode && (selectedRequestIds.length === 0 || !selectedBankId)) || isSubmitting}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 請款單詳情視窗（只讀模式） */}
      <RequestDetailDialog
        request={viewingRequest}
        open={!!viewingRequest}
        onOpenChange={(open) => !open && setViewingRequest(null)}
        readOnly
      />
    </Dialog>
  )
}
