'use client'
/**
 * 機器人區塊
 * VENTURO 機器人 = 系統通知 / 工單狀態派送機器人
 */

import { useMemo } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmployeesSlim } from '@/data'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'
import { SYSTEM_BOT_ID } from '@/lib/constants/workspace'

interface BotSectionProps {
  onSelectBot: (botId: string) => void
  selectedBotId?: string | null
}

export function BotSection({ onSelectBot, selectedBotId }: BotSectionProps) {
  const { items: employees } = useEmployeesSlim()

  // 找到 VENTURO 機器人
  const bot = useMemo(() => {
    return employees.find(emp => emp.id === SYSTEM_BOT_ID || emp.employee_number === 'BOT001')
  }, [employees])

  if (!bot) {
    return null
  }

  return (
    <div className="py-1 space-y-0.5">
      <button
        onClick={() => onSelectBot(bot.id)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
          selectedBotId === bot.id
            ? 'bg-morandi-gold/10 text-morandi-primary'
            : 'text-morandi-secondary hover:bg-morandi-container/30'
        )}
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-morandi-gold/20">
          <Bot size={14} className="text-morandi-gold" />
        </div>
        <span className="flex-1 text-left truncate font-medium">
          {bot.chinese_name || bot.display_name || COMP_WORKSPACE_LABELS.VENTURO_機器人}
        </span>
      </button>
    </div>
  )
}
