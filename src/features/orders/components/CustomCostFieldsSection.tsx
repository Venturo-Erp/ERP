'use client'
/**
 * CustomCostFieldsSection - 自訂費用欄位區域
 * 團體模式使用，管理自訂費用項目
 */

import React, { useState } from 'react'
import { Coins, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { CustomCostField } from '../types/order-member.types'
import { useTranslations } from 'next-intl'

interface CustomCostFieldsSectionProps {
  fields: CustomCostField[]
  onAddField: (name: string) => void
  onRemoveField: (fieldId: string) => void
}

export function CustomCostFieldsSection({
  fields,
  onAddField,
  onRemoveField,
}: CustomCostFieldsSectionProps) {
  const t = useTranslations('orders')

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')

  const handleAdd = () => {
    if (newFieldName.trim()) {
      onAddField(newFieldName.trim())
      setNewFieldName('')
      setShowAddDialog(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Coins size={16} className="text-morandi-gold" />
        <span className="text-sm font-medium text-morandi-primary">
          {t('common.自訂費用欄位')} ({fields.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="ml-auto"
        >
          <Plus size={14} className="mr-1" />
          {t('common.add3322')}
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map(field => (
            <div
              key={field.id}
              className="flex items-center gap-2 px-3 py-2 bg-morandi-green/10 rounded border border-morandi-green/30"
            >
              <span className="flex-1 text-sm text-morandi-primary">{field.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveField(field.id)}
                className="text-status-danger hover:text-status-danger"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 新增欄位對話框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent level={2} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.add7841')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              placeholder={t('common.輸入欄位名稱_例如_簽證費_小費')}
              value={newFieldName}
              onChange={e => setNewFieldName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
              }}
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t('common.取消')}
              </Button>
              <Button onClick={handleAdd} disabled={!newFieldName.trim()}>
                {t('common.新增')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
