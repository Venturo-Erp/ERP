'use client'
/**
 * MemberInfoForm - 成員基本資訊表單
 * 從 MemberEditDialog.tsx 拆分
 */

import React from 'react'
import type { EditFormData } from '../MemberEditDialog'
import { useTranslations } from 'next-intl'

interface MemberInfoFormProps {
  formData: EditFormData
  onChange: (data: EditFormData) => void
}

export function MemberInfoForm({ formData, onChange }: MemberInfoFormProps) {
  const t = useTranslations('orders')

  const inputClass =
    'w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-morandi-gold'
  const labelClass = 'block text-xs font-medium text-morandi-primary mb-1'

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-morandi-primary">{t('memberEdit.label3362')}</h3>

      {/* 中文姓名 + 性別 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEdit.label9768')}</label>
          <input
            type="text"
            value={formData.chinese_name || ''}
            onChange={e => onChange({ ...formData, chinese_name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('memberEdit.label2195')}</label>
          <select
            value={formData.gender || ''}
            onChange={e => onChange({ ...formData, gender: e.target.value })}
            className={inputClass}
          >
            <option value="">-</option>
            <option value="M">{t('memberEdit.label4765')}</option>
            <option value="F">{t('memberEdit.label7599')}</option>
          </select>
        </div>
      </div>

      {/* 護照拼音 + 吊牌拼音 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEdit.label1636')}</label>
          <input
            type="text"
            value={formData.passport_name || ''}
            onChange={e => onChange({ ...formData, passport_name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {t('memberEdit.label1089')}
            <span className="text-morandi-muted font-normal ml-1 text-[10px]">(列印)</span>
          </label>
          <input
            type="text"
            value={formData.passport_name_print || ''}
            onChange={e => onChange({ ...formData, passport_name_print: e.target.value })}
            placeholder="HSU ZHENG-YI"
            className={inputClass}
          />
        </div>
      </div>

      {/* 出生年月日 + 身分證號 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEdit.label3396')}</label>
          <input
            type="text"
            value={formData.birth_date || ''}
            onChange={e => onChange({ ...formData, birth_date: e.target.value })}
            placeholder="YYYY-MM-DD"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('memberEdit.label3405')}</label>
          <input
            type="text"
            value={formData.id_number || ''}
            onChange={e => onChange({ ...formData, id_number: e.target.value.toUpperCase() })}
            className={inputClass}
          />
        </div>
      </div>

      {/* 護照號碼 + 護照效期 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEdit.label5147')}</label>
          <input
            type="text"
            value={formData.passport_number || ''}
            onChange={e => onChange({ ...formData, passport_number: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('memberEdit.label4167')}</label>
          <input
            type="text"
            value={formData.passport_expiry || ''}
            onChange={e => onChange({ ...formData, passport_expiry: e.target.value })}
            placeholder="YYYY-MM-DD"
            className={inputClass}
          />
        </div>
      </div>

      {/* 特殊餐食 + 備註 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEdit.label6650')}</label>
          <input
            type="text"
            value={formData.special_meal || ''}
            onChange={e => onChange({ ...formData, special_meal: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('memberEdit.remarks')}</label>
          <input
            type="text"
            value={formData.remarks || ''}
            onChange={e => onChange({ ...formData, remarks: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
