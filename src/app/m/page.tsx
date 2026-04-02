'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plane, PlaneLanding, ClipboardList, AlertCircle, ChevronRight, Search } from 'lucide-react'
import { DateCell } from '@/components/table-cells'
import { TourCard } from '@/components/mobile/cards'
import { TodoCard } from '@/components/mobile/cards'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { M_LABELS } from './constants/labels'

interface Tour {
  id: string
  code: string
  name: string
  departure_date: string | null
  return_date: string | null
  current_participants: number | null
  status: string | null
}

interface Todo {
  id: string
  title: string
  notes: unknown
  status: string
  priority: number
  deadline: string | null
  assignee: string | null
}

export default function MobileHomePage() {
  const { user } = useAuthStore()
  const [todayDepartures, setTodayDepartures] = useState<Tour[]>([])
  const [todayReturns, setTodayReturns] = useState<Tour[]>([])
  const [urgentTodos, setUrgentTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const today = getTodayString()

      try {
        const [departuresRes, returnsRes, todosRes] = await Promise.all([
          // 今日出發
          supabase
            .from('tours')
            .select('id, code, name, departure_date, return_date, current_participants, status')
            .eq('departure_date', today)
            .neq('status', '取消')
            .order('code'),

          // 今日返程
          supabase
            .from('tours')
            .select('id, code, name, departure_date, return_date, current_participants, status')
            .eq('return_date', today)
            .neq('status', '取消')
            .order('code'),

          // 緊急待辦 (priority 1=低, 2=中, 3=高, 4=緊急)
          supabase
            .from('todos')
            .select('id, title, notes, status, priority, deadline, assignee')
            .in('status', ['pending', 'in_progress'])
            .gte('priority', 3)
            .order('deadline', { ascending: true })
            .limit(5),
        ])

        setTodayDepartures(departuresRes.data || [])
        setTodayReturns(returnsRes.data || [])
        setUrgentTodos(todosRes.data || [])
      } catch (error) {
        logger.error('Failed to load home data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '早安'
    if (hour < 18) return '午安'
    return '晚安'
  }

  // 轉換 Tour 資料為 TourCard 需要的格式
  const formatTourForCard = (tour: Tour) => ({
    id: tour.id,
    code: tour.code,
    destination: tour.name,
    departure_date: tour.departure_date,
    return_date: tour.return_date,
    total_people: tour.current_participants || 0,
    status: tour.status || '開團',
    duration_nights: calculateNights(tour.departure_date || '', tour.return_date || ''),
  })

  // 轉換 Todo 資料為 TodoCard 需要的格式
  const formatTodoForCard = (todo: Todo) => ({
    id: todo.id,
    title: todo.title,
    description: typeof todo.notes === 'string' ? todo.notes : null,
    status: todo.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    priority: priorityNumberToString(todo.priority),
    due_date: todo.deadline,
    tour_code: null,
    assigned_to_name: todo.assignee,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-morandi-primary">
              {getGreeting()}，{user?.name || '你好'}
            </h1>
            <p className="text-sm text-morandi-secondary mt-0.5">
              <DateCell date={new Date()} format="long" showIcon={false} />
            </p>
          </div>
          <Link
            href="/m/search"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-morandi-container hover:bg-morandi-container/80 transition-colors"
          >
            <Search size={20} className="text-morandi-secondary" />
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 今日出發 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plane size={18} className="text-morandi-green" />
              <h2 className="font-bold text-morandi-primary">{M_LABELS.LABEL_5500}</h2>
              {todayDepartures.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-green/10 text-morandi-green">
                  {todayDepartures.length}
                </span>
              )}
            </div>
            <Link
              href="/m/tours?filter=departing"
              className="text-sm text-morandi-gold flex items-center gap-1"
            >
              查看全部 <ChevronRight size={16} />
            </Link>
          </div>
          {todayDepartures.length > 0 ? (
            <div className="space-y-3">
              {todayDepartures.map(tour => (
                <TourCard key={tour.id} tour={formatTourForCard(tour)} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-6 text-center text-morandi-secondary">
              {M_LABELS.LABEL_3700}
            </div>
          )}
        </section>

        {/* 今日返程 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PlaneLanding size={18} className="text-status-info" />
              <h2 className="font-bold text-morandi-primary">{M_LABELS.LABEL_8173}</h2>
              {todayReturns.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-status-info/10 text-status-info">
                  {todayReturns.length}
                </span>
              )}
            </div>
            <Link
              href="/m/tours?filter=returning"
              className="text-sm text-morandi-gold flex items-center gap-1"
            >
              查看全部 <ChevronRight size={16} />
            </Link>
          </div>
          {todayReturns.length > 0 ? (
            <div className="space-y-3">
              {todayReturns.map(tour => (
                <TourCard key={tour.id} tour={formatTourForCard(tour)} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-6 text-center text-morandi-secondary">
              {M_LABELS.LABEL_5477}
            </div>
          )}
        </section>

        {/* 緊急待辦 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-morandi-red" />
              <h2 className="font-bold text-morandi-primary">{M_LABELS.LABEL_5382}</h2>
              {urgentTodos.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-red/10 text-morandi-red">
                  {urgentTodos.length}
                </span>
              )}
            </div>
            <Link href="/m/todos" className="text-sm text-morandi-gold flex items-center gap-1">
              查看全部 <ChevronRight size={16} />
            </Link>
          </div>
          {urgentTodos.length > 0 ? (
            <div className="space-y-3">
              {urgentTodos.map(todo => (
                <TodoCard key={todo.id} todo={formatTodoForCard(todo)} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-6 text-center text-morandi-secondary">
              <ClipboardList size={24} className="mx-auto mb-2 text-morandi-muted" />
              {M_LABELS.NOT_FOUND_9241}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// 計算天數
function calculateNights(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
}

// 轉換 priority 數字為字串
function priorityNumberToString(priority: number): 'low' | 'medium' | 'high' | 'urgent' {
  switch (priority) {
    case 4:
      return 'urgent'
    case 3:
      return 'high'
    case 2:
      return 'medium'
    default:
      return 'low'
  }
}
