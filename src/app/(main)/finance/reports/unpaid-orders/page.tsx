'use client'

import { useState, useEffect, useMemo } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { useAuthStore } from '@/stores/auth-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface UnpaidOrder {
  id: string
  code: string
  order_number: string
  contact_person: string
  tour_code: string
  tour_name: string
  departure_date: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  payment_status: string
  status: string
  days_since_departure: number
}

const PAYMENT_STATUS_MAP: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  unpaid: { label: t('unpaidOrders.statusUnpaid'), variant: 'destructive' },
  partial: { label: t('unpaidOrders.statusPartial'), variant: 'secondary' },
  pending_deposit: { label: t('unpaidOrders.statusPendingDeposit'), variant: 'outline' },
}

export default function UnpaidOrdersPage() {
  const t = useTranslations('finance')

  const [data, setData] = useState<UnpaidOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const workspace_id = useAuthStore(s => s.user?.workspace_id)

  useEffect(() => {
    if (!workspace_id) return
    fetchData()
  }, [workspace_id])

  async function fetchData() {
    try {
      setLoading(true)
      // 改用金額算未收款 (paid_amount < total_amount) 取代 payment_status enum filter
      // payment_status 已被廢棄、SSOT 是 paid_amount / total_amount 兩個數字
      const { data: orders, error } = await supabase
        .from('orders')
        .select(
          `
          id, code, order_number, contact_person,
          total_amount, paid_amount, remaining_amount,
          payment_status, status,
          tours!inner(code, name, departure_date)
        `
        )
        .eq('workspace_id', workspace_id!)
        .eq('is_active', true)
        .not('status', 'in', '("cancelled","expired")')
        .order('created_at', { ascending: false })

      if (error) throw error

      const today = new Date()
      const mapped: UnpaidOrder[] = (orders ?? [])
        .filter(o => (o.paid_amount ?? 0) < (o.total_amount ?? 0))
        .map(o => {
          const tour = Array.isArray(o.tours) ? o.tours[0] : o.tours
          const depDate = tour?.departure_date ? new Date(tour.departure_date) : null
          const daysSince = depDate
            ? Math.floor((today.getTime() - depDate.getTime()) / 86400000)
            : 0
          // 衍生 status 給 UI 用、不再依賴 DB payment_status
          const paid = o.paid_amount ?? 0
          const total = o.total_amount ?? 0
          const derivedStatus = paid <= 0 ? 'unpaid' : paid < total ? 'partial' : 'paid'
          return {
            id: o.id,
            code: o.code,
            order_number: o.order_number ?? o.code,
            contact_person: o.contact_person,
            tour_code: tour?.code ?? '',
            tour_name: tour?.name ?? '',
            departure_date: tour?.departure_date ?? '',
            total_amount: total,
            paid_amount: paid,
            remaining_amount: o.remaining_amount ?? total - paid,
            payment_status: derivedStatus,
            status: o.status ?? '',
            days_since_departure: daysSince,
          }
        })

      setData(mapped)
    } catch (err) {
      logger.error('Failed to fetch unpaid orders:', err)
      toast.error(t('unpaidOrders.toastLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return data
    if (filter === 'overdue') return data.filter(d => d.days_since_departure > 0)
    return data.filter(d => d.payment_status === filter)
  }, [data, filter])

  const totalRemaining = useMemo(
    () => filtered.reduce((sum, d) => sum + d.remaining_amount, 0),
    [filtered]
  )

  const columns: TableColumn<UnpaidOrder>[] = [
    { key: 'order_number', label: t('unpaidOrders.colOrderNumber'), sortable: true },
    { key: 'contact_person', label: t('unpaidOrders.colContactPerson'), sortable: true },
    { key: 'tour_code', label: t('unpaidOrders.colTourCode'), sortable: true },
    {
      key: 'departure_date',
      label: t('unpaidOrders.colDepartureDate'),
      sortable: true,
      render: value => <DateCell date={value as string} />,
    },
    {
      key: 'payment_status',
      label: t('unpaidOrders.colPaymentStatus'),
      sortable: true,
      render: (_value, row) => {
        const info = PAYMENT_STATUS_MAP[row.payment_status]
        return info ? (
          <Badge variant={info.variant}>{info.label}</Badge>
        ) : (
          <span>{row.payment_status}</span>
        )
      },
    },
    {
      key: 'total_amount',
      label: t('unpaidOrders.colTotalAmount'),
      sortable: true,
      align: 'right',
      render: value => <CurrencyCell amount={Number(value)} />,
    },
    {
      key: 'paid_amount',
      label: t('unpaidOrders.colPaidAmount'),
      sortable: true,
      align: 'right',
      render: value => <CurrencyCell amount={Number(value)} />,
    },
    {
      key: 'remaining_amount',
      label: t('unpaidOrders.colRemainingAmount'),
      sortable: true,
      align: 'right',
      render: (_value, row) => (
        <span className={row.days_since_departure > 0 ? 'text-status-danger font-semibold' : ''}>
          <CurrencyCell amount={row.remaining_amount} />
        </span>
      ),
    },
    {
      key: 'days_since_departure',
      label: t('unpaidOrders.colDaysSinceDeparture'),
      sortable: true,
      align: 'center',
      render: (_value, row) => {
        if (row.days_since_departure > 0) {
          return (
            <Badge variant="destructive">
              {row.days_since_departure}
              {t('unpaidOrders.daysSuffix')}
            </Badge>
          )
        }
        if (row.days_since_departure === 0)
          return <span className="text-muted-foreground">{t('unpaidOrders.today')}</span>
        return <span className="text-muted-foreground">{t('unpaidOrders.notDeparted')}</span>
      },
    },
  ]

  return (
    <ListPageLayout
      title={t('unpaidOrders.label1474')}
      breadcrumb={[
        { label: t('unpaidOrders.breadcrumbHome'), href: '/dashboard' },
        { label: t('unpaidOrders.breadcrumbFinance'), href: '/finance' },
        { label: t('unpaidOrders.breadcrumbReports'), href: '/finance/reports' },
        { label: t('unpaidOrders.label1474'), href: '/finance/reports/unpaid-orders' },
      ]}
      headerActions={
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {t('unpaidOrders.totalRemainingPrefix')}
            <span className="font-semibold text-foreground">
              NT${totalRemaining.toLocaleString()}
            </span>
            （{filtered.length}
            {t('unpaidOrders.countSuffix')}）
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('unpaidOrders.all')}</SelectItem>
              <SelectItem value="overdue">{t('unpaidOrders.overdue')}</SelectItem>
              <SelectItem value="unpaid">{t('unpaidOrders.unpaid')}</SelectItem>
              <SelectItem value="partial">{t('unpaidOrders.partial')}</SelectItem>
              <SelectItem value="pending_deposit">
                {t('unpaidOrders.pendingDeposit')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      loading={loading}
      columns={columns}
      data={filtered}
      searchPlaceholder={t('unpaidOrders.searchPlaceholder')}
    />
  )
}
