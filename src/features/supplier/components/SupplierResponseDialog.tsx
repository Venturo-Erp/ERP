// @ts-nocheck
'use client'
/**
 * SupplierResponseDialog - 供應商回覆需求 Dialog
 *
 * 供應商可以：
 * 1. 查看需求詳情
 * 2. 新增回覆資源（車輛/領隊）
 * 3. 填寫報價和備註
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DIALOG_SIZES,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X, Save, Loader2, Plus, Trash2, Bus, Users, Calendar, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import type { SupplierRequest } from '../hooks/useSupplierRequests'
import { SUPPLIER_LABELS } from './constants/labels'

interface ResponseItem {
  id: string
  resourceType: 'vehicle' | 'leader'
  resourceName: string
  licensePlate: string
  driverName: string
  driverPhone: string
  availableStartDate: string
  availableEndDate: string
  unitPrice: number
  notes: string
}

interface SupplierResponseDialogProps {
  isOpen: boolean
  onClose: () => void
  request: SupplierRequest | null
  onSuccess?: () => void
}

export function SupplierResponseDialog({
  isOpen,
  onClose,
  request,
  onSuccess,
}: SupplierResponseDialogProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [responseNotes, setResponseNotes] = useState('')
  const [items, setItems] = useState<ResponseItem[]>([])

  // 判斷資源類型
  const isVehicle = request?.category === 'transport'
  const resourceTypeLabel = isVehicle
    ? SUPPLIER_LABELS.RESOURCE_VEHICLE
    : SUPPLIER_LABELS.RESOURCE_LEADER
  const ResourceIcon = isVehicle ? Bus : Users

  // 初始化回覆項目
  useEffect(() => {
    if (isOpen && request) {
      // 根據需求數量建立初始項目
      const quantity = request.quantity || 1
      const newItems: ResponseItem[] = []
      for (let i = 0; i < quantity; i++) {
        newItems.push({
          id: `item-${i}`,
          resourceType: isVehicle ? 'vehicle' : 'leader',
          resourceName: '',
          licensePlate: '',
          driverName: '',
          driverPhone: '',
          availableStartDate: request.service_date || '',
          availableEndDate: request.service_date_end || request.service_date || '',
          unitPrice: 0,
          notes: '',
        })
      }
      setItems(newItems)
      setResponseNotes('')
    }
  }, [isOpen, request, isVehicle])

  // 更新項目
  const updateItem = useCallback(
    (id: string, field: keyof ResponseItem, value: string | number) => {
      setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)))
    },
    []
  )

  // 新增項目
  const addItem = useCallback(() => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        resourceType: isVehicle ? 'vehicle' : 'leader',
        resourceName: '',
        licensePlate: '',
        driverName: '',
        driverPhone: '',
        availableStartDate: request?.service_date || '',
        availableEndDate: request?.service_date_end || request?.service_date || '',
        unitPrice: 0,
        notes: '',
      },
    ])
  }, [isVehicle, request])

  // 刪除項目
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  // 送出回覆
  const handleSubmit = useCallback(async () => {
    if (!request || !user?.workspace_id) return

    // 驗證至少有一個項目有填資料
    const validItems = items.filter(item => item.resourceName.trim())
    if (validItems.length === 0) {
      toast({ title: SUPPLIER_LABELS.FILL_AT_LEAST_ONE(resourceTypeLabel), variant: 'destructive' })
      return
    }

    setSaving(true)

    try {
      // 1. 建立回覆主表
      const { data: responseData, error: responseError } = await supabase
        .from('request_responses')
        .insert({
          request_id: request.id,
          responder_workspace_id: user.workspace_id,
          status: 'submitted',
          total_amount: validItems.reduce((sum, item) => sum + (item.unitPrice || 0), 0),
          notes: responseNotes || null,
        })
        .select()
        .single()

      if (responseError) throw responseError

      // 2. 建立回覆明細
      const itemsToInsert = validItems.map(item => ({
        response_id: responseData.id,
        resource_type: item.resourceType,
        resource_name: item.resourceName,
        license_plate: item.licensePlate || null,
        driver_name: item.driverName || null,
        driver_phone: item.driverPhone || null,
        available_start_date: item.availableStartDate || null,
        available_end_date: item.availableEndDate || null,
        unit_price: item.unitPrice || null,
        notes: item.notes || null,
      }))

      const { error: itemsError } = await supabase
        .from('request_response_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // 3. 更新需求單狀態
      const { error: updateError } = await supabase
        .from('tour_requests')
        .update({ response_status: 'responded' })
        .eq('id', request.id)

      if (updateError) throw updateError

      toast({ title: SUPPLIER_LABELS.RESPONSE_SUBMITTED })
      onSuccess?.()
    } catch (error) {
      logger.error('送出回覆失敗:', error)
      toast({ title: SUPPLIER_LABELS.SUBMIT_FAILED, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [request, user, items, responseNotes, resourceTypeLabel, toast, onSuccess])

  if (!request) return null

  const isReadOnly = request.response_status !== 'pending'

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className={cn(DIALOG_SIZES['2xl'], 'max-h-[85vh] overflow-hidden flex flex-col')}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ResourceIcon className="h-5 w-5 text-morandi-gold" />
            {isReadOnly ? SUPPLIER_LABELS.VIEW_RESPONSE : SUPPLIER_LABELS.RESPOND_REQUEST} -{' '}
            {request.tour_name || request.tour_code}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* 需求資訊 */}
          <div className="bg-morandi-container/30 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-morandi-primary">{SUPPLIER_LABELS.LABEL_8868}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-morandi-secondary" />
                <span className="text-morandi-secondary">{SUPPLIER_LABELS.LABEL_9868}</span>
                <span className="font-medium">
                  {request.service_date}
                  {request.service_date_end &&
                    request.service_date_end !== request.service_date &&
                    ` ~ ${request.service_date_end}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-morandi-secondary" />
                <span className="text-morandi-secondary">{SUPPLIER_LABELS.LABEL_4600}</span>
                <span className="font-medium">{request.quantity || 1}</span>
              </div>
              {request.description && (
                <div className="col-span-2">
                  <span className="text-morandi-secondary">{SUPPLIER_LABELS.LABEL_5457}</span>
                  <span className="font-medium ml-1">{request.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* 回覆資源列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-morandi-primary">
                {SUPPLIER_LABELS.RESOURCE_INFO(resourceTypeLabel, items.length)}
              </h3>
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="h-4 w-4" />
                  {SUPPLIER_LABELS.ADD_RESOURCE(resourceTypeLabel)}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {resourceTypeLabel} #{index + 1}
                    </Badge>
                    {!isReadOnly && items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => removeItem(item.id)}
                        className="text-morandi-red hover:bg-morandi-red/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 資源名稱 */}
                    <div className="space-y-2">
                      <Label required>
                        {isVehicle
                          ? SUPPLIER_LABELS.VEHICLE_NAME_LABEL
                          : SUPPLIER_LABELS.LEADER_NAME_LABEL}
                      </Label>
                      <Input
                        value={item.resourceName}
                        onChange={e => updateItem(item.id, 'resourceName', e.target.value)}
                        placeholder={
                          isVehicle
                            ? SUPPLIER_LABELS.VEHICLE_NAME_PLACEHOLDER
                            : SUPPLIER_LABELS.LEADER_NAME_PLACEHOLDER
                        }
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* 車牌（僅車輛） */}
                    {isVehicle && (
                      <div className="space-y-2">
                        <Label>{SUPPLIER_LABELS.LABEL_6418}</Label>
                        <Input
                          value={item.licensePlate}
                          onChange={e => updateItem(item.id, 'licensePlate', e.target.value)}
                          placeholder={SUPPLIER_LABELS.EXAMPLE_2914}
                          disabled={isReadOnly}
                        />
                      </div>
                    )}

                    {/* 司機姓名（僅車輛） */}
                    {isVehicle && (
                      <div className="space-y-2">
                        <Label>{SUPPLIER_LABELS.LABEL_6947}</Label>
                        <Input
                          value={item.driverName}
                          onChange={e => updateItem(item.id, 'driverName', e.target.value)}
                          placeholder={SUPPLIER_LABELS.LABEL_5402}
                          disabled={isReadOnly}
                        />
                      </div>
                    )}

                    {/* 聯絡電話 */}
                    <div className="space-y-2">
                      <Label>
                        {isVehicle ? SUPPLIER_LABELS.DRIVER_PHONE : SUPPLIER_LABELS.LEADER_PHONE}
                      </Label>
                      <Input
                        value={item.driverPhone}
                        onChange={e => updateItem(item.id, 'driverPhone', e.target.value)}
                        placeholder={SUPPLIER_LABELS.LABEL_8624}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* 可用日期 */}
                    <div className="space-y-2">
                      <Label>{SUPPLIER_LABELS.LABEL_915}</Label>
                      <Input
                        type="date"
                        value={item.availableStartDate}
                        onChange={e => updateItem(item.id, 'availableStartDate', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{SUPPLIER_LABELS.LABEL_7036}</Label>
                      <Input
                        type="date"
                        value={item.availableEndDate}
                        onChange={e => updateItem(item.id, 'availableEndDate', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* 報價 */}
                    <div className="space-y-2">
                      <Label>{SUPPLIER_LABELS.LABEL_3404}</Label>
                      <Input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={e =>
                          updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)
                        }
                        placeholder={SUPPLIER_LABELS.LABEL_2285}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* 備註 */}
                    <div className="space-y-2">
                      <Label>{SUPPLIER_LABELS.REMARKS}</Label>
                      <Input
                        value={item.notes}
                        onChange={e => updateItem(item.id, 'notes', e.target.value)}
                        placeholder={SUPPLIER_LABELS.LABEL_8253}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 整體備註 */}
          <div className="space-y-2">
            <Label>{SUPPLIER_LABELS.LABEL_7829}</Label>
            <Textarea
              value={responseNotes}
              onChange={e => setResponseNotes(e.target.value)}
              placeholder={SUPPLIER_LABELS.LABEL_694}
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X size={16} />
            {isReadOnly ? SUPPLIER_LABELS.BTN_CLOSE : SUPPLIER_LABELS.BTN_CANCEL}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {SUPPLIER_LABELS.LABEL_9}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
