'use client'

/**
 * 詢價單管理頁面
 * 路由: /inquiries
 */

import { useState, useEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  wishlist_templates?: {
    name: string
    slug: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: '待處理', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  contacted: { label: '已聯繫', icon: Phone, color: 'bg-blue-100 text-blue-800' },
  quoted: { label: '已報價', icon: FileText, color: 'bg-purple-100 text-purple-800' },
  converted: { label: '已成交', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', icon: XCircle, color: 'bg-gray-100 text-gray-800' },
}

export default function InquiriesPage() {
  const { user } = useAuthStore()
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)



  const fetchInquiries = async () => {
    if (!user?.workspace_id) return

    let query = supabase
      .from('customer_inquiries')
      .select(`
        *,
        wishlist_templates(name, slug)
      `)
      .eq('workspace_id', user.workspace_id)
      .order('created_at', { ascending: false })

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query

    if (error) {
      console.error('載入失敗:', error)
      toast.error('載入失敗')
      return
    }

    setInquiries(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchInquiries()
  }, [user?.workspace_id, filterStatus])

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
    fetchInquiries()
  }

  const openDetail = (inquiry: CustomerInquiry) => {
    setSelectedInquiry(inquiry)
    setDetailOpen(true)
  }

  const pendingCount = inquiries.filter(i => i.status === 'pending').length

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 標題區 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="text-primary" />
            詢價單管理
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            客人透過紙娃娃送出的詢價單
          </p>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待處理</SelectItem>
            <SelectItem value="contacted">已聯繫</SelectItem>
            <SelectItem value="quoted">已報價</SelectItem>
            <SelectItem value="converted">已成交</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 列表 */}
      {inquiries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filterStatus === 'all' ? '還沒有詢價單' : '沒有符合條件的詢價單'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inquiry => {
            const statusConfig = STATUS_CONFIG[inquiry.status]
            const StatusIcon = statusConfig?.icon || Clock
            
            return (
              <Card 
                key={inquiry.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  inquiry.status === 'pending' ? 'border-yellow-300 bg-yellow-50/50' : ''
                }`}
                onClick={() => openDetail(inquiry)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {inquiry.code}
                        </span>
                        <Badge className={statusConfig?.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig?.label}
                        </Badge>
                        {inquiry.wishlist_templates && (
                          <Badge variant="outline">
                            {inquiry.wishlist_templates.name}
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-lg mb-2">{inquiry.customer_name}</h3>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {inquiry.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {inquiry.phone}
                          </span>
                        )}
                        {inquiry.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {inquiry.email}
                          </span>
                        )}
                        {inquiry.travel_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(inquiry.travel_date), 'yyyy/MM/dd')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {inquiry.people_count} 人
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {inquiry.selected_items?.length || 0} 個景點
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(inquiry.created_at), 'MM/dd HH:mm', { locale: zhTW })}
                      </span>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(inquiry) }}>
                            <Eye className="w-4 h-4 mr-2" />
                            查看詳情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus(inquiry, 'contacted') }}>
                            標記為已聯繫
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus(inquiry, 'quoted') }}>
                            標記為已報價
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus(inquiry, 'converted') }}>
                            標記為已成交
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); updateStatus(inquiry, 'cancelled') }}
                            className="text-destructive"
                          >
                            取消
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
                        {selectedInquiry.wishlist_templates?.name || '-'}
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
    </div>
  )
}
