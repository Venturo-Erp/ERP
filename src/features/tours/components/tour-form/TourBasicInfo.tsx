'use client'

import { getTodayString } from '@/lib/utils/format-date'

import React from 'react'
import { Input } from '@/components/ui/input'
import { SimpleDateInput } from '@/components/ui/simple-date-input'
import { CountryAirportSelector } from '@/components/selectors/CountryAirportSelector'
import type { NewTourData } from '../../types'
import { TOUR_BASIC_INFO } from '../../constants'

interface TourBasicInfoProps {
  newTour: NewTourData
  setNewTour: React.Dispatch<React.SetStateAction<NewTourData>>
}

export function TourBasicInfo({ newTour, setNewTour }: TourBasicInfoProps) {
  const isProposalOrTemplate = newTour.tour_type === 'proposal' || newTour.tour_type === 'template'

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
