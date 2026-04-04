'use client'

/**
 * 詢價單管理頁面
 * 路由: /inquiries
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { 
  Inbox, 
  Phone, 
  Mail, 
  Calendar, 
  Users, 
  MapPin,
  MoreHorizontal,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client' // 用於狀態更新
import { logger } from '@/lib/utils/logger'

interface SelectedItem {
  id: string
  name: string
  image_url?: string
  region?: string
}

interface CustomerInquiry {
  id: string
  code: string
  customer_name: string
  phone: string | null
  email: string | null
  travel_date: string | null
  people_count: number
  notes: string | null
  selected_items: SelectedItem[]
  status: 'pending' | 'contacted' | 'quoted' | 'converted' | 'cancelled'
  internal_notes: string | null
  created_at: string
  template_name?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '待處理', color: 'bg-morandi-gold/10 text-morandi-gold' },
  contacted: { label: '已聯繫', color: 'bg-status-info/10 text-status-info' },
  quoted: { label: '已報價', color: 'bg-morandi-secondary/10 text-morandi-secondary' },
  converted: { label: '已成交', color: 'bg-morandi-green/10 text-morandi-green' },
  cancelled: { label: '已取消', color: 'bg-morandi-muted/10 text-morandi-muted' },
}

export default function InquiriesPage() {
  const { user } = useAuthStore()
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchInquiries = useCallback(async () => {
    if (!user?.workspace_id) return

    try {
      const res = await fetch('/api/inquiries')
      if (!res.ok) throw new Error('載入失敗')
      
      const data = await res.json()

      interface ApiRow {
        id: string
        code: string | null
        customer_name: string
        phone: string | null
        email: string | null
        travel_date: string | null
        people_count: number | null
        notes: string | null
        selected_items: unknown
        status: string
        internal_notes: string | null
        created_at: string | null
        customized_tours: { name: string } | null
      }

      const processed: CustomerInquiry[] = (data || []).map((row: ApiRow) => ({
        id: row.id,
        code: row.code || '',
        customer_name: row.customer_name,
        phone: row.phone,
        email: row.email,
        travel_date: row.travel_date,
        people_count: row.people_count || 1,
        notes: row.notes,
        selected_items: (row.selected_items as SelectedItem[]) || [],
        status: row.status as CustomerInquiry['status'],
        internal_notes: row.internal_notes,
        created_at: row.created_at || new Date().toISOString(),
        template_name: row.customized_tours?.name,
      }))

      setInquiries(processed)
    } catch (error) {
      logger.error('載入失敗:', error)
      toast.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [user?.workspace_id])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const updateStatus = async (inquiry: CustomerInquiry, newStatus: string) => {
    const { error } = await supabase
      .from('customer_inquiries')
      .update({ status: newStatus })
      .eq('id', inquiry.id)

    if (error) {
      toast.error('更新失敗')
      return
    }

    toast.success(`已更新為「${STATUS_CONFIG[newStatus]?.label}」`)
    fetchInquiries()
    setDetailOpen(false)
  }

  const updateNotes = async (inquiry: CustomerInquiry, notes: string) => {
    const { error } = await supabase
      .from('customer_inquiries')
      .update({ internal_notes: notes })
      .eq('id', inquiry.id)

    if (error) {
      toast.error('備註更新失敗')
      return
    }

    toast.success('已儲存備註')
  }

  const openDetail = (inquiry: CustomerInquiry) => {
    setSelectedInquiry(inquiry)
    setDetailOpen(true)
  }

  // 計算各狀態數量
  const statusCounts = useMemo(() => {
    return {
      all: inquiries.length,
      pending: inquiries.filter(i => i.status === 'pending').length,
      contacted: inquiries.filter(i => i.status === 'contacted').length,
      quoted: inquiries.filter(i => i.status === 'quoted').length,
      converted: inquiries.filter(i => i.status === 'converted').length,
      cancelled: inquiries.filter(i => i.status === 'cancelled').length,
    }
  }, [inquiries])

  // 篩選後的資料
  const filteredInquiries = useMemo(() => {
    if (activeTab === 'all') return inquiries
    return inquiries.filter(i => i.status === activeTab)
  }, [inquiries, activeTab])

  // 分頁標籤
  const statusTabs = [
    { value: 'all', label: `全部 (${statusCounts.all})` },
    { value: 'pending', label: `待處理 (${statusCounts.pending})` },
    { value: 'contacted', label: `已聯繫 (${statusCounts.contacted})` },
    { value: 'quoted', label: `已報價 (${statusCounts.quoted})` },
    { value: 'converted', label: `已成交 (${statusCounts.converted})` },
  ]

  // 表格欄位
  const columns: TableColumn<CustomerInquiry>[] = [
    {
      key: 'code',
      label: '編號',
      width: '120px',
      render: (_, row) => (
        <span className="font-mono text-sm">{row.code}</span>
      ),
    },
    {
      key: 'customer_name',
      label: '客人',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.customer_name}</div>
          <div className="text-xs text-muted-foreground">{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'template_name',
      label: '來源',
      width: '150px',
      render: (_, row) => row.template_name || '-',
    },
    {
      key: 'selected_items',
      label: '景點',
      width: '80px',
      align: 'center',
      render: (_, row) => `${row.selected_items?.length || 0} 個`,
    },
    {
      key: 'travel_date',
      label: '出發日',
      width: '100px',
      render: (_, row) => row.travel_date 
        ? format(new Date(row.travel_date), 'MM/dd')
        : '-',
    },
    {
      key: 'people_count',
      label: '人數',
      width: '60px',
      align: 'center',
      render: (_, row) => row.people_count,
    },
    {
      key: 'status',
      label: '狀態',
      width: '90px',
      render: (_, row) => (
        <Badge className={STATUS_CONFIG[row.status]?.color}>
          {STATUS_CONFIG[row.status]?.label}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: '時間',
      width: '100px',
      render: (_, row) => format(new Date(row.created_at), 'MM/dd HH:mm'),
    },
  ]

  // 操作欄
  const renderActions = (row: CustomerInquiry) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openDetail(row)}>
          <Eye className="w-4 h-4 mr-2" />
          查看詳情
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateStatus(row, 'contacted')}>
          <Phone className="w-4 h-4 mr-2" />
          標記已聯繫
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateStatus(row, 'quoted')}>
          <FileText className="w-4 h-4 mr-2" />
          標記已報價
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateStatus(row, 'converted')}>
          <CheckCircle className="w-4 h-4 mr-2" />
          標記已成交
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => updateStatus(row, 'cancelled')}
          className="text-destructive"
        >
          <XCircle className="w-4 h-4 mr-2" />
          取消
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <ListPageLayout
        title="詢價單管理"
        icon={Inbox}
        data={filteredInquiries}
        columns={columns}
        loading={loading}
        renderActions={renderActions}
        onRowClick={openDetail}
        bordered
        searchable
        searchPlaceholder="搜尋客人姓名、編號..."
        searchFields={['customer_name', 'code', 'phone']}
        statusTabs={statusTabs}
        activeStatusTab={activeTab}
        onStatusTabChange={setActiveTab}
        emptyMessage={activeTab === 'all' ? '還沒有詢價單' : '沒有符合條件的詢價單'}
      />

      {/* 詳情 Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent level={1} className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedInquiry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedInquiry.code}
                  <Badge className={STATUS_CONFIG[selectedInquiry.status]?.color}>
                    {STATUS_CONFIG[selectedInquiry.status]?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* 客人資訊 */}
                <div>
                  <h4 className="font-bold mb-3">客人資訊</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">姓名：</span>
                      <span className="font-medium">{selectedInquiry.customer_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">電話：</span>
                      <span className="font-medium">{selectedInquiry.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email：</span>
                      <span className="font-medium">{selectedInquiry.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">人數：</span>
                      <span className="font-medium">{selectedInquiry.people_count} 人</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">出發日期：</span>
                      <span className="font-medium">
                        {selectedInquiry.travel_date 
                          ? format(new Date(selectedInquiry.travel_date), 'yyyy/MM/dd')
                          : '未指定'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">來源：</span>
                      <span className="font-medium">
                        {selectedInquiry.template_name || '-'}
                      </span>
                    </div>
                  </div>
                  
                  {selectedInquiry.notes && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">客人備註：</span>
                      <p className="text-sm mt-1">{selectedInquiry.notes}</p>
                    </div>
                  )}
                </div>

                {/* 選擇的景點 */}
                <div>
                  <h4 className="font-bold mb-3">
                    選擇的景點（{selectedInquiry.selected_items?.length || 0}）
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedInquiry.selected_items?.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          {item.region && (
                            <p className="text-xs text-muted-foreground">{item.region}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 內部備註 */}
                <div>
                  <Label>內部備註</Label>
                  <Textarea
                    defaultValue={selectedInquiry.internal_notes || ''}
                    placeholder="記錄跟進狀況..."
                    rows={3}
                    className="mt-2"
                    onBlur={(e) => {
                      if (e.target.value !== selectedInquiry.internal_notes) {
                        updateNotes(selectedInquiry, e.target.value)
                      }
                    }}
                  />
                </div>

                {/* 狀態更新 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(selectedInquiry, 'contacted')}
                    disabled={selectedInquiry.status === 'contacted'}
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    已聯繫
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(selectedInquiry, 'quoted')}
                    disabled={selectedInquiry.status === 'quoted'}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    已報價
                  </Button>
                  <Button
                    onClick={() => updateStatus(selectedInquiry, 'converted')}
                    disabled={selectedInquiry.status === 'converted'}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    已成交
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
