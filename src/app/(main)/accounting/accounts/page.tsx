'use client'

import { useState, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CreateAccountDialog } from './components/CreateAccountDialog'

interface Account {
  id: string
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost' | string
  is_active: boolean | null
  is_system_locked: boolean | null
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
      setAccounts(data || [])
    } catch (error) {
      console.error('載入科目失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const columns: TableColumn<Account>[] = [
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
  ]

  const handleCreate = () => {
    setCreateDialogOpen(true)
  }

  return (
    <>
      <ListPageLayout
        title="會計科目管理"
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
    </>
  )
}
