'use client'

import React from 'react'
import { UserPlus, Upload, Loader2, X, Save, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateCell } from '@/components/table-cells'
import { CUSTOMER_MATCH_LABELS as CL, ADD_CUSTOMER_FORM_LABELS as FL } from '../constants/labels'
import { usePassportImageUrl } from '@/lib/passport-storage/usePassportImageUrl'

interface CustomerMatch {
  name: string
  phone: string
  matchedCustomers: Array<{
    id: string
    name: string
    phone: string | null
    birth_date: string | null
    national_id: string | null
  }>
}

interface CustomerMatchDialogProps {
  open: boolean
  currentPerson: CustomerMatch | undefined
  currentIndex: number
  totalCount: number
  onSelectExisting: (customerId: string, customerName: string) => void
  onAddNew: () => void
  onSkipAll: () => void
}

export function CustomerMatchDialog({
  open,
  currentPerson,
  currentIndex,
  totalCount,
  onSelectExisting,
  onAddNew,
  onSkipAll,
}: CustomerMatchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onSkipAll()}>
      <DialogContent level={1} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-morandi-gold" />
            {CL.title}
            {totalCount > 1 && (
              <span className="text-sm font-normal text-morandi-secondary">
                ({currentIndex + 1} / {totalCount})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {(currentPerson?.matchedCustomers.length ?? 0 > 0)
              ? CL.found_match(
                  currentPerson?.matchedCustomers.length ?? 0,
                  currentPerson?.name ?? ''
                )
              : CL.new_customer(currentPerson?.name ?? '')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 有同名客戶時，列出供選擇 */}
          {(currentPerson?.matchedCustomers.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {currentPerson?.matchedCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="p-4 border border-border rounded-lg hover:border-morandi-gold/50 hover:bg-morandi-container/20 transition-colors cursor-pointer"
                  onClick={() => onSelectExisting(customer.id, customer.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-morandi-gold/20 flex items-center justify-center text-lg font-medium text-morandi-gold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-morandi-primary">{customer.name}</div>
                        <div className="text-sm text-morandi-secondary space-x-3">
                          {customer.phone && <span>{customer.phone}</span>}
                          {customer.birth_date && (
                            <DateCell
                              date={customer.birth_date}
                              showIcon={false}
                              className="inline text-sm text-morandi-secondary"
                            />
                          )}
                          {customer.national_id && <span>{customer.national_id}</span>}
                        </div>
                        {!customer.phone && !customer.birth_date && !customer.national_id && (
                          <div className="text-sm text-morandi-secondary/60">{CL.no_detail}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-morandi-gold border-morandi-gold/50"
                    >
                      {CL.btn_is_this}
                    </Button>
                  </div>
                </div>
              ))}

              {/* 不是以上任何人，新增為新客戶 */}
              <div
                className="p-4 border border-dashed border-border rounded-lg hover:border-morandi-green/50 hover:bg-morandi-green/5 transition-colors cursor-pointer"
                onClick={onAddNew}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-morandi-green/20 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-morandi-green" />
                    </div>
                    <div>
                      <div className="font-medium text-morandi-primary">{CL.not_any}</div>
                      <div className="text-sm text-morandi-secondary">
                        {CL.create_new(currentPerson?.name ?? '')}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-morandi-green border-morandi-green/50 gap-1"
                  >
                    <Plus size={16} />
                    {CL.btn_add}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* 沒有同名客戶，直接顯示新增選項 */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-morandi-gold/20 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-morandi-gold" />
              </div>
              <div className="text-lg font-medium text-morandi-primary mb-2">
                {currentPerson?.name}
              </div>
              <div className="text-sm text-morandi-secondary mb-4">{CL.new_customer_label}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          {(currentPerson?.matchedCustomers.length ?? 0) === 0 && (
            <Button variant="soft-gold"
              onClick={onAddNew}
 className="gap-2"
            >
              <Plus size={16} />
              {CL.btn_add_to_crm}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AddCustomerFormDialogProps {
  open: boolean
  customerName: string
  formData: {
    name: string
    phone: string
    email: string
    national_id: string
    passport_number: string
    passport_name: string
    passport_expiry: string
    birth_date: string
    gender: string
    notes: string
    passport_image_url: string
  }
  isUploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onUpdateField: (field: string, value: string) => void
  onUploadImage: (file: File) => void
  onSave: () => void
  onBack: () => void
}

export function AddCustomerFormDialog({
  open,
  customerName,
  formData,
  isUploading,
  fileInputRef,
  onUpdateField,
  onUploadImage,
  onSave,
  onBack,
}: AddCustomerFormDialogProps) {
  const passportDisplayUrl = usePassportImageUrl(formData.passport_image_url)
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onBack()}>
      <DialogContent level={1} className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-morandi-gold" />
            {FL.title}
          </DialogTitle>
          <DialogDescription>{FL.desc(customerName)}</DialogDescription>
        </DialogHeader>

        <div className="py-4 grid grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
          {/* 左側：表單欄位 */}
          <div className="space-y-4">
            {/* 基本資料 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{FL.label_name}</Label>
                <Input
                  value={formData.name}
                  onChange={e => onUpdateField('name', e.target.value)}
                  className="bg-morandi-container/30 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{FL.label_phone}</Label>
                <Input
                  value={formData.phone}
                  onChange={e => onUpdateField('phone', e.target.value)}
                  placeholder={FL.placeholder_optional}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{FL.label_email}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => onUpdateField('email', e.target.value)}
                  placeholder={FL.placeholder_optional}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{FL.label_national_id}</Label>
                <Input
                  value={formData.national_id}
                  onChange={e => onUpdateField('national_id', e.target.value)}
                  placeholder={FL.placeholder_optional}
                  className="h-9"
                />
              </div>
            </div>

            {/* 護照資訊 */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-morandi-secondary mb-2">{FL.section_passport}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{FL.label_passport_number}</Label>
                  <Input
                    value={formData.passport_number}
                    onChange={e => onUpdateField('passport_number', e.target.value)}
                    placeholder={FL.placeholder_optional}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{FL.label_passport_name}</Label>
                  <Input
                    value={formData.passport_name}
                    onChange={e => onUpdateField('passport_name', e.target.value.toUpperCase())}
                    placeholder="WANG/XIAOMING"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{FL.label_passport_expiry}</Label>
                  <DatePicker
                    value={formData.passport_expiry}
                    onChange={date => onUpdateField('passport_expiry', date)}
                    className="h-9"
                    placeholder={FL.placeholder_date}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{FL.label_birth_date}</Label>
                  <DatePicker
                    value={formData.birth_date}
                    onChange={date => onUpdateField('birth_date', date)}
                    className="h-9"
                    placeholder={FL.placeholder_date}
                  />
                </div>
              </div>
            </div>

            {/* 其他資料 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{FL.label_gender}</Label>
                <Select
                  value={formData.gender}
                  onValueChange={value => onUpdateField('gender', value)}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder={FL.placeholder_optional} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{FL.gender_male}</SelectItem>
                    <SelectItem value="female">{FL.gender_female}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{FL.label_notes}</Label>
                <Input
                  value={formData.notes}
                  onChange={e => onUpdateField('notes', e.target.value)}
                  placeholder={FL.placeholder_optional}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* 右側：護照圖片上傳 */}
          <div className="space-y-3">
            <Label className="text-xs">{FL.label_passport_scan}</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg transition-colors ${
                formData.passport_image_url
                  ? 'border-morandi-gold/50 bg-morandi-gold/5'
                  : 'border-border hover:border-morandi-gold/50 hover:bg-morandi-container/20'
              }`}
              style={{ minHeight: '280px' }}
              onDragOver={e => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={e => {
                e.preventDefault()
                e.stopPropagation()
                const file = e.dataTransfer.files?.[0]
                if (file && file.type.startsWith('image/')) {
                  onUploadImage(file)
                }
              }}
            >
              {formData.passport_image_url ? (
                <>
                  <img
                    src={passportDisplayUrl ?? ''}
                    alt={FL.alt_passport_scan}
                    className="w-full h-full object-contain rounded-lg"
                    style={{ maxHeight: '280px' }}
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateField('passport_image_url', '')}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                    title={FL.tooltip_remove_image}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                  {isUploading ? (
                    <Loader2 size={32} className="text-morandi-gold animate-spin" />
                  ) : (
                    <>
                      <Upload size={32} className="text-morandi-secondary/50 mb-2" />
                      <span className="text-sm text-morandi-secondary">{FL.upload_hint}</span>
                      <span className="text-xs text-morandi-secondary/60 mt-1">
                        {FL.upload_formats}
                      </span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        onUploadImage(file)
                      }
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-morandi-secondary/60">{FL.upload_note}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <X size={16} />
            {FL.btn_cancel}
          </Button>
          <Button variant="soft-gold"
            onClick={onSave}
 className="gap-2"
          >
            <Save size={16} />
            {FL.btn_save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
