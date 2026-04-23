'use client'
/**
 * LeaderAvailabilityDialog - 領隊檔期管理對話框
 *
 * 用於管理單一領隊的可用檔期
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DIALOG_SIZES,
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plus, Pencil, Trash2, X, Save, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { formatDate, parseLocalDate } from '@/lib/utils/format-date'
import {
  useLeaderAvailability,
  LEADER_AVAILABILITY_STATUS_CONFIG,
  type LeaderAvailability,
  type LeaderAvailabilityStatus,
} from '@/stores/leader-availability-store'
import type { TourLeader } from '@/types/tour-leader.types'
import { TOUR_LEADERS_LABELS } from '../constants/labels'

interface LeaderAvailabilityDialogProps {
  isOpen: boolean
  onClose: () => void
  leader: TourLeader | null
}

interface AvailabilityFormData {
  id?: string
  available_start_date: string
  available_end_date: string
  status: LeaderAvailabilityStatus
  notes: string
}

const emptyFormData: AvailabilityFormData = {
  available_start_date: '',
  available_end_date: '',
  status: 'available',
  notes: '',
}

export const LeaderAvailabilityDialog: React.FC<LeaderAvailabilityDialogProps> = ({
  isOpen,
  onClose,
  leader,
}) => {
  const [isAddMode, setIsAddMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AvailabilityFormData>(emptyFormData)

  const {
    items: allAvailability,
    isLoading,
    create,
    update,
    delete: deleteItem,
  } = useLeaderAvailability()

  // 過濾出該領隊的檔期
  const leaderAvailability = useMemo(() => {
    if (!leader) return []
    return allAvailability
      .filter(a => a.leader_id === leader.id)
      .sort((a, b) => a.available_start_date.localeCompare(b.available_start_date))
  }, [allAvailability, leader])

  const handleOpenAdd = useCallback(() => {
    setIsAddMode(true)
    setEditingId(null)
    setFormData(emptyFormData)
  }, [])

  const handleEdit = useCallback((item: LeaderAvailability) => {
    setIsAddMode(true)
    setEditingId(item.id)
    setFormData({
      id: item.id,
      available_start_date: item.available_start_date,
      available_end_date: item.available_end_date,
      status: item.status as LeaderAvailabilityStatus,
      notes: item.notes || '',
    })
  }, [])

  const handleCancelForm = useCallback(() => {
    setIsAddMode(false)
    setEditingId(null)
    setFormData(emptyFormData)
  }, [])

  const handleDelete = useCallback(
    async (item: LeaderAvailability) => {
      const confirmed = await confirm(TOUR_LEADERS_LABELS.CONFIRM_DELETE_AVAILABILITY, {
        title: TOUR_LEADERS_LABELS.DELETE_AVAILABILITY_TITLE,
        type: 'warning',
      })
      if (!confirmed) return

      try {
        await deleteItem(item.id)
        await alert(TOUR_LEADERS_LABELS.AVAILABILITY_DELETED, 'success')
      } catch (error) {
        logger.error('Delete availability error:', error)
        await alert(TOUR_LEADERS_LABELS.DELETE_AVAILABILITY_FAILED, 'error')
      }
    },
    [deleteItem]
  )

  const handleSubmit = useCallback(async () => {
    if (!leader) return
    if (!formData.available_start_date || !formData.available_end_date) {
      await alert(TOUR_LEADERS_LABELS.FILL_DATES, 'warning')
      return
    }

    // 驗證日期順序
    if (formData.available_start_date > formData.available_end_date) {
      await alert(TOUR_LEADERS_LABELS.END_AFTER_START, 'warning')
      return
    }

    try {
      const data = {
        leader_id: leader.id,
        available_start_date: formData.available_start_date,
        available_end_date: formData.available_end_date,
        status: formData.status,
        notes: formData.notes || null,
      }

      if (editingId) {
        await update(editingId, data)
        await alert(TOUR_LEADERS_LABELS.AVAILABILITY_UPDATED, 'success')
      } else {
        await create(data as Parameters<typeof create>[0])
        await alert(TOUR_LEADERS_LABELS.AVAILABILITY_ADDED, 'success')
      }

      handleCancelForm()
    } catch (error) {
      logger.error('Save availability error:', error)
      await alert(TOUR_LEADERS_LABELS.SAVE_AVAILABILITY_FAILED, 'error')
    }
  }, [leader, formData, editingId, create, update, handleCancelForm])

  const handleFieldChange = useCallback(
    <K extends keyof AvailabilityFormData>(field: K, value: AvailabilityFormData[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  if (!leader) return null

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className={cn(DIALOG_SIZES.lg, 'max-h-[85vh] overflow-hidden flex flex-col')}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-morandi-gold" />
            {leader.name}
            {TOUR_LEADERS_LABELS.AVAILABILITY_SUFFIX}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* 新增/編輯表單 */}
          {isAddMode ? (
            <div className="p-4 bg-morandi-container/30 rounded-lg border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-morandi-primary">
                  {editingId ? '編輯檔期' : '新增檔期'}
                </h4>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={handleCancelForm}
                  className="text-morandi-secondary"
                >
                  <X size={16} />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-morandi-primary">
                    {TOUR_LEADERS_LABELS.START_DATE} <span className="text-morandi-red">*</span>
                  </label>
                  <DatePicker
                    value={formData.available_start_date}
                    onChange={date => handleFieldChange('available_start_date', date)}
                    placeholder={TOUR_LEADERS_LABELS.PLACEHOLDER_START_DATE}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-morandi-primary">
                    {TOUR_LEADERS_LABELS.END_DATE} <span className="text-morandi-red">*</span>
                  </label>
                  <DatePicker
                    value={formData.available_end_date}
                    onChange={date => handleFieldChange('available_end_date', date)}
                    placeholder={TOUR_LEADERS_LABELS.PLACEHOLDER_END_DATE}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-morandi-primary">
                    {TOUR_LEADERS_LABELS.COL_STATUS}
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={value =>
                      handleFieldChange('status', value as LeaderAvailabilityStatus)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEADER_AVAILABILITY_STATUS_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-morandi-primary">
                    {TOUR_LEADERS_LABELS.NOTES}
                  </label>
                  <Input
                    value={formData.notes}
                    onChange={e => handleFieldChange('notes', e.target.value)}
                    placeholder={TOUR_LEADERS_LABELS.PLACEHOLDER_NOTES_OPTIONAL}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelForm} className="gap-2">
                  <X size={16} />
                  {TOUR_LEADERS_LABELS.CANCEL}
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-2"
                >
                  <Save size={16} />
                  {editingId ? TOUR_LEADERS_LABELS.SAVE : TOUR_LEADERS_LABELS.ADD}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleOpenAdd}
              className="w-full gap-2 border-dashed"
            >
              <Plus size={16} />
              {TOUR_LEADERS_LABELS.ADD_AVAILABILITY_BTN}
            </Button>
          )}

          {/* 檔期列表 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-morandi-secondary">
              已設定的檔期 ({leaderAvailability.length})
            </h4>

            {isLoading ? (
              <div className="text-center py-8 text-morandi-secondary">
                {TOUR_LEADERS_LABELS.LOADING}
              </div>
            ) : leaderAvailability.length === 0 ? (
              <div className="text-center py-8 text-morandi-secondary flex flex-col items-center gap-2">
                <AlertCircle size={24} className="text-morandi-muted" />
                <span>{TOUR_LEADERS_LABELS.NO_AVAILABILITY}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderAvailability.map(item => {
                  const statusConfig =
                    LEADER_AVAILABILITY_STATUS_CONFIG[item.status as LeaderAvailabilityStatus]
                  const startDate = parseLocalDate(item.available_start_date)
                  const endDate = parseLocalDate(item.available_end_date)

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-morandi-gold/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={cn('text-xs', statusConfig?.color)}>
                          {statusConfig?.label || item.status}
                        </Badge>
                        <div>
                          <div className="font-medium text-morandi-primary">
                            {startDate ? formatDate(startDate) : item.available_start_date}
                            {' ~ '}
                            {endDate ? formatDate(endDate) : item.available_end_date}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-morandi-secondary">{item.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => handleEdit(item)}
                          className="text-morandi-blue hover:bg-morandi-blue/10"
                          title={TOUR_LEADERS_LABELS.EDIT_TITLE}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => handleDelete(item)}
                          className="text-morandi-red hover:bg-morandi-red/10"
                          title={TOUR_LEADERS_LABELS.DELETE_TITLE}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X size={16} />
            {TOUR_LEADERS_LABELS.CLOSE}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
