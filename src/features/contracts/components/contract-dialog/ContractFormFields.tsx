'use client'

import { CONTRACT_FORM_LABELS } from '../constants/labels'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ContractData } from './types'
import { Users, ChevronDown, Check } from 'lucide-react'
import { COMP_CONTRACTS_LABELS } from '../constants/labels'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'

interface MemberOption {
  id: string
  name: string
  idNumber?: string
  phone?: string
}

interface ContractFormFieldsProps {
  contractData: Partial<ContractData>
  onFieldChange: (field: keyof ContractData, value: string) => void
  members?: MemberOption[]
  onSelectMembers?: (memberIds: string[]) => void
  selectedMemberIds?: string[]
}

export function ContractFormFields({
  contractData,
  onFieldChange,
  members = [],
  onSelectMembers,
  selectedMemberIds = [],
}: ContractFormFieldsProps) {
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const ws = useWorkspaceSettings()

  // 切換成員選擇
  const toggleMember = (memberId: string) => {
    const newIds = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter(id => id !== memberId)
      : [...selectedMemberIds, memberId]

    if (onSelectMembers) {
      onSelectMembers(newIds)
    }

    // 自動填入第一個選擇的成員資料
    if (newIds.length > 0) {
      const firstMember = members.find(m => m.id === newIds[0])
      if (firstMember) {
        onFieldChange('travelerName', firstMember.name)
        if (firstMember.idNumber) onFieldChange('travelerIdNumber', firstMember.idNumber)
        if (firstMember.phone) onFieldChange('travelerPhone', firstMember.phone)
      }
    }
  }

  // 全選/取消全選
  const toggleAll = () => {
    if (selectedMemberIds.length === members.length) {
      // 取消全選
      if (onSelectMembers) onSelectMembers([])
    } else {
      // 全選
      const allIds = members.map(m => m.id)
      if (onSelectMembers) onSelectMembers(allIds)

      // 填入第一個成員資料
      if (members.length > 0) {
        onFieldChange('travelerName', members[0].name)
        if (members[0].idNumber) onFieldChange('travelerIdNumber', members[0].idNumber)
        if (members[0].phone) onFieldChange('travelerPhone', members[0].phone)
      }
    }
  }

  // 選擇公司代表（清空成員選擇）
  const selectCorporate = () => {
    if (onSelectMembers) onSelectMembers([])
    setShowMemberDropdown(false)
  }

  // 取得顯示文字
  const getButtonLabel = () => {
    if (selectedMemberIds.length === 0) return COMP_CONTRACTS_LABELS.選擇成員
    if (selectedMemberIds.length === 1) {
      const member = members.find(m => m.id === selectedMemberIds[0])
      return member?.name || COMP_CONTRACTS_LABELS._1_人
    }
    return `${selectedMemberIds.length} ${COMP_CONTRACTS_LABELS.人}`
  }

  return (
    <>
      {/* 旅客資訊 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-morandi-primary">
            {COMP_CONTRACTS_LABELS.旅客資訊_甲方}
          </h3>
          {members.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-morandi-gold border border-morandi-gold/50 rounded-lg hover:bg-morandi-gold/5 transition-colors"
              >
                <Users size={14} />
                {getButtonLabel()}
                <ChevronDown size={14} />
              </button>

              {showMemberDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 max-h-72 overflow-hidden flex flex-col">
                  {/* 標題列 */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-morandi-container/30">
                    <span className="text-xs text-morandi-secondary">
                      {CONTRACT_FORM_LABELS.SELECT_SIGNER}
                    </span>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs text-morandi-gold hover:underline"
                    >
                      {selectedMemberIds.length === members.length
                        ? COMP_CONTRACTS_LABELS.取消全選
                        : COMP_CONTRACTS_LABELS.全選}
                    </button>
                  </div>

                  {/* 成員列表 */}
                  <div className="flex-1 overflow-y-auto">
                    {/* 公司代表選項 */}
                    <button
                      type="button"
                      onClick={selectCorporate}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-morandi-gold/5 transition-colors border-b border-border/50 ${
                        selectedMemberIds.length === 0 ? 'bg-morandi-gold/10' : ''
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedMemberIds.length === 0
                            ? 'bg-morandi-gold border-morandi-gold'
                            : 'border-border'
                        }`}
                      >
                        {selectedMemberIds.length === 0 && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="text-morandi-primary">
                        {CONTRACT_FORM_LABELS.COMPANY_SIGN}
                      </span>
                    </button>

                    {/* 成員列表 */}
                    {members.map(member => {
                      const isSelected = selectedMemberIds.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleMember(member.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-morandi-gold/5 transition-colors ${
                            isSelected ? 'bg-morandi-gold/10' : ''
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-morandi-gold border-morandi-gold' : 'border-border'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-morandi-primary">{member.name}</div>
                            {member.idNumber && (
                              <div className="text-xs text-morandi-secondary truncate">
                                {member.idNumber}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* 確認按鈕 */}
                  <div className="p-2 border-t border-border">
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => setShowMemberDropdown(false)}
                      className="w-full"
                    >
                      {CONTRACT_FORM_LABELS.CONFIRM}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-morandi-primary block mb-1">
              {CONTRACT_FORM_LABELS.NAME}
            </label>
            <Input
              type="text"
              value={contractData.travelerName || ''}
              onChange={e => onFieldChange('travelerName', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-morandi-primary block mb-1">
              {CONTRACT_FORM_LABELS.ID_NUMBER}
            </label>
            <Input
              type="text"
              value={contractData.travelerIdNumber || ''}
              onChange={e => onFieldChange('travelerIdNumber', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-morandi-primary block mb-1">
              {CONTRACT_FORM_LABELS.ADDRESS}
            </label>
            <Input
              type="text"
              value={contractData.travelerAddress || ''}
              onChange={e => onFieldChange('travelerAddress', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-morandi-primary block mb-1">
              {CONTRACT_FORM_LABELS.PHONE}
            </label>
            <Input
              type="text"
              value={contractData.travelerPhone || ''}
              onChange={e => onFieldChange('travelerPhone', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 集合時地 */}
      <div>
        <h3 className="text-sm font-semibold text-morandi-primary mb-3">
          {CONTRACT_FORM_LABELS.MEETING_PLACE}
        </h3>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-morandi-primary block mb-1">
              {CONTRACT_FORM_LABELS.MEETING_TIME}
            </label>
            <Input
              type="datetime-local"
              value={(() => {
                // 將分開的年月日時分組合成 datetime-local 格式
                const { gatherYear, gatherMonth, gatherDay, gatherHour, gatherMinute } =
                  contractData
                if (gatherYear && gatherMonth && gatherDay && gatherHour && gatherMinute) {
                  const year = gatherYear.padStart(4, '0')
                  const month = gatherMonth.padStart(2, '0')
                  const day = gatherDay.padStart(2, '0')
                  const hour = gatherHour.padStart(2, '0')
                  const minute = gatherMinute.padStart(2, '0')
                  return `${year}-${month}-${day}T${hour}:${minute}`
                }
                return ''
              })()}
              onChange={e => {
                // 將 datetime-local 格式分解成5個欄位
                const value = e.target.value // 格式: "2024-01-15T08:30"
                if (value) {
                  const [datePart, timePart] = value.split('T')
                  const [year, month, day] = datePart.split('-')
                  const [hour, minute] = timePart.split(':')

                  onFieldChange('gatherYear', year)
                  onFieldChange('gatherMonth', month)
                  onFieldChange('gatherDay', day)
                  onFieldChange('gatherHour', hour)
                  onFieldChange('gatherMinute', minute)
                } else {
                  // 清空所有欄位
                  onFieldChange('gatherYear', '')
                  onFieldChange('gatherMonth', '')
                  onFieldChange('gatherDay', '')
                  onFieldChange('gatherHour', '')
                  onFieldChange('gatherMinute', '')
                }
              }}
            />
          </div>
          <div>
            <label className="text-xs text-morandi-primary block mb-1">
              {CONTRACT_FORM_LABELS.LABEL_863}
            </label>
            <Input
              type="text"
              value={contractData.gatherLocation || ''}
              onChange={e => onFieldChange('gatherLocation', e.target.value)}
              placeholder={COMP_CONTRACTS_LABELS.集合地點_例如_桃園國際機場第一航廈}
            />
          </div>
        </div>
      </div>

      {/* 費用 */}
      <div>
        <h3 className="text-sm font-semibold text-morandi-primary mb-3">
          {CONTRACT_FORM_LABELS.LABEL_3906}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-morandi-primary block mb-1">
              {CONTRACT_FORM_LABELS.TOTAL_6648}
            </label>
            <Input
              type="text"
              value={contractData.totalAmount || ''}
              onChange={e => onFieldChange('totalAmount', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-morandi-primary block mb-1">
              {CONTRACT_FORM_LABELS.LABEL_3770}
            </label>
            <Input
              type="text"
              value={contractData.depositAmount || ''}
              onChange={e => onFieldChange('depositAmount', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 乙方資訊 */}
      <div>
        <h3 className="text-sm font-semibold text-morandi-primary mb-3">
          {CONTRACT_FORM_LABELS.LABEL_2868}
        </h3>
        <div>
          <label className="text-xs text-morandi-primary block mb-1">
            {CONTRACT_FORM_LABELS.PHONE_EXTENSION}
            {ws.phone ? `（${ws.phone}${CONTRACT_FORM_LABELS.PHONE_EXTENSION_SUFFIX}` : ''}
          </label>
          <Input
            type="text"
            value={contractData.companyExtension || ''}
            onChange={e => onFieldChange('companyExtension', e.target.value)}
            placeholder={COMP_CONTRACTS_LABELS.分機號碼}
          />
        </div>
      </div>
    </>
  )
}
