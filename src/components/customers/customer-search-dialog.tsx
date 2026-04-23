'use client'
/**
 * 顧客進階搜尋對話框
 * 整合舊專案 cornerERP 的進階搜尋功能 + Venturo 的 VIP 篩選
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { CUSTOMER_SEARCH_LABELS as L } from '@/app/(main)/customers/constants/labels'

export interface CustomerSearchParams {
  query?: string // 姓名/身份證號/護照號碼
  phone?: string // 電話
  email?: string // Email
  passport_name?: string // 護照姓名/拼音（標準欄位）
  is_vip?: boolean // 是否為 VIP
  vip_level?: string // VIP 等級
  source?: string // 客戶來源
  city?: string // 城市
  passport_expiry_start?: string // 護照效期起始日
  passport_expiry_end?: string // 護照效期結束日
}

interface CustomerSearchDialogProps {
  open: boolean
  onClose: () => void
  onSearch: (params: CustomerSearchParams) => void
  initialValues?: CustomerSearchParams
}

export function CustomerSearchDialog({
  open,
  onClose,
  onSearch,
  initialValues = {},
}: CustomerSearchDialogProps) {
  const [searchParams, setSearchParams] = useState<CustomerSearchParams>(initialValues)

  const handleReset = () => {
    setSearchParams({})
  }

  const handleSearch = () => {
    // 過濾掉空值
    const filteredParams = Object.entries(searchParams).reduce<CustomerSearchParams>(
      (acc, [key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          acc[key as keyof CustomerSearchParams] = value
        }
        return acc
      },
      {}
    )

    onSearch(filteredParams)
    onClose()
  }

  const updateParam = (
    key: keyof CustomerSearchParams,
    value: CustomerSearchParams[keyof CustomerSearchParams]
  ) => {
    setSearchParams(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent level={1} className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Search size={20} className="text-morandi-gold" />
            {L.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本資訊 */}
          <div>
            <h3 className="text-sm font-semibold text-morandi-primary mb-3">{L.section_basic}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-morandi-primary mb-2 block">{L.label_keyword}</label>
                <Input
                  value={searchParams.query || ''}
                  onChange={e => updateParam('query', e.target.value)}
                  placeholder={L.placeholder_keyword}
                />
              </div>

              <div>
                <label className="text-sm text-morandi-primary mb-2 block">{L.label_phone}</label>
                <Input
                  value={searchParams.phone || ''}
                  onChange={e => updateParam('phone', e.target.value)}
                  placeholder={L.placeholder_phone}
                />
              </div>

              <div>
                <label className="text-sm text-morandi-primary mb-2 block">{L.label_email}</label>
                <Input
                  type="email"
                  value={searchParams.email || ''}
                  onChange={e => updateParam('email', e.target.value)}
                  placeholder={L.placeholder_email}
                />
              </div>

              <div>
                <label className="text-sm text-morandi-primary mb-2 block">{L.label_city}</label>
                <Input
                  value={searchParams.city || ''}
                  onChange={e => updateParam('city', e.target.value)}
                  placeholder={L.placeholder_city}
                />
              </div>
            </div>
          </div>

          {/* 護照資訊 */}
          <div>
            <h3 className="text-sm font-semibold text-morandi-primary mb-3">
              {L.section_passport}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-morandi-primary mb-2 block">
                  {L.label_passport_name}
                </label>
                <Input
                  value={searchParams.passport_name || ''}
                  onChange={e => updateParam('passport_name', e.target.value)}
                  placeholder={L.placeholder_passport_name}
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-sm text-morandi-primary mb-2 block">
                  {L.label_passport_expiry}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker
                    value={searchParams.passport_expiry_start || ''}
                    onChange={date => updateParam('passport_expiry_start', date)}
                    placeholder={L.placeholder_start}
                  />
                  <DatePicker
                    value={searchParams.passport_expiry_end || ''}
                    onChange={date => updateParam('passport_expiry_end', date)}
                    placeholder={L.placeholder_end}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* VIP 與來源 */}
          <div>
            <h3 className="text-sm font-semibold text-morandi-primary mb-3">
              {L.section_vip_source}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-morandi-primary mb-2 block">{L.label_vip}</label>
                <Select
                  value={searchParams.is_vip?.toString() || 'all'}
                  onValueChange={value =>
                    updateParam('is_vip', value === 'all' ? undefined : value === 'true')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={L.option_all} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{L.option_all}</SelectItem>
                    <SelectItem value="true">{L.option_vip}</SelectItem>
                    <SelectItem value="false">{L.option_non_vip}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-morandi-primary mb-2 block">
                  {L.label_vip_level}
                </label>
                <Select
                  value={searchParams.vip_level || 'all'}
                  onValueChange={value =>
                    updateParam('vip_level', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={L.option_all} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{L.option_all}</SelectItem>
                    <SelectItem value="bronze">{L.option_bronze}</SelectItem>
                    <SelectItem value="silver">{L.option_silver}</SelectItem>
                    <SelectItem value="gold">{L.option_gold}</SelectItem>
                    <SelectItem value="platinum">{L.option_platinum}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-morandi-primary mb-2 block">{L.label_source}</label>
                <Select
                  value={searchParams.source || 'all'}
                  onValueChange={value =>
                    updateParam('source', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={L.option_all} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{L.option_all}</SelectItem>
                    <SelectItem value="website">{L.option_website}</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="line">LINE</SelectItem>
                    <SelectItem value="referral">{L.option_referral}</SelectItem>
                    <SelectItem value="phone">{L.option_phone}</SelectItem>
                    <SelectItem value="walk_in">{L.option_walk_in}</SelectItem>
                    <SelectItem value="other">{L.option_other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <X size={16} />
            {L.btn_reset}
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-1">
            <X size={16} />
            {L.btn_close}
          </Button>
          <Button
            onClick={handleSearch}
            className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-2"
          >
            <Search size={16} />
            {L.btn_search}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
