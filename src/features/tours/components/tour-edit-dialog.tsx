'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Tour } from '@/stores/types'
import { useTourEdit } from '../hooks/useTourEdit'
import { CountryAirportSelector } from '@/components/selectors/CountryAirportSelector'
import { Input } from '@/components/ui/input'
import { SimpleDateInput } from '@/components/ui/simple-date-input'
import { ItinerarySyncDialog } from './ItinerarySyncDialog'
import { COMP_TOURS_LABELS } from '../constants/labels'

interface TourEditDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
  onSuccess?: (updatedTour: Tour) => void
}

export function TourEditDialog({ isOpen, onClose, tour, onSuccess }: TourEditDialogProps) {
  const {
    formData,
    setFormData,
    submitting,
    handleSubmit,
    // Sync dialog state
    syncDialogOpen,
    syncInfo,
    handleSync,
    closeSyncDialog,
  } = useTourEdit({ tour, isOpen, onClose, onSuccess })

  // 🔧 核心表架構：國家變更 → 接收完整 {id, name, code}
  const handleCountryChange = (data: { id: string; name: string; code: string }) => {
    setFormData(prev => ({
      ...prev,
      countryId: data.id,
      countryName: data.name,
      airportCode: '',
      airportCityName: '',
    }))
  }

  // 機場變更
  const handleAirportChange = (airportCode: string, cityName: string) => {
    setFormData(prev => ({
      ...prev,
      airportCode,
      airportCityName: cityName,
    }))
  }

  // 處理出發日期變更
  const handleDepartureDateChange = (departure_date: string) => {
    setFormData(prev => ({
      ...prev,
      departure_date,
      return_date:
        prev.return_date && prev.return_date < departure_date ? departure_date : prev.return_date,
    }))
  }

  return (
    <>
      <Dialog
        open={isOpen && !syncDialogOpen}
        onOpenChange={open => {
          // 只有在 syncDialogOpen 為 false 時，才允許關閉
          // 避免切換到 sync dialog 時誤觸 onClose
          if (!open && !syncDialogOpen) {
            onClose()
          }
        }}
      >
        <DialogContent
          level={2}
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
          onInteractOutside={e => {
            const target = e.target as HTMLElement
            if (target.closest('[role="listbox"]') || target.closest('select')) {
              e.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{COMP_TOURS_LABELS.EDIT_7182}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 旅遊團名稱 */}
            <div>
              <label className="text-sm font-medium text-morandi-primary">旅遊團名稱</label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            {/* 🔧 核心表架構：統一用 CountryAirportSelector */}
            <CountryAirportSelector
              countryName={formData.countryName}
              airportCode={formData.airportCode}
              onCountryChange={handleCountryChange}
              onAirportChange={handleAirportChange}
              disablePortal
              showLabels
            />

            {/* 日期 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-morandi-primary">出發日期</label>
                <SimpleDateInput
                  value={formData.departure_date}
                  onChange={handleDepartureDateChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-morandi-primary">返回日期</label>
                <SimpleDateInput
                  value={formData.return_date}
                  onChange={return_date => setFormData(prev => ({ ...prev, return_date }))}
                  min={formData.departure_date}
                  className="mt-1"
                />
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="text-sm font-medium text-morandi-primary">描述</label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>

            {/* 選項 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-enableCheckin"
                  checked={formData.enable_checkin}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, enable_checkin: e.target.checked }))
                  }
                  className="rounded"
                />
                <label htmlFor="edit-enableCheckin" className="text-sm text-morandi-primary">
                  開啟報到功能
                </label>
              </div>
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={submitting} className="gap-1">
              <X size={16} />
              {COMP_TOURS_LABELS.取消}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !formData.name.trim() ||
                !formData.departure_date ||
                !formData.return_date
              }
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              {submitting ? COMP_TOURS_LABELS.儲存中 : COMP_TOURS_LABELS.儲存變更}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 行程表同步對話框 */}
      <ItinerarySyncDialog
        open={syncDialogOpen}
        syncInfo={syncInfo}
        onSync={handleSync}
        onClose={closeSyncDialog}
      />
    </>
  )
}
