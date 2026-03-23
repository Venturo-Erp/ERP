'use client'

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layouts/ContentPageLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, Building2, Plus, Pencil, Trash2, Search, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { alert, confirm } from '@/lib/ui/alert-dialog'

interface ChartOfAccount {
  id: string
  code: string
  name: string
  account_type: string
  parent_id: string | null
  is_system_locked: boolean
  is_active: boolean
  description: string | null
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

const ACCOUNT_TYPES = [
  { value: 'asset', label: '資產' },
  { value: 'liability', label: '負債' },
  { value: 'equity', label: '權益' },
  { value: 'revenue', label: '收入' },
  { value: 'expense', label: '費用' },
]

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-purple-100 text-purple-800',
  revenue: 'bg-green-100 text-green-800',
  expense: 'bg-orange-100 text-orange-800',
}

export default function AccountingSettingsPage() {
  const [activeTab, setActiveTab] = useState('accounts')
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  
  // 編輯對話框
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
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
      // 載入會計科目
      const accountsRes = await fetch(`/api/accounting/accounts?workspace_id=${workspaceId}`)
      const accountsData = await accountsRes.json()
      setAccounts(accountsData || [])

      // 載入銀行帳戶
      const banksRes = await fetch(`/api/bank-accounts?workspace_id=${workspaceId}`)
      const banksData = await banksRes.json()
      setBankAccounts(banksData || [])
    } catch (error) {
      console.error('載入資料失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 過濾會計科目
  const filteredAccounts = accounts.filter(account => {
    const matchSearch = 
      account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = typeFilter === 'all' || account.account_type === typeFilter
    return matchSearch && matchType
  })

  // 儲存會計科目
  const handleSaveAccount = async (account: Partial<ChartOfAccount>) => {
    try {
      const res = await fetch('/api/accounting/accounts', {
        method: editingAccount?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...account,
          id: editingAccount?.id,
          workspace_id: workspaceId,
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      await loadData()
      setIsAccountDialogOpen(false)
      setEditingAccount(null)
      await alert('儲存成功', 'success')
    } catch (error) {
      await alert('儲存失敗', 'error')
    }
  }

  // 刪除會計科目
  const handleDeleteAccount = async (account: ChartOfAccount) => {
    if (account.is_system_locked) {
      await alert('系統科目無法刪除', 'warning')
      return
    }
    const confirmed = await confirm(`確定要刪除科目 ${account.code} ${account.name} 嗎？`, {
      title: '刪除會計科目',
      type: 'danger',
    })
    if (!confirmed) return
    
    try {
      const res = await fetch(`/api/accounting/accounts?id=${account.id}`, {
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
    const confirmed = await confirm(`確定要刪除 ${bank.name} 嗎？`, {
      title: '刪除銀行帳戶',
      type: 'danger',
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

  return (
    <ContentPageLayout
      title="會計科目設定"
      icon={<Calculator className="h-5 w-5" />}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="accounts" className="gap-2">
            <Calculator className="h-4 w-4" />
            會計科目
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-2">
            <Building2 className="h-4 w-4" />
            銀行帳戶
          </TabsTrigger>
        </TabsList>

        {/* 會計科目 */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-morandi-muted" />
                <Input
                  placeholder="搜尋科目..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部類型</SelectItem>
                  {ACCOUNT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                setEditingAccount(null)
                setIsAccountDialogOpen(true)
              }}
              className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增科目
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">科目代碼</TableHead>
                  <TableHead>科目名稱</TableHead>
                  <TableHead className="w-[100px]">類型</TableHead>
                  <TableHead className="w-[100px]">狀態</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map(account => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {account.name}
                        {account.is_system_locked && (
                          <Lock className="h-3 w-3 text-morandi-muted" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ACCOUNT_TYPE_COLORS[account.account_type] || 'bg-gray-100'}>
                        {ACCOUNT_TYPES.find(t => t.value === account.account_type)?.label || account.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? 'default' : 'secondary'}>
                        {account.is_active ? '啟用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingAccount(account)
                            setIsAccountDialogOpen(true)
                          }}
                          disabled={account.is_system_locked}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAccount(account)}
                          disabled={account.is_system_locked}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 銀行帳戶 */}
        <TabsContent value="banks" className="space-y-4">
          <div className="flex items-center justify-end">
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
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">代碼</TableHead>
                  <TableHead>名稱</TableHead>
                  <TableHead>銀行</TableHead>
                  <TableHead>帳號</TableHead>
                  <TableHead className="w-[100px]">預設</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map(bank => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-mono">{bank.code}</TableCell>
                    <TableCell>{bank.name}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* 會計科目編輯對話框 */}
      <AccountDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        account={editingAccount}
        onSave={handleSaveAccount}
      />

      {/* 銀行帳戶編輯對話框 */}
      <BankDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        bank={editingBank}
        accounts={accounts}
        onSave={handleSaveBank}
      />
    </ContentPageLayout>
  )
}

// 會計科目編輯對話框
function AccountDialog({
  open,
  onOpenChange,
  account,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: ChartOfAccount | null
  onSave: (account: Partial<ChartOfAccount>) => Promise<void>
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [accountType, setAccountType] = useState('expense')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(account?.code || '')
      setName(account?.name || '')
      setAccountType(account?.account_type || 'expense')
      setDescription(account?.description || '')
    }
  }, [open, account])

  const handleSubmit = async () => {
    if (!code || !name) {
      await alert('請填寫科目代碼和名稱', 'warning')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({ code, name, account_type: accountType, description })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? '編輯會計科目' : '新增會計科目'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>科目代碼 *</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="例：5101"
              />
            </div>
            <div className="space-y-2">
              <Label>類型 *</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>科目名稱 *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：旅遊成本-交通"
            />
          </div>
          <div className="space-y-2">
            <Label>說明</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="選填"
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
  accounts,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bank: BankAccount | null
  accounts: ChartOfAccount[]
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
