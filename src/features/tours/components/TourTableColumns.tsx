'use client'
/**
 * TourTableColumns - Table column definitions for tours list
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { TableColumn } from '@/components/ui/enhanced-table'
import { Tour } from '@/stores/types'
import { cn } from '@/lib/utils'
import { DateCell } from '@/components/table-cells'
import { TOUR_TABLE } from '../constants'
import { getStatusConfig } from '@/lib/status-config'
import { useTourDisplayResolver } from '../utils/tour-display'

interface UseTourTableColumnsParams {
  ordersByTourId?: Map<string, { sales_person: string | null; assistant: string | null }>
}

export function useTourTableColumns({ ordersByTourId }: UseTourTableColumnsParams) {
  return useMemo<TableColumn[]>(
    () => [
      {
        key: 'code',
        label: TOUR_TABLE.col_code,
        sortable: true,
        width: '110px',
        render: (value, row) => {
          const code = String(value || '')
          return (
            <Link
              href={`/tours/${code}`}
              onClick={e => e.stopPropagation()}
              className="text-sm text-morandi-gold hover:text-morandi-gold-hover hover:underline font-medium"
            >
              {code}
            </Link>
          )
        },
      },
      {
        key: 'name',
        label: TOUR_TABLE.col_name,
        sortable: true,
        width: '180px',
        render: value => (
          <span className="text-sm text-morandi-primary">{String(value || '')}</span>
        ),
      },
      {
        key: 'departure_date',
        label: TOUR_TABLE.col_departure,
        sortable: true,
        width: '100px',
        render: (value, row) => {
          const tour = row as Tour
          return <DateCell date={tour.departure_date} showIcon={false} />
        },
      },
      {
        key: 'return_date',
        label: TOUR_TABLE.col_return,
        sortable: true,
        width: '100px',
        render: (value, row) => {
          const tour = row as Tour
          return <DateCell date={tour.return_date} showIcon={false} />
        },
      },

      {
        key: 'status',
        label: TOUR_TABLE.col_status,
        sortable: true,
        width: '80px',
        render: (value, row) => {
          const tour = row as Tour
          const today = new Date().toISOString().split('T')[0]

          // 動態計算實際狀態
          let actualStatus = tour.status || ''

          if (tour.departure_date && tour.return_date) {
            if (actualStatus === '待出發' && tour.departure_date <= today) {
              actualStatus = '進行中'
            }
            if (actualStatus === '進行中' && tour.return_date < today) {
              actualStatus = '已完成'
            }
          }

          const config = getStatusConfig('tour', actualStatus)
          return (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                config.bgColor,
                config.color,
                config.borderColor
              )}
            >
              {actualStatus}
            </span>
          )
        },
      },
    ],
    [ordersByTourId]
  )
}

/**
 * useTemplateTableColumns - 提案/模板精簡版表格欄位
 */
interface UseTemplateTableColumnsParams {
  onConvert?: (tour: Tour) => void
}

export function useTemplateTableColumns({ onConvert }: UseTemplateTableColumnsParams) {
  const resolveDisplay = useTourDisplayResolver()
  return useMemo<TableColumn[]>(
    () => [
      {
        key: 'name',
        label: TOUR_TABLE.col_name,
        sortable: true,
        width: '240px',
        render: value => (
          <span className="text-sm text-morandi-primary font-medium">{String(value || '')}</span>
        ),
      },
      {
        key: 'location',
        label: TOUR_TABLE.col_location,
        sortable: false,
        width: '120px',
        render: (_value, row) => {
          const tour = row as Tour
          const { displayString } = resolveDisplay(tour)
          return <span className="text-sm text-morandi-primary">{displayString || '-'}</span>
        },
      },
      {
        key: 'days_count',
        label: TOUR_TABLE.col_days,
        sortable: true,
        width: '80px',
        render: value => (
          <span className="text-sm text-morandi-primary">
            {value ? `${value} ${TOUR_TABLE.col_days_unit}` : '-'}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: TOUR_TABLE.col_created,
        sortable: true,
        width: '120px',
        render: value => <DateCell date={value as string | null} showIcon={false} />,
      },
      {
        key: 'actions',
        label: TOUR_TABLE.col_actions,
        width: '100px',
        render: (_value, row) => {
          const tour = row as Tour
          return (
            <button
              onClick={e => {
                e.stopPropagation()
                onConvert?.(tour)
              }}
              className="text-xs px-3 py-1 rounded-md bg-morandi-gold text-white hover:bg-morandi-gold-hover transition-colors"
            >
              {TOUR_TABLE.convert_to_tour}
            </button>
          )
        },
      },
    ],
    [onConvert, resolveDisplay]
  )
}
