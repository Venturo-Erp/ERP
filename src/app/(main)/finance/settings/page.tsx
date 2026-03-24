'use client'

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
// 簡易 Table 組件
const Table = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <table className={`w-full text-sm ${className || ''}`}>{children}</table>
)
const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-morandi-background/50">{children}</thead>
)
const TableBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>
const TableRow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <tr className={`border-b border-border ${className || ''}`}>{children}</tr>
)
const TableHead = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-3 text-left font-medium text-morandi-muted ${className || ''}`}>{children}</th>
)
const TableCell = ({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) => (
  <td className={`px-4 py-3 ${className || ''}`} colSpan={colSpan}>{children}</td>
)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Settings,
  CreditCard,
  Banknote,
  Plus,
  Pencil,
  Trash2,
  Building2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { alert, confirm } from '@/lib/ui/alert-dialog'

interface PaymentMethod {
  id: string
  code: string
  name: string
  type: 'receipt' | 'payment' // 收款 or 請款
  description: string | null
  is_active: boolean
  sort_order: number
}

interface BankAccount {
  id: string
  code: string
  name: string
  bank_name: string | null
  account_number: string | null
  is_default: boolean
  is_active: boolean
}

interface AccountMapping {
  id: string
  category: string
  mapping_type: string
  debit_account_id: string | null
  credit_account_id: string | null
  debit: { id: string; code: string; name: string } | null
  credit: { id: string; code: string; name: string } | null
}

interface ChartOfAccount {
  id: string
  code: string
  name: string
  type: string // API 返回的是 type（轉換自 account_type）
  account_type?: string
}

export default function FinanceSettingsPage() {
  const [activeSection, setActiveSection] = useState<'receipt' | 'payment' | 'bank' | 'mapping'>('receipt')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 編輯對話框
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false)
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false)
  
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  // 載入資料
  useEffect(() => {
    if (workspaceId) {
      loadData()
    }
  }, [workspaceId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // 載入付款方式
      const methodsRes = await fetch(`/api/finance/payment-methods?workspace_id=${workspaceId}`)
      const methodsData = await methodsRes.json()
      setPaymentMethods(methodsData || [])

      // 載入銀行帳戶
      const banksRes = await fetch(`/api/bank-accounts?workspace_id=${workspaceId}`)
      const banksData = await banksRes.json()
      setBankAccounts(banksData || [])

      // 載入科目對應
      const mappingsRes = await fetch(`/api/finance/account-mappings?workspace_id=${workspaceId}`)
      const mappingsData = await mappingsRes.json()
      setAccountMappings(mappingsData || [])

      // 載入會計科目（供選擇用）
      const accountsRes = await fetch(`/api/finance/accounting-subjects?workspace_id=${workspaceId}`)
      const accountsData = await accountsRes.json()
      setChartOfAccounts(accountsData || [])
    } catch (error) {
      console.error('載入資料失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 收款方式
  const receiptMethods = paymentMethods.filter(m => m.type === 'receipt')
  // 請款方式
  const paymentMethodsList = paymentMethods.filter(m => m.type === 'payment')

  // 儲存付款方式
  const handleSaveMethod = async (method: Partial<PaymentMethod>) => {
    try {
      const res = await fetch('/api/finance/payment-methods', {
        method: editingMethod?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...method,
          id: editingMethod?.id,
          workspace_id: workspaceId,
          type: activeSection === 'receipt' ? 'receipt' : 'payment',
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      await loadData()
      setIsMethodDialogOpen(false)
      setEditingMethod(null)
      await alert('儲存成功', 'success')
    } catch (error) {
      await alert('儲存失敗', 'error')
    }
  }

  // 刪除付款方式
  const handleDeleteMethod = async (method: PaymentMethod) => {
    const confirmed = await confirm(`確定要刪除「${method.name}」嗎？`, {
      title: '刪除付款方式',
      type: 'warning',
    })
    if (!confirmed) return
    
    try {
      const res = await fetch(`/api/finance/payment-methods?id=${method.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('刪除失敗')
      await loadData()
      await alert('刪除成功', 'success')
    } catch (error) {
      await alert('刪除失敗', 'error')
    }
  }

  // 儲存銀行帳戶
  const handleSaveBank = async (bank: Partial<BankAccount>) => {
    try {
      const res = await fetch('/api/bank-accounts', {
        method: editingBank?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bank,
          id: editingBank?.id,
          workspace_id: workspaceId,
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      await loadData()
      setIsBankDialogOpen(false)
      setEditingBank(null)
      await alert('儲存成功', 'success')
    } catch (error) {
      await alert('儲存失敗', 'error')
    }
  }

  // 刪除銀行帳戶
  const handleDeleteBank = async (bank: BankAccount) => {
    const confirmed = await confirm(`確定要刪除「${bank.name}」嗎？`, {
      title: '刪除銀行帳戶',
      type: 'warning',
    })
    if (!confirmed) return
    
    try {
      const res = await fetch(`/api/bank-accounts?id=${bank.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('刪除失敗')
      await loadData()
      await alert('刪除成功', 'success')
    } catch (error) {
      await alert('刪除失敗', 'error')
    }
  }

  const sections = [
    { key: 'receipt', label: '收款方式', icon: CreditCard },
    { key: 'payment', label: '請款方式', icon: Banknote },
    { key: 'bank', label: '銀行帳戶', icon: Building2 },
    { key: 'mapping', label: '科目對應', icon: Settings },
  ] as const

  // 取得當前 section 的標題
  const currentSection = sections.find(s => s.key === activeSection)
  const sectionTitle = currentSection?.label || ''

  return (
    <ContentPageLayout 
      title={`財務設定 > ${sectionTitle}管理`} 
      icon={Settings}
      headerActions={
        activeSection === 'receipt' ? (
          <Button
            onClick={() => {
              setEditingMethod(null)
              setIsMethodDialogOpen(true)
            }}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增收款方式
          </Button>
        ) : activeSection === 'payment' ? (
          <Button
            onClick={() => {
              setEditingMethod(null)
              setIsMethodDialogOpen(true)
            }}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增請款方式
          </Button>
        ) : activeSection === 'bank' ? (
          <Button
            onClick={() => {
              setEditingBank(null)
              setIsBankDialogOpen(true)
            }}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增銀行帳戶
          </Button>
        ) : null
      }
    >
      <div className="flex h-full">
        {/* 左側選單 */}
        <div className="w-[200px] border-r border-border bg-morandi-background/30">
          <div className="p-4 space-y-1">
            {sections.map(section => {
              const Icon = section.icon
              const isActive = activeSection === section.key
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-morandi-gold text-white'
                      : 'text-morandi-secondary hover:bg-morandi-container'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 右側內容 */}
        <div className="flex-1 p-6">
          {/* 收款方式 */}
          {activeSection === 'receipt' && (
            <div className="space-y-4">
              <Card className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">代碼</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>說明</TableHead>
                      <TableHead className="w-[80px]">狀態</TableHead>
                      <TableHead className="w-[100px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptMethods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-morandi-muted">
                          尚未設定收款方式
                        </TableCell>
                      </TableRow>
                    ) : (
                      receiptMethods.map(method => (
                        <TableRow key={method.id}>
                          <TableCell className="font-mono">{method.code}</TableCell>
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell className="text-morandi-muted">{method.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={method.is_active ? 'default' : 'secondary'}>
                              {method.is_active ? '啟用' : '停用'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingMethod(method)
                                  setIsMethodDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMethod(method)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* 請款方式 */}
          {activeSection === 'payment' && (
            <div className="space-y-4">
              <Card className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">代碼</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>說明</TableHead>
                      <TableHead className="w-[80px]">狀態</TableHead>
                      <TableHead className="w-[100px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethodsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-morandi-muted">
                          尚未設定請款方式
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentMethodsList.map(method => (
                        <TableRow key={method.id}>
                          <TableCell className="font-mono">{method.code}</TableCell>
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell className="text-morandi-muted">{method.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={method.is_active ? 'default' : 'secondary'}>
                              {method.is_active ? '啟用' : '停用'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingMethod(method)
                                  setIsMethodDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMethod(method)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* 銀行帳戶 */}
          {activeSection === 'bank' && (
            <div className="space-y-4">
              <Card className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">代碼</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>銀行</TableHead>
                      <TableHead>帳號</TableHead>
                      <TableHead className="w-[80px]">預設</TableHead>
                      <TableHead className="w-[100px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-morandi-muted">
                          尚未設定銀行帳戶
                        </TableCell>
                      </TableRow>
                    ) : (
                      bankAccounts.map(bank => (
                        <TableRow key={bank.id}>
                          <TableCell className="font-mono">{bank.code}</TableCell>
                          <TableCell className="font-medium">{bank.name}</TableCell>
                          <TableCell>{bank.bank_name || '-'}</TableCell>
                          <TableCell className="font-mono">{bank.account_number || '-'}</TableCell>
                          <TableCell>
                            {bank.is_default && (
                              <Badge className="bg-morandi-gold/20 text-morandi-gold">預設</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingBank(bank)
                                  setIsBankDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBank(bank)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* 科目對應 */}
          {activeSection === 'mapping' && (
            <div className="space-y-4">
              <Card className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">名稱</TableHead>
                      <TableHead className="w-[150px]">說明</TableHead>
                      <TableHead>借方</TableHead>
                      <TableHead>貸方</TableHead>
                      <TableHead className="w-[80px]">狀態</TableHead>
                      <TableHead className="w-[80px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountMappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-morandi-muted">
                          尚未設定科目對應
                        </TableCell>
                      </TableRow>
                    ) : (
                      accountMappings.map(mapping => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-medium">{mapping.category}</TableCell>
                          <TableCell className="text-morandi-muted text-sm">
                            {mapping.mapping_type === 'payment_category' ? '請款' : '收款'}
                          </TableCell>
                          <TableCell>
                            <select
                              value={mapping.debit_account_id || ''}
                              onChange={async (e) => {
                                const newDebitId = e.target.value
                                await fetch(`/api/finance/account-mappings?id=${mapping.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    debit_account_id: newDebitId,
                                    credit_account_id: mapping.credit_account_id 
                                  }),
                                })
                                await loadData()
                              }}
                              className="w-full h-9 px-2 rounded border border-input bg-background text-sm"
                            >
                              <option value="">選擇科目</option>
                              {chartOfAccounts.map(account => (
                                <option key={account.id} value={account.id}>
                                  {account.code} {account.name}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <select
                              value={mapping.credit_account_id || ''}
                              onChange={async (e) => {
                                const newCreditId = e.target.value
                                await fetch(`/api/finance/account-mappings?id=${mapping.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    debit_account_id: mapping.debit_account_id,
                                    credit_account_id: newCreditId 
                                  }),
                                })
                                await loadData()
                              }}
                              className="w-full h-9 px-2 rounded border border-input bg-background text-sm"
                            >
                              <option value="">選擇科目</option>
                              {chartOfAccounts.map(account => (
                                <option key={account.id} value={account.id}>
                                  {account.code} {account.name}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700">啟用</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* 付款方式編輯對話框 */}
      <MethodDialog
        open={isMethodDialogOpen}
        onOpenChange={setIsMethodDialogOpen}
        method={editingMethod}
        type={activeSection === 'receipt' ? 'receipt' : 'payment'}
        onSave={handleSaveMethod}
      />

      {/* 銀行帳戶編輯對話框 */}
      <BankDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        bank={editingBank}
        onSave={handleSaveBank}
      />

    </ContentPageLayout>
  )
}

// 付款方式編輯對話框
function MethodDialog({
  open,
  onOpenChange,
  method,
  type,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: PaymentMethod | null
  type: 'receipt' | 'payment'
  onSave: (method: Partial<PaymentMethod>) => Promise<void>
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(method?.code || '')
      setName(method?.name || '')
      setDescription(method?.description || '')
    }
  }, [open, method])

  const handleSubmit = async () => {
    if (!code || !name) {
      await alert('請填寫代碼和名稱', 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({ code, name, description })
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = type === 'receipt' 
    ? (method ? '編輯收款方式' : '新增收款方式')
    : (method ? '編輯請款方式' : '新增請款方式')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>代碼 *</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="例：CASH"
              />
            </div>
            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：現金"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>說明</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="選填"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
          >
            {isSubmitting ? '儲存中...' : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 銀行帳戶編輯對話框
function BankDialog({
  open,
  onOpenChange,
  bank,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bank: BankAccount | null
  onSave: (bank: Partial<BankAccount>) => Promise<void>
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(bank?.code || '')
      setName(bank?.name || '')
      setBankName(bank?.bank_name || '')
      setAccountNumber(bank?.account_number || '')
      setIsDefault(bank?.is_default || false)
    }
  }, [open, bank])

  const handleSubmit = async () => {
    if (!code || !name) {
      await alert('請填寫代碼和名稱', 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({
        code,
        name,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        is_default: isDefault,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bank ? '編輯銀行帳戶' : '新增銀行帳戶'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>代碼 *</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="例：ESUN"
              />
            </div>
            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：玉山銀行"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>銀行全名</Label>
            <Input
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="例：玉山商業銀行"
            />
          </div>
          <div className="space-y-2">
            <Label>帳號</Label>
            <Input
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder="例：0000-1234-5678-90"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isDefault">設為預設帳戶</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
          >
            {isSubmitting ? '儲存中...' : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


