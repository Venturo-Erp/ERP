'use client'

/**
 * 車趟管理頁面
 *
 * 車行專用：顯示收到的派車需求和已確認的車趟
 */

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Truck, Inbox, CheckCircle, Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface TripRequest {
  id: string
  tour_id: string
  status: string
  created_at: string
  items: unknown[]
  tour?: {
    code: string
    name: string
    departure_date: string
    return_date: string
    current_participants: number
  }
}

export default function SupplierTripsPage() {
  const { user } = useAuthStore()
  const [pendingTrips, setPendingTrips] = useState<TripRequest[]>([])
  const [confirmedTrips, setConfirmedTrips] = useState<TripRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    if (!user?.workspace_id) return

    const fetchTrips = async () => {
      setLoading(true)

      // 取得發給此車行的交通需求
      const { data, error } = await supabase
        .from('tour_requests')
        .select(
          `
          id,
          tour_id,
          status,
          created_at,
          items,
          tour:tours(code, name, departure_date, return_date, current_participants)
        `
        )
        .eq('recipient_workspace_id', user.workspace_id as string)
        .eq('request_type', 'transport')
        .order('created_at', { ascending: false })

      if (!error && data) {
        // 分類：待確認 vs 已確認
        const pending = data.filter(t => t.status === 'sent' || t.status === 'draft')
        const confirmed = data.filter(t => t.status === 'confirmed' || t.status === 'accepted')
        setPendingTrips(pending as TripRequest[])
        setConfirmedTrips(confirmed as TripRequest[])
      }

      setLoading(false)
    }

    fetchTrips()
  }, [user?.workspace_id])

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return format(new Date(date), 'MM/dd (EEE)', { locale: zhTW })
  }

  const renderTripCard = (trip: TripRequest, isPending: boolean) => {
    const tour = trip.tour as TripRequest['tour']

    return (
      <Card key={trip.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isPending ? 'secondary' : 'default'}>
                {isPending ? '待確認' : '已確認'}
              </Badge>
              <span className="text-sm text-muted-foreground">{tour?.code || '未知團號'}</span>
            </div>

            <h3 className="font-medium mb-2">{tour?.name || '未知行程'}</h3>

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {formatDate(tour?.departure_date || null)} -{' '}
                  {formatDate(tour?.return_date || null)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{tour?.current_participants || 0} 人</span>
              </div>
            </div>
          </div>

          <Button variant={isPending ? 'default' : 'outline'} size="sm" className="ml-4">
            {isPending ? '查看報價' : '管理車趟'}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <ContentPageLayout
      title="車趟管理"
      icon={Truck}
      tabs={[
        {
          value: 'pending',
          label: `收到的派車${pendingTrips.length > 0 ? ` (${pendingTrips.length})` : ''}`,
          icon: Inbox,
        },
        { value: 'confirmed', label: '已確認車趟', icon: CheckCircle },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="pending">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : pendingTrips.length === 0 ? (
            <Card className="p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">目前沒有待確認的派車</h3>
              <p className="text-sm text-muted-foreground">新的派車需求會顯示在這裡</p>
            </Card>
          ) : (
            <div className="space-y-3">{pendingTrips.map(trip => renderTripCard(trip, true))}</div>
          )}
        </TabsContent>

        <TabsContent value="confirmed">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : confirmedTrips.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">目前沒有已確認的車趟</h3>
              <p className="text-sm text-muted-foreground">確認派車需求後會顯示在這裡</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {confirmedTrips.map(trip => renderTripCard(trip, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </ContentPageLayout>
  )
}
