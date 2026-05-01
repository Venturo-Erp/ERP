'use client'

/**
 * Leader Availability Store
 * Cloud-based hook for managing tour leader availability/schedules using SWR
 *
 * 用於管理領隊的可用檔期：
 * - available: 可用
 * - tentative: 暫定
 * - blocked: 不可用
 */

import { createCloudHook } from '@/hooks/createCloudHook'
import type { Database } from '@/lib/supabase/types'

// Leader Availability type from Supabase schema
export type LeaderAvailability = Database['public']['Tables']['leader_availability']['Row']
type CreateLeaderAvailability = Database['public']['Tables']['leader_availability']['Insert']
type UpdateLeaderAvailability = Database['public']['Tables']['leader_availability']['Update']

// Status types for leader availability
export type LeaderAvailabilityStatus = 'available' | 'tentative' | 'blocked'

// Status display configuration
export const LEADER_AVAILABILITY_STATUS_CONFIG: Record<
  LeaderAvailabilityStatus,
  { label: string; color: string }
> = {
  available: { label: '可用', color: 'bg-morandi-green/70 text-white' },
  tentative: { label: '暫定', color: 'bg-morandi-gold/70 text-white' },
  blocked: { label: '不可用', color: 'bg-morandi-red/70 text-white' },
}

/**
 * useLeaderAvailability - SWR hook for leader availability
 * Returns: { items, isLoading, isValidating, error, create, update, delete, fetchAll, getById }
 */
export const useLeaderAvailability = createCloudHook<LeaderAvailability>('leader_availability', {
  orderBy: { column: 'available_start_date', ascending: true },
  workspaceScoped: true,
})

/**
 * Helper function to check if a leader is available on a specific date
 */
function isLeaderAvailableOnDate(
  availability: LeaderAvailability[],
  leaderId: string,
  date: Date
): { available: boolean; status: LeaderAvailabilityStatus | null } {
  const dateStr = date.toISOString().split('T')[0]

  const matching = availability.find(a => {
    if (a.leader_id !== leaderId) return false
    return dateStr >= a.available_start_date && dateStr <= a.available_end_date
  })

  if (!matching) {
    return { available: false, status: null }
  }

  return {
    available: matching.status === 'available' || matching.status === 'tentative',
    status: matching.status as LeaderAvailabilityStatus,
  }
}

/**
 * Helper function to get available leaders for a date range
 */
function getAvailableLeadersForDateRange(
  availability: LeaderAvailability[],
  leaderIds: string[],
  startDate: Date,
  endDate: Date
): string[] {
  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  return leaderIds.filter(leaderId => {
    const leaderAvailability = availability.filter(a => a.leader_id === leaderId)

    // Check if there's any availability record that covers the entire date range
    return leaderAvailability.some(a => {
      const isStatusOk = a.status === 'available' || a.status === 'tentative'
      const coversStart = startStr >= a.available_start_date
      const coversEnd = endStr <= a.available_end_date
      return isStatusOk && coversStart && coversEnd
    })
  })
}
