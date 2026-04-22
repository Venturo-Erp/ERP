'use client'

import { useState, useEffect, useCallback } from 'react'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell } from '@/components/table-cells'
import { confirm } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { deleteTour as deleteTourEntity } from '@/data'
import {
  checkTourDependencies,
  deleteTourEmptyOrders,
  unlinkTourQuotes,
  unlinkTourItineraries,
} from '@/features/tours/services/tour_dependency.service'
import { ARCHIVE_LABELS } from './constants/labels'

interface ArchivedTour {
  id: string
  code: string
  name: string | null
  location: string | null
  departure_date: string | null
  return_date: string | null
  archived: boolean | null
  updated_at: string | null
}

export default function ArchiveManagementPage() {
  const [archivedTours, setArchivedTours] = useState<ArchivedTour[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadArchivedData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: tours, error: toursError } = await supabase
        .from('tours')
        .select('id, code, name, location, departure_date, return_date, archived, updated_at')
        .eq('archived', true)
        .order('updated_at', { ascending: false })

      if (toursError) throw toursError
      setArchivedTours(tours || [])
    } catch (error) {
      logger.error('Load archived data failed:', error)
      toast.error(ARCHIVE_LABELS.LOAD_ERROR)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadArchivedData()
  }, [loadArchivedData])

  // 還原旅遊團
  const handleRestoreTour = async (tour: ArchivedTour) => {
    const confirmed = await confirm(ARCHIVE_LABELS.CONFIRM_RESTORE_TOUR(tour.code), {
      title: ARCHIVE_LABELS.CONFIRM_RESTORE_TOUR_TITLE,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      const { error } = await supabase.from('tours').update({ archived: false }).eq('id', tour.id)

      if (error) throw error

      // 同步解封頻道
      await supabase
        .from('channels')
        .update({ is_archived: false, archived_at: null })
        .eq('tour_id', tour.id)

      toast.success(ARCHIVE_LABELS.TOAST_TOUR_RESTORED(tour.code))
      loadArchivedData()
    } catch (error) {
      logger.error('Restore failed:', error)
      toast.error(ARCHIVE_LABELS.TOAST_RESTORE_ERROR)
    }
  }

  // 永久刪除旅遊團
  const handleDeleteTour = async (tour: ArchivedTour) => {
    const { blockers, hasBlockers } = await checkTourDependencies(tour.id)

    if (hasBlockers) {
      toast.error(ARCHIVE_LABELS.CANNOT_DELETE_BLOCKERS(blockers.join('、')))
      return
    }

    const confirmed = await confirm(ARCHIVE_LABELS.CONFIRM_DELETE_TOUR(tour.code), {
      title: ARCHIVE_LABELS.CONFIRM_DELETE_TITLE,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      // 清理關聯資料
      await supabase.from('tour_itinerary_items').delete().eq('tour_id', tour.id)
      await Promise.all([
        supabase.from('calendar_events').delete().eq('related_tour_id', tour.id),
        supabase.from('channels').delete().eq('tour_id', tour.id),
      ])
      await unlinkTourQuotes(tour.id)
      await unlinkTourItineraries(tour.id)
      await deleteTourEmptyOrders(tour.id)
      await deleteTourEntity(tour.id)
      toast.success(ARCHIVE_LABELS.TOAST_TOUR_DELETED(tour.code))
      loadArchivedData()
    } catch (error) {
      logger.error('Delete failed:', error)
      toast.error(ARCHIVE_LABELS.TOAST_DELETE_ERROR)
    }
  }

  const tourColumns = [
    {
      key: 'code',
      label: ARCHIVE_LABELS.COL_CODE,
      width: '140px',
      render: (_: unknown, row: ArchivedTour) => (
        <span className="font-medium text-morandi-primary">{row.code}</span>
      ),
    },
    {
      key: 'name',
      label: ARCHIVE_LABELS.COL_NAME,
      render: (_: unknown, row: ArchivedTour) => (
        <span className="text-morandi-secondary">{row.name || row.location || '-'}</span>
      ),
    },
    {
      key: 'departure_date',
      label: ARCHIVE_LABELS.COL_DEPARTURE_DATE,
      width: '120px',
      render: (_: unknown, row: ArchivedTour) => <DateCell date={row.departure_date} />,
    },
    {
      key: 'updated_at',
      label: ARCHIVE_LABELS.COL_ARCHIVED_TIME,
      width: '120px',
      render: (_: unknown, row: ArchivedTour) => (
        <span className="text-sm text-morandi-secondary">
          {row.updated_at ? formatDate(row.updated_at) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '100px',
      render: (_: unknown, row: ArchivedTour) => (
        <ActionCell
          actions={[
            {
              icon: RotateCcw,
              label: ARCHIVE_LABELS.ACTION_RESTORE,
              onClick: () => handleRestoreTour(row),
            },
            {
              icon: Trash2,
              label: ARCHIVE_LABELS.ACTION_DELETE_PERMANENT,
              onClick: () => handleDeleteTour(row),
              variant: 'danger',
            },
          ]}
        />
      ),
    },
  ]

  return (
    <ContentPageLayout
      title={ARCHIVE_LABELS.PAGE_TITLE}
      icon={Archive}
      breadcrumb={[
        { label: ARCHIVE_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
        { label: ARCHIVE_LABELS.BREADCRUMB_DATABASE, href: '/database' },
        { label: ARCHIVE_LABELS.BREADCRUMB_ARCHIVE, href: '/database/archive-management' },
      ]}
      contentClassName="flex-1 overflow-hidden"
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold" />
        </div>
      ) : archivedTours.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-morandi-secondary">
          <Archive className="h-12 w-12 mb-4 opacity-30" />
          <p>{ARCHIVE_LABELS.EMPTY_ARCHIVED_TOURS}</p>
        </div>
      ) : (
        <EnhancedTable columns={tourColumns} data={archivedTours} />
      )}
    </ContentPageLayout>
  )
}
