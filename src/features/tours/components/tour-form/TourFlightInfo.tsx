'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import type { NewTourData } from '../../types'
import { TOUR_FLIGHT_INFO } from '../../constants'

interface TourFlightInfoProps {
  newTour: NewTourData
  setNewTour: React.Dispatch<React.SetStateAction<NewTourData>>
  loadingOutbound: boolean
  loadingReturn: boolean
  handleSearchOutbound: () => Promise<void>
  handleSearchReturn: () => Promise<void>
}

export function TourFlightInfo({
  newTour,
  setNewTour,
  loadingOutbound,
  loadingReturn,
  handleSearchOutbound,
  handleSearchReturn,
}: TourFlightInfoProps) {
  return (
    <div className="pt-4 mt-4">
      <label className="text-sm font-medium text-morandi-primary mb-3 block">
        {TOUR_FLIGHT_INFO.section_title}
      </label>
      <div className="space-y-3">
        {/* 去程航班 */}
        <div>
          <label className="text-xs font-medium text-morandi-primary mb-2 block">
            {TOUR_FLIGHT_INFO.outbound_label}
          </label>
          <div className="flex gap-2 items-center">
            <Input
              value={newTour.outbound_flight_number || ''}
              onChange={e =>
                setNewTour(prev => ({
                  ...prev,
                  outbound_flight_number: e.target.value.toUpperCase(),
                }))
              }
              placeholder={TOUR_FLIGHT_INFO.flight_number_placeholder}
              className="text-sm w-32"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSearchOutbound}
              disabled={loadingOutbound || !newTour.outbound_flight_number}
              className="gap-1 shrink-0"
            >
              {loadingOutbound ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              {TOUR_FLIGHT_INFO.search_button}
            </Button>
            <Input
              value={newTour.outbound_flight_text || ''}
              onChange={e =>
                setNewTour(prev => ({ ...prev, outbound_flight_text: e.target.value }))
              }
              placeholder={TOUR_FLIGHT_INFO.flight_text_placeholder}
              className="text-sm flex-1"
            />
          </div>
        </div>

        {/* 回程航班 */}
        <div>
          <label className="text-xs font-medium text-morandi-primary mb-2 block">
            {TOUR_FLIGHT_INFO.return_label}
          </label>
          <div className="flex gap-2 items-center">
            <Input
              value={newTour.return_flight_number || ''}
              onChange={e =>
                setNewTour(prev => ({
                  ...prev,
                  return_flight_number: e.target.value.toUpperCase(),
                }))
              }
              placeholder={TOUR_FLIGHT_INFO.flight_number_placeholder}
              className="text-sm w-32"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSearchReturn}
              disabled={loadingReturn || !newTour.return_flight_number}
              className="gap-1 shrink-0"
            >
              {loadingReturn ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              {TOUR_FLIGHT_INFO.search_button}
            </Button>
            <Input
              value={newTour.return_flight_text || ''}
              onChange={e =>
                setNewTour(prev => ({ ...prev, return_flight_text: e.target.value }))
              }
              placeholder={TOUR_FLIGHT_INFO.flight_text_placeholder}
              className="text-sm flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
