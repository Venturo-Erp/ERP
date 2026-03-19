'use client'

import { useState, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, RotateCcw, Plus } from 'lucide-react'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

interface JournalVoucher {
  id: string
  voucher_no: string
  voucher_date: string
  memo: string | null
  status: 'draft' | 'posted' | 'reversed' | 'locked' | null
  total_debit: number | null
  total_credit: number | null
  created_at: string | null
}

const statusConfig = {
  draft: { label: '草稿', variant: 'secondary' as const },
  posted: { label: '已過帳', variant: 'default' as const },
  reversed: { label: '已反沖', variant: 'destructive' as const },
  locked: { label: '已鎖定', variant: 'outline' as const },
}

export default function VouchersPage() {
  const { user } = useAuthStore()
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadVouchers()
  }, [user?.workspace_id])

  const loadVouchers = async () => {
    if (!user?.workspace_id) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('journal_vouchers')
        .select('*')
        .eq('workspace_id', user.workspace_id)
        .order('voucher_date', { ascending: false })
        .order('voucher_no', { ascending: false })

      if (error) throw error
      setVouchers(data || [])
    } catch (error) {
      console.error('載入傳票失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const columns: TableColumn<JournalVoucher>[] = [
    {
      key: 'voucher_no',
      label: '傳票編號',
      width: "140px",
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono text-sm">{row.voucher_no}</span>
      ),
    },
    {
      key: 'voucher_date',
      label: '日期',
      width: "100px",
    },
    {
      key: 'memo',
      label: '說明',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.memo || '-'}
        </span>
      ),
    },
    {
      key: 'total_debit',
      label: '借方',
      width: "120px",
      align: 'right',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono">
          {(row.total_debit || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'total_credit',
      label: '貸方',
      width: "120px",
      align: 'right',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono">
          {(row.total_credit || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      width: "100px",
      render: (_: unknown, row: JournalVoucher) => {
        if (!row.status) return <Badge variant="outline">-</Badge>
        const config = statusConfig[row.status]
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      key: 'actions',
      label: '操作',
      width: "140px",
      render: (_: unknown, row: JournalVoucher) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDetail(row)}
            title="查看"
          >
            <Eye size={14} />
          </Button>
          {row.status === 'posted' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleReverse(row)}
              className="text-destructive hover:text-destructive"
              title="反沖"
            >
              <RotateCcw size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const handleViewDetail = (voucher: JournalVoucher) => {
    // TODO: 開啟詳細對話框
    console.log('查看傳票:', voucher)
  }

  const handleReverse = (voucher: JournalVoucher) => {
    // TODO: 開啟反沖對話框
    console.log('反沖傳票:', voucher)
  }

  const handleCreate = () => {
    // TODO: 開啟新增對話框
    console.log('新增傳票')
  }

  return (
    <ListPageLayout
      title="傳票管理"
      data={vouchers}
      columns={columns}
      loading={isLoading}
      searchable={false}
      headerActions={
        <Button onClick={handleCreate} className="gap-2">
          <Plus size={16} />
          新增傳票
        </Button>
      }
    />
  )
}
