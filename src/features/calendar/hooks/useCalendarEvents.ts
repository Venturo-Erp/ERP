'use client'

import { formatDate, toTaipeiDateString, toTaipeiTimeString } from '@/lib/utils/format-date'

import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { useCalendarStore, useAuthStore, useWorkspaceStore } from '@/stores'
import {
  useToursForCalendar,
  useCustomersSlim,
  useEmployeesSlim,
  useCalendarEvents as useCalendarEventList,
  invalidateCalendarEvents,
} from '@/data'
import { supabase } from '@/lib/supabase/client'
import { FullCalendarEvent } from '../types'
import { useTourDisplayResolver } from '@/features/tours/utils/tour-display'
import type { CalendarEvent } from '@/types/calendar.types'
import type { DatesSetArg } from '@fullcalendar/core'
import useSWR from 'swr'

// 請假資料類型
interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days: number
  status: string
  employee?: { chinese_name: string; english_name: string; display_name: string }
  leave_type?: { name: string; code: string }
}

// 從 ISO 時間字串取得顯示用的時間（HH:MM）
const getDisplayTime = (isoString: string, allDay?: boolean): string => {
  if (allDay) return ''
  return toTaipeiTimeString(isoString, { skipMidnight: true })
}

// 從 ISO 時間字串取得台灣時區的日期（YYYY-MM-DD）
// 用於全天事件，避免 FullCalendar 時區轉換問題
const getDateInTaipei = (isoString: string): string => {
  return toTaipeiDateString(isoString) || isoString
}

// 計算初始日期範圍（當前月份 ±1 個月）
const getInitialDateRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0) // 下個月的最後一天
  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

