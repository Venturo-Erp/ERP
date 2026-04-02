'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Calendar,
  MoreVertical,
  Bed,
  Bus,
  Wallet,
  ClipboardList,
  FileText,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateCompact } from '@/lib/utils/format-date'
import { supabase } from '@/lib/supabase/client'
import { MemberCard } from '@/components/mobile/cards/MemberCard'
import { PaymentCard } from '@/components/mobile/cards/PaymentCard'
import { TodoCard } from '@/components/mobile/cards/TodoCard'
import { ID_LABELS } from './constants/labels'

type TabType = 'overview' | 'members' | 'rooms' | 'vehicles' | 'finance' | 'todos'

const TABS: { id: TabType; label: string; icon: typeof FileText }[] = [
  { id: 'overview', label: ID_LABELS.TAB_OVERVIEW, icon: FileText },
  { id: 'members', label: ID_LABELS.TAB_MEMBERS, icon: Users },
  { id: 'rooms', label: ID_LABELS.TAB_ROOMS, icon: Bed },
  { id: 'vehicles', label: ID_LABELS.TAB_VEHICLES, icon: Bus },
  { id: 'finance', label: ID_LABELS.TAB_FINANCE, icon: Wallet },
  { id: 'todos', label: ID_LABELS.TAB_TODOS, icon: ClipboardList },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  開團: { label: ID_LABELS.STATUS_PROPOSAL, color: 'text-morandi-gold', bg: 'bg-morandi-gold/10' },
  待出發: { label: ID_LABELS.STATUS_IN_PROGRESS, color: 'text-morandi-green', bg: 'bg-morandi-green/10' },
  已結團: {
    label: ID_LABELS.STATUS_CLOSED,
    color: 'text-morandi-secondary',
    bg: 'bg-morandi-container',
  },
  取消: { label: ID_LABELS.STATUS_CANCELLED, color: 'text-morandi-red', bg: 'bg-morandi-red/10' },
}

// 資料庫類型
interface DbTour {
  id: string
  code: string
  name: string
  departure_date: string | null
  return_date: string | null
  current_participants: number | null
  status: string | null
}

interface DbMember {
  id: string
  chinese_name: string | null
  passport_name: string | null
  gender: string | null
}

interface DbPayment {
  id: string
  code: string
  notes: string | null
  amount: number
  status: string | null
  supplier_name: string | null
  tour_code: string | null
  created_at: string | null
  paid_at: string | null
}

interface DbTodo {
  id: string
  title: string
  notes: unknown
  status: string
  priority: number
  deadline: string | null
}

// 顯示類型
interface DisplayMember {
  id: string
  chinese_name: string | null
  passport_name: string | null
  gender: string | null
  checked_in: boolean
  room_number?: string | null
  vehicle_name?: string | null
  seat_number?: number | null
}

interface DisplayPayment {
  id: string
  code: string
  description: string
  amount: number
  status: 'pending' | 'confirmed' | 'billed' | 'rejected'
  supplier_name: string | null
  tour_code: string | null
  created_at: string | null
  paid_at: string | null
}

interface DisplayTodo {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  tour_code: string | null
}

interface Room {
  id: string
  room_number: string | null
  room_type: string
  hotel_name: string
  night_number: number
  capacity: number
  assigned_members: { id: string; name: string }[]
}

interface Vehicle {
  id: string
  vehicle_name: string
  vehicle_type: string
  capacity: number
  driver_name?: string | null
  assigned_members: { id: string; name: string; seat_number?: number }[]
}

// 工具函數
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

function calculateNights(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
}

