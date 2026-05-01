import { CALENDAR_LABELS } from '../constants/labels'

function CalendarLegend() {
  return (
    <div className="mt-6 flex flex-wrap gap-4 p-4 bg-morandi-container/10 rounded-lg">
      <div className="text-sm font-medium text-morandi-secondary">{CALENDAR_LABELS.LEGEND}</div>

      {/* 旅遊團狀態圖例 */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--cal-proposal)' }} />
        <span className="text-sm text-morandi-secondary">{CALENDAR_LABELS.PROPOSAL}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--cal-in-progress)' }} />
        <span className="text-sm text-morandi-secondary">{CALENDAR_LABELS.IN_PROGRESS}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--cal-pending-close)' }} />
        <span className="text-sm text-morandi-secondary">{CALENDAR_LABELS.PENDING_CLOSE}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--cal-closed)' }} />
        <span className="text-sm text-morandi-secondary">{CALENDAR_LABELS.CLOSED}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--cal-special)' }} />
        <span className="text-sm text-morandi-secondary">{CALENDAR_LABELS.SPECIAL_TOUR}</span>
      </div>

      {/* 個人事項圖例 */}
      <div className="flex items-center gap-2 ml-4">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--cal-personal)' }} />
        <span className="text-sm text-morandi-secondary">{CALENDAR_LABELS.PERSONAL_EVENT}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--cal-birthday)' }} />
        <span className="text-sm text-morandi-secondary">{CALENDAR_LABELS.BIRTHDAY}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--cal-company)' }} />
        <span className="text-sm text-morandi-secondary">{CALENDAR_LABELS.COMPANY_EVENT}</span>
      </div>
    </div>
  )
}
