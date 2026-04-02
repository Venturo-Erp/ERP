'use client'

import { useState, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, RotateCcw, Plus, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TableColumn } from '@/components/ui/enhanced-table'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { CreateVoucherDialog } from './components/CreateVoucherDialog'
import { VoucherDetailDialog } from './components/VoucherDetailDialog'
import { logger } from '@/lib/utils/logger'

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<JournalVoucher | null>(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
  })

  useEffect(() => {
    loadVouchers()
  }, [user?.workspace_id])

  const loadVouchers = async () => {
    if (!user?.workspace_id) return

    setIsLoading(true)
    try {
      let query = supabase
        .from('journal_vouchers')
        .select('id, voucher_no, voucher_date, memo, status, total_debit, total_credit, created_by, workspace_id, created_at')
        .eq('workspace_id', user.workspace_id)

      // 應用日期範圍篩選
      if (filters.startDate) {
        query = query.gte('voucher_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('voucher_date', filters.endDate)
      }

      // 應用狀態篩選
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status as never)
      }

      query = query
        .order('voucher_date', { ascending: false })
        .order('voucher_no', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      setVouchers(data || [])
    } catch (error) {
      logger.error('載入傳票失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 當篩選條件改變時重新載入
  useEffect(() => {
    if (user?.workspace_id) {
      loadVouchers()
    }
  }, [filters])

  const columns: TableColumn<JournalVoucher>[] = [
    {
      key: 'voucher_no',
      label: '傳票編號',
      width: '140px',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono text-sm">{row.voucher_no}</span>
      ),
    },
    {
      key: 'voucher_date',
      label: '日期',
      width: '120px',
    },
    {
      key: 'memo',
      label: '說明',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="text-sm text-muted-foreground line-clamp-1">{row.memo || '-'}</span>
      ),
    },
    {
      key: 'total_debit',
      label: '借方',
      width: '120px',
      align: 'right',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono">{(row.total_debit || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'total_credit',
      label: '貸方',
      width: '120px',
      align: 'right',
      render: (_: unknown, row: JournalVoucher) => (
        <span className="font-mono">{(row.total_credit || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      width: '100px',
      render: (_: unknown, row: JournalVoucher) => {
        if (!row.status) return <Badge variant="outline">-</Badge>
        const config = statusConfig[row.status]
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      key: 'actions',
      label: '操作',
      width: '140px',
      render: (_: unknown, row: JournalVoucher) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleViewDetail(row)} title="查看">
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
    setSelectedVoucher(voucher)
    setIsDetailDialogOpen(true)
  }

  const handleReverse = (voucher: JournalVoucher) => {
    // TODO: 開啟反沖對話框
    // TODO: 反沖傳票 modal
  }

  const handleCreate = () => {
    setIsCreateDialogOpen(true)
  }

  const handleCreateSuccess = () => {
    loadVouchers()
  }

  return (
    <>
      <ListPageLayout
        title="傳票管理"
        data={vouchers}
        columns={columns}
        loading={isLoading}
        searchable={false}
        headerActions={
          <div className="flex gap-2 items-center flex-wrap">
            <Input
              type="date"
              placeholder="開始日期"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              className="w-40"
            />
            <Input
              type="date"
              placeholder="結束日期"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              className="w-40"
            />
            <Select
              value={filters.status}
              onValueChange={value => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="posted">已過帳</SelectItem>
                <SelectItem value="reversed">已反沖</SelectItem>
                <SelectItem value="locked">已鎖定</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ startDate: '', endDate: '', status: 'all' })}
            >
              清除
            </Button>
            <Button onClick={handleCreate} className="gap-2 ml-2">
              <Plus size={16} />
              新增傳票
            </Button>
          </div>
        }
      />

      <CreateVoucherDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <VoucherDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        voucher={selectedVoucher ? { ...selectedVoucher, status: selectedVoucher.status || 'draft', total_debit: selectedVoucher.total_debit || 0, total_credit: selectedVoucher.total_credit || 0 } : null}
      />
    </>
  )
}
