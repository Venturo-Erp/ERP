'use client'

import { getTodayString } from '@/lib/utils/format-date'

import React, { useState } from 'react'

import { Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SimpleDateInput } from '@/components/ui/simple-date-input'
import { Combobox } from '@/components/ui/combobox'
import { DestinationSelector } from '@/components/shared/destination-selector'
import {
  createTour,
  createOrder,
  useCountries,
  useCities,
  updateCountry,
  updateCity,
  useEmployeesSlim,
} from '@/data'
import { useWorkspaceId } from '@/lib/workspace-context'
import { alert } from '@/lib/ui/alert-dialog'
import { QUICK_ACTIONS_LABELS } from './constants/labels'

interface QuickGroupProps {
  onSubmit?: () => void
}

export function QuickGroup({ onSubmit }: QuickGroupProps) {
  const { items: countries } = useCountries()
  const { items: cities } = useCities()
  const { items: employees } = useEmployeesSlim()

  // Helper functions to increment usage count (replaces store methods)
  const incrementCountryUsage = async (countryName: string) => {
    const country = countries.find(c => c.name === countryName)
    if (!country) return
    const newCount = (country.usage_count || 0) + 1
    await updateCountry(country.id, { usage_count: newCount })
  }

  const incrementCityUsage = async (cityName: string) => {
    const city = cities.find(c => c.name === cityName)
    if (!city) return
    const newCount = (city.usage_count || 0) + 1
    await updateCity(city.id, { usage_count: newCount })
  }
  const workspaceId = useWorkspaceId()
  const [submitting, setSubmitting] = useState(false)

  const [newTour, setNewTour] = useState({
    name: '',
    countryCode: '',
    cityCode: '',
    customLocation: '',
    departure_date: '',
    return_date: '',
    price: 0,
    max_participants: undefined as number | undefined,
    description: '',
    isSpecial: false,
  })

  const [newOrder, setNewOrder] = useState({
    contact_person: '',
    contact_phone: '',
    sales_person: '',
    assistant: '',
  })

  // 篩選業務人員和助理
  const salesPersons = employees.filter(emp => emp.status === 'active')
  const assistants = employees.filter(emp => emp.status === 'active')

  const handleSubmit = async () => {
    if (!workspaceId) {
      void alert('無法取得 workspace_id，請重新登入', 'error')
      return
    }

    if (!newTour.name.trim() || !newTour.departure_date || !newTour.return_date) {
      void alert('請填寫必填欄位（團名、出發日期、返回日期）', 'warning')
      return
    }

    if (!newTour.countryCode) {
      void alert('請選擇國家/地區', 'warning')
      return
    }

    if (newTour.countryCode !== '__custom__' && !newTour.cityCode) {
      void alert('請選擇城市', 'warning')
      return
    }

    if (newTour.countryCode === '__custom__' && !newTour.customLocation) {
      void alert('請輸入自訂目的地', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const tourData = {
        workspace_id: workspaceId,
        name: newTour.name,
        country_code: newTour.countryCode === '__custom__' ? '__custom__' : newTour.countryCode,
        city_code: newTour.countryCode === '__custom__' ? '__custom__' : newTour.cityCode,
        custom_location: newTour.countryCode === '__custom__' ? newTour.customLocation : null,
        departure_date: newTour.departure_date,
        return_date: newTour.return_date,
        price: newTour.price,
        max_participants: newTour.max_participants || 20,
        description: newTour.description,
        status: 'draft' as const,
        contract_status: 'pending' as const,
        total_revenue: 0,
        total_cost: 0,
        profit: 0,
      }

      const createdTour = await createTour(tourData as unknown as Parameters<typeof createTour>[0])

      // 更新國家和城市的使用次數（讓常用的排在前面）
      if (newTour.countryCode !== '__custom__') {
        // 找到國家名稱
        const country = countries.find(c => c.code === newTour.countryCode)
        if (country) {
          incrementCountryUsage(country.name)
        }
        // 找到城市名稱
        const city = cities.find(c => c.airport_code === newTour.cityCode)
        if (city) {
          incrementCityUsage(city.name)
        }
      }

      // 如果有填寫聯絡人，同時建立訂單
      if (newOrder.contact_person.trim()) {
        const orderData = {
          workspace_id: workspaceId,
          tour_id: createdTour.id,
          code: createdTour.code,
          tour_name: createdTour.name,
          contact_person: newOrder.contact_person,
          contact_phone: newOrder.contact_phone,
          sales_person: newOrder.sales_person || '未指派',
          assistant: newOrder.assistant || '未指派',
          member_count: 1,
          total_amount: 0,
          paid_amount: 0,
          remaining_amount: 0,
          payment_status: 'unpaid' as const,
        }

        await createOrder(orderData as unknown as Parameters<typeof createOrder>[0])
      }

      // 重置表單
      setNewTour({
        name: '',
        countryCode: '',
        cityCode: '',
        customLocation: '',
        departure_date: '',
        return_date: '',
        price: 0,
        max_participants: 20,
        description: '',
        isSpecial: false,
      })
      setNewOrder({
        contact_person: '',
        contact_phone: '',
        sales_person: '',
        assistant: '',
      })

      await alert(
        newOrder.contact_person ? '成功建立旅遊團和訂單！' : '成功建立旅遊團！',
        'success'
      )
      onSubmit?.()
    } catch (error) {
      void alert('建立失敗，請稍後再試', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 旅遊團資訊 */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-2 block">
            旅遊團名稱 <span className="text-morandi-red">*</span>
          </label>
          <Input
            value={newTour.name}
            onChange={e => setNewTour(prev => ({ ...prev, name: e.target.value }))}
            placeholder={QUICK_ACTIONS_LABELS.EXAMPLE_8778}
            className="border-morandi-container/30"
          />
        </div>

        <DestinationSelector
          countryCode={newTour.countryCode}
          cityCode={newTour.cityCode}
          customLocation={newTour.customLocation}
          onCountryChange={countryCode => {
            setNewTour(prev => ({
              ...prev,
              countryCode,
              cityCode: countryCode === '__custom__' ? '__custom__' : '',
              customLocation: '',
            }))
          }}
          onCityChange={cityCode => setNewTour(prev => ({ ...prev, cityCode }))}
          onCustomLocationChange={customLocation =>
            setNewTour(prev => ({ ...prev, customLocation }))
          }
          showCustomFields={false}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              出發日期 <span className="text-morandi-red">*</span>
            </label>
            <SimpleDateInput
              value={newTour.departure_date}
              onChange={departure_date => {
                setNewTour(prev => {
                  const newReturnDate =
                    prev.return_date && prev.return_date < departure_date
                      ? departure_date
                      : prev.return_date
                  return { ...prev, departure_date, return_date: newReturnDate }
                })
              }}
              min={getTodayString()}
              className="border-morandi-container/30"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              返回日期 <span className="text-morandi-red">*</span>
            </label>
            <SimpleDateInput
              value={newTour.return_date}
              onChange={return_date => {
                setNewTour(prev => ({ ...prev, return_date }))
              }}
              min={newTour.departure_date || getTodayString()}
              className="border-morandi-container/30"
              required
            />
          </div>
        </div>
      </div>

      {/* 訂單資訊（選填） */}
      <div className="border-t border-morandi-container/30 pt-4 space-y-4">
        <h4 className="text-sm font-semibold text-morandi-primary">
          {QUICK_ACTIONS_LABELS.ADD_8364}
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {QUICK_ACTIONS_LABELS.LABEL_7009}
            </label>
            <Input
              value={newOrder.contact_person}
              onChange={e => setNewOrder(prev => ({ ...prev, contact_person: e.target.value }))}
              placeholder={QUICK_ACTIONS_LABELS.LABEL_8434}
              className="border-morandi-container/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {QUICK_ACTIONS_LABELS.LABEL_6280}
            </label>
            <Input
              value={newOrder.contact_phone}
              onChange={e => setNewOrder(prev => ({ ...prev, contact_phone: e.target.value }))}
              placeholder={QUICK_ACTIONS_LABELS.LABEL_5110}
              className="border-morandi-container/30"
            />
          </div>
        </div>

        {newOrder.contact_person && (
          <>
            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {QUICK_ACTIONS_LABELS.LABEL_6419}
              </label>
              <Combobox
                value={newOrder.sales_person}
                onChange={sales_person => setNewOrder(prev => ({ ...prev, sales_person }))}
                options={salesPersons.map(emp => ({
                  value: emp.display_name || emp.english_name || '',
                  label: emp.display_name || emp.english_name || '',
                }))}
                placeholder={QUICK_ACTIONS_LABELS.SELECT_463}
                emptyMessage="找不到員工"
                showSearchIcon={true}
                showClearButton={true}
                className="border-morandi-container/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {QUICK_ACTIONS_LABELS.LABEL_7412}
              </label>
              <Combobox
                value={newOrder.assistant}
                onChange={assistant => setNewOrder(prev => ({ ...prev, assistant }))}
                options={assistants.map(emp => ({
                  value: emp.display_name || emp.english_name || '',
                  label: emp.display_name || emp.english_name || '',
                }))}
                placeholder={QUICK_ACTIONS_LABELS.SELECT_8232}
                emptyMessage="找不到員工"
                showSearchIcon={true}
                showClearButton={true}
                className="border-morandi-container/30"
              />
            </div>
          </>
        )}

        <div className="bg-morandi-container/10 p-3 rounded-lg">
          <p className="text-xs text-morandi-secondary">{QUICK_ACTIONS_LABELS.LABEL_8280}</p>
        </div>
      </div>

      {/* 提交按鈕 */}
      <Button
        onClick={handleSubmit}
        disabled={
          submitting || !newTour.name.trim() || !newTour.departure_date || !newTour.return_date
        }
        className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white"
      >
        <Users size={16} className="mr-2" />
        {submitting ? '建立中...' : newOrder.contact_person ? '建立旅遊團 & 訂單' : '建立旅遊團'}
      </Button>
    </div>
  )
}