export default function TourDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tourId = params.id as string

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [tour, setTour] = useState<DbTour | null>(null)
  const [members, setMembers] = useState<DisplayMember[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [payments, setPayments] = useState<DisplayPayment[]>([])
  const [todos, setTodos] = useState<DisplayTodo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 載入團資料
  useEffect(() => {
    async function loadTour() {
      const { data, error } = await supabase
        .from('tours')
        .select('id, code, name, departure_date, return_date, current_participants, status')
        .eq('id', tourId)
        .single()

      if (error || !data) {
        router.push('/m/tours')
        return
      }

      setTour(data)
      setIsLoading(false)
    }

    loadTour()
  }, [tourId, router])

  // 載入成員
  useEffect(() => {
    if (activeTab !== 'members' && activeTab !== 'overview') return

    async function loadMembers() {
      // 先取得該團的所有訂單 ID
      const { data: orders } = await supabase.from('orders').select('id').eq('tour_id', tourId)

      if (!orders || orders.length === 0) {
        setMembers([])
        return
      }

      const orderIds = orders.map(o => o.id)

      const { data } = await supabase
        .from('order_members')
        .select('id, chinese_name, passport_name, gender')
        .in('order_id', orderIds)

      const formatted: DisplayMember[] = (data || []).map((m: DbMember) => ({
        ...m,
        checked_in: false, // 資料庫沒有這個欄位，預設 false
      }))

      setMembers(formatted)
    }

    loadMembers()
  }, [activeTab, tourId])

  // 載入分房
  useEffect(() => {
    if (activeTab !== 'rooms') return

    async function loadRooms() {
      const { data } = await supabase
        .from('tour_rooms')
        .select(
          `
          id,
          room_number,
          room_type,
          hotel_name,
          night_number,
          capacity,
          tour_room_assignments(
            order_member_id,
            order_members(id, chinese_name)
          )
        `
        )
        .eq('tour_id', tourId)
        .order('night_number')
        .order('room_number')

      interface RoomData {
        id: string
        room_number: string | null
        room_type: string
        hotel_name: string
        night_number: number
        capacity: number
        tour_room_assignments: Array<{
          order_member_id: string
          order_members: { id: string; chinese_name: string | null } | null
        }>
      }

      const formattedRooms = ((data || []) as RoomData[]).map(room => ({
        id: room.id,
        room_number: room.room_number,
        room_type: room.room_type,
        hotel_name: room.hotel_name,
        night_number: room.night_number,
        capacity: room.capacity,
        assigned_members: (room.tour_room_assignments || []).map(a => ({
          id: a.order_members?.id || '',
          name: a.order_members?.chinese_name || ID_LABELS.UNNAMED,
        })),
      }))

      setRooms(formattedRooms)
    }

    loadRooms()
  }, [activeTab, tourId])

  // 載入分車
  useEffect(() => {
    if (activeTab !== 'vehicles') return

    async function loadVehicles() {
      const { data } = await supabase
        .from('tour_vehicles')
        .select(
          `
          id,
          vehicle_name,
          vehicle_type,
          capacity,
          driver_name,
          tour_vehicle_assignments(
            order_member_id,
            seat_number,
            order_members(id, chinese_name)
          )
        `
        )
        .eq('tour_id', tourId)
        .order('display_order')

      interface VehicleData {
        id: string
        vehicle_name: string
        vehicle_type: string
        capacity: number
        driver_name: string | null
        tour_vehicle_assignments: Array<{
          order_member_id: string
          seat_number: number | null
          order_members: { id: string; chinese_name: string | null } | null
        }>
      }

      const formattedVehicles = ((data || []) as VehicleData[]).map(v => ({
        id: v.id,
        vehicle_name: v.vehicle_name,
        vehicle_type: v.vehicle_type,
        capacity: v.capacity,
        driver_name: v.driver_name,
        assigned_members: (v.tour_vehicle_assignments || []).map(a => ({
          id: a.order_members?.id || '',
          name: a.order_members?.chinese_name || ID_LABELS.UNNAMED,
          seat_number: a.seat_number ?? undefined,
        })),
      }))

      setVehicles(formattedVehicles)
    }

    loadVehicles()
  }, [activeTab, tourId])

  // 載入財務
  useEffect(() => {
    if (activeTab !== 'finance') return

    async function loadPayments() {
      const { data } = await supabase
        .from('payment_requests')
        .select('id, code, notes, amount, status, supplier_name, tour_code, created_at, paid_at')
        .eq('tour_id', tourId)
        .order('created_at', { ascending: false })

      const formatted: DisplayPayment[] = ((data || []) as DbPayment[]).map(p => ({
        id: p.id,
        code: p.code,
        description: p.notes || ID_LABELS.NO_DESCRIPTION,
        amount: p.amount,
        status: (p.status || 'pending') as DisplayPayment['status'],
        supplier_name: p.supplier_name,
        tour_code: p.tour_code,
        created_at: p.created_at,
        paid_at: p.paid_at,
      }))

      setPayments(formatted)
    }

    loadPayments()
  }, [activeTab, tourId])

  // 載入待辦
  useEffect(() => {
    if (activeTab !== 'todos') return

    async function loadTodos() {
      const { data } = await supabase
        .from('todos')
        .select('id, title, notes, status, priority, deadline')
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('deadline', { ascending: true })
        .limit(20)

      const formatted: DisplayTodo[] = ((data || []) as DbTodo[]).map(t => ({
        id: t.id,
        title: t.title,
        description: typeof t.notes === 'string' ? t.notes : null,
        status: t.status as DisplayTodo['status'],
        priority: priorityNumberToString(t.priority),
        due_date: t.deadline,
        tour_code: tour?.code || null,
      }))

      setTodos(formatted)
    }

    loadTodos()
  }, [activeTab, tour?.code])

  if (isLoading || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold" />
      </div>
    )
  }

  const status = STATUS_CONFIG[tour.status || '開團'] || STATUS_CONFIG['開團']
  const durationNights = calculateNights(tour.departure_date || '', tour.return_date || '')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-morandi-container transition-colors -ml-2"
            >
              <ArrowLeft size={20} className="text-morandi-primary" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-morandi-primary">{tour.code}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', status.bg, status.color)}>
                  {status.label}
                </span>
              </div>
              <div className="text-sm text-morandi-secondary">
                {tour.name} {durationNights}
                {ID_LABELS.NIGHTS_SUFFIX}
              </div>
            </div>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-morandi-container transition-colors">
            <MoreVertical size={20} className="text-morandi-secondary" />
          </button>
        </div>

        {/* Tab 切換 */}
        <div className="flex overflow-x-auto scrollbar-hide border-t border-border">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'text-morandi-gold border-morandi-gold'
                    : 'text-morandi-secondary border-transparent hover:text-morandi-primary'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 內容區域 */}
      <div className="p-4">
        {/* 總覽 Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 基本資訊 */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-medium text-morandi-primary mb-3">{ID_LABELS.LABEL_8160}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-morandi-secondary" />
                  <span className="text-morandi-secondary">{ID_LABELS.LABEL_4513}</span>
                  <span className="ml-auto text-morandi-primary">
                    {formatDateCompact(tour.departure_date)} - {formatDateCompact(tour.return_date)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-morandi-secondary" />
                  <span className="text-morandi-secondary">{ID_LABELS.TOTAL_4426}</span>
                  <span className="ml-auto text-morandi-primary">
                    {tour.current_participants || 0} 人
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <UserCheck size={16} className="text-morandi-secondary" />
                  <span className="text-morandi-secondary">{ID_LABELS.LABEL_6686}</span>
                  <span className="ml-auto text-morandi-primary">{members.length} 人</span>
                </div>
              </div>
            </div>

            {/* 快速統計 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="text-2xl font-bold text-morandi-primary">{rooms.length}</div>
                <div className="text-sm text-morandi-secondary">{ID_LABELS.LABEL_7081}</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="text-2xl font-bold text-morandi-primary">{vehicles.length}</div>
                <div className="text-sm text-morandi-secondary">{ID_LABELS.LABEL_6648}</div>
              </div>
            </div>
          </div>
        )}

        {/* 成員 Tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {/* 成員統計 */}
            <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
              <span className="text-morandi-secondary">{ID_LABELS.TOTAL_3943}</span>
              <span className="font-bold text-morandi-primary">{members.length}</span>
            </div>

            {/* 成員列表 */}
            {members.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                tourCode={tour.code}
                tourId={tour.id}
                showActions={false}
              />
            ))}

            {members.length === 0 && (
              <div className="text-center py-8 text-morandi-secondary">{ID_LABELS.EMPTY_885}</div>
            )}
          </div>
        )}

        {/* 分房 Tab */}
        {activeTab === 'rooms' && (
          <div className="space-y-3">
            {rooms.map(room => (
              <div key={room.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bed size={16} className="text-morandi-secondary" />
                    <span className="font-medium text-morandi-primary">
                      {room.room_number || '未編號'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-container text-morandi-secondary">
                      {room.room_type}
                    </span>
                  </div>
                  <span className="text-sm text-morandi-secondary">
                    {room.assigned_members.length}/{room.capacity}
                  </span>
                </div>
                <div className="text-sm text-morandi-secondary mb-2">
                  {room.hotel_name} · 第{room.night_number}晚
                </div>
                <div className="flex flex-wrap gap-2">
                  {room.assigned_members.map(m => (
                    <span
                      key={m.id}
                      className="text-xs px-2 py-1 rounded-full bg-status-info/10 text-status-info"
                    >
                      {m.name}
                    </span>
                  ))}
                  {room.assigned_members.length === 0 && (
                    <span className="text-xs text-morandi-muted">{ID_LABELS.LABEL_3641}</span>
                  )}
                </div>
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="text-center py-8 text-morandi-secondary">{ID_LABELS.EMPTY_3224}</div>
            )}
          </div>
        )}

        {/* 分車 Tab */}
        {activeTab === 'vehicles' && (
          <div className="space-y-3">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bus size={16} className="text-morandi-secondary" />
                    <span className="font-medium text-morandi-primary">{vehicle.vehicle_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-container text-morandi-secondary">
                      {vehicle.vehicle_type}
                    </span>
                  </div>
                  <span className="text-sm text-morandi-secondary">
                    {vehicle.assigned_members.length}/{vehicle.capacity}
                  </span>
                </div>
                {vehicle.driver_name && (
                  <div className="text-sm text-morandi-secondary mb-2">
                    司機：{vehicle.driver_name}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {vehicle.assigned_members.map(m => (
                    <span
                      key={m.id}
                      className="text-xs px-2 py-1 rounded-full bg-morandi-green/10 text-morandi-green"
                    >
                      {m.name}
                      {m.seat_number && ` #${m.seat_number}`}
                    </span>
                  ))}
                  {vehicle.assigned_members.length === 0 && (
                    <span className="text-xs text-morandi-muted">{ID_LABELS.NOT_ASSIGNED}</span>
                  )}
                </div>
              </div>
            ))}

            {vehicles.length === 0 && (
              <div className="text-center py-8 text-morandi-secondary">{ID_LABELS.EMPTY_9630}</div>
            )}
          </div>
        )}

        {/* 財務 Tab */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            {/* 財務摘要 */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-medium text-morandi-primary mb-3">{ID_LABELS.LABEL_2382}</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-morandi-green">
                    {payments.filter(p => p.status === 'billed').length}
                  </div>
                  <div className="text-xs text-morandi-secondary">{ID_LABELS.LABEL_9075}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-morandi-gold">
                    {
                      payments.filter(p => p.status === 'pending' || p.status === 'confirmed')
                        .length
                    }
                  </div>
                  <div className="text-xs text-morandi-secondary">{ID_LABELS.PROCESSING}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-morandi-primary">
                    {new Intl.NumberFormat('zh-TW').format(
                      payments.reduce((sum, p) => sum + (p.amount || 0), 0)
                    )}
                  </div>
                  <div className="text-xs text-morandi-secondary">{ID_LABELS.TOTAL_6550}</div>
                </div>
              </div>
            </div>

            {/* 請款列表 */}
            <div className="space-y-3">
              <h3 className="font-medium text-morandi-primary">{ID_LABELS.LABEL_9799}</h3>
              {payments.map(payment => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
              {payments.length === 0 && (
                <div className="text-center py-8 text-morandi-secondary">
                  {ID_LABELS.EMPTY_2322}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 待辦 Tab */}
        {activeTab === 'todos' && (
          <div className="space-y-3">
            {todos.map(todo => (
              <TodoCard key={todo.id} todo={todo} />
            ))}
            {todos.length === 0 && (
              <div className="text-center py-8 text-morandi-secondary">
                {ID_LABELS.NOT_FOUND_500}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
