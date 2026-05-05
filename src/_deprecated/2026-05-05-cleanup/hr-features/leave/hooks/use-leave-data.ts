'use client'

import useSWR from 'swr'

export interface LeaveType {
  id: string
  workspace_id: string
  code: string
  name: string
  pay_type: 'full' | 'half' | 'unpaid'
  quota_type: 'annual_seniority' | 'annual_fixed' | 'event_based' | 'no_limit' | 'monthly_fixed'
  default_days_per_year: number | null
  attendance_bonus_flag: 'protected' | 'proportional' | 'deductible'
  legal_basis: string | null
  requires_attachment: boolean
  attachment_threshold_days: number | null
  supports_hourly: boolean
  sort_order: number
  is_active: boolean
}

export interface LeaveBalance {
  id: string
  leave_type_id: string
  year: number
  total_days: number
  used_days: number
  pending_days: number
  remaining_days: number
  leave_type: Pick<
    LeaveType,
    | 'code'
    | 'name'
    | 'pay_type'
    | 'quota_type'
    | 'attendance_bonus_flag'
    | 'legal_basis'
    | 'requires_attachment'
    | 'attachment_threshold_days'
    | 'supports_hourly'
    | 'sort_order'
  > | null
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_at: string
  end_at: string
  total_minutes: number
  total_days: number
  reason: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'
  approver_id: string | null
  approved_at: string | null
  reject_reason: string | null
  estimated_deduction_amount: number | null
  created_at: string
  leave_types: { code: string; name: string; pay_type: string; attendance_bonus_flag: string } | null
  employees: { display_name: string | null; employee_number: string | null } | null
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error('fetch failed')
    return r.json()
  })

export function useLeaveTypes() {
  return useSWR<LeaveType[]>('/api/hr/leave-types', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
}

export function useLeaveBalances() {
  return useSWR<LeaveBalance[]>('/api/hr/leave-balances', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
}

export function useMyLeaveRequests(limit = 20) {
  return useSWR<LeaveRequest[]>(`/api/hr/leave-requests?limit=${limit}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
}

export function usePendingLeaveRequests() {
  return useSWR<LeaveRequest[]>('/api/hr/leave-requests?scope=workspace&status=pending', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
}

export function useWorkspaceLeaveRequests() {
  return useSWR<LeaveRequest[]>('/api/hr/leave-requests?scope=workspace&limit=50', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
}
