'use client'

import { useState, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Star, Edit, ChevronRight, ChevronDown } from 'lucide-react'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CreateAccountDialog } from './components/CreateAccountDialog'
import { EditAccountDialog } from './components/EditAccountDialog'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Account {
  id: string
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost' | string
  is_active: boolean | null
  is_system_locked: boolean | null
  is_favorite: boolean | null
  description: string | null
  parent_id: string | null
}

// 根據科目代碼計算層級（用於縮排）
function getAccountLevel(code: string): number {
  if (code.length === 1) return 0  // 大類：1, 2, 3...
  if (code.length === 2) return 1  // 中類：11, 12, 21...
  if (code.length === 4) return 2  // 明細：1100, 1110...
  if (code.includes('-')) return 3 // 子明細：1100-1, 1100-2...
  return 2
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [parentForNew, setParentForNew] = useState<Account | null>(null) // 新增子科目的父科目

  // 判斷科目是否有子科目
  const hasChildren = (accountId: string) => {
    return accounts.some(a => a.parent_id === accountId)
  }

  // 切換展開/折疊
  const toggleExpand = (accountId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }

  // 判斷科目是否應該顯示
  const isVisible = (account: Account): boolean => {
    if (!account.parent_id) return true // 頂層永遠顯示
    // 檢查所有祖先是否都展開
    let current = account
    while (current.parent_id) {
      if (!expandedIds.has(current.parent_id)) return false
      const parent = accounts.find(a => a.id === current.parent_id)
      if (!parent) break
      current = parent
    }
    return true
  }

  // 過濾可見的科目
  const visibleAccounts = accounts.filter(isVisible)

  // 計算下一個子科目代碼
  const getNextChildCode = (parentCode: string): string => {
    // 找出所有以 parentCode- 開頭的子科目
    const children = accounts.filter(a => a.code.startsWith(parentCode + '-'))
    if (children.length === 0) return `${parentCode}-1`
    
    // 找出最大的編號
    const maxNum = Math.max(...children.map(c => {
      const match = c.code.match(new RegExp(`^${parentCode}-(\\d+)$`))
      return match ? parseInt(match[1]) : 0
    }))
    return `${parentCode}-${maxNum + 1}`
  }

  // 新增子科目
  const handleAddChild = (parent: Account) => {
    setParentForNew(parent)
    setCreateDialogOpen(true)
  }
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
      setAccounts((data || []).map(d => ({ ...d, is_favorite: (d as Record<string, unknown>).is_favorite as boolean ?? false })))
    } catch (error) {
      logger.error('載入科目失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFavorite = async (accountId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({ is_favorite: !currentFavorite } as Record<string, unknown>)
        .eq('id', accountId)

      if (error) throw error

      // 更新本地状态
      setAccounts(prev =>
        prev.map(acc => (acc.id === accountId ? { ...acc, is_favorite: !currentFavorite } : acc))
      )

      toast.success(currentFavorite ? '已取消常用' : '已標記為常用')
    } catch (error) {
      logger.error('更新常用狀態失敗:', error)
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
      width: '60px',
      render: (_: unknown, row: Account) => (
        <button
          onClick={() => toggleFavorite(row.id, row.is_favorite || false)}
          className="hover:scale-110 transition-transform"
        >
          <Star
            size={18}
            className={
              row.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }
          />
        </button>
      ),
    },
    {
      key: 'code',
      label: '科目代號',
      width: '100px',
      render: (_: unknown, row: Account) => (
        <span className="font-mono font-semibold">{row.code}</span>
      ),
    },
    {
      key: 'name',
      label: '科目名稱',
      render: (_: unknown, row: Account) => {
        const level = getAccountLevel(row.code)
        const indent = level * 20 // 每層縮排 20px
        const hasChild = hasChildren(row.id)
        const isExpanded = expandedIds.has(row.id)
        
        return (
          <div 
            className="flex items-center"
            style={{ paddingLeft: `${indent}px` }}
          >
            {hasChild ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(row.id)
                }}
                className="mr-1 p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="w-5" /> // 占位符，保持對齊
            )}
            <span 
              className={`font-medium ${level === 0 ? 'text-base font-bold' : level === 1 ? 'font-semibold' : ''}`}
            >
              {row.name}
            </span>
          </div>
        )
      },
    },
    {
      key: 'account_type',
      label: '類型',
      width: '100px',
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
        <span className="text-sm text-muted-foreground">{row.description || '-'}</span>
      ),
    },
    {
      key: 'is_system_locked',
      label: '系統科目',
      width: '100px',
      render: (_: unknown, row: Account) =>
        row.is_system_locked ? <Badge variant="secondary">系統</Badge> : null,
    },
    {
      key: 'is_active',
      label: '狀態',
      width: '80px',
      render: (_: unknown, row: Account) => (
        <Badge variant={row.is_active ? 'default' : 'outline'}>
          {row.is_active ? '啟用' : '停用'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      width: '120px',
      render: (_: unknown, row: Account) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleAddChild(row)} 
            className="gap-1 px-2"
            title="新增子科目"
          >
            <Plus size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} className="gap-1 px-2">
            <Edit size={14} />
          </Button>
        </div>
      ),
    },
  ]

  const handleCreate = () => {
    setParentForNew(null)
    setCreateDialogOpen(true)
  }

  return (
    <>
      <ListPageLayout
        title={`會計科目管理（共 ${accounts.length} 個科目）`}
        data={visibleAccounts}
        columns={columns}
        loading={isLoading}
        searchable={false}
        headerActions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // 展開所有
                const allIds = accounts.filter(a => hasChildren(a.id)).map(a => a.id)
                setExpandedIds(new Set(allIds))
              }}
            >
              全部展開
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setExpandedIds(new Set())}
            >
              全部折疊
            </Button>
            <Button onClick={handleCreate} className="gap-2">
              <Plus size={16} />
              新增科目
            </Button>
          </div>
        }
      />

      <CreateAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadAccounts}
        parentAccount={parentForNew}
        suggestedCode={parentForNew ? getNextChildCode(parentForNew.code) : ''}
      />

      <EditAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadAccounts}
        account={selectedAccount as unknown as Parameters<typeof EditAccountDialog>[0]['account']}
      />
    </>
  )
}
