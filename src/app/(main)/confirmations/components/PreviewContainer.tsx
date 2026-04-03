import { LABELS } from '../constants/labels'
import { AccommodationPreview } from './AccommodationPreview'
import { FlightPreview } from './FlightPreview'
import type { ConfirmationFormData } from '@/types/confirmation.types'

interface PreviewContainerProps {
  formData: ConfirmationFormData
}

export function PreviewContainer({ formData }: PreviewContainerProps) {
  return (
    <div className="w-1/2 bg-muted flex flex-col">
      {/* 標題列 */}
      <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-morandi-primary">{LABELS.LIVE_PREVIEW}</h2>
          <span className="text-sm text-morandi-secondary">
            {formData.type === 'accommodation'
              ? LABELS.ACCOMMODATION_CONFIRMATION_TITLE
              : LABELS.FLIGHT_CONFIRMATION_TITLE}
          </span>
        </div>
      </div>

      {/* 預覽容器 */}
      <div className="flex-1 overflow-y-auto p-8 bg-background">
        <div className="max-w-[21cm] mx-auto bg-card rounded-lg shadow-lg overflow-hidden">
          {formData.type === 'accommodation' ? (
            <AccommodationPreview formData={formData} />
          ) : (
            <FlightPreview formData={formData} />
          )}
        </div>
      </div>
    </div>
  )
}
