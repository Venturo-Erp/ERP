'use client'
/**
 * 封面區塊編輯器
 *
 * 編輯封面相關資訊：標題、副標題、封面圖片等
 */

import { useCallback } from 'react'
import { getBrandTagline } from '@/lib/tenant'
import { Input } from '@/components/ui/input'
import { RichTextInput } from '@/components/ui/rich-text-input'
import { ImageUploader } from '@/components/ui/image-uploader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CoverBlockData } from '../types'
import type { CoverStyleType } from '@/components/editor/tour-form/types'
import type { ImagePositionSettings } from '@/components/ui/image-position-editor'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface CoverBlockEditorProps {
  data: CoverBlockData
  onChange: (data: Partial<CoverBlockData>) => void
}

export function CoverBlockEditor({ data, onChange }: CoverBlockEditorProps) {
  const updateField = useCallback(
    <K extends keyof CoverBlockData>(field: K, value: CoverBlockData[K]) => {
      onChange({ [field]: value })
    },
    [onChange]
  )

  return (
    <div className="space-y-4">
      {/* 基本資訊 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_1694}
          </label>
          <RichTextInput
            value={data.tagline || ''}
            onChange={value => updateField('tagline', value)}
            placeholder={getBrandTagline()}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_147}
          </label>
          <RichTextInput
            value={data.title || ''}
            onChange={value => updateField('title', value)}
            placeholder={COMP_EDITOR_LABELS.漫遊福岡}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.副標題}
          </label>
          <RichTextInput
            value={data.subtitle || ''}
            onChange={value => updateField('subtitle', value)}
            placeholder={COMP_EDITOR_LABELS.半自由行}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_3951}
          </label>
          <RichTextInput
            value={data.description || ''}
            onChange={value => updateField('description', value)}
            placeholder={COMP_EDITOR_LABELS.行程特色描述}
            singleLine={false}
          />
        </div>
      </div>

      {/* 行程資訊 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_4513}
          </label>
          <Input
            type="text"
            value={data.departureDate || ''}
            onChange={e => updateField('departureDate', e.target.value)}
            placeholder="2025/01/01"
            className="h-8 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_1470}
          </label>
          <Input
            type="text"
            value={data.tourCode || ''}
            onChange={e => updateField('tourCode', e.target.value)}
            placeholder="25JFO21CIG"
            className="h-8 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_5040}
          </label>
          <Input
            type="text"
            value={data.country || ''}
            onChange={e => updateField('country', e.target.value)}
            placeholder={COMP_EDITOR_LABELS.日本}
            className="h-8 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_5461}
          </label>
          <Input
            type="text"
            value={data.city || ''}
            onChange={e => updateField('city', e.target.value)}
            placeholder={COMP_EDITOR_LABELS.福岡}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* 價格資訊 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.價格}
          </label>
          <Input
            type="text"
            value={data.price || ''}
            onChange={e => updateField('price', e.target.value)}
            placeholder="39,800"
            className="h-8 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-morandi-primary mb-1">
            {COMP_EDITOR_LABELS.LABEL_9062}
          </label>
          <Select
            value={data.priceNote || COMP_EDITOR_LABELS.人}
            onValueChange={value => updateField('priceNote', value)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={COMP_EDITOR_LABELS.選擇單位} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={COMP_EDITOR_LABELS.人}>/人</SelectItem>
              <SelectItem value={COMP_EDITOR_LABELS.起}>起</SelectItem>
              <SelectItem value={COMP_EDITOR_LABELS.人起}>/人起</SelectItem>
              <SelectItem value="__hidden__">(不顯示)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 封面風格 */}
      <div>
        <label className="block text-xs font-medium text-morandi-primary mb-1">
          {COMP_EDITOR_LABELS.LABEL_1860}
        </label>
        <Select
          value={data.coverStyle || 'original'}
          onValueChange={value => updateField('coverStyle', value as CoverStyleType)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={COMP_EDITOR_LABELS.選擇風格} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="original">{COMP_EDITOR_LABELS.經典全屏}</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="nature">{COMP_EDITOR_LABELS.LABEL_4}</SelectItem>
            <SelectItem value="luxury">{COMP_EDITOR_LABELS.LABEL_4759}</SelectItem>
            <SelectItem value="art">{COMP_EDITOR_LABELS.LABEL_5990}</SelectItem>
            <SelectItem value="dreamscape">{COMP_EDITOR_LABELS.LABEL_7067}</SelectItem>
            <SelectItem value="collage">{COMP_EDITOR_LABELS.LABEL_6627}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 封面圖片 */}
      <div>
        <label className="block text-xs font-medium text-morandi-primary mb-1">
          {COMP_EDITOR_LABELS.封面圖片}
        </label>
        <ImageUploader
          value={data.coverImage}
          onChange={url => updateField('coverImage', url)}
          position={data.coverImagePosition as ImagePositionSettings}
          onPositionChange={pos => updateField('coverImagePosition', pos)}
          bucket="city-backgrounds"
          filePrefix="itinerary"
          previewHeight="80px"
          aspectRatio={16 / 9}
          placeholder={COMP_EDITOR_LABELS.拖曳圖片到此處_或點擊上傳}
        />
      </div>
    </div>
  )
}
