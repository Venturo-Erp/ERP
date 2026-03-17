'use client'
/**
 * SupplierRequestsPage - 供應商需求收件匣
 *
 * 顯示所有發送給此供應商的需求單
 */

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Send, Eye, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useSupplierRequests, type SupplierRequest } from '../hooks/useSupplierRequests'
import { SupplierResponseDialog } from './SupplierResponseDialog'
import { cn } from '@/lib/utils'
import { SUPPLIER_LABELS } from './constants/labels'

// 回覆狀態配置
const RESPONSE_STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ReactNode
  }
> = {
  pending: {
    label: SUPPLIER_LABELS.STATUS_PENDING_REPLY,
    variant: 'outline',
    icon: <Clock className="h-3 w-3" />,
  },
  responded: {
    label: SUPPLIER_LABELS.STATUS_RESPONDED,
    variant: 'secondary',
    icon: <Send className="h-3 w-3" />,
  },
  quoted: {
    label: SUPPLIER_LABELS.STATUS_QUOTED,
    variant: 'secondary',
    icon: <Send className="h-3 w-3" />,
  },
  accepted: {
    label: SUPPLIER_LABELS.STATUS_ACCEPTED,
    variant: 'default',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: SUPPLIER_LABELS.STATUS_REJECTED,
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
  },
  need_info: {
    label: SUPPLIER_LABELS.STATUS_NEED_INFO,
    variant: 'outline',
    icon: <Clock className="h-3 w-3" />,
  },
}

// 類別配置
const CATEGORY_CONFIG: Record<string, string> = {
  transport: SUPPLIER_LABELS.CAT_TRANSPORT,
  guide: SUPPLIER_LABELS.CAT_GUIDE,
  hotel: SUPPLIER_LABELS.CAT_HOTEL,
  restaurant: SUPPLIER_LABELS.CAT_RESTAURANT,
  activity: SUPPLIER_LABELS.CAT_ACTIVITY,
  other: SUPPLIER_LABELS.CAT_OTHER,
}

