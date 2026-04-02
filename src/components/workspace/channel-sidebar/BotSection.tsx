'use client'
/**
 * 機器人區塊
 * VENTURO 機器人 = 系統通知 + Logan AI 對話
 */

import { useMemo, useState, useEffect } from 'react'
import { Bot, Sparkles } from 'lucide-react'
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
  const [aiAvailable, setAiAvailable] = useState(false)

  // 檢查 AI 是否可用（使用 sessionStorage 快取 5 分鐘）
  useEffect(() => {
    const cacheKey = 'logan-ai-available'
    const cached = sessionStorage.getItem(cacheKey)

    if (cached) {
      const { available, timestamp } = JSON.parse(cached)
      // 5 分鐘內用快取
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        setAiAvailable(available)
        return
      }
    }

    fetch('/api/logan/chat')
      .then(res => res.json())
      .then(data => {
        setAiAvailable(data.available)
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            available: data.available,
            timestamp: Date.now(),
          })
        )
      })
      .catch(() => setAiAvailable(false))
  }, [])

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
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center',
            aiAvailable ? 'bg-morandi-green/100/20' : 'bg-morandi-gold/20'
          )}
        >
          {aiAvailable ? (
            <Sparkles size={14} className="text-morandi-green" />
          ) : (
            <Bot size={14} className="text-morandi-gold" />
          )}
        </div>
        <span className="flex-1 text-left truncate font-medium">
          {bot.chinese_name || bot.display_name || COMP_WORKSPACE_LABELS.VENTURO_機器人}
        </span>
        {aiAvailable && (
          <span className="text-[10px] text-morandi-green bg-morandi-green/100/10 px-1.5 py-0.5 rounded">
            AI
          </span>
        )}
      </button>
    </div>
  )
}
