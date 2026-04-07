import { Button } from '@/components/ui/button'
import { LABELS } from '../constants/labels'
import { AccommodationForm } from './AccommodationForm'
import { FlightForm } from './FlightForm'
import type { ConfirmationFormData, ConfirmationType } from '@/types/confirmation.types'

interface EditorContainerProps {
  formData: ConfirmationFormData
  onFormDataChange: (data: ConfirmationFormData) => void
  onTypeChange: (type: ConfirmationType) => void
}

export function EditorContainer({
  formData,
  onFormDataChange,
  onTypeChange,
}: EditorContainerProps) {
  return (
    <div className="w-1/2 bg-card border-r border-border flex flex-col">
      {/* 標題列 */}
      <div className="h-14 bg-morandi-gold-header px-6 flex items-center justify-between border-b border-border">
        <h2 className="text-lg font-semibold">{LABELS.EDIT_CONFIRMATION}</h2>

        {/* 類型切換 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={formData.type === 'accommodation' ? 'default' : 'outline'}
            onClick={() => onTypeChange('accommodation')}
            className={
              formData.type === 'accommodation'
                ? 'bg-card text-morandi-gold hover:bg-muted'
                : 'text-white border-white hover:bg-morandi-gold-dark'
            }
          >
            {LABELS.ACCOMMODATION_CONFIRMATION_TITLE}
          </Button>
          <Button
            size="sm"
            variant={formData.type === 'flight' ? 'default' : 'outline'}
            onClick={() => onTypeChange('flight')}
            className={
              formData.type === 'flight'
                ? 'bg-card text-morandi-gold hover:bg-muted'
                : 'text-white border-white hover:bg-morandi-gold-dark'
            }
          >
            {LABELS.FLIGHT_CONFIRMATION_TITLE}
          </Button>
        </div>
      </div>

      {/* 表單內容 */}
      <div className="flex-1 overflow-y-auto p-6">
        {formData.type === 'accommodation' ? (
          <AccommodationForm formData={formData} onChange={onFormDataChange} />
        ) : (
          <FlightForm formData={formData} onChange={onFormDataChange} />
        )}
      </div>
    </div>
  )
}
