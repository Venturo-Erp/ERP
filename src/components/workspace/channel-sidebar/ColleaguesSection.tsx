'use client'
/**
 * 同事列表區塊
 * 顯示兩個辦公室的員工（不含機器人）
 */

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, User, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores'
import { useAuthStore } from '@/stores/auth-store'
import { useEmployeesSlim } from '@/data'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'
import { SYSTEM_BOT_ID } from '@/lib/constants/workspace'

interface ColleaguesSectionProps {
  isExpanded: boolean
  onToggleExpanded: () => void
  onSelectMember: (memberId: string) => void
  selectedMemberId?: string | null
}

export function ColleaguesSection({
  isExpanded,
  onToggleExpanded,
  onSelectMember,
  selectedMemberId,
}: ColleaguesSectionProps) {
  const { user } = useAuthStore()
  const { items: employees } = useEmployeesSlim()
  const { workspaces, loadWorkspaces } = useWorkspaceStore()

  const [expandedOffices, setExpandedOffices] = useState<Record<string, boolean>>({})

  // 載入 workspaces 資料（employees 由 SWR 自動載入）
  useEffect(() => {
    if (workspaces.length === 0) {
      loadWorkspaces()
    }
  }, [workspaces.length, loadWorkspaces])

  // 只顯示同 workspace 的同事（排除自己和機器人）
  const employeesByOffice = useMemo(() => {
    const currentWorkspaceId = user?.workspace_id
    const grouped: Record<string, typeof employees> = {}

    employees.forEach(emp => {
      // 排除機器人和自己
      if (emp.id === SYSTEM_BOT_ID || emp.employee_number === 'BOT001') return
      if (emp.id === user?.id) return
      // 排除離職員工
      if (emp.status === 'terminated') return
      // 只顯示同 workspace 的員工
      if (currentWorkspaceId && emp.workspace_id !== currentWorkspaceId) return

      const workspaceId = emp.workspace_id || 'unknown'
      if (!grouped[workspaceId]) {
        grouped[workspaceId] = []
      }
      grouped[workspaceId].push(emp)
    })

    // 排序每個辦公室的員工
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        const nameA = a.chinese_name || a.display_name || ''
        const nameB = b.chinese_name || b.display_name || ''
        return nameA.localeCompare(nameB, 'zh-TW')
      })
    })

    return grouped
  }, [employees, user?.id])

  // 計算總員工數（不含機器人和自己）
  const totalColleagues = useMemo(() => {
    return Object.values(employeesByOffice).reduce((sum, arr) => sum + arr.length, 0)
  }, [employeesByOffice])

  // 取得工作空間名稱
  const getWorkspaceName = (workspaceId: string) => {
    const ws = workspaces.find(w => w.id === workspaceId)
    return ws?.name || COMP_WORKSPACE_LABELS.其他
  }

  // 切換辦公室展開
  const toggleOffice = (workspaceId: string) => {
    setExpandedOffices(prev => ({
      ...prev,
      [workspaceId]: !prev[workspaceId],
    }))
  }

  // 初始化展開狀態
  useEffect(() => {
    const initial: Record<string, boolean> = {}
    Object.keys(employeesByOffice).forEach(key => {
      initial[key] = true // 預設展開
    })
    setExpandedOffices(initial)
  }, [Object.keys(employeesByOffice).join(',')])

  const officeIds = Object.keys(employeesByOffice)

  return (
    <div className="py-1">
      {/* 區塊標題 */}
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-morandi-secondary hover:bg-morandi-container/30 transition-colors"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <User size={14} />
        <span>{COMP_WORKSPACE_LABELS.同事}</span>
        <span className="text-xs text-morandi-muted ml-auto">{totalColleagues}</span>
      </button>

      {isExpanded && (
        <div className="mt-1">
          {/* 按辦公室分組 */}
          {officeIds.map(workspaceId => {
            const officeEmployees = employeesByOffice[workspaceId]
            const officeName = getWorkspaceName(workspaceId)
            const isOfficeExpanded = expandedOffices[workspaceId] !== false

            return (
              <div key={workspaceId} className="mt-1">
                {/* 辦公室標題 */}
                <button
                  onClick={() => toggleOffice(workspaceId)}
                  className="w-full flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-morandi-muted hover:bg-morandi-container/20 transition-colors"
                >
                  {isOfficeExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Building2 size={12} />
                  <span>{officeName}</span>
                  <span className="ml-auto">{officeEmployees.length}</span>
                </button>

                {/* 辦公室員工列表 */}
                {isOfficeExpanded && (
                  <div className="ml-2">
                    {officeEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => onSelectMember(emp.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors',
                          selectedMemberId === emp.id
                            ? 'bg-morandi-gold/10 text-morandi-primary'
                            : 'text-morandi-secondary hover:bg-morandi-container/30'
                        )}
                      >
                        {emp.avatar ? (
                          <img
                            src={emp.avatar}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-morandi-container flex items-center justify-center text-xs text-morandi-secondary">
                            {(emp.chinese_name || emp.display_name || '?')[0]}
                          </div>
                        )}
                        <span className="flex-1 text-left truncate">
                          {emp.chinese_name || emp.display_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
