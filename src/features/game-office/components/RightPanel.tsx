'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { GAME_OFFICE_LABELS } from './constants/labels'

interface TourInfo {
  tour_code: string
  status: string
  departure_time?: string
}

interface ActivityItem {
  icon: string
  text: string
}

export default function RightPanel() {
  const { user, isAuthenticated } = useAuthStore()
  const [clock, setClock] = useState('')
  const [stats, setStats] = useState({ tours: 0, orders: 0, requests: 0, revenue: 0 })
  const [todayTours, setTodayTours] = useState<TourInfo[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [teamMembers, setTeamMembers] = useState<
    { name: string; role: string; status: string; color: string }[]
  >([])

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch real data
  useEffect(() => {
    if (!isAuthenticated || !user?.workspace_id) return

    async function fetchData() {
      const wid = user?.workspace_id || ''

      // Tour count
      const { count: tourCount } = await supabase
        .from('tours')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wid)
        .in('status', ['confirmed', 'in_progress'])

      // Pending orders
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wid)
        .eq('status', 'pending_deposit')

      // Today's tours
      const today = new Date().toISOString().split('T')[0]
      const { data: toursData } = (await supabase
        .from('tours')
        .select('tour_code, status, departure_date')
        .eq('workspace_id', wid)
        .gte('departure_date', today)
        .lte('departure_date', today + 'T23:59:59')
        .limit(5)) as unknown as {
        data: { tour_code: string; status: string; departure_date: string }[] | null
      }

      // Team members (employees)
      const { data: employees } = (await supabase
        .from('employees')
        .select('display_name, position')
        .eq('workspace_id', wid)
        .eq('is_active', true)
        .limit(6)) as unknown as { data: { display_name: string; position: string }[] | null }

      setStats({
        tours: tourCount || 0,
        orders: orderCount || 0,
        requests: 0,
        revenue: 0,
      })

      if (toursData) {
        setTodayTours(
          toursData.map(t => ({
            tour_code: t.tour_code || '',
            status:
              t.status === 'in_progress'
                ? '已出發'
                : t.status === 'confirmed'
                  ? '集合中'
                  : t.status,
          }))
        )
      }

      if (employees) {
        const statusOptions = [
          '處理報價',
          '拜訪客戶',
          '等待回覆',
          '製作行程',
          '確認訂單',
          '整理資料',
        ]
        const colors = [
          'text-emerald-400',
          'text-blue-400',
          'text-yellow-400',
          'text-purple-400',
          'text-cyan-400',
        ]
        setTeamMembers(
          employees.map((e, i) => ({
            name: e.display_name || '員工',
            role: e.position || 'OP',
            status: statusOptions[i % statusOptions.length],
            color: colors[i % colors.length],
          }))
        )
      }

      setActivities([
        { icon: '📋', text: '泰國地接回覆了報價' },
        { icon: '💰', text: '王小姐匯入尾款' },
        { icon: '📝', text: '新訂單：林家族 6 人北海道' },
      ])
    }

    fetchData()
  }, [isAuthenticated, user?.workspace_id])

  const statusColors: Record<string, string> = {
    已出發: 'text-emerald-400',
    集合中: 'text-yellow-400',
    confirmed: 'text-blue-400',
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-muted-foreground font-mono text-sm border-l border-[var(--border)] overflow-y-auto">
      {/* Online + Clock */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-bold tracking-wider">ONLINE</span>
        </div>
        <div className="text-4xl font-bold text-white tracking-widest text-center">{clock}</div>
      </div>

      {/* 今日概覽 */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-blue-400">📊</span>
          <span className="text-xs text-morandi-secondary font-bold">
            {GAME_OFFICE_LABELS.LABEL_8131}
          </span>
        </div>
        <div className="space-y-2">
          <Row
            label={GAME_OFFICE_LABELS.LABEL_8538}
            value={`${stats.tours} 團`}
            color="text-emerald-400"
          />
          <Row
            label={GAME_OFFICE_LABELS.CONFIRM_173}
            value={`${stats.orders} 筆`}
            color="text-yellow-400"
          />
          <Row
            label={GAME_OFFICE_LABELS.PROCESSING_7916}
            value={`${stats.requests} 筆`}
            color="text-orange-400"
          />
          <Row
            label={GAME_OFFICE_LABELS.LABEL_5096}
            value={stats.revenue ? `NT$ ${stats.revenue.toLocaleString()}` : '-'}
            color="text-emerald-400"
          />
        </div>
      </div>

      {/* 團隊狀態 */}
      {teamMembers.length > 0 && (
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-400">👥</span>
            <span className="text-xs text-morandi-secondary font-bold">
              {GAME_OFFICE_LABELS.LABEL_6017}
            </span>
          </div>
          <div className="space-y-2">
            {teamMembers.map((m, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {m.name}（{m.role}）
                </span>
                <span className={`flex items-center gap-1 ${m.color} font-bold`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 今日出團 */}
      {todayTours.length > 0 && (
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-400">✈</span>
            <span className="text-xs text-morandi-secondary font-bold">
              {GAME_OFFICE_LABELS.LABEL_2938}
            </span>
          </div>
          <div className="space-y-2">
            {todayTours.map((t, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.tour_code}</span>
                <span className={`font-bold ${statusColors[t.status] || 'text-muted-foreground'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 會議系統 */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-purple-400">🎙️</span>
          <span className="text-xs text-morandi-secondary font-bold">
            {GAME_OFFICE_LABELS.LABEL_1006}
          </span>
        </div>
        <div className="space-y-2">
          <div className="bg-morandi-primary/50 rounded-lg p-3 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-purple-400 font-bold">
                {GAME_OFFICE_LABELS.LABEL_8236}
              </span>
              <span className="text-[10px] text-morandi-secondary bg-morandi-primary px-1.5 py-0.5 rounded">
                0 人在線
              </span>
            </div>
            <button className="w-full py-1.5 text-xs text-morandi-secondary border border-dashed border-[var(--border)] rounded hover:border-purple-400 hover:text-purple-400 transition-colors">
              🚧 即將開放
            </button>
          </div>
          <div className="text-[10px] text-morandi-secondary">{GAME_OFFICE_LABELS.LABEL_9095}</div>
        </div>
      </div>

      {/* 最新動態 */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-yellow-400">🔔</span>
          <span className="text-xs text-morandi-secondary font-bold">
            {GAME_OFFICE_LABELS.LABEL_4511}
          </span>
        </div>
        <div className="space-y-2">
          {activities.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span>{a.icon}</span>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  )
}
