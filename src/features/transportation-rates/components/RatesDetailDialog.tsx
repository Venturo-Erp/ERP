'use client'
/**
 * RatesDetailDialog - 國家車資詳細表格懸浮視窗
 */

import { logger } from '@/lib/utils/logger'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EditableRatesTable } from '@/features/transportation-rates/components/editable-rates-table/index'
import { TransportationRate } from '@/types/transportation-rates.types'
import {
  type TransportationRate as TransportationRateEntity,
  updateTransportationRate,
  deleteTransportationRate,
  createTransportationRate,
} from '@/data/entities/transportation-rates'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { confirm } from '@/lib/ui/alert-dialog'
import { Bus, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TRANSPORTATION_RATES_LABELS } from '../constants/labels'

interface RatesDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  countryName: string
  rates: TransportationRate[]
  onUpdate: () => void
  onInsert?: (rate: TransportationRate) => void
  isEditMode: boolean
}

export const RatesDetailDialog: React.FC<RatesDetailDialogProps> = ({
  isOpen,
  onClose,
  countryName,
  rates,
  onUpdate,
  onInsert,
  isEditMode,
}) => {
  const { user } = useAuthStore()
  const [hideKKDAYColumns, setHideKKDAYColumns] = useState(true)

  // 更新單筆資料
  const handleUpdate = async (id: string, updates: Partial<TransportationRate>) => {
    try {
      await updateTransportationRate(id, updates as Partial<TransportationRateEntity>)
      toast.success(TRANSPORTATION_RATES_LABELS.更新成功)
      onUpdate()
    } catch (error) {
      logger.error('Error updating rate:', error)
      toast.error(TRANSPORTATION_RATES_LABELS.更新失敗)
    }
  }

  // 刪除資料
  const handleDelete = async (id: string) => {
    const confirmed = await confirm(TRANSPORTATION_RATES_LABELS.確定要刪除這筆車資資料嗎, {
      title: TRANSPORTATION_RATES_LABELS.刪除車資,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteTransportationRate(id)
      toast.success(TRANSPORTATION_RATES_LABELS.刪除成功)
      onUpdate()
    } catch (error) {
      logger.error('Error deleting rate:', error)
      toast.error(TRANSPORTATION_RATES_LABELS.刪除失敗)
    }
  }

  // 新增資料
  const handleCreate = async (data: Partial<TransportationRate>) => {
    interface CreateRateData extends Partial<TransportationRate> {
      category?: string
      price_twd?: number
    }
    const dataWithCategory = data as CreateRateData

    try {
      await createTransportationRate({
        country_id: data.country_id || null,
        country_name: countryName,
        vehicle_type: data.vehicle_type || dataWithCategory?.category || '',
        price: dataWithCategory?.price_twd || 0,
        currency: 'TWD',
        unit: 'trip',
        is_active: true,
        display_order: 0,
      })
      toast.success(TRANSPORTATION_RATES_LABELS.新增成功)
      onUpdate()
    } catch (error) {
      logger.error('Error creating rate:', error)
      toast.error(TRANSPORTATION_RATES_LABELS.新增失敗)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent level={1} className="max-w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bus size={20} className="text-morandi-gold" />
              {countryName} - {TRANSPORTATION_RATES_LABELS.RATES_MANAGEMENT_SUFFIX}
            </DialogTitle>
            <Button
              variant="soft-gold"
              size="sm"
              onClick={() => setHideKKDAYColumns(!hideKKDAYColumns)}
              className="gap-2"
            >
              {hideKKDAYColumns ? <Eye size={16} /> : <EyeOff size={16} />}
              {hideKKDAYColumns
                ? TRANSPORTATION_RATES_LABELS.顯示_KKDAY_欄位
                : TRANSPORTATION_RATES_LABELS.隱藏_KKDAY_欄位}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <EditableRatesTable
            rates={rates}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onCreate={handleCreate}
            onInsert={onInsert}
            isLoading={false}
            isEditMode={isEditMode}
            hideKKDAYColumns={hideKKDAYColumns}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