export function useCalendarEvents() {
  // 日期範圍狀態（用於分月載入團資料）
  const [dateRange, setDateRange] = useState(getInitialDateRange)

  // 使用日期範圍載入團資料（只載入需要的月份）
  const { items: tours } = useToursForCalendar(dateRange)
  // SSOT：從 country_id / airport_code 解析目的地顯示字串
  const resolveTourDisplay = useTourDisplayResolver()
  const { items: customers } = useCustomersSlim()
  const { settings } = useCalendarStore()
  const { items: calendarEvents } = useCalendarEventList()
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim()
  const { workspaces, loadWorkspaces } = useWorkspaceStore()

  // 載入已核准的請假資料（顯示在行事曆上）
  const workspaceId = user?.workspace_id
  const { data: leaveRequests } = useSWR<LeaveRequest[]>(
    workspaceId ? ['leave_requests_for_calendar', workspaceId] : null,
    async ([, wsId]: [string, string]) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(
          `
          id, employee_id, leave_type_id, start_date, end_date, days, status,
          employee:employees!leave_requests_employee_id_fkey(chinese_name, english_name, display_name),
          leave_type:leave_types!leave_requests_leave_type_id_fkey(name, code)
        `
        )
        .eq('workspace_id', wsId)
        .eq('status', 'approved')
      if (error) throw error
      return data as LeaveRequest[]
    },
    { revalidateOnFocus: false }
  )

  // Workspace 篩選狀態（只有管理員能用）
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const { isAdmin } = useAuthStore.getState()

  // 初始化時從 localStorage 讀取篩選狀態
  const workspaceInitRef = useRef(false)
  useEffect(() => {
    if (isAdmin && !workspaceInitRef.current) {
      workspaceInitRef.current = true
      const saved = localStorage.getItem('calendar_workspace_filter')
      setSelectedWorkspaceId(saved)
      loadWorkspaces()
    }
  }, [isAdmin, loadWorkspaces])

  // 當 FullCalendar 視圖日期改變時更新日期範圍
  const handleDatesChange = useCallback((arg: DatesSetArg) => {
    // FullCalendar 的 start/end 是 Date 物件，需要擴展範圍以確保跨月團正確顯示
    const viewStart = arg.start
    const viewEnd = arg.end

    // 擴展範圍：前後各加 1 個月，確保跨月事件能正確載入
    const expandedStart = new Date(viewStart)
    expandedStart.setMonth(expandedStart.getMonth() - 1)
    const expandedEnd = new Date(viewEnd)
    expandedEnd.setMonth(expandedEnd.getMonth() + 1)

    const newRange = {
      start: formatDate(expandedStart),
      end: formatDate(expandedEnd),
    }

    // 只在範圍實際變化時才更新（避免不必要的重新查詢）
    setDateRange(prev => {
      if (prev.start === newRange.start && prev.end === newRange.end) {
        return prev
      }
      return newRange
    })
  }, [])

  // Realtime 訂閱：當其他人新增/修改/刪除行事曆事件時，自動更新
  useEffect(() => {
    const channel = supabase
      .channel('calendar_events_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => {
        // 重新抓取資料（使用 SWR invalidate）
        invalidateCalendarEvents()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 根據類型取得顏色 - 使用莫蘭迪配色
  const getEventColor = useCallback((type: string, status?: string) => {
    if (type === 'tour' && status) {
      const colors: Record<string, { bg: string; border: string }> = {
        draft: { bg: '#9BB5D6', border: '#8AA4C5' }, // 提案
        active: { bg: '#A8C4A2', border: '#97B391' }, // 進行中
        pending_close: { bg: '#D4B896', border: '#C3A785' }, // 待結案
        closed: { bg: '#B8B3AE', border: '#A7A29D' }, // 結案
        cancelled: { bg: '#B8B3AE', border: '#A7A29D' }, // 已取消
        special: { bg: '#D4A5A5', border: '#C39494' }, // 特殊團
      }
      return colors[status] || colors.draft
    }

    const colors = {
      personal: { bg: '#B8A9D1', border: '#A798C0' },
      birthday: { bg: '#E6B8C8', border: '#D5A7B7' },
      company: { bg: '#E0C3A0', border: '#CFB28F' },
    }
    return colors[type as keyof typeof colors] || { bg: '#B8B3AE', border: '#A7A29D' }
  }, [])

  // 轉換旅遊團為日曆事件（過濾掉特殊團和已封存的）
  const tourEvents: FullCalendarEvent[] = useMemo(() => {
    return (tours || [])
      .filter(tour => tour.status !== '特殊團' && !tour.archived) // 過濾掉簽證專用團等特殊團，以及已封存的
      .map(tour => {
        const color = getEventColor('tour', tour.status || '開團')
        // 🔧 優化：直接使用 tour.current_participants，不再遍歷 orders/members
        const actualMembers = tour.current_participants || 0

        // 修正 FullCalendar 的多日事件顯示問題
        // 如果有 return_date，則需要加一天才能正確顯示跨日事件
        let end_date = tour.return_date
        if (end_date && end_date !== tour.departure_date) {
          const returnDateObj = new Date(end_date)
          returnDateObj.setDate(returnDateObj.getDate() + 1)
          end_date = formatDate(returnDateObj)
        }

        return {
          id: `tour-${tour.id}`,
          title: tour.name || '',
          start: tour.departure_date || '',
          end: end_date || '',
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: {
            type: 'tour' as const,
            tour_id: tour.id,
            code: tour.code || '',
            location: resolveTourDisplay(tour).displayString,
            participants: actualMembers,
            max_participants: tour.max_participants || 0,
            status: tour.status || '',
          },
        } as FullCalendarEvent
      })
  }, [tours, getEventColor, resolveTourDisplay])

  // 轉換個人事項為日曆事件（只顯示當前用戶的個人事項）
  const personalCalendarEvents: FullCalendarEvent[] = useMemo(() => {
    if (!user?.id) return []

    return (calendarEvents || [])
      .filter(event => event.visibility === 'personal' && event.created_by === user.id)
      .map(event => {
        const color = getEventColor('personal')
        const isAllDay = event.all_day ?? false // 轉換 null 為 false
        const timeStr = getDisplayTime(event.start, isAllDay)
        const displayTitle = timeStr ? `${timeStr} ${event.title}` : event.title

        // 🔧 修正：全天事件只傳日期字串，避免 FullCalendar 時區轉換問題
        const startDate = isAllDay ? getDateInTaipei(event.start) : event.start
        const endDate = event.end ? (isAllDay ? getDateInTaipei(event.end) : event.end) : undefined

        return {
          id: event.id,
          title: displayTitle,
          start: startDate,
          end: endDate,
          allDay: isAllDay || undefined, // FullCalendar 期望 boolean | undefined
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: {
            type: 'personal' as const,
            description: event.description ?? undefined,
          },
        }
      })
  }, [calendarEvents, getEventColor, user?.id])

  // 轉換公司事項為日曆事件
  const companyCalendarEvents: FullCalendarEvent[] = useMemo(() => {
    return (calendarEvents || [])
      .filter(event => {
        if (event.visibility !== 'company') return false
        // 超級管理員且有選擇特定 workspace，則只顯示該 workspace 的事項
        if (isAdmin && selectedWorkspaceId) {
          return (event as CalendarEvent).workspace_id === selectedWorkspaceId
        }
        return true
      })
      .map(event => {
        const color = getEventColor('company')

        // 找出建立者姓名（用於詳細頁面）
        // 優先檢查當前登入用戶，再檢查員工列表
        let creatorName = '未知使用者'
        if (user && user.id === event.created_by) {
          creatorName =
            user.display_name ||
            user.chinese_name ||
            user.english_name ||
            user.personal_info?.email ||
            '未知使用者'
        } else {
          const creator = employees?.find(emp => emp.id === event.created_by)
          creatorName =
            creator?.display_name || creator?.chinese_name || creator?.english_name || '未知使用者'
        }

        const isAllDay = event.all_day ?? false // 轉換 null 為 false
        const timeStr = getDisplayTime(event.start, isAllDay)
        const displayTitle = timeStr ? `${timeStr} 公司｜${event.title}` : `公司｜${event.title}`

        // 🔧 修正：全天事件只傳日期字串，避免 FullCalendar 時區轉換問題
        const startDate = isAllDay ? getDateInTaipei(event.start) : event.start
        const endDate = event.end ? (isAllDay ? getDateInTaipei(event.end) : event.end) : undefined

        return {
          id: event.id,
          title: displayTitle,
          start: startDate,
          end: endDate,
          allDay: isAllDay || undefined, // FullCalendar 期望 boolean | undefined
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: {
            type: 'company' as const,
            description: event.description ?? undefined,
            created_by: event.created_by ?? undefined,
            creator_name: creatorName, // 保留在 extendedProps，詳細頁面可以用
          },
        } as FullCalendarEvent
      })
  }, [calendarEvents, getEventColor, employees, user, isAdmin, selectedWorkspaceId])

  // 轉換客戶生日為日曆事件
  // 🔧 優化：移除 memberBirthdayEvents，因不再載入 members 資料
  const customerBirthdayEvents: FullCalendarEvent[] = useMemo(() => {
    const currentYear = new Date().getFullYear()

    return (customers || [])
      .map(customer => {
        if (!customer?.birth_date) return null

        // 計算今年的生日日期
        const birthdayThisYear = `${currentYear}-${customer.birth_date.slice(5)}`

        return {
          id: `customer-birthday-${customer.id}`,
          title: `🎂 ${customer.name} 生日`,
          start: birthdayThisYear,
          backgroundColor: getEventColor('birthday').bg,
          borderColor: getEventColor('birthday').border,
          extendedProps: {
            type: 'birthday' as const,
            customer_id: customer.id,
            customer_name: customer.name,
            source: 'customer' as const,
          },
        }
      })
      .filter(Boolean) as FullCalendarEvent[]
  }, [customers, getEventColor])

  // 合併所有生日事件（目前只有客戶生日）
  const birthdayEvents = useMemo(() => {
    return [...customerBirthdayEvents]
  }, [customerBirthdayEvents])

  // 轉換請假為日曆事件（只顯示已核准的）
  const leaveEvents: FullCalendarEvent[] = useMemo(() => {
    if (!leaveRequests) return []

    return leaveRequests.map(leave => {
      // 取得員工姓名
      const emp = leave.employee as {
        chinese_name?: string
        english_name?: string
        display_name?: string
      } | null
      const employeeName = emp?.display_name || emp?.chinese_name || emp?.english_name || '未知員工'

      // 取得假別名稱
      const leaveType = leave.leave_type as { name?: string; code?: string } | null
      const leaveTypeName = leaveType?.name || '請假'

      // 修正 FullCalendar 的多日事件顯示問題（需要加一天）
      let endDate = leave.end_date
      if (endDate && endDate !== leave.start_date) {
        const endDateObj = new Date(endDate)
        endDateObj.setDate(endDateObj.getDate() + 1)
        endDate = formatDate(endDateObj)
      }

      return {
        id: `leave-${leave.id}`,
        title: `🏖️ ${employeeName} ${leaveTypeName}`,
        start: leave.start_date,
        end: endDate || undefined,
        allDay: true,
        backgroundColor: '#D4A5A5', // 莫蘭迪粉紅
        borderColor: '#C39494',
        extendedProps: {
          type: 'leave' as const,
          leave_id: leave.id,
          employee_name: employeeName,
          leave_type_name: leaveTypeName,
          days: leave.days,
        },
      } as FullCalendarEvent
    })
  }, [leaveRequests])

  // 合併所有事件（生日改用獨立彈窗顯示，不在行事曆上顯示）
  const allEvents = useMemo(() => {
    return [...tourEvents, ...personalCalendarEvents, ...companyCalendarEvents, ...leaveEvents]
  }, [tourEvents, personalCalendarEvents, companyCalendarEvents, leaveEvents])

  // 過濾事件（根據 settings）
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const type = event.extendedProps.type

      if (type === 'tour' && !settings.showTours) return false
      if (type === 'personal' && !settings.showPersonal) return false
      if (type === 'company' && !settings.showCompany) return false
      if (type === 'leave' && settings.showLeave === false) return false // 預設顯示

      return true
    })
  }, [allEvents, settings])

  // 切換 workspace 篩選
  const handleWorkspaceFilterChange = useCallback((workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId)
    if (workspaceId) {
      localStorage.setItem('calendar_workspace_filter', workspaceId)
    } else {
      localStorage.removeItem('calendar_workspace_filter')
    }
  }, [])

  return {
    filteredEvents,
    allEvents,
    // 日期範圍變更處理（給 FullCalendar 的 datesSet 使用）
    onDatesChange: handleDatesChange,
    // Workspace 篩選相關（只有超級管理員可用）
    isAdmin,
    workspaces,
    selectedWorkspaceId,
    onWorkspaceFilterChange: handleWorkspaceFilterChange,
  }
}
