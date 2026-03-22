'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, BarChart3, CheckSquare, Bell, Gamepad2, LogIn } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { GAME_OFFICE_LABELS } from './constants/labels'

const TABS = [
  { id: 'stats', label: '數據', icon: BarChart3 },
  { id: 'chat', label: '聊天', icon: MessageSquare },
  { id: 'todos', label: '待辦', icon: CheckSquare },
  { id: 'alerts', label: '通知', icon: Bell },
] as const

type TabId = (typeof TABS)[number]['id']

interface DashboardStats {
  activeTours: number
  pendingOrders: number
  todayRevenue: string
  pendingRequests: number
  recentTours: string[]
}

export default function LeftPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('stats')
  const { user, isAuthenticated } = useAuthStore()

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] border-r border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <Gamepad2 className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-bold text-emerald-400">{GAME_OFFICE_LABELS.LABEL_4906}</span>
      </div>

      {!isAuthenticated ? (
        /* Not logged in */
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <div className="text-4xl">🎮</div>
          <p className="text-sm text-muted-foreground text-center">
            {GAME_OFFICE_LABELS.LABEL_6922}
          </p>
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {GAME_OFFICE_LABELS.LABEL_2142}
          </Link>
          <p className="text-xs text-morandi-secondary mt-2">{GAME_OFFICE_LABELS.LABEL_4923}</p>
        </div>
      ) : (
        <>
          {/* User info */}
          <div className="px-3 py-2 border-b border-[var(--border)] text-xs text-morandi-secondary">
            👤 {user?.display_name || user?.chinese_name || '使用者'}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-morandi-secondary hover:text-muted-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4 mb-1" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 text-sm text-muted-foreground">
            {activeTab === 'stats' && <StatsPanel />}
            {activeTab === 'chat' && <ChatPanel />}
            {activeTab === 'todos' && <TodosPanel />}
            {activeTab === 'alerts' && <AlertsPanel />}
          </div>
        </>
      )}
    </div>
  )
}

function StatsPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Active tours
        const { count: activeTours } = await supabase
          .from('tours')
          .select('*', { count: 'exact', head: true })
          .in('status', ['confirmed', 'in_progress'])
          .eq('workspace_id', useAuthStore.getState().user?.workspace_id || '')

        // Pending orders
        const { count: pendingOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_deposit')
          .eq('workspace_id', useAuthStore.getState().user?.workspace_id || '')

        // Recent tours
        const { data: recentToursData } = (await supabase
          .from('tours')
          .select('tour_code, destination, current_participants')
          .in('status', ['confirmed', 'in_progress'])
          .eq('workspace_id', useAuthStore.getState().user?.workspace_id || '')
          .order('departure_date', { ascending: true })
          .limit(5)) as unknown as {
          data:
            | {
                tour_code: string | null
                destination: string | null
                current_participants: number | null
              }[]
            | null
        }

        setStats({
          activeTours: activeTours || 0,
          pendingOrders: pendingOrders || 0,
          todayRevenue: '-',
          pendingRequests: 0,
          recentTours: (recentToursData || []).map(
            t => `${t.tour_code} ${t.destination || ''} (${t.current_participants || 0}人)`
          ),
        })
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading)
    return (
      <div className="text-xs text-morandi-secondary animate-pulse">
        {GAME_OFFICE_LABELS.LOADING_6991}
      </div>
    )

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-morandi-secondary uppercase">
        {GAME_OFFICE_LABELS.LABEL_3241}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: '進行中的團', value: String(stats?.activeTours || 0), color: 'text-blue-400' },
          {
            label: '待處理訂單',
            value: String(stats?.pendingOrders || 0),
            color: 'text-yellow-400',
          },
          { label: '今日收款', value: stats?.todayRevenue || '-', color: 'text-emerald-400' },
          {
            label: '待確認需求',
            value: String(stats?.pendingRequests || 0),
            color: 'text-orange-400',
          },
        ].map(s => (
          <div key={s.label} className="bg-morandi-primary/50 rounded-lg p-2">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-morandi-secondary">{s.label}</div>
          </div>
        ))}
      </div>
      {stats?.recentTours && stats.recentTours.length > 0 && (
        <>
          <h3 className="text-xs font-bold text-morandi-secondary uppercase mt-4">
            {GAME_OFFICE_LABELS.LABEL_8724}
          </h3>
          <div className="space-y-2">
            {stats.recentTours.map(t => (
              <div key={t} className="bg-morandi-primary/50 rounded px-2 py-1.5 text-xs">
                {t}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ChatPanel() {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-morandi-secondary uppercase">
        {GAME_OFFICE_LABELS.LABEL_4689}
      </h3>
      <div className="text-xs text-morandi-secondary text-center py-8">即將推出 💬</div>
    </div>
  )
}

function TodosPanel() {
  const [todos, setTodos] = useState<{ id: string; title: string; done: boolean }[]>([])

  useEffect(() => {
    async function fetchTodos() {
      const { data } = await supabase
        .from('todos')
        .select('id, title, completed')
        .eq('completed', false)
        .eq('workspace_id', useAuthStore.getState().user?.workspace_id || '')
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) {
        setTodos(data.map(t => ({ id: t.id, title: t.title, done: t.completed ?? false })))
      }
    }
    fetchTodos()
  }, [])

  if (todos.length === 0) {
    return <div className="text-xs text-morandi-secondary text-center py-8">沒有待辦事項 ✅</div>
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-morandi-secondary uppercase">
        {GAME_OFFICE_LABELS.LABEL_4477}
      </h3>
      {todos.map(t => (
        <label
          key={t.id}
          className="flex items-center gap-2 text-xs cursor-pointer hover:text-white"
        >
          <input type="checkbox" className="rounded border-[var(--border)]" />
          {t.title}
        </label>
      ))}
    </div>
  )
}

function AlertsPanel() {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-morandi-secondary uppercase">
        {GAME_OFFICE_LABELS.LABEL_514}
      </h3>
      <div className="text-xs text-morandi-secondary text-center py-8">目前沒有新通知 ✅</div>
    </div>
  )
}
