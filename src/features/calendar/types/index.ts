import { Tour } from '@/stores/types'

// FullCalendar 元件所需的顯示格式（與資料庫 CalendarEvent 不同）
export interface FullCalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  allDay?: boolean // 🔥 新增：是否為全天事件
  backgroundColor: string
  borderColor: string
  extendedProps: {
    type: 'tour' | 'personal' | 'birthday' | 'company' | 'leave'
    description?: string
    location?: string
    participants?: number
    max_participants?: number
    status?: Tour['status']
    tour_id?: string
    code?: string
    member_id?: string
    member_name?: string
    customer_id?: string
    customer_name?: string
    order_id?: string
    created_by?: string
    creator_name?: string
    source?: 'member' | 'customer'
    // 請假相關
    leave_id?: string
    employee_name?: string
    leave_type_name?: string
    days?: number
  }
}

export interface MoreEventsDialogState {
  open: boolean
  date: string
  events: FullCalendarEvent[]
}

export interface AddEventDialogState {
  open: boolean
  selectedDate: string
}

export interface NewEventForm {
  title: string
  visibility: 'personal' | 'company'
  description: string
  end_date: string
  start_time: string
  end_time: string
}

export interface EditEventDialogState {
  open: boolean
  eventId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  title: string
  description: string
  visibility: 'personal' | 'company'
}
