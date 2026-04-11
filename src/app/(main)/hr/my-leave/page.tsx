'use client'

import React, { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

interface LeaveRequest {
  id: string
  start_date: string
  end_date: string
  days: number
  reason: string | null
  status: string
  created_at: string | null
  leave_type_name?: string
}

interface LeaveBalance {
  leave_type_name: string
  leave_type_code: string
  entitled_days: number
  used_days: number
  remaining_days: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待審核', color: 'bg-status-warning-bg text-status-warning' },
  approved: { label: '已核准', color: 'bg-morandi-green/10 text-morandi-green' },
  rejected: { label: '已駁回', color: 'bg-morandi-red/10 text-morandi-red' },
  cancelled: { label: '已取消', color: 'bg-morandi-container text-morandi-muted' },
}

export default function MyLeavePage() {
  const user = useAuthStore(state => state.user)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      setLoading(true)
      try {
        // 請假紀錄
        const { data: reqs } = await supabase
          .from('leave_requests')
          .select(`
            id, start_date, end_date, days, reason, status, created_at,
            leave_type:leave_types!leave_requests_leave_type_id_fkey(name)
          `)
          .eq('employee_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30)

        setRequests((reqs || []).map(r => ({
          ...r,
          leave_type_name: (r.leave_type as { name: string } | null)?.name || '未知',
        })))

        // 假別餘額
        const year = new Date().getFullYear()
        const { data: bals } = await supabase
          .from('leave_balances')
          .select(`
            entitled_days, used_days, remaining_days,
            leave_type:leave_types!leave_balances_leave_type_id_fkey(name, code)
          `)
          .eq('employee_id', user.id)
          .eq('year', year)

        setBalances((bals || []).map(b => {
          const lt = b.leave_type as { name: string; code: string } | null
          return {
            leave_type_name: lt?.name || '未知',
            leave_type_code: lt?.code || '',
            entitled_days: b.entitled_days || 0,
            used_days: b.used_days || 0,
            remaining_days: b.remaining_days || 0,
          }
        }))
      } catch (err) {
        logger.error('載入請假紀錄失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  return (
    <ContentPageLayout title="我的請假" icon={Calendar}>
      <div className="space-y-4">
        {/* 假別餘額 */}
        {balances.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {balances.map(b => (
              <Card key={b.leave_type_code} className="rounded-xl border border-border p-4">
                <p className="text-xs text-morandi-muted">{b.leave_type_name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-morandi-primary">{b.remaining_days}</span>
                  <span className="text-xs text-morandi-muted">/ {b.entitled_days} 天</span>
                </div>
                <div className="mt-2 h-1.5 bg-morandi-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-morandi-gold rounded-full"
                    style={{ width: `${b.entitled_days > 0 ? (b.used_days / b.entitled_days) * 100 : 0}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}

        {balances.length === 0 && !loading && (
          <Card className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-morandi-muted">
            尚未設定假別餘額，請聯繫管理員初始化
          </Card>
        )}

        {/* 請假紀錄 */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-morandi-container/40 border-b border-border/60">
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">假別</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">日期</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">天數</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">事由</th>
                <th className="text-left px-4 py-2 font-medium text-morandi-secondary">狀態</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-morandi-muted">載入中...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-morandi-muted">尚無請假紀錄</td></tr>
              ) : (
                requests.map(r => {
                  const s = STATUS_MAP[r.status] || STATUS_MAP.pending
                  return (
                    <tr key={r.id} className="border-b border-border/30 hover:bg-morandi-container/20">
                      <td className="px-4 py-2 font-medium text-morandi-primary">{r.leave_type_name}</td>
                      <td className="px-4 py-2 text-morandi-secondary">{r.start_date === r.end_date ? r.start_date : `${r.start_date} ~ ${r.end_date}`}</td>
                      <td className="px-4 py-2">{r.days} 天</td>
                      <td className="px-4 py-2 text-morandi-secondary truncate max-w-[200px]">{r.reason || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', s.color)}>{s.label}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ContentPageLayout>
  )
}
