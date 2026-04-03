'use client'
/**
 * 顧客管理頁面（重構版）
 *
 * 使用模組化組件和 Hooks：
 * - useCustomerSearch: 搜尋與篩選
 * - CustomerAddDialog: 新增顧客（手動 + OCR）
 * - CustomerVerifyDialog: 驗證/編輯顧客
 * - CustomerDetailDialog: 顧客詳情
 * - ResetPasswordDialog: 重置密碼
 */

import { useState, useMemo, useCallback } from 'react'
import { Search, X, Plus, AlertTriangle, Edit, Trash2, Users, FileSpreadsheet, MessageCircle, Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatPassportExpiryWithStatus } from '@/lib/utils/passport-expiry'
import { DateCell } from '@/components/table-cells'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import {
  CustomerSearchDialog,
  CustomerSearchParams,
} from '@/components/customers/customer-search-dialog'
import { useCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/data'
import type { Customer, CreateCustomerData } from '@/types/customer.types'
import { confirm } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { syncPassportImageToMembers } from '@/lib/utils/sync-passport-image'
import { useRouter } from 'next/navigation'

// 本地組件和 Hooks
import { useCustomerSearch } from './hooks'
import {
  CustomerAddDialog,
  CustomerDialog,
  ResetPasswordDialog,
  ImportCustomersDialog,
} from './components'
import { CUSTOMER_PAGE_LABELS as L, CUSTOMER_IMPORT_LABELS } from './constants/labels'

export default function CustomersPage() {
  const router = useRouter()
  const { items: customers } = useCustomers()
  const addCustomer = createCustomer

  // 搜尋 Hook
  const { searchParams, setSearchParams, filteredCustomers, hasActiveFilters, clearFilters } =
    useCustomerSearch(customers)

  // 對話框狀態
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [customerDialogMode, setCustomerDialogMode] = useState<'view' | 'edit'>('view')
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [lineBindingCustomer, setLineBindingCustomer] = useState<Customer | null>(null)

  // 處理點擊行
  const handleRowClick = useCallback(async (customer: Customer) => {
    // 如果顧客沒有護照圖片（列表查詢不含此欄位），先從 customers 表直接撈
    let passportImageUrl = customer.passport_image_url
    if (!passportImageUrl) {
      try {
        const { data: customerDetail } = await supabase
          .from('customers')
          .select('passport_image_url')
          .eq('id', customer.id)
          .single()

        if (customerDetail?.passport_image_url) {
          passportImageUrl = customerDetail.passport_image_url
        }
      } catch {
        // 忽略錯誤
      }
    }

    // 仍然沒有的話，嘗試從關聯的 order_members 取得
    if (!passportImageUrl) {
      try {
        const { data: member } = await supabase
          .from('order_members')
          .select('passport_image_url')
          .eq('customer_id', customer.id)
          .not('passport_image_url', 'is', null)
          .limit(1)
          .single()

        if (member?.passport_image_url) {
          passportImageUrl = member.passport_image_url
          // 同時更新顧客的護照圖片並同步到其他成員（背景執行）
          void (async () => {
            await supabase
              .from('customers')
              .update({ passport_image_url: passportImageUrl })
              .eq('id', customer.id)
            await syncPassportImageToMembers(customer.id, passportImageUrl)
          })()
        }
      } catch {
        // 找不到關聯的訂單成員，忽略錯誤
      }
    }

    setSelectedCustomer({
      ...customer,
      passport_image_url: passportImageUrl,
    })
    setCustomerDialogMode('view')
    setIsCustomerDialogOpen(true)
  }, [])

  // 處理刪除
  const handleDelete = useCallback(
    async (customer: Customer) => {
      // 先檢查是否有訂單成員關聯
      const { data: linkedMembers } = await supabase
        .from('order_members')
        .select('id, order_id, orders!inner(code, tour_name)')
        .eq('customer_id', customer.id)
        .limit(5)

      if (linkedMembers && linkedMembers.length > 0) {
        const orderInfo = linkedMembers
          .map(m => {
            const order = m.orders as { code?: string; tour_name?: string } | null
            return order?.code || order?.tour_name || L.unknown_order
          })
          .join('、')

        const goToOrder = await confirm(L.cannot_delete_msg(orderInfo), {
          title: L.cannot_delete_title,
          type: 'warning',
          confirmText: L.btn_go_to_order,
          cancelText: L.btn_cancel,
        })

        if (goToOrder) {
          router.push('/orders')
        }
        return
      }

      const confirmed = await confirm(L.confirm_delete(customer.name), {
        title: L.confirm_delete_title,
        type: 'warning',
      })
      if (confirmed) {
        deleteCustomer(customer.id)
      }
    },
    [deleteCustomer, router]
  )

  // 表格欄位定義
  const tableColumns: TableColumn<Customer>[] = useMemo(
    () => [
      {
        key: 'code',
        label: L.col_code,
        sortable: true,
        render: (_value, customer: Customer) => (
          <div className="flex items-center gap-2">
            <span className="text-xs text-morandi-secondary font-mono">{customer.code}</span>
            {customer.verification_status === 'unverified' && (
              <span className="text-xs text-status-warning font-medium">⚠️</span>
            )}
          </div>
        ),
      },
      {
        key: 'name',
        label: L.col_name,
        sortable: true,
        render: (_value, customer: Customer) => (
          <div className="text-sm font-medium text-morandi-primary">{customer.name}</div>
        ),
      },
      {
        key: 'passport_name',
        label: L.col_passport_name,
        sortable: false,
        render: (_value, customer: Customer) => (
          <div className="text-xs text-morandi-primary font-mono">
            {customer.passport_name || '-'}
          </div>
        ),
      },
      {
        key: 'phone',
        label: L.col_phone,
        sortable: false,
        render: (_value, customer: Customer) => (
          <div className="text-xs text-morandi-primary">{customer.phone || '-'}</div>
        ),
      },
      {
        key: 'passport_number',
        label: L.col_passport_number,
        sortable: false,
        render: (_value, customer: Customer) => (
          <div className="text-xs text-morandi-primary font-mono">
            {customer.passport_number || '-'}
          </div>
        ),
      },
      {
        key: 'passport_expiry',
        label: L.col_passport_expiry,
        sortable: false,
        render: (_value, customer: Customer) => {
          const expiryInfo = formatPassportExpiryWithStatus(customer.passport_expiry)
          return (
            <div className={`text-xs ${expiryInfo.className || 'text-morandi-secondary'}`}>
              <DateCell
                date={customer.passport_expiry}
                showIcon={false}
                className={`text-xs ${expiryInfo.className || 'text-morandi-secondary'}`}
              />
              {expiryInfo.statusLabel && (
                <span className="ml-1 text-[10px] font-medium">({expiryInfo.statusLabel})</span>
              )}
            </div>
          )
        },
      },
      {
        key: 'national_id',
        label: L.col_national_id,
        sortable: false,
        render: (_value, customer: Customer) => (
          <div className="text-xs text-morandi-primary font-mono">
            {customer.national_id || '-'}
          </div>
        ),
      },
      {
        key: 'birth_date',
        label: L.col_birth_date,
        sortable: false,
        render: (_value, customer: Customer) => (
          <DateCell
            date={customer.birth_date}
            showIcon={false}
            className="text-xs text-morandi-secondary"
          />
        ),
      },
      {
        key: 'dietary_restrictions',
        label: L.col_dietary,
        sortable: false,
        render: (_value, customer: Customer) => (
          <div
            className={`text-xs ${customer.dietary_restrictions ? 'text-morandi-gold bg-status-warning-bg px-1.5 py-0.5 rounded' : 'text-morandi-secondary'}`}
          >
            {customer.dietary_restrictions || '-'}
          </div>
        ),
      },
      {
        key: 'vip',
        label: 'VIP',
        sortable: true,
        render: (_value, customer: Customer) => (
          <div className="text-xs text-morandi-secondary">
            {customer.is_vip ? (
              <span className="text-morandi-gold font-medium">VIP</span>
            ) : (
              L.vip_normal
            )}
          </div>
        ),
      },
    ],
    []
  )

  // 處理新增顧客
  const handleAddCustomer = useCallback(
    async (data: {
      name: string
      email: string
      phone: string
      address: string
      passport_number: string
      passport_name: string
      passport_expiry: string
      national_id: string
      birth_date: string
    }) => {
      // 將空字串日期欄位轉換為 null，避免 PostgreSQL 日期格式錯誤
      const cleanedData = {
        ...data,
        passport_expiry: data.passport_expiry || null,
        birth_date: data.birth_date || null,
      }
      await (addCustomer as (data: CreateCustomerData) => Promise<Customer>)({
        ...cleanedData,
        is_vip: false,
        is_active: true,
        total_spent: 0,
        verification_status: 'unverified',
      } as CreateCustomerData)
    },
    [addCustomer]
  )

  return (
    <ContentPageLayout
      title={L.page_title}
      icon={Users}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/customer-groups')}
            className="gap-2"
          >
            <Users size={16} />
            <span className="hidden sm:inline">{L.btn_groups}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdvancedSearchOpen(true)}
            className="gap-2"
          >
            <Search size={16} />
            <span className="hidden sm:inline">{L.btn_advanced_search}</span>
          </Button>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="gap-2 text-morandi-red"
            >
              <X size={16} />
              <span className="hidden sm:inline">{L.btn_clear_filters}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportDialogOpen(true)}
            className="gap-2"
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">{CUSTOMER_IMPORT_LABELS.btn_select_file}</span>
          </Button>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
            size="sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{L.btn_add_customer}</span>
          </Button>
        </div>
      }
    >
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-morandi-container/20 border-b border-border">
          <div className="text-xs text-morandi-secondary">
            {L.filter_applied(
              Object.keys(searchParams).length,
              filteredCustomers.length,
              customers.length
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full">
          <EnhancedTable
            columns={tableColumns}
            data={filteredCustomers}
            onRowClick={handleRowClick}
            actions={(customer: Customer) => (
              <div className="flex items-center gap-1">
                {customer.verification_status === 'unverified' && customer.passport_image_url && (
                  <button
                    className="p-1 text-status-warning hover:text-status-warning hover:bg-status-warning-bg rounded transition-colors"
                    title={L.title_verify}
                    onClick={e => {
                      e.stopPropagation()
                      setSelectedCustomer(customer)
                      setCustomerDialogMode('edit')
                      setIsCustomerDialogOpen(true)
                    }}
                  >
                    <AlertTriangle size={14} />
                  </button>
                )}
                {/* LINE 綁定按鈕 */}
                <button
                  className={`p-1 rounded transition-colors ${
                    (customer as unknown as Record<string, unknown>).line_user_id
                      ? 'text-brand-line hover:bg-brand-line/10'
                      : 'text-morandi-secondary hover:text-brand-line hover:bg-brand-line/10'
                  }`}
                  title={(customer as unknown as Record<string, unknown>).line_user_id ? '已綁定 LINE' : '綁定 LINE'}
                  onClick={e => {
                    e.stopPropagation()
                    setLineBindingCustomer(customer)
                  }}
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  className="p-1 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
                  title={L.title_edit}
                  onClick={e => {
                    e.stopPropagation()
                    setSelectedCustomer(customer)
                    setCustomerDialogMode('edit')
                    setIsCustomerDialogOpen(true)
                  }}
                >
                  <Edit size={14} />
                </button>
                <button
                  className="p-1 text-morandi-secondary hover:text-status-danger hover:bg-status-danger-bg rounded transition-colors"
                  title={L.title_delete}
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete(customer)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          />
        </div>
      </div>

      {/* 進階搜尋對話框 */}
      <CustomerSearchDialog
        open={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        onSearch={setSearchParams}
        initialValues={searchParams}
      />

      {/* 新增顧客對話框 */}
      <CustomerAddDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        customers={customers}
        onAddCustomer={handleAddCustomer}
        updateCustomer={
          updateCustomer as unknown as (id: string, data: Partial<Customer>) => Promise<void>
        }
        addCustomer={addCustomer as (data: Partial<Customer>) => Promise<Customer>}
      />

      {/* 顧客詳情/編輯對話框（統一組件） */}
      <CustomerDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        customer={selectedCustomer}
        mode={customerDialogMode}
        onModeChange={setCustomerDialogMode}
        onSave={async (data) => {
          if (selectedCustomer) {
            await updateCustomer(selectedCustomer.id, data as Partial<Customer>)
          }
        }}
      />

      {/* 重置密碼對話框 */}
      <ResetPasswordDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        customer={selectedCustomer}
      />

      {/* 批次匯入對話框 */}
      <ImportCustomersDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />

      {/* LINE 綁定 Dialog */}
      <Dialog open={!!lineBindingCustomer} onOpenChange={() => setLineBindingCustomer(null)}>
        <DialogContent level={1} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-brand-line">📱</span> LINE 綁定
            </DialogTitle>
          </DialogHeader>
          {lineBindingCustomer && (
            <div className="flex flex-col items-center gap-4 py-4">
              {(lineBindingCustomer as unknown as Record<string, unknown>).line_user_id ? (
                // 已綁定
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-line/10 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-brand-line" />
                  </div>
                  <p className="font-medium text-morandi-primary">
                    {lineBindingCustomer.name}
                  </p>
                  <p className="text-sm text-brand-line mt-1">✓ 已綁定 LINE</p>
                  <p className="text-xs text-morandi-secondary mt-2">
                    綁定時間：{(lineBindingCustomer as unknown as Record<string, unknown>).line_linked_at
                      ? new Date((lineBindingCustomer as unknown as Record<string, unknown>).line_linked_at as string).toLocaleDateString('zh-TW')
                      : '未知'}
                  </p>
                </div>
              ) : (
                // 未綁定，顯示 QR Code
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <QRCodeSVG
                      value={`https://line.me/R/oaMessage/${process.env.NEXT_PUBLIC_LINE_BOT_ID || '@745gftqd'}?綁定 ${lineBindingCustomer.code}`}
                      size={180}
                      level="M"
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-morandi-primary">
                      {lineBindingCustomer.name}
                    </p>
                    <p className="text-sm text-morandi-secondary mt-1">
                      客戶編號：{lineBindingCustomer.code}
                    </p>
                    <p className="text-xs text-morandi-muted mt-2">
                      請客戶掃描 QR Code 完成綁定
                    </p>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const url = `https://line.me/R/oaMessage/${process.env.NEXT_PUBLIC_LINE_BOT_ID || '@745gftqd'}?綁定 ${lineBindingCustomer.code}`
                        navigator.clipboard.writeText(url)
                        toast.success('連結已複製')
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      複製連結
                    </Button>
                  </div>
                  <p className="text-xs text-morandi-muted text-center">
                    掃碼後會打開 LINE 對話
                    <br />
                    自動傳送綁定指令完成綁定
                  </p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
