'use client'

import { useState, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Plus, CheckCircle, XCircle } from 'lucide-react'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { createBrowserClient } from '@supabase/ssr'
import { useAuthStore } from '@/stores/auth-store'
import { CreateCheckDialog } from './components/CreateCheckDialog'

interface Check {
  id: string
  check_number: string
  check_date: string
  due_date: string
  amount: number
  payee_name: string
  status: 'pending' | 'cleared' | 'voided' | 'bounced'
  memo: string | null
  created_at: string
}

const statusConfig = {
  pending: { label: '未兌現', variant: 'secondary' as const, color: 'text-yellow-600' },
  cleared: { label: '已兌現', variant: 'default' as const, color: 'text-green-600' },
  voided: { label: '作廢', variant: 'outline' as const, color: 'text-morandi-secondary' },
  bounced: { label: '退票', variant: 'destructive' as const, color: 'text-red-600' },
}

export default function ChecksPage() {
  const { user } = useAuthStore()
  const [checks, setChecks] = useState<Check[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadChecks()
  }, [user?.workspace_id])

  const loadChecks = async () => {
    if (!user?.workspace_id) return

    setIsLoading(true)
    try {
      // TODO: 等 migration 執行後啟用
      // const supabase = createBrowserClient(
      //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
      //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      // )
      // const { data, error } = await supabase
      //   .from('checks')
      //   .select('*')
      //   .eq('workspace_id', user.workspace_id)
      //   .order('due_date', { ascending: true })
      // if (error) throw error
      // setChecks(data || [])
      setChecks([]) // 暫時空陣列
    } catch (error) {
      console.error('載入票據失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const columns: TableColumn<Check>[] = [
    {
      key: 'check_number',
      label: '支票號碼',
      width: '140px',
      render: (_: unknown, row: Check) => (
        <span className="font-mono text-sm">{row.check_number}</span>
      ),
    },
    {
      key: 'check_date',
      label: '開票日',
      width: '100px',
    },
    {
      key: 'due_date',
      label: '到期日',
      width: '100px',
      render: (_: unknown, row: Check) => {
        const isOverdue = new Date(row.due_date) < new Date() && row.status === 'pending'
        return <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>{row.due_date}</span>
      },
    },
    {
      key: 'payee_name',
      label: '受款人',
      render: (_: unknown, row: Check) => <span className="text-sm">{row.payee_name}</span>,
    },
    {
      key: 'amount',
      label: '金額',
      width: '120px',
      align: 'right',
      render: (_: unknown, row: Check) => (
        <span className="font-mono font-semibold">${row.amount.toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      width: '100px',
      render: (_: unknown, row: Check) => {
        const config = statusConfig[row.status as keyof typeof statusConfig]
        if (!config) return <Badge variant="outline">-</Badge>
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      key: 'actions',
      label: '操作',
      width: '140px',
      render: (_: unknown, row: Check) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleViewDetail(row)} title="查看">
            <Eye size={14} />
          </Button>
          {row.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleClearCheck(row)}
                className="text-green-600 hover:text-green-700"
                title="標記已兌現"
              >
                <CheckCircle size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleVoidCheck(row)}
                className="text-red-600 hover:text-red-700"
                title="作廢"
              >
                <XCircle size={14} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const handleViewDetail = (check: Check) => {
    // TODO: 開啟詳細對話框
    console.log('查看票據:', check)
  }

  const handleClearCheck = async (check: Check) => {
    if (!confirm(`確定標記支票 ${check.check_number} 為已兌現？`)) return

    try {
      // TODO: 等 migration 執行後啟用
      // const supabase = createBrowserClient(
      //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
      //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      // )
      // const { error } = await supabase
      //   .from('checks')
      //   .update({ status: 'cleared' })
      //   .eq('id', check.id)
      // if (error) throw error
      // loadChecks()
      console.log('TODO: 標記已兌現', check.id)
    } catch (error) {
      console.error('更新票據狀態失敗:', error)
      alert('操作失敗')
    }
  }

  const handleVoidCheck = async (check: Check) => {
    if (!confirm(`確定作廢支票 ${check.check_number}？`)) return

    try {
      // TODO: 等 migration 執行後啟用
      // const supabase = createBrowserClient(
      //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
      //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      // )
      // const { error } = await supabase
      //   .from('checks')
      //   .update({ status: 'voided' })
      //   .eq('id', check.id)
      // if (error) throw error
      // loadChecks()
      console.log('TODO: 作廢支票', check.id)
    } catch (error) {
      console.error('更新票據狀態失敗:', error)
      alert('操作失敗')
    }
  }

  const handleCreate = () => {
    setCreateDialogOpen(true)
  }

  // 統計資料
  const stats = {
    pending: checks.filter(c => c.status === 'pending').length,
    pendingAmount: checks.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
    overdue: checks.filter(c => c.status === 'pending' && new Date(c.due_date) < new Date()).length,
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-700 mb-1">未兌現支票</div>
            <div className="text-2xl font-bold text-yellow-900">{stats.pending} 張</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-700 mb-1">未兌現金額</div>
            <div className="text-2xl font-bold text-blue-900">
              ${stats.pendingAmount.toLocaleString()}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-700 mb-1">逾期支票</div>
            <div className="text-2xl font-bold text-red-900">{stats.overdue} 張</div>
          </div>
        </div>

        <div className="flex-1">
          <ListPageLayout
            title="票據管理"
            data={checks}
            columns={columns}
            loading={isLoading}
            searchable={false}
            headerActions={
              <Button onClick={handleCreate} className="gap-2">
                <Plus size={16} />
                新增票據
              </Button>
            }
          />
        </div>
      </div>

      <CreateCheckDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadChecks}
      />
    </>
  )
}
