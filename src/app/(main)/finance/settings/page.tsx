'use client'

import { useState, useEffect } from 'react'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
// 使用和 EnhancedTable 一致的表格樣式
const Table = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <table className={`w-full text-sm ${className || ''}`}>{children}</table>
)
const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-card sticky top-0 z-20 [&_tr]:bg-morandi-container/30">{children}</thead>
)
const TableBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>
const TableRow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <tr
    className={`border-b border-border/50 hover:bg-morandi-container/20 transition-colors ${className || ''}`}
  >
    {children}
  </tr>
)
const TableHead = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th
    className={`px-4 py-3 text-left text-xs font-medium text-morandi-secondary uppercase tracking-wider ${className || ''}`}
  >
    {children}
  </th>
)
const TableCell = ({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) => (
  <td className={`px-4 py-3 text-sm ${className || ''}`} colSpan={colSpan}>
    {children}
  </td>
)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  TrendingUp,
  Award,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'

interface PaymentMethod {
  id: string
  code: string
  name: string
  type: 'receipt' | 'payment' // 收款 or 請款
  description: string | null
  placeholder: string | null // 付款資訊提示文字
  is_active: boolean
  is_system: boolean
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
  debit_account_id: string | null
  credit_account_id: string | null
  debit_account?: { id: string; code: string; name: string } | null
  credit_account?: { id: string; code: string; name: string } | null
}

export default function FinanceSettingsPage() {
  const { can, loading: permLoading } = useCapabilities()
  const [activeSection, setActiveSection] = useState<
    'receipt' | 'payment' | 'bank' | 'category' | 'company_expense' | 'company_income' | 'bonus'
  >('receipt')
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
      const methodsRes = await fetch(
        `/api/finance/payment-methods?workspace_id=${workspaceId}&include_inactive=true`
      )
      const methodsData = await methodsRes.json()
      setPaymentMethods(methodsData || [])

      // 載入銀行帳戶
      const banksRes = await fetch(`/api/bank-accounts?workspace_id=${workspaceId}`)
      const banksData = await banksRes.json()
      setBankAccounts(banksData || [])

      // 載入會計科目（供選擇用）
      const accountsRes = await fetch(
        `/api/finance/accounting-subjects?workspace_id=${workspaceId}`
      )
      const accountsData = await accountsRes.json()
      setChartOfAccounts(accountsData || [])

      // 載入請款類別
      const categoriesRes = await fetch(
        `/api/finance/expense-categories?workspace_id=${workspaceId}`
      )
      const categoriesData = await categoriesRes.json()
      setExpenseCategories(categoriesData || [])
    } catch (error) {
      logger.error('載入資料失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 收款方式
  const receiptMethods = paymentMethods.filter(m => m.type === 'receipt')
  // 付款方式
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

  // 切換付款方式啟用/停用
  const handleToggleMethodActive = async (method: PaymentMethod) => {
    const newStatus = !method.is_active
    const action = newStatus ? '啟用' : '停用'
    const confirmed = await confirm(`確定要${action}「${method.name}」嗎？`, {
      title: `${action}付款方式`,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      const res = await fetch('/api/finance/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: method.id, is_active: newStatus }),
      })
      if (!res.ok) throw new Error(`${action}失敗`)
      await loadData()
      await alert(`${action}成功`, 'success')
    } catch (error) {
      await alert(`${action}失敗`, 'error')
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

  // 儲存請款類別（根據 activeSection 決定 type）
  const handleSaveCategory = async (category: Partial<ExpenseCategory>) => {
    // 決定 category type
    let categoryType = 'expense'
    if (activeSection === 'company_expense') {
      categoryType = 'company_expense'
    } else if (activeSection === 'company_income') {
      categoryType = 'company_income'
    }

    try {
      const res = await fetch('/api/finance/expense-categories', {
        method: editingCategory?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...category,
          id: editingCategory?.id,
          workspace_id: workspaceId,
          type: editingCategory?.id ? undefined : categoryType, // 新增時設定 type，編輯時不改
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

  // 公司支出項目
  const companyExpenseCategories = expenseCategories.filter(c => c.type === 'company_expense')
  // 公司收入項目
  const companyIncomeCategories = expenseCategories.filter(c => c.type === 'company_income')
  // 團體請款類別（原本的 expense 類型）
  const tourExpenseCategories = expenseCategories.filter(
    c => c.type === 'expense' || c.type === 'both'
  )

  const tabs = [
    { value: 'receipt', label: '收款方式', icon: CreditCard },
    { value: 'payment', label: '付款方式', icon: Banknote },
    { value: 'category', label: '團體請款類別', icon: Tag },
    { value: 'company_expense', label: '公司支出項目', icon: Building2 },
    { value: 'company_income', label: '公司收入項目', icon: TrendingUp },
    { value: 'bank', label: '銀行帳戶', icon: Building2 },
    { value: 'bonus', label: '獎金設定', icon: Award },
  ]

  const sectionTitle = tabs.find(t => t.value === activeSection)?.label || ''

  // 新增按鈕
  const renderAddButton = () => {
    const buttonConfig: Record<string, { label: string; onClick: () => void }> = {
      receipt: {
        label: '新增收款方式',
        onClick: () => {
          setEditingMethod(null)
          setIsMethodDialogOpen(true)
        },
      },
      payment: {
        label: '新增付款方式',
        onClick: () => {
          setEditingMethod(null)
          setIsMethodDialogOpen(true)
        },
      },
      category: {
        label: '新增請款類別',
        onClick: () => {
          setEditingCategory(null)
          setIsCategoryDialogOpen(true)
        },
      },
      company_expense: {
        label: '新增支出項目',
        onClick: () => {
          setEditingCategory(null)
          setIsCategoryDialogOpen(true)
        },
      },
      company_income: {
        label: '新增收入項目',
        onClick: () => {
          setEditingCategory(null)
          setIsCategoryDialogOpen(true)
        },
      },
      bank: {
        label: '新增銀行帳戶',
        onClick: () => {
          setEditingBank(null)
          setIsBankDialogOpen(true)
        },
      },
    }
    const config = buttonConfig[activeSection]
    if (!config) return null
    return (
      <Button
        onClick={config.onClick}
        className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        {config.label}
      </Button>
    )
  }

  if (permLoading) return <ModuleLoading fullscreen />
  if (!can(CAPABILITIES.FINANCE_READ_SETTINGS)) return <UnauthorizedPage />

  return (
    <ContentPageLayout
      title="財務設定"
      icon={Settings}
      tabs={tabs}
      activeTab={activeSection}
      onTabChange={value => setActiveSection(value as typeof activeSection)}
      headerActions={renderAddButton()}
    >
      {/* 內容區 */}
      <div>
        {/* 收款方式 */}
        {activeSection === 'receipt' && (
          <div className="space-y-4">
            <Card className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">排序</TableHead>
                    <TableHead>名稱</TableHead>
                    <TableHead>說明</TableHead>
                    <TableHead>借方科目</TableHead>
                    <TableHead>貸方科目</TableHead>
                    <TableHead className="w-[80px]">狀態</TableHead>
                    <TableHead className="w-[80px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptMethods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-morandi-muted">
                        尚未設定收款方式
                      </TableCell>
                    </TableRow>
                  ) : (
                    receiptMethods.map(method => (
                      <TableRow key={method.id} className={!method.is_active ? 'opacity-50' : ''}>
                        <TableCell className="text-morandi-muted">{method.sort_order}</TableCell>
                        <TableCell className="font-medium">
                          {method.name}
                          {method.is_system && (
                            <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                              系統
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-morandi-muted text-sm">
                          {method.description || '-'}
                        </TableCell>
                        <TableCell className="text-morandi-muted text-sm">
                          {method.debit_account
                            ? `${method.debit_account.code} ${method.debit_account.name}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-morandi-muted text-sm">
                          {method.credit_account
                            ? `${method.credit_account.code} ${method.credit_account.name}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={method.is_active}
                              onCheckedChange={() => handleToggleMethodActive(method)}
                            />
                            <span
                              className={`text-xs ${method.is_active ? 'text-morandi-primary' : 'text-morandi-muted'}`}
                            >
                              {method.is_active ? '啟用' : '停用'}
                            </span>
                          </div>
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
                            {!method.is_system && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMethod(method)}
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

        {/* 付款方式 */}
        {activeSection === 'payment' && (
          <div className="space-y-4">
            <Card className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">排序</TableHead>
                    <TableHead>名稱</TableHead>
                    <TableHead>說明</TableHead>
                    <TableHead>借方科目</TableHead>
                    <TableHead>貸方科目</TableHead>
                    <TableHead className="w-[80px]">狀態</TableHead>
                    <TableHead className="w-[80px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethodsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-morandi-muted">
                        尚未設定付款方式
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentMethodsList.map(method => (
                      <TableRow key={method.id} className={!method.is_active ? 'opacity-50' : ''}>
                        <TableCell className="text-morandi-muted">{method.sort_order}</TableCell>
                        <TableCell className="font-medium">
                          {method.name}
                          {method.is_system && (
                            <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                              系統
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-morandi-muted text-sm">
                          {method.description || '-'}
                        </TableCell>
                        <TableCell className="text-morandi-muted text-sm">
                          {method.debit_account
                            ? `${method.debit_account.code} ${method.debit_account.name}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-morandi-muted text-sm">
                          {method.credit_account
                            ? `${method.credit_account.code} ${method.credit_account.name}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={method.is_active}
                              onCheckedChange={() => handleToggleMethodActive(method)}
                            />
                            <span
                              className={`text-xs ${method.is_active ? 'text-morandi-primary' : 'text-morandi-muted'}`}
                            >
                              {method.is_active ? '啟用' : '停用'}
                            </span>
                          </div>
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
                            {!method.is_system && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMethod(method)}
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

        {/* 請款類別 */}
        {activeSection === 'category' && (
          <div className="space-y-4">
            <Card className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名稱</TableHead>
                    <TableHead>借方科目</TableHead>
                    <TableHead>貸方科目</TableHead>
                    <TableHead className="w-[80px]">狀態</TableHead>
                    <TableHead className="w-[100px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tourExpenseCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-morandi-muted">
                        尚未設定請款類別
                      </TableCell>
                    </TableRow>
                  ) : (
                    tourExpenseCategories.map(category => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          {category.debit_account ? (
                            <span className="text-sm">
                              {category.debit_account.code} {category.debit_account.name}
                            </span>
                          ) : (
                            <span className="text-morandi-muted text-sm">未設定</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {category.credit_account ? (
                            <span className="text-sm">
                              {category.credit_account.code} {category.credit_account.name}
                            </span>
                          ) : (
                            <span className="text-morandi-muted text-sm">未設定</span>
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

        {/* 公司支出項目 */}
        {activeSection === 'company_expense' && (
          <div className="space-y-4">
            <Card className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">排序</TableHead>
                    <TableHead>名稱</TableHead>
                    <TableHead>借方科目</TableHead>
                    <TableHead>貸方科目</TableHead>
                    <TableHead className="w-[80px]">狀態</TableHead>
                    <TableHead className="w-[100px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyExpenseCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-morandi-muted">
                        尚未設定公司支出項目
                      </TableCell>
                    </TableRow>
                  ) : (
                    companyExpenseCategories.map(category => (
                      <TableRow key={category.id}>
                        <TableCell className="text-morandi-muted">{category.sort_order}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          {category.debit_account ? (
                            <span className="text-sm">
                              {category.debit_account.code} {category.debit_account.name}
                            </span>
                          ) : (
                            <span className="text-morandi-muted text-sm">未設定</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {category.credit_account ? (
                            <span className="text-sm">
                              {category.credit_account.code} {category.credit_account.name}
                            </span>
                          ) : (
                            <span className="text-morandi-muted text-sm">未設定</span>
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

        {/* 公司收入項目 */}
        {activeSection === 'company_income' && (
          <div className="space-y-4">
            <Card className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">排序</TableHead>
                    <TableHead>名稱</TableHead>
                    <TableHead>借方科目</TableHead>
                    <TableHead>貸方科目</TableHead>
                    <TableHead className="w-[80px]">狀態</TableHead>
                    <TableHead className="w-[100px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyIncomeCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-morandi-muted">
                        尚未設定公司收入項目
                      </TableCell>
                    </TableRow>
                  ) : (
                    companyIncomeCategories.map(category => (
                      <TableRow key={category.id}>
                        <TableCell className="text-morandi-muted">{category.sort_order}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          {category.debit_account ? (
                            <span className="text-sm">
                              {category.debit_account.code} {category.debit_account.name}
                            </span>
                          ) : (
                            <span className="text-morandi-muted text-sm">未設定</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {category.credit_account ? (
                            <span className="text-sm">
                              {category.credit_account.code} {category.credit_account.name}
                            </span>
                          ) : (
                            <span className="text-morandi-muted text-sm">未設定</span>
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

        {/* 獎金設定 */}
        {activeSection === 'bonus' && (
          <div className="space-y-4">
            <Card className="rounded-lg overflow-hidden p-8">
              <div className="text-center text-morandi-muted py-8">
                <Award className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">獎金設定</p>
                <p className="text-sm mt-1">即將推出</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 付款方式編輯對話框 */}
      <MethodDialog
        open={isMethodDialogOpen}
        onOpenChange={setIsMethodDialogOpen}
        method={editingMethod}
        type={activeSection === 'receipt' ? 'receipt' : 'payment'}
        onSave={handleSaveMethod}
        chartOfAccounts={chartOfAccounts}
        existingMethods={activeSection === 'receipt' ? receiptMethods : paymentMethodsList}
      />

      {/* 銀行帳戶編輯對話框 */}
      <BankDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        bank={editingBank}
        onSave={handleSaveBank}
      />

      {/* 類別編輯對話框（請款類別 / 公司支出 / 公司收入） */}
      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        chartOfAccounts={chartOfAccounts}
        categoryType={
          activeSection === 'company_expense'
            ? 'company_expense'
            : activeSection === 'company_income'
              ? 'company_income'
              : 'expense'
        }
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
  existingMethods,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: PaymentMethod | null
  type: 'receipt' | 'payment'
  onSave: (method: Partial<PaymentMethod>) => Promise<void>
  chartOfAccounts: ChartOfAccount[]
  existingMethods: PaymentMethod[]
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [debitAccountId, setDebitAccountId] = useState('')
  const [creditAccountId, setCreditAccountId] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(method?.name || '')
      setDescription(method?.description || '')
      setPlaceholder(method?.placeholder || '')
      setDebitAccountId(method?.debit_account_id || '')
      setCreditAccountId(method?.credit_account_id || '')
      // 新增時自動取下一個排序數字
      if (method) {
        setSortOrder(method.sort_order || 0)
      } else {
        const maxSort = Math.max(0, ...existingMethods.map(m => m.sort_order || 0))
        setSortOrder(maxSort + 1)
      }
    }
  }, [open, method])

  const handleSubmit = async () => {
    if (!name) {
      await alert('請填寫名稱', 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({
        name,
        description,
        placeholder: placeholder || null,
        debit_account_id: debitAccountId || null,
        credit_account_id: creditAccountId || null,
        sort_order: sortOrder,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const title =
    type === 'receipt'
      ? method
        ? '編輯收款方式'
        : '新增收款方式'
      : method
        ? '編輯付款方式'
        : '新增付款方式'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>名稱 *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：現金、匯款、信用卡"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 space-y-2">
              <Label>說明</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="選填"
              />
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>
          {type === 'receipt' && (
            <div className="space-y-2">
              <Label>付款資訊提示</Label>
              <Input
                value={placeholder}
                onChange={e => setPlaceholder(e.target.value)}
                placeholder="例：帳號後五碼、收款人、調閱編號"
              />
              <p className="text-xs text-morandi-muted">
                💡 收款時「付款資訊」欄位會顯示這段提示文字
              </p>
            </div>
          )}
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
      <DialogContent level={1}>
        <DialogHeader>
          <DialogTitle>{bank ? '編輯銀行帳戶' : '新增銀行帳戶'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>代碼 *</Label>
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder="例：ESUN" />
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
              className="h-4 w-4 rounded border-morandi-muted"
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
  chartOfAccounts,
  categoryType = 'expense',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ExpenseCategory | null
  onSave: (category: Partial<ExpenseCategory>) => Promise<void>
  chartOfAccounts: ChartOfAccount[]
  categoryType?: 'expense' | 'company_expense' | 'company_income'
}) {
  const [name, setName] = useState('')
  const [debitAccountId, setDebitAccountId] = useState<string>('')
  const [creditAccountId, setCreditAccountId] = useState<string>('')
  const [sortOrder, setSortOrder] = useState(100)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 根據類型決定科目篩選
  // 費用/公司支出: 借方=費用(5), 貸方=負債(2)
  // 公司收入: 借方=資產(1), 貸方=收入(4)
  const debitAccounts =
    categoryType === 'company_income'
      ? chartOfAccounts.filter(a => a.code.startsWith('1')) // 資產類
      : chartOfAccounts.filter(a => a.code.startsWith('5')) // 費用類
  const creditAccounts =
    categoryType === 'company_income'
      ? chartOfAccounts.filter(a => a.code.startsWith('4')) // 收入類
      : chartOfAccounts.filter(a => a.code.startsWith('2')) // 負債類

  // 舊變數保留向後相容
  const expenseAccounts = debitAccounts
  const liabilityAccounts = creditAccounts

  useEffect(() => {
    if (open) {
      setName(category?.name || '')
      setDebitAccountId(category?.debit_account_id || '')
      setCreditAccountId(category?.credit_account_id || '')
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
        debit_account_id: debitAccountId || null,
        credit_account_id: creditAccountId || null,
        sort_order: sortOrder,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1}>
        <DialogHeader>
          <DialogTitle>
            {category ? '編輯' : '新增'}
            {categoryType === 'company_expense'
              ? '公司支出項目'
              : categoryType === 'company_income'
                ? '公司收入項目'
                : '請款類別'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>名稱 *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：住宿、交通、餐食"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>借方科目（費用）</Label>
              <select
                value={debitAccountId}
                onChange={e => setDebitAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">請選擇</option>
                {expenseAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>貸方科目（負債）</Label>
              <select
                value={creditAccountId}
                onChange={e => setCreditAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">請選擇</option>
                {liabilityAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-morandi-muted">
            建立請款單時自動生成傳票：借 費用科目 / 貸 應付帳款
          </p>
          <div className="space-y-2">
            <Label>排序</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              placeholder="100"
              className="w-24"
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
