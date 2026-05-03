'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Calendar, Inbox } from 'lucide-react'
import { useLayoutContext } from '@/lib/auth/useLayoutContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LeaveBalanceCards } from '@/features/hr/leave/components/LeaveBalanceCards'
import { LeaveRequestForm } from '@/features/hr/leave/components/LeaveRequestForm'
import { LeaveRequestList } from '@/features/hr/leave/components/LeaveRequestList'
import {
  useLeaveTypes,
  useLeaveBalances,
  useMyLeaveRequests,
  usePendingLeaveRequests,
} from '@/features/hr/leave/hooks/use-leave-data'
import { logger } from '@/lib/utils/logger'

interface MeData {
  monthly_salary: number
  attendance_bonus: number
}

export default function LeavePage() {
  const router = useRouter()
  const { payload } = useLayoutContext()
  const isAdmin = useMemo(
    () => payload.capabilities.some(c => c.startsWith('hr.')),
    [payload.capabilities]
  )

  const [tab, setTab] = useState<'mine' | 'review'>('mine')
  const [me, setMe] = useState<MeData>({ monthly_salary: 30000, attendance_bonus: 0 })

  const { data: leaveTypes } = useLeaveTypes()
  const { data: balances, mutate: mutateBalances } = useLeaveBalances()
  const { data: myRequests, mutate: mutateMine } = useMyLeaveRequests()
  const { data: pendingRequests, mutate: mutatePending } = usePendingLeaveRequests()

  // 拿自己的薪資 / 全勤獎金 → 算扣薪預覽
  useEffect(() => {
    if (!payload.employee?.id) return
    fetch(`/api/users/${payload.employee.id}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        const salary = Number(data.monthly_salary ?? 30000)
        const bonus = Number(data.salary_info?.attendance_bonus ?? 0)
        setMe({ monthly_salary: salary, attendance_bonus: bonus })
      })
      .catch(err => logger.warn('查薪資失敗', err))
  }, [payload.employee?.id])

  const handleSubmitted = () => {
    mutateBalances()
    mutateMine()
  }

  const handleReviewDone = () => {
    mutatePending()
    mutateBalances()
  }

  return (
    <div className="space-y-4">
      <ResponsiveHeader
        title="請假管理"
        icon={Calendar}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '請假', href: '/hr/leave' },
        ]}
        tabs={[
          { value: '/hr/attendance', label: '出勤管理' },
          { value: '/hr/leave', label: '請假管理' },
          { value: '/hr/overtime', label: '加班審核' },
          { value: '/hr/missed-clock', label: '補打卡審核' },
        ]}
        activeTab="/hr/leave"
        onTabChange={href => router.push(href)}
      />

      <Tabs value={tab} onValueChange={v => setTab(v as 'mine' | 'review')}>
        <TabsList className="bg-card/60 border border-border/60">
          <TabsTrigger value="mine">
            <Calendar size={14} className="mr-1.5" />
            我的請假
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="review">
              <Inbox size={14} className="mr-1.5" />
              待我審核
              {pendingRequests && pendingRequests.length > 0 && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-status-warning/20 text-status-warning">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine" className="space-y-4 mt-4">
          {/* 假別餘額卡片 */}
          <div>
            <h2 className="text-sm font-semibold text-morandi-primary mb-2">本年度假額</h2>
            <LeaveBalanceCards balances={balances ?? []} />
          </div>

          {/* 新增請假表單 */}
          <LeaveRequestForm
            leaveTypes={leaveTypes ?? []}
            balances={balances ?? []}
            monthlySalary={me.monthly_salary}
            attendanceBonus={me.attendance_bonus}
            onSubmitted={handleSubmitted}
          />

          {/* 我的請假紀錄 */}
          <div>
            <h2 className="text-sm font-semibold text-morandi-primary mb-2">我的請假紀錄</h2>
            <LeaveRequestList
              requests={myRequests ?? []}
              mode="mine"
              onActionDone={handleSubmitted}
            />
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="review" className="space-y-4 mt-4">
            <div>
              <h2 className="text-sm font-semibold text-morandi-primary mb-2">待審核請假單</h2>
              <LeaveRequestList
                requests={pendingRequests ?? []}
                mode="review"
                onActionDone={handleReviewDone}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
