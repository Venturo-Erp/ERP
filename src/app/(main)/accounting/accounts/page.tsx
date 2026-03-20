'use client'

import { useState, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Star, Edit } from 'lucide-react'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CreateAccountDialog } from './components/CreateAccountDialog'
import { EditAccountDialog } from './components/EditAccountDialog'
import { toast } from 'sonner'

interface Account {
  id: string
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost' | string
  is_active: boolean | null
  is_system_locked: boolean | null
  is_favorite: boolean | null
  description: string | null
}

const typeConfig = {
  asset: { label: '資產', color: 'text-blue-600' },
  liability: { label: '負債', color: 'text-red-600' },
  equity: { label: '權益', color: 'text-purple-600' },
  revenue: { label: '收入', color: 'text-green-600' },
  expense: { label: '費用', color: 'text-orange-600' },
  cost: { label: '成本', color: 'text-yellow-600' },
}

export default function AccountsPage() {
  const { user } = useAuthStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [user?.workspace_id])

  const loadAccounts = async () => {
    if (!user?.workspace_id) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('workspace_id', user.workspace_id)
        .order('code', { ascending: true })

      if (error) throw error
      // 補上 is_favorite 預設值（DB 可能沒有這個欄位）
      setAccounts((data || []).map(d => ({ ...d, is_favorite: (d as any).is_favorite ?? false })))
    } catch (error) {
      console.error('載入科目失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFavorite = async (accountId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({ is_favorite: !currentFavorite } as any)
        .eq('id', accountId)

      if (error) throw error

      // 更新本地状态
      setAccounts(prev => 
        prev.map(acc => 
          acc.id === accountId ? { ...acc, is_favorite: !currentFavorite } : acc
        )
      )

      toast.success(currentFavorite ? '已取消常用' : '已標記為常用')
    } catch (error) {
      console.error('更新常用狀態失敗:', error)
      toast.error('更新失敗')
    }
  }

  const handleEdit = (account: Account) => {
    setSelectedAccount(account)
    setEditDialogOpen(true)
  }

  const columns: TableColumn<Account>[] = [
    {
      key: 'favorite',
      label: '常用',
      width: "60px",
      render: (_: unknown, row: Account) => (
        <button
          onClick={() => toggleFavorite(row.id, row.is_favorite || false)}
          className="hover:scale-110 transition-transform"
        >
          <Star
            size={18}
            className={row.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        </button>
      ),
    },
    {
      key: 'code',
      label: '科目代號',
      width: "100px",
      render: (_: unknown, row: Account) => (
        <span className="font-mono font-semibold">{row.code}</span>
      ),
    },
    {
      key: 'name',
      label: '科目名稱',
      render: (_: unknown, row: Account) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      key: 'account_type',
      label: '類型',
      width: "100px",
      render: (_: unknown, row: Account) => {
        const config = typeConfig[row.account_type as keyof typeof typeConfig]
        if (!config) return <Badge variant="outline">-</Badge>
        return (
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: 'description',
      label: '說明',
      render: (_: unknown, row: Account) => (
        <span className="text-sm text-muted-foreground">
          {row.description || '-'}
        </span>
      ),
    },
    {
      key: 'is_system_locked',
      label: '系統科目',
      width: "100px",
      render: (_: unknown, row: Account) => (
        row.is_system_locked ? (
          <Badge variant="secondary">系統</Badge>
        ) : null
      ),
    },
    {
      key: 'is_active',
      label: '狀態',
      width: "80px",
      render: (_: unknown, row: Account) => (
        <Badge variant={row.is_active ? 'default' : 'outline'}>
          {row.is_active ? '啟用' : '停用'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      width: "80px",
      render: (_: unknown, row: Account) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleEdit(row)}
          className="gap-1"
        >
          <Edit size={14} />
          編輯
        </Button>
      ),
    },
  ]

  const handleCreate = () => {
    setCreateDialogOpen(true)
  }

  return (
    <>
      <ListPageLayout
        title="會計科目管理"
        description={`共 ${accounts.length} 個科目`}
        data={accounts}
        columns={columns}
        loading={isLoading}
        searchable={false}
        headerActions={
          <Button onClick={handleCreate} className="gap-2">
            <Plus size={16} />
            新增科目
          </Button>
        }
      />
      
      <CreateAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadAccounts}
      />

      <EditAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadAccounts}
        account={selectedAccount}
      />
    </>
  )
}
