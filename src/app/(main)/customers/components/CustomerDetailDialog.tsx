'use client'
/**
 * 顧客詳情對話框
 * 顯示顧客基本資料（左邊護照照片，右邊資料）
 */

import { Check, AlertTriangle, Mail, Phone, X, ImageOff } from 'lucide-react'
import { DateCell } from '@/components/table-cells'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Customer } from '@/types/customer.types'
import { CUSTOMER_DETAIL_LABELS as L } from '../constants/labels'
import { usePassportImageUrl } from '@/lib/passport-storage/usePassportImageUrl'

interface CustomerDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  onEdit: (customer: Customer) => void
}

function CustomerDetailDialog({
  open,
  onOpenChange,
  customer,
  onEdit,
}: CustomerDetailDialogProps) {
  const passportUrl = usePassportImageUrl(customer?.passport_image_url)
  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {customer.name}
            {customer.is_vip && (
              <span className="text-xs bg-morandi-gold text-white px-2 py-0.5 rounded">VIP</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 主要內容區：左邊照片，右邊資料 */}
        <div className="flex gap-6 py-4">
          {/* 左側：護照照片 */}
          <div className="w-64 flex-shrink-0">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-morandi-background border border-border shadow-sm">
              {customer.passport_image_url && passportUrl ? (
                <img
                  src={passportUrl}
                  alt={L.passport_alt(customer.name)}
                  className="w-full h-full object-cover"
                  onError={e => {
                    // 圖片載入失敗時隱藏
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex flex-col items-center justify-center text-morandi-muted">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-2">
                            <line x1="2" y1="2" x2="22" y2="22"></line>
                            <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"></path>
                            <line x1="13.5" y1="13.5" x2="6" y2="21"></line>
                            <line x1="18" y1="12" x2="21" y2="15"></line>
                            <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"></path>
                            <path d="M21 15V5a2 2 0 0 0-2-2H9"></path>
                          </svg>
                          <span class="text-sm">${L.no_passport_photo}</span>
                        </div>
                      `
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-morandi-muted">
                  <ImageOff size={48} className="mb-2" />
                  <span className="text-sm">{L.no_passport_photo}</span>
                </div>
              )}
            </div>
          </div>

          {/* 右側：資料欄位 */}
          <div className="flex-1 space-y-4">
            {/* 聯絡資訊 */}
            <div className="bg-morandi-container rounded-lg p-4 border border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-morandi-muted">{L.label_phone}</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Phone size={14} className="text-morandi-muted" />
                    <span className="text-morandi-primary font-medium">
                      {customer.phone || '-'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-morandi-muted">{L.label_email}</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Mail size={14} className="text-morandi-muted" />
                    <span className="text-morandi-primary text-sm break-all">
                      {customer.email || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 護照資料 */}
            <div className="bg-morandi-container rounded-lg p-4 border border-border">
              <h4 className="text-sm font-medium text-morandi-primary mb-3">
                {L.section_passport}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-morandi-muted">{L.label_passport_number}</label>
                  <div className="font-mono text-morandi-primary mt-1.5">
                    {customer.passport_number || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-morandi-muted">{L.label_passport_name}</label>
                  <div className="font-mono text-morandi-primary mt-1.5">
                    {customer.passport_name || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-morandi-muted">{L.label_passport_expiry}</label>
                  <div className="mt-1.5">
                    <DateCell
                      date={customer.passport_expiry}
                      showIcon={false}
                      className="text-morandi-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-morandi-muted">{L.label_verification}</label>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {customer.verification_status === 'verified' ? (
                      <>
                        <Check size={14} className="text-status-success" />
                        <span className="text-status-success text-sm">{L.status_verified}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} className="text-status-warning" />
                        <span className="text-status-warning text-sm">{L.status_unverified}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 身分資料 */}
            <div className="bg-morandi-container rounded-lg p-4 border border-border">
              <h4 className="text-sm font-medium text-morandi-primary mb-3">
                {L.section_identity}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-morandi-muted">{L.label_national_id}</label>
                  <div className="font-mono text-morandi-primary mt-1.5">
                    {customer.national_id || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-morandi-muted">{L.label_birth_date}</label>
                  <div className="mt-1.5">
                    <DateCell
                      date={customer.birth_date}
                      showIcon={false}
                      className="text-morandi-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 飲食禁忌 */}
            {customer.dietary_restrictions && (
              <div className="bg-status-warning-bg rounded-lg p-4 border border-morandi-gold/30">
                <label className="text-xs text-morandi-muted">{L.label_dietary}</label>
                <div className="mt-1.5 text-morandi-gold font-medium">
                  {customer.dietary_restrictions}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="soft-gold" onClick={() => onOpenChange(false)} className="gap-2">
            <X size={16} />
            {L.btn_close}
          </Button>
          <Button
            onClick={() => {
              onEdit(customer)
              onOpenChange(false)
            }}
            className="gap-2"
          >
            {L.btn_edit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
