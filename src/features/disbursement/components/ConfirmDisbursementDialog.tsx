'use client'
/**
 * ConfirmDisbursementDialog
 * 確認出帳對話框 - 選擇付款銀行
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyCell } from '@/components/table-cells'
import { Check, Banknote } from 'lucide-react'
import { DISBURSEMENT_LABELS } from '../constants/labels'

interface BankAccount {
  id: string
  code: string
  name: string
  bank_name: string | null
  account_number: string | null
  is_default: boolean
}

interface ConfirmDisbursementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
  totalAmount: number
  bankAccounts: BankAccount[]
  onConfirm: (bankAccountId: string) => Promise<void>
}

export function ConfirmDisbursementDialog({
  open,
  onOpenChange,
  orderNumber,
  totalAmount,
  bankAccounts,
  onConfirm,
}: ConfirmDisbursementDialogProps) {
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 預設選擇 is_default 的銀行
  useEffect(() => {
    if (open && bankAccounts.length > 0) {
      const defaultBank = bankAccounts.find(b => b.is_default)
      setSelectedBankId(defaultBank?.id || bankAccounts[0].id)
    }
  }, [open, bankAccounts])

  const handleConfirm = async () => {
    if (!selectedBankId) return
    setIsSubmitting(true)
    try {
      await onConfirm(selectedBankId)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-morandi-gold" />
            {DISBURSEMENT_LABELS.確認出帳}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 出納單資訊 */}
          <div className="bg-morandi-background/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-morandi-muted">出納單號</span>
              <span className="font-medium">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-morandi-muted">出帳金額</span>
              <span className="font-bold text-lg text-morandi-gold">
                <CurrencyCell amount={totalAmount} />
              </span>
            </div>
          </div>

          {/* 銀行選擇 */}
          <div className="space-y-2">
            <Label>付款銀行 / 現金</Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="選擇付款來源" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    <div className="flex items-center gap-2">
                      <span>{bank.name}</span>
                      {bank.account_number && (
                        <span className="text-morandi-muted text-xs">
                          ({bank.account_number})
                        </span>
                      )}
                      {bank.is_default && (
                        <span className="text-xs bg-morandi-gold/20 text-morandi-gold px-1.5 py-0.5 rounded">
                          預設
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBank && selectedBank.bank_name && (
              <p className="text-xs text-morandi-muted">
                {selectedBank.bank_name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedBankId || isSubmitting}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            {isSubmitting ? '處理中...' : '確認出帳'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
