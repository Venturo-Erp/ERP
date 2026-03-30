'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useAuthStore, useWorkspaceStore } from '@/stores'
import { FullCalendarEvent } from '../types'
import type { CalendarSettings } from '@/stores/calendar-store'

// 定義 CalendarEvent 類型（從 store 推斷）
interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  all_day?: boolean
  visibility?: 'personal' | 'company'
  description?: string
  created_by?: string
  workspace_id?: string
}

/**
 * 行事曆事件篩選邏輯
 * 處理：
 * 1. Workspace 篩選（超級管理員專用）
 * 2. 事件類型篩選（根據 settings）
 * 3. 個人/公司事項的可見性篩選
 */
export function useCalendarFilters(calendarEvents: CalendarEvent[], settings: CalendarSettings) {
  const { user } = useAuthStore()
  const { workspaces, loadWorkspaces } = useWorkspaceStore()

  // Workspace 篩選狀態（只有管理員能用）
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const { isAdmin } = useAuthStore.getState()
  const isSuperAdmin = isAdmin

  // 初始化時從 localStorage 讀取篩選狀態
  const workspaceInitRef = useRef(false)
  useEffect(() => {
    if (isSuperAdmin && !workspaceInitRef.current) {
      workspaceInitRef.current = true
      const saved = localStorage.getItem('calendar_workspace_filter')
      setSelectedWorkspaceId(saved)
      loadWorkspaces()
    }
  }, [isSuperAdmin, loadWorkspaces])

  // 切換 workspace 篩選
  const handleWorkspaceFilterChange = useCallback((workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId)
    if (workspaceId) {
      localStorage.setItem('calendar_workspace_filter', workspaceId)
    } else {
      localStorage.removeItem('calendar_workspace_filter')
    }
  }, [])

  // 過濾個人事項（只顯示當前用戶的個人事項）
  const personalCalendarEvents = useMemo(() => {
    if (!user?.id) return []
    return calendarEvents.filter(
      event => event.visibility === 'personal' && event.created_by === user.id
    )
  }, [calendarEvents, user?.id])

  // 過濾公司事項（根據 workspace 和超級管理員權限）
  const companyCalendarEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      if (event.visibility !== 'company') return false
      // 超級管理員且有選擇特定 workspace，則只顯示該 workspace 的事項
      if (isSuperAdmin && selectedWorkspaceId) {
        return event.workspace_id === selectedWorkspaceId
      }
      return true
    })
  }, [calendarEvents, isSuperAdmin, selectedWorkspaceId])

  // 根據 settings 篩選事件類型
  const filterBySettings = useCallback(
    (events: FullCalendarEvent[]): FullCalendarEvent[] => {
      return events.filter(event => {
        const type = event.extendedProps.type

        if (type === 'tour' && !settings.showTours) return false
        if (type === 'personal' && !settings.showPersonal) return false
        if (type === 'company' && !settings.showCompany) return false
        if (type === 'birthday' && !settings.showBirthdays) return false

        return true
      })
    },
    [settings]
  )

  return {
    // 篩選後的事件
    personalCalendarEvents,
    companyCalendarEvents,
    filterBySettings,

    // Workspace 篩選相關（只有超級管理員可用）
    isSuperAdmin,
    workspaces,
    selectedWorkspaceId,
    onWorkspaceFilterChange: handleWorkspaceFilterChange,
  }
}
