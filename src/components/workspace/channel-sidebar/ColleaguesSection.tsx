'use client'
/**
 * 同事列表區塊
 * 顯示兩個辦公室的員工（不含機器人）
 */

import { useMemo } from 'react'
import { ChevronDown, ChevronRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'
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

  // 只顯示同 workspace 的同事（排除自己和機器人）
  const colleagues = useMemo(() => {
    const currentWorkspaceId = user?.workspace_id
    return employees
      .filter(emp => {
        if (emp.id === SYSTEM_BOT_ID || emp.employee_number === 'BOT001') return false
        if (emp.id === user?.id) return false
        if (emp.status === 'terminated') return false
        if (currentWorkspaceId && emp.workspace_id !== currentWorkspaceId) return false
        return true
      })
      .sort((a, b) => {
        const nameA = a.chinese_name || a.display_name || ''
        const nameB = b.chinese_name || b.display_name || ''
        return nameA.localeCompare(nameB, 'zh-TW')
      })
  }, [employees, user?.id])

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
        <span className="text-xs text-morandi-muted ml-auto">{colleagues.length}</span>
      </button>

      {isExpanded && (
        <div className="mt-1">
          {colleagues.map(emp => (
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
              {emp.avatar_url ? (
                <img src={emp.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
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
}
