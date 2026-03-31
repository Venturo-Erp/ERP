'use client'

import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { PublishButton } from '@/components/editor/PublishButton'
import type { LocalTourData } from '../hooks/useItineraryEditor'
import type { ItineraryVersionRecord } from '@/stores/types'
import { NEW_LABELS } from './constants/labels'

interface ItineraryHeaderProps {
  tourData: LocalTourData
  itineraryId: string | null
  currentVersionIndex: number
  onVersionChange: (index: number, versionData?: ItineraryVersionRecord) => void
  onVersionRecordsChange: (versionRecords: ItineraryVersionRecord[]) => void
  onBack: () => void
}

export function ItineraryHeader({
  tourData,
  itineraryId,
  currentVersionIndex,
  onVersionChange,
  onVersionRecordsChange,
  onBack,
}: ItineraryHeaderProps) {
  return (
    <ResponsiveHeader
      title={
        tourData.tourCode
          ? NEW_LABELS.EDIT_ITINERARY_TITLE(tourData.tourCode)
          : NEW_LABELS.NEW_WEB_ITINERARY
      }
      breadcrumb={[
        { label: NEW_LABELS.BREADCRUMB_ITINERARY_MGMT, href: '/itinerary' },
        {
          label: tourData.tourCode
            ? NEW_LABELS.EDIT_BREADCRUMB(tourData.tourCode)
            : NEW_LABELS.NEW_WEB_ITINERARY,
          href: '#',
        },
      ]}
      actions={
        <PublishButton
          data={{
            ...tourData,
            id: itineraryId || undefined,
            version_records: tourData.version_records,
          }}
          currentVersionIndex={currentVersionIndex}
          onVersionChange={onVersionChange}
          onVersionRecordsChange={onVersionRecordsChange}
        />
      }
    />
  )
}
