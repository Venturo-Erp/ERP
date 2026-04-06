'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AttractionFormData } from '../../types'
import type { Country, Region, City } from '@/stores/region-store'
import { ATTRACTION_FORM_LABELS, DATABASE_MANAGEMENT_PAGE_LABELS } from '../../constants/labels'
import { CoordinateSearch } from './CoordinateSearch'

interface AttractionFormProps {
  formData: AttractionFormData
  countries: Country[]
  availableRegions: Region[]
  availableCities: City[]
  onFormDataChange: (formData: AttractionFormData) => void
  /** 唯讀模式（無編輯權限時） */
  readOnly?: boolean
  /** 放在左欄底部的額外內容（如圖片上傳） */
  children?: React.ReactNode
}

export function AttractionForm({
  formData,
  countries,
  availableRegions,
  availableCities,
  onFormDataChange,
  readOnly = false,
  children,
}: AttractionFormProps) {
  const setFormData = (updater: (prev: AttractionFormData) => AttractionFormData) => {
    onFormDataChange(updater(formData))
  }

  const country = countries.find(c => c.id === formData.country_id)
  const region = availableRegions.find(r => r.id === formData.region_id)
  const city = availableCities.find(c => c.id === formData.city_id)

  // 唯讀欄位樣式
  const readOnlyClass = 'bg-muted/50 cursor-default pointer-events-none'

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      {/* ====== 左欄 ====== */}
      <div className="space-y-3">
        {/* 名稱 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.ZH_NAME}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.name || '-'}
              </div>
            ) : (
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={ATTRACTION_FORM_LABELS.例如_太宰府天滿宮}
                required
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.EN_NAME}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.english_name || '-'}
              </div>
            ) : (
              <Input
                value={formData.english_name}
                onChange={e => setFormData(prev => ({ ...prev, english_name: e.target.value }))}
                placeholder={ATTRACTION_FORM_LABELS.例如_Dazaifu_Tenmangu}
              />
            )}
          </div>
        </div>

        {/* 描述 */}
        <div>
          <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.DESCRIPTION_LABEL}</label>
          {readOnly ? (
            <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50 min-h-[68px] whitespace-pre-wrap">
              {formData.description || '-'}
            </div>
          ) : (
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={ATTRACTION_FORM_LABELS.景點簡介}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm min-h-[68px]"
            />
          )}
        </div>

        {/* 地點 */}
        <div
          className={`grid gap-3 ${availableRegions.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.COUNTRY}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {country?.name || '-'}
              </div>
            ) : (
              <Select
                value={formData.country_id}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, country_id: value, region_id: '', city_id: '' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={ATTRACTION_FORM_LABELS.請選擇} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {availableRegions.length > 0 && (
            <div>
              <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.REGION}</label>
              {readOnly ? (
                <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                  {region?.name || '-'}
                </div>
              ) : (
                <Select
                  value={formData.region_id}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, region_id: value, city_id: '' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={ATTRACTION_FORM_LABELS.請選擇} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRegions.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.CITY_SELECT}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {city?.name || '不指定'}
              </div>
            ) : (
              <Select
                value={formData.city_id || '_none_'}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, city_id: value === '_none_' ? '' : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={ATTRACTION_FORM_LABELS.不指定} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{ATTRACTION_FORM_LABELS.NOT_SPECIFIED}</SelectItem>
                  {availableCities.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* 類別 + 標籤 + 時間 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.CATEGORY}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.category || '-'}
              </div>
            ) : (
              <Select
                value={formData.category}
                onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={DATABASE_MANAGEMENT_PAGE_LABELS.景點} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DATABASE_MANAGEMENT_PAGE_LABELS.景點}>景點</SelectItem>
                  <SelectItem value={DATABASE_MANAGEMENT_PAGE_LABELS.餐廳}>餐廳</SelectItem>
                  <SelectItem value={DATABASE_MANAGEMENT_PAGE_LABELS.住宿}>住宿</SelectItem>
                  <SelectItem value={DATABASE_MANAGEMENT_PAGE_LABELS.購物}>購物</SelectItem>
                  <SelectItem value={DATABASE_MANAGEMENT_PAGE_LABELS.交通}>交通</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.TAGS}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.tags
                  ? formData.tags.split(',').map((t, i) => (
                      <span
                        key={i}
                        className="inline-block px-1.5 py-0.5 mr-1 bg-morandi-gold/10 text-morandi-gold rounded text-xs"
                      >
                        {t.trim()}
                      </span>
                    ))
                  : '-'}
              </div>
            ) : (
              <Input
                value={formData.tags}
                onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder={ATTRACTION_FORM_LABELS.例如_文化_神社_歷史}
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.DURATION}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.duration_minutes} 分鐘
              </div>
            ) : (
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={e =>
                  setFormData(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))
                }
                min={0}
              />
            )}
          </div>
        </div>

        {/* 圖片上傳（從 children 傳入） */}
        {children}
      </div>

      {/* ====== 右欄 ====== */}
      <div className="space-y-3">
        {/* 聯絡資訊 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.PHONE}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.phone || '-'}
              </div>
            ) : (
              <Input
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+81-92-123-4567"
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.WEBSITE}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.website ? (
                  <a
                    href={formData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-morandi-gold hover:underline truncate block"
                  >
                    {formData.website}
                  </a>
                ) : (
                  '-'
                )}
              </div>
            ) : (
              <Input
                value={formData.website}
                onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://..."
              />
            )}
          </div>
        </div>

        {/* 地址 */}
        <div>
          <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.ADDRESS}</label>
          {readOnly ? (
            <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
              {formData.address || '-'}
            </div>
          ) : (
            <Input
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder={ATTRACTION_FORM_LABELS.完整地址}
            />
          )}
        </div>

        {/* 座標搜尋 */}
        <div>
          <label className="text-sm font-medium mb-2 block">座標</label>
          <CoordinateSearch
            attractionName={formData.name}
            city={city?.name}
            country={country?.name}
            currentLat={formData.latitude}
            currentLng={formData.longitude}
            onCoordsUpdate={(lat, lng, address) => {
              setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                ...(address && !prev.address ? { address } : {}), // 如果沒有地址，自動填入
              }))
            }}
            readOnly={readOnly}
          />
        </div>

        {/* 備註 */}
        <div>
          <label className="text-sm font-medium">{ATTRACTION_FORM_LABELS.INTERNAL_NOTES}</label>
          {readOnly ? (
            <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50 min-h-[68px] whitespace-pre-wrap">
              {formData.notes || '-'}
            </div>
          ) : (
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={ATTRACTION_FORM_LABELS.內部使用備註}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm min-h-[68px]"
            />
          )}
        </div>

        {/* 啟用狀態 */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.is_active}
            onCheckedChange={checked =>
              setFormData(prev => ({ ...prev, is_active: checked as boolean }))
            }
            disabled={readOnly}
          />
          <label className="text-sm">{ATTRACTION_FORM_LABELS.ENABLE_ATTRACTION}</label>
        </div>
      </div>
    </div>
  )
}
