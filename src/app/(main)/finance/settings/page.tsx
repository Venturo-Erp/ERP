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
  <tr className={`border-b border-border/60 ${className || ''}`}>{children}</tr>
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
  Tag,
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
  debit_account_id: string | null
  credit_account_id: string | null
  debit_account: { id: string; code: string; name: string } | null
  credit_account: { id: string; code: string; name: string } | null
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

interface ChartOfAccount {
  id: string
  code: string
  name: string
  type: string // API 返回的是 type（轉換自 account_type）
  account_type?: string
}

interface ExpenseCategory {
  id: string
  name: string
  icon: string
  color: string
  type: string
  is_active: boolean
  is_system: boolean
  sort_order: number
}

export default function FinanceSettingsPage() {
  const [activeSection, setActiveSection] = useState<'receipt' | 'payment' | 'bank' | 'category'>('receipt')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 編輯對話框
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false)
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  
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

      // 載入會計科目（供選擇用）
      const accountsRes = await fetch(`/api/finance/accounting-subjects?workspace_id=${workspaceId}`)
      const accountsData = await accountsRes.json()
      setChartOfAccounts(accountsData || [])

      // 載入請款類別
      const categoriesRes = await fetch(`/api/finance/expense-categories?workspace_id=${workspaceId}`)
      const categoriesData = await categoriesRes.json()
      setExpenseCategories(categoriesData || [])
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

  // 儲存請款類別
  const handleSaveCategory = async (category: Partial<ExpenseCategory>) => {
    try {
      const res = await fetch('/api/finance/expense-categories', {
        method: editingCategory?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...category,
          id: editingCategory?.id,
          workspace_id: workspaceId,
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      await loadData()
      setIsCategoryDialogOpen(false)
      setEditingCategory(null)
      await alert('儲存成功', 'success')
    } catch (error) {
      await alert('儲存失敗', 'error')
    }
  }

  // 刪除請款類別
  const handleDeleteCategory = async (category: ExpenseCategory) => {
    if (category.is_system) {
      await alert('系統預設類別無法刪除', 'warning')
      return
    }

    const confirmed = await confirm(`確定要刪除「${category.name}」嗎？`, {
      title: '刪除請款類別',
      type: 'warning',
    })
    if (!confirmed) return
    
    try {
      const res = await fetch(`/api/finance/expense-categories?id=${category.id}`, {
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
    { key: 'category', label: '請款類別', icon: Tag },
    { key: 'bank', label: '銀行帳戶', icon: Building2 },
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
        ) : activeSection === 'category' ? (
          <Button
            onClick={() => {
              setEditingCategory(null)
              setIsCategoryDialogOpen(true)
            }}
            className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增請款類別
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
              <Card className="rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">代碼</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>借方科目</TableHead>
                      <TableHead>貸方科目</TableHead>
                      <TableHead className="w-[80px]">狀態</TableHead>
                      <TableHead className="w-[80px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptMethods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-morandi-muted">
                          尚未設定收款方式
                        </TableCell>
                      </TableRow>
                    ) : (
                      receiptMethods.map(method => (
                        <TableRow key={method.id}>
                          <TableCell className="font-mono">{method.code}</TableCell>
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell className="text-morandi-muted text-sm">
                            {method.debit_account ? `${method.debit_account.code} ${method.debit_account.name}` : '-'}
                          </TableCell>
                          <TableCell className="text-morandi-muted text-sm">
                            {method.credit_account ? `${method.credit_account.code} ${method.credit_account.name}` : '-'}
                          </TableCell>
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
                                className="text-status-danger hover:text-status-danger/80"
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
              <Card className="rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">代碼</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>借方科目</TableHead>
                      <TableHead>貸方科目</TableHead>
                      <TableHead className="w-[80px]">狀態</TableHead>
                      <TableHead className="w-[80px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethodsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-morandi-muted">
                          尚未設定請款方式
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentMethodsList.map(method => (
                        <TableRow key={method.id}>
                          <TableCell className="font-mono">{method.code}</TableCell>
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell className="text-morandi-muted text-sm">
                            {method.debit_account ? `${method.debit_account.code} ${method.debit_account.name}` : '-'}
                          </TableCell>
                          <TableCell className="text-morandi-muted text-sm">
                            {method.credit_account ? `${method.credit_account.code} ${method.credit_account.name}` : '-'}
                          </TableCell>
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
                                className="text-status-danger hover:text-status-danger/80"
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

          {/* 請款類別 */}
          {activeSection === 'category' && (
            <div className="space-y-4">
              <Card className="rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">圖示</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>顏色</TableHead>
                      <TableHead className="w-[80px]">類型</TableHead>
                      <TableHead className="w-[80px]">狀態</TableHead>
                      <TableHead className="w-[100px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-morandi-muted">
                          尚未設定請款類別
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenseCategories.map(category => (
                        <TableRow key={category.id}>
                          <TableCell className="text-2xl">{category.icon}</TableCell>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded" 
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="text-xs font-mono text-morandi-muted">{category.color}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {category.is_system && (
                              <Badge variant="secondary" className="text-xs">系統</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={category.is_active ? 'default' : 'secondary'}>
                              {category.is_active ? '啟用' : '停用'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingCategory(category)
                                  setIsCategoryDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!category.is_system && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteCategory(category)}
                                  className="text-status-danger hover:text-status-danger/80"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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
              <Card className="rounded-lg overflow-hidden">
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
                                className="text-status-danger hover:text-status-danger/80"
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

        </div>
      </div>

      {/* 付款方式編輯對話框 */}
      <MethodDialog
        open={isMethodDialogOpen}
        onOpenChange={setIsMethodDialogOpen}
        method={editingMethod}
        type={activeSection === 'receipt' ? 'receipt' : 'payment'}
        onSave={handleSaveMethod}
        chartOfAccounts={chartOfAccounts}
      />

      {/* 銀行帳戶編輯對話框 */}
      <BankDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        bank={editingBank}
        onSave={handleSaveBank}
      />

      {/* 請款類別編輯對話框 */}
      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
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
  chartOfAccounts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: PaymentMethod | null
  type: 'receipt' | 'payment'
  onSave: (method: Partial<PaymentMethod>) => Promise<void>
  chartOfAccounts: ChartOfAccount[]
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [debitAccountId, setDebitAccountId] = useState('')
  const [creditAccountId, setCreditAccountId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(method?.code || '')
      setName(method?.name || '')
      setDescription(method?.description || '')
      setDebitAccountId(method?.debit_account_id || '')
      setCreditAccountId(method?.credit_account_id || '')
    }
  }, [open, method])

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
        description,
        debit_account_id: debitAccountId || null,
        credit_account_id: creditAccountId || null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = type === 'receipt' 
    ? (method ? '編輯收款方式' : '新增收款方式')
    : (method ? '編輯請款方式' : '新增請款方式')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>借方科目（選填）</Label>
              <select
                value={debitAccountId}
                onChange={e => setDebitAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">不綁定</option>
                {chartOfAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>貸方科目（選填）</Label>
              <select
                value={creditAccountId}
                onChange={e => setCreditAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">不綁定</option>
                {chartOfAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-morandi-muted">
            💡 綁定科目後，收款/請款時會自動產生對應傳票。不綁定則不產生。
          </p>
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



// 請款類別編輯對話框
function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ExpenseCategory | null
  onSave: (category: Partial<ExpenseCategory>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('')
  const [sortOrder, setSortOrder] = useState(100)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(category?.name || '')
      setIcon(category?.icon || '💰')
      setColor(category?.color || '#c9aa7c')
      setSortOrder(category?.sort_order || 100)
    }
  }, [open, category])

  const handleSubmit = async () => {
    if (!name) {
      await alert('請填寫類別名稱', 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({
        name,
        icon,
        color,
        sort_order: sortOrder,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? '編輯請款類別' : '新增請款類別'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：住宿"
              />
            </div>
            <div className="space-y-2">
              <Label>圖示</Label>
              <Input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="例：🏨"
                className="text-2xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>顏色</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="#c9aa7c"
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                placeholder="100"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-morandi-container/30 rounded-lg">
            <span className="text-2xl">{icon}</span>
            <span className="font-medium">{name || '類別名稱'}</span>
            <div 
              className="w-6 h-6 rounded ml-auto" 
              style={{ backgroundColor: color }}
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
