'use client'

/**
 * ThemeSwitcher — 主題切換 UI
 *
 * 預覽卡片形式，選中時用主色框線標示當前主題。
 * 讀寫 `useThemeStore`，自動同步 localStorage + document.documentElement。
 */

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore, THEMES, type ThemeType } from '@/stores/theme-store'

// 每個主題的色卡預覽（對應 globals.css 的色值，只用來視覺預覽）
const THEME_PREVIEWS: Record<ThemeType, { bg: string; primary: string; accent: string }> = {
  morandi: { bg: '#f6f4f1', primary: '#3a3633', accent: '#c9aa7c' },
  iron: { bg: '#f4f5f7', primary: '#2d3139', accent: '#5d6670' },
  airtable: { bg: '#ffffff', primary: '#181d26', accent: '#1b61c9' },
}

export function ThemeSwitcher() {
  const currentTheme = useThemeStore(s => s.currentTheme)
  const setTheme = useThemeStore(s => s.setTheme)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {THEMES.map(item => {
        const active = currentTheme === item.value
        const preview = THEME_PREVIEWS[item.value]
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => setTheme(item.value)}
            className={cn(
              'relative rounded-lg border-2 p-4 text-left transition-all',
              active
                ? 'border-morandi-gold bg-morandi-gold-light'
                : 'border-border hover:border-morandi-gold/50 bg-card'
            )}
          >
            {/* 色卡預覽 */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-8 h-8 rounded-md border border-border/40"
                style={{ backgroundColor: preview.bg }}
              />
              <span
                className="w-8 h-8 rounded-md border border-border/40"
                style={{ backgroundColor: preview.primary }}
              />
              <span
                className="w-8 h-8 rounded-md border border-border/40"
                style={{ backgroundColor: preview.accent }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-morandi-primary">{item.label}</div>
                <div className="text-xs text-morandi-secondary mt-0.5">{item.description}</div>
              </div>
              {active && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-morandi-gold text-white flex items-center justify-center">
                  <Check size={14} />
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
