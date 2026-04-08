'use client'

import { getTodayString } from '@/lib/utils/format-date'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleDateInput } from '@/components/ui/simple-date-input'
import { CountryAirportSelector } from '@/components/selectors/CountryAirportSelector'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { useDepartments, useEmployeesSlim } from '@/data'
import type { NewTourData } from '../../types'
import { TOUR_BASIC_INFO } from '../../constants'

interface TourBasicInfoProps {
  newTour: NewTourData
  setNewTour: React.Dispatch<React.SetStateAction<NewTourData>>
}

export function TourBasicInfo({ newTour, setNewTour }: TourBasicInfoProps) {
  const isProposalOrTemplate = newTour.tour_type === 'proposal' || newTour.tour_type === 'template'
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const hasDepartments = isFeatureEnabled('departments')
  const hasTourController = isFeatureEnabled('tour_controller')
  const hasTourAttributes = isFeatureEnabled('tour_attributes')
  const { items: departments = [] } = useDepartments()
  const { items: employees = [] } = useEmployeesSlim()

  // 暫時硬編碼可用的團類型（等後端 API 完成後改為從設定獲取）
  const availableTourCategories = [
    { id: 'flight', label: '✈️ 機票', enabled: true },
    { id: 'flight_hotel', label: '🏨 機加酒', enabled: true },
    { id: 'hotel', label: '🛏️ 訂房', enabled: true },
    { id: 'car_service', label: '🚗 派車', enabled: true },
    { id: 'tour_group', label: '🧳 旅遊團', enabled: true },
    { id: 'visa', label: '🛂 簽證', enabled: true },
  ]

  // 實際可用的團類型（根據租戶設定）
  const enabledTourCategories = availableTourCategories.filter(cat => cat.enabled)

  // 🔧 核心表架構：接收完整國家資料
  const handleCountryChange = (data: { id: string; name: string; code: string }) => {
    setNewTour(prev => ({
      ...prev,
      countryId: data.id, // countries.id
      countryName: data.name, // 顯示用
      countryCode: data.code, // 用於過濾機場
      cityCode: '', // 清空機場
      cityName: '',
    }))
  }

  // 處理機場代碼變更
  const handleAirportChange = (airportCode: string, cityName: string) => {
    setNewTour(prev => ({
      ...prev,
      cityCode: airportCode,
      cityName: cityName,
    }))
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-morandi-primary">
          {TOUR_BASIC_INFO.label_name}
        </label>
        <Input
          value={newTour.name}
          onChange={e => setNewTour(prev => ({ ...prev, name: e.target.value }))}
          className="mt-1"
        />
      </div>

      {/* 團類型選擇（必填） - 僅當租戶開啟 tour_attributes 功能時顯示 */}
      {hasTourAttributes && (
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            團類型 <span className="text-red-500">*</span>
          </label>
          <Select
            value={newTour.tour_service_type || 'tour_group'}
            onValueChange={(value: 'flight' | 'flight_hotel' | 'hotel' | 'car_service' | 'tour_group' | 'visa') =>
              setNewTour(prev => ({
                ...prev,
                tour_service_type: value,
              }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="選擇團類型..." />
            </SelectTrigger>
            <SelectContent>
              {enabledTourCategories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 團控人員選擇（必填） - 僅當租戶開啟 tour_controller 功能時顯示 */}
      {hasTourController && (
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            團控 <span className="text-red-500">*</span>
          </label>
          <Select
            value={newTour.controller_id || ''}
            onValueChange={value =>
              setNewTour(prev => ({
                ...prev,
                controller_id: value,
              }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="選擇團控人員..." />
            </SelectTrigger>
            <SelectContent>
              {employees
                .filter(emp => emp.status !== 'terminated' && emp.status !== 'probation')
                .map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} {emp.employee_number ? `(${emp.employee_number})` : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 部門選擇（僅有 departments 功能的租戶顯示） */}
      {hasDepartments && departments.length > 0 && (
        <div>
          <label className="text-sm font-medium text-morandi-primary">部門</label>
          <Select
            value={newTour.department_id || '_none_'}
            onValueChange={value =>
              setNewTour(prev => ({
                ...prev,
                department_id: value === '_none_' ? undefined : value,
              }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="選擇部門..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none_">不指定</SelectItem>
              {departments
                .filter(d => d.is_active)
                .map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 國家/機場選擇 - 使用共用組件 */}
      <CountryAirportSelector
        countryName={newTour.countryName}
        airportCode={newTour.cityCode}
        onCountryChange={handleCountryChange}
        onAirportChange={handleAirportChange}
        disablePortal
        showLabels
      />

      {isProposalOrTemplate ? (
        /* 提案/模板：只顯示天數 */
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {TOUR_BASIC_INFO.label_days_count}
          </label>
          <Input
            type="number"
            min={1}
            max={30}
            value={newTour.days_count || ''}
            onChange={e =>
              setNewTour(prev => ({ ...prev, days_count: parseInt(e.target.value) || null }))
            }
            className="mt-1 w-32"
          />
        </div>
      ) : (
        /* 正式團：顯示出發和回程日期 */
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {TOUR_BASIC_INFO.label_departure}
            </label>
            <SimpleDateInput
              value={newTour.departure_date}
              onChange={departure_date => {
                setNewTour(prev => {
                  const newReturnDate =
                    prev.return_date && prev.return_date < departure_date
                      ? departure_date
                      : prev.return_date

                  return {
                    ...prev,
                    departure_date,
                    return_date: newReturnDate,
                  }
                })
              }}
              min={getTodayString()}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {TOUR_BASIC_INFO.label_return}
            </label>
            <SimpleDateInput
              value={newTour.return_date}
              onChange={return_date => {
                setNewTour(prev => ({ ...prev, return_date }))
              }}
              min={newTour.departure_date || getTodayString()}
              defaultMonth={newTour.departure_date}
              className="mt-1"
              required
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-morandi-primary">
          {TOUR_BASIC_INFO.label_description}
        </label>
        <Input
          value={newTour.description || ''}
          onChange={e => setNewTour(prev => ({ ...prev, description: e.target.value }))}
          className="mt-1"
        />
      </div>
    </div>
  )
}