export function SupplierRequestsPage() {
  const router = useRouter()
  const { requests, isLoading, refetch } = useSupplierRequests()
  const [selectedRequest, setSelectedRequest] = useState<SupplierRequest | null>(null)
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // 過濾需求
  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'pending') return r.response_status === 'pending' || !r.response_status
    return r.response_status === filterStatus
  })

  // 處理回覆
  const handleRespond = useCallback((request: SupplierRequest) => {
    setSelectedRequest(request)
    setIsResponseDialogOpen(true)
  }, [])

  // 關閉回覆 Dialog
  const handleCloseResponseDialog = useCallback(() => {
    setIsResponseDialogOpen(false)
    setSelectedRequest(null)
  }, [])

  // 回覆成功後重新載入
  const handleResponseSuccess = useCallback(() => {
    refetch()
    handleCloseResponseDialog()
  }, [refetch, handleCloseResponseDialog])

  // 表格欄位定義
  const columns: TableColumn[] = [
    {
      key: 'response_status',
      label: SUPPLIER_LABELS.COL_STATUS,
      width: '100px',
      render: value => {
        const status = String(value || 'pending')
        const config = RESPONSE_STATUS_CONFIG[status]
        return (
          <Badge variant={config?.variant || 'outline'} className="gap-1">
            {config?.icon}
            {config?.label || status}
          </Badge>
        )
      },
    },
    {
      key: 'category',
      label: SUPPLIER_LABELS.COL_CATEGORY,
      width: '120px',
      render: value => (
        <span className="text-morandi-primary">
          {CATEGORY_CONFIG[String(value)] || String(value)}
        </span>
      ),
    },
    {
      key: 'tour_name',
      label: SUPPLIER_LABELS.COL_TOUR_NAME,
      render: (value, row) => {
        const request = row as SupplierRequest
        return (
          <div>
            <div className="font-medium text-morandi-primary">
              {String(value || request.tour_code || SUPPLIER_LABELS.UNNAMED)}
            </div>
            {request.title && <div className="text-xs text-morandi-secondary">{request.title}</div>}
          </div>
        )
      },
    },
    {
      key: 'service_date',
      label: SUPPLIER_LABELS.COL_SERVICE_DATE_REQ,
      width: '180px',
      render: (value, row) => {
        const request = row as SupplierRequest
        const startDate = value ? new Date(String(value)).toLocaleDateString('zh-TW') : '-'
        const endDate = request.service_date_end
          ? new Date(request.service_date_end).toLocaleDateString('zh-TW')
          : null
        return (
          <span className="text-morandi-primary">
            {startDate}
            {endDate && endDate !== startDate && ` ~ ${endDate}`}
          </span>
        )
      },
    },
    {
      key: 'quantity',
      label: SUPPLIER_LABELS.COL_QUANTITY_REQ,
      width: '80px',
      render: value => (
        <span className="font-medium text-morandi-primary">{String(value || 1)}</span>
      ),
    },
    {
      key: 'created_at',
      label: SUPPLIER_LABELS.COL_RECEIVED_AT,
      width: '120px',
      render: value => (
        <span className="text-morandi-secondary text-sm">
          {value ? new Date(String(value)).toLocaleDateString('zh-TW') : '-'}
        </span>
      ),
    },
  ]

  return (
    <ContentPageLayout
      title={SUPPLIER_LABELS.LABEL_174}
      icon={ClipboardList}
      breadcrumb={[
        { label: SUPPLIER_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
        { label: SUPPLIER_LABELS.BREADCRUMB_SUPPLIER, href: '/supplier' },
        { label: SUPPLIER_LABELS.BREADCRUMB_REQUESTS, href: '/supplier/requests' },
      ]}
    >
      {/* 篩選 Tabs */}
      <div className="px-4 py-2 border-b border-border bg-card flex gap-2">
        {[
          { value: 'all', label: SUPPLIER_LABELS.TAB_ALL, count: requests.length },
          {
            value: 'pending',
            label: SUPPLIER_LABELS.TAB_PENDING,
            count: requests.filter(r => r.response_status === 'pending' || !r.response_status)
              .length,
          },
          {
            value: 'quoted',
            label: SUPPLIER_LABELS.TAB_QUOTED,
            count: requests.filter(r => r.response_status === 'quoted').length,
          },
          {
            value: 'accepted',
            label: SUPPLIER_LABELS.TAB_ACCEPTED,
            count: requests.filter(r => r.response_status === 'accepted').length,
          },
          {
            value: 'rejected',
            label: SUPPLIER_LABELS.TAB_REJECTED,
            count: requests.filter(r => r.response_status === 'rejected').length,
          },
        ].map(tab => (
          <Button
            key={tab.value}
            variant={filterStatus === tab.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterStatus(tab.value)}
            className={cn(
              filterStatus === tab.value && 'bg-morandi-gold hover:bg-morandi-gold-hover text-white'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                  filterStatus === tab.value ? 'bg-white/20' : 'bg-morandi-container'
                )}
              >
                {tab.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <EnhancedTable
          className="min-h-full"
          columns={columns}
          data={filteredRequests}
          loading={isLoading}
          onRowClick={row => {
            const req = row as SupplierRequest
            router.push(`/supplier/requests/${req.id}`)
          }}
          actions={row => {
            const request = row as SupplierRequest
            const isPending = request.response_status === 'pending'
            return (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={e => {
                    e.stopPropagation()
                    handleRespond(request)
                  }}
                  className={cn(
                    isPending
                      ? 'text-morandi-gold hover:bg-morandi-gold/10'
                      : 'text-morandi-secondary hover:bg-morandi-container/50'
                  )}
                  title={isPending ? SUPPLIER_LABELS.BTN_RESPOND : SUPPLIER_LABELS.BTN_VIEW}
                >
                  {isPending ? <Send size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            )
          }}
        />
      </div>

      {/* 回覆 Dialog */}
      <SupplierResponseDialog
        isOpen={isResponseDialogOpen}
        onClose={handleCloseResponseDialog}
        request={selectedRequest}
        onSuccess={handleResponseSuccess}
      />
    </ContentPageLayout>
  )
}
