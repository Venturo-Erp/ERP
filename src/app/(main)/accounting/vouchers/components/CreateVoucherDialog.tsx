'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface JournalLine {
  id: string
  account_id: string
  account_code?: string
  account_name?: string
  description: string
  debit_amount: number
  credit_amount: number
}

interface Account {
  id: string
  code: string
  name: string
  account_type: string
}

interface CreateVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// 關聯單據類型
type SourceType = '' | 'receipt' | 'payment_request'

interface SourceDocument {
  id: string
  code: string
  description: string
  amount: number
  date: string
}

export function CreateVoucherDialog({ open, onOpenChange, onSuccess }: CreateVoucherDialogProps) {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])

  // 傳票資料
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState('')

  // 關聯單據
  const [sourceType, setSourceType] = useState<SourceType>('')
  const [sourceId, setSourceId] = useState('')
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)

  // 分錄明細
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    { id: '2', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
  ])

  // 載入科目表
  useEffect(() => {
    if (open && user?.workspace_id) {
      loadAccounts()
    }
  }, [open, user?.workspace_id])

  // 載入關聯單據列表
  useEffect(() => {
    if (sourceType && user?.workspace_id) {
      loadSourceDocuments()
    } else {
      setSourceDocuments([])
      setSourceId('')
    }
  }, [sourceType, user?.workspace_id])

  const loadSourceDocuments = async () => {
    if (!user?.workspace_id || !sourceType) return
    
    setIsLoadingDocuments(true)
    try {
      if (sourceType === 'receipt') {
        // 載入收款單（排除已有傳票的）
        const { data } = await supabase
          .from('receipts')
          .select('id, receipt_number, notes, amount, receipt_date')
          .eq('workspace_id', user.workspace_id)
          .order('receipt_date', { ascending: false })
          .limit(50)
        
        setSourceDocuments((data || []).map(r => ({
          id: r.id,
          code: r.receipt_number || r.id.slice(0, 8),
          description: r.notes || '收款單',
          amount: r.amount || 0,
          date: r.receipt_date || '',
        })))
      } else if (sourceType === 'payment_request') {
        // 載入請款單
        const { data } = await supabase
          .from('payment_requests')
          .select('id, code, notes, total_amount, request_date')
          .eq('workspace_id', user.workspace_id)
          .order('request_date', { ascending: false })
          .limit(50)
        
        setSourceDocuments((data || []).map(r => ({
          id: r.id,
          code: r.code || r.id.slice(0, 8),
          description: r.notes || '請款單',
          amount: r.total_amount || 0,
          date: r.request_date || '',
        })))
      }
    } catch (error) {
      logger.error('載入單據失敗:', error)
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  const loadAccounts = async () => {
    if (!user?.workspace_id) return

    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_type')
        .eq('workspace_id', user.workspace_id)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      logger.error('載入科目表失敗:', error)
      toast.error('載入科目表失敗')
    }
  }

  // 新增分錄
  const addLine = () => {
    setLines([
      ...lines,
      {
        id: Date.now().toString(),
        account_id: '',
        description: '',
        debit_amount: 0,
        credit_amount: 0,
      },
    ])
  }

  // 刪除分錄
  const removeLine = (id: string) => {
    if (lines.length <= 2) {
      toast.error('至少需要兩筆分錄')
      return
    }
    setLines(lines.filter(line => line.id !== id))
  }

  // 更新分錄
  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(lines.map(line => (line.id === id ? { ...line, [field]: value } : line)))
  }

  // 計算總額
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
  const isBalanced = totalDebit === totalCredit && totalDebit > 0

  // 提交傳票
  const handleSubmit = async () => {
    // 驗證
    if (!voucherDate) {
      toast.error('請選擇傳票日期')
      return
    }

    if (lines.some(line => !line.account_id)) {
      toast.error('請為所有分錄選擇科目')
      return
    }

    if (!isBalanced) {
      toast.error('借貸不平衡！借方總額必須等於貸方總額')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/accounting/vouchers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_date: voucherDate,
          source_type: sourceType || null,
          source_id: sourceId || null,
          memo: memo.trim() || null,
          lines: lines.map(line => ({
            account_id: line.account_id,
            description: line.description.trim() || null,
            debit_amount: line.debit_amount || 0,
            credit_amount: line.credit_amount || 0,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '建立傳票失敗')
      }

      toast.success('傳票建立成功')
      onSuccess?.()
      handleClose()
    } catch (error) {
      logger.error('建立傳票失敗:', error)
      toast.error(error instanceof Error ? error.message : '建立傳票失敗')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setVoucherDate(new Date().toISOString().split('T')[0])
    setMemo('')
    setSourceType('')
    setSourceId('')
    setSourceDocuments([])
    setLines([
      { id: '1', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
      { id: '2', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    ])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增傳票</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 傳票資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>傳票日期 *</Label>
              <Input
                type="date"
                value={voucherDate}
                onChange={e => setVoucherDate(e.target.value)}
              />
            </div>
            <div>
              <Label>說明</Label>
              <Input placeholder="傳票說明" value={memo} onChange={e => setMemo(e.target.value)} />
            </div>
          </div>

          {/* 關聯單據 */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <Label>關聯單據類型（選填）</Label>
              <Select 
                value={sourceType || 'none'} 
                onValueChange={(v) => setSourceType(v === 'none' ? '' : v as SourceType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="不關聯單據" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不關聯單據</SelectItem>
                  <SelectItem value="receipt">收款單</SelectItem>
                  <SelectItem value="payment_request">請款單</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>選擇單據</Label>
              <Select 
                value={sourceId} 
                onValueChange={setSourceId}
                disabled={!sourceType || isLoadingDocuments}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingDocuments ? '載入中...' : '請先選擇類型'} />
                </SelectTrigger>
                <SelectContent>
                  {sourceDocuments.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.code} - {doc.description} (${doc.amount.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceType && sourceDocuments.length === 0 && !isLoadingDocuments && (
                <p className="text-xs text-muted-foreground mt-1">沒有可選的單據</p>
              )}
            </div>
          </div>

          {/* 分錄明細 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>分錄明細</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus size={14} className="mr-1" />
                新增分錄
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 w-[25%]">科目</th>
                    <th className="text-left p-2 w-[30%]">摘要</th>
                    <th className="text-right p-2 w-[18%]">借方</th>
                    <th className="text-right p-2 w-[18%]">貸方</th>
                    <th className="text-center p-2 w-[9%]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => (
                    <tr key={line.id} className="border-t">
                      <td className="p-2">
                        <Select
                          value={line.account_id}
                          onValueChange={value => updateLine(line.id, 'account_id', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="選擇科目" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-8"
                          placeholder="摘要"
                          value={line.description}
                          onChange={e => updateLine(line.id, 'description', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-8 text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit_amount || ''}
                          onChange={e =>
                            updateLine(line.id, 'debit_amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-8 text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit_amount || ''}
                          onChange={e =>
                            updateLine(line.id, 'credit_amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 2}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {/* 總計行 */}
                  <tr className="border-t bg-muted font-semibold">
                    <td colSpan={2} className="p-2 text-right">
                      總計
                    </td>
                    <td className="p-2 text-right">{totalDebit.toLocaleString()}</td>
                    <td className="p-2 text-right">{totalCredit.toLocaleString()}</td>
                    <td className="p-2 text-center">
                      {isBalanced ? (
                        <span className="text-morandi-green">✅ 平衡</span>
                      ) : (
                        <span className="text-morandi-red">❌ 不平衡</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !isBalanced}>
              {isLoading ? '建立中...' : '建立傳票'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
