'use client'

/**
 * 詢價單管理頁面
 * 路由: /inquiries
 */

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
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
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
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
import { supabase } from '@/lib/supabase/client'

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
  pending: { label: '待處理', color: 'bg-yellow-100 text-yellow-800' },
  contacted: { label: '已聯繫', color: 'bg-blue-100 text-blue-800' },
  quoted: { label: '已報價', color: 'bg-purple-100 text-purple-800' },
  converted: { label: '已成交', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
}

type FilterTab = 'all' | 'pending' | 'contacted' | 'quoted' | 'converted' | 'cancelled'

export default function InquiriesPage() {
  const { user } = useAuthStore()
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchInquiries = async () => {
    if (!user?.workspace_id) return

    const { data, error } = await supabase
      .from('customer_inquiries')
      .select(`
        *,
        wishlist_templates(name)
      `)
      .eq('workspace_id', user.workspace_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('載入失敗:', error)
      toast.error('載入失敗')
      return
    }

    interface InquiryRow {
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
      wishlist_templates?: { name: string } | null
    }

    const processed = (data || []).map((row: InquiryRow) => ({
      ...row,
      template_name: row.wishlist_templates?.name,
    }))

    setInquiries(processed)
    setLoading(false)
  }

  useEffect(() => {
    fetchInquiries()
  }, [user?.workspace_id])

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

  // 篩選
  const filteredInquiries = useMemo(() => {
    let result = inquiries
    
    if (activeTab !== 'all') {
      result = result.filter(i => i.status === activeTab)
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i => 
        i.customer_name.toLowerCase().includes(term) ||
        i.code.toLowerCase().includes(term) ||
        i.phone?.includes(term)
      )
    }
    
    return result
  }, [inquiries, activeTab, searchTerm])

  // 分頁標籤
  const tabs = [
    { key: 'all', label: '全部', count: statusCounts.all },
    { key: 'pending', label: '待處理', count: statusCounts.pending },
    { key: 'contacted', label: '已聯繫', count: statusCounts.contacted },
    { key: 'quoted', label: '已報價', count: statusCounts.quoted },
    { key: 'converted', label: '已成交', count: statusCounts.converted },
  ]

  // 表格欄位
  const columns: TableColumn<CustomerInquiry>[] = [
    {
      key: 'code',
      title: '編號',
      width: '120px',
      render: (row) => (
        <span className="font-mono text-sm">{row.code}</span>
      ),
    },
    {
      key: 'customer_name',
      title: '客人',
      render: (row) => (
        <div>
          <div className="font-medium">{row.customer_name}</div>
          <div className="text-xs text-muted-foreground">{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'template_name',
      title: '來源',
      width: '150px',
      render: (row) => row.template_name || '-',
    },
    {
      key: 'selected_items',
      title: '景點',
      width: '80px',
      align: 'center',
      render: (row) => `${row.selected_items?.length || 0} 個`,
    },
    {
      key: 'travel_date',
      title: '出發日',
      width: '100px',
      render: (row) => row.travel_date 
        ? format(new Date(row.travel_date), 'MM/dd')
        : '-',
    },
    {
      key: 'people_count',
      title: '人數',
      width: '60px',
      align: 'center',
      render: (row) => row.people_count,
    },
    {
      key: 'status',
      title: '狀態',
      width: '90px',
      render: (row) => (
        <Badge className={STATUS_CONFIG[row.status]?.color}>
          {STATUS_CONFIG[row.status]?.label}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      title: '時間',
      width: '100px',
      render: (row) => format(new Date(row.created_at), 'MM/dd HH:mm'),
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
    <ListPageLayout
      title="詢價單管理"
      icon={Inbox}
      description="客人透過紙娃娃送出的詢價單"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as FilterTab)}
      searchPlaceholder="搜尋客人姓名、編號..."
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      badge={statusCounts.pending > 0 ? statusCounts.pending : undefined}
    >
      <EnhancedTable
        columns={columns}
        data={filteredInquiries}
        loading={loading}
        actions={renderActions}
        actionsWidth="50px"
        onRowClick={openDetail}
        bordered
        rowClassName={(row) => row.status === 'pending' ? 'bg-yellow-50' : ''}
        emptyState={
          <div className="flex flex-col items-center py-12">
            <Inbox size={48} className="text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {activeTab === 'all' ? '還沒有詢價單' : '沒有符合條件的詢價單'}
            </p>
          </div>
        }
      />

      {/* 詳情 Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
    </ListPageLayout>
  )
}
