/**
 * useMembers Hook
 *
 * 管理成員的通用 Hook
 * 整合 SWR 資料取得、CRUD 操作、護照上傳等功能
 *
 * 用途：
 * - 提供統一的成員管理 API
 * - 支援依訂單或旅遊團過濾成員
 */

import { useMemo, useCallback } from 'react'
import { useMembers as useMembersData } from '@/data' // 使用 @/data 的 SWR hook
import { useMemberActions } from './useMemberActions' // 使用有同步邏輯的 actions
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { getCurrentWorkspaceId } from '@/lib/workspace-helpers'
import type { Member } from '@/stores/types'

// 使用 @/lib/workspace-helpers 的 getCurrentWorkspaceId

interface UseMembersOptions {
  /** 訂單 ID（選填，用於過濾成員） */
  orderId?: string
  /** 旅遊團 ID（選填，用於過濾成員 - 注意：目前成員不直接包含 tour_id，此過濾將不生效或需額外邏輯） */
  tourId?: string
  /** 出發日期（用於計算年齡，選填，傳遞給成員視圖） */
  departureDate?: string
}

interface UseMembersReturn {
  /** 該上下文的成員列表 */
  members: Member[]
  /** 是否正在載入 */
  isLoading: boolean
  /** 是否正在驗證/重新載入 */
  isValidating: boolean
  /** 錯誤訊息 */
  error: Error | undefined
  /** 當前 workspace ID */
  workspaceId: string | null
  /** 建立成員 */
  createMember: (
    data: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'order_id'>
  ) => Promise<Member>
  /** 更新成員 */
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>
  /** 刪除成員 */
  deleteMember: (id: string) => Promise<void>
  /** 重新載入成員 */
  refetchMembers: () => void // Renamed for clarity
  /** 根據 ID 取得成員 */
  getMemberById: (id: string) => Member | undefined
  /** 上傳護照照片到 Supabase Storage */
  uploadPassportImage: (
    fileName: string,
    file: File
  ) => Promise<{
    data: { publicUrl: string } | null
    error: Error | null
  }>
}

/**
 * 通用成員管理 Hook
 *
 * @example
 * ```tsx
 * // 取得某訂單的成員
 * const { members, isLoading } = useMembers({ orderId: 'order-123' })
 * // 取得某旅遊團的成員 (目前需要額外邏輯處理 tourId)
 * const { members: tourMembers } = useMembers({ tourId: 'tour-456' })
 * ```
 */
export function useMembers({ orderId, tourId }: UseMembersOptions = {}): UseMembersReturn {
  // 使用 @/data 的 SWR hook
  const {
    items: allMembers,
    loading: isLoading,
  } = useMembersData()
  
  // 相容舊 API
  const isValidating = false
  const error: Error | undefined = undefined
  const update = async (id: string, data: Partial<Member>) => {
    const { updateMember } = await import('@/data')
    return updateMember(id, data)
  }
  const fetchAll = async () => {
    const { invalidateMembers } = await import('@/data')
    return invalidateMembers()
  }
  const getById = (id: string) => allMembers.find(m => m.id === id)

  // 使用 useMemberActions 來執行 create/delete，這樣會自動同步 order.member_count
  const { create, delete: remove } = useMemberActions()

  // 取得當前 workspace ID
  const workspaceId = useMemo(() => getCurrentWorkspaceId(), [])

  // 過濾出該上下文的成員
  const members = useMemo(
    () => {
      let filtered = allMembers
      if (orderId) {
        filtered = filtered.filter(member => member.order_id === orderId)
      }
      // [Note] tourId 過濾需透過 OrderStore 取得相關訂單 ID
      // 目前僅支援 orderId 過濾，tourId 過濾待後續實作
      return filtered
    },
    [allMembers, orderId, tourId] // Added tourId to dependencies for future use
  )

  // 建立成員（自動注入 order_id，如果存在）
  const createMember = useCallback(
    async (
      data: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'order_id'>
    ): Promise<Member> => {
      const memberData = {
        ...data,
        order_id: orderId, // Inject orderId if available
        workspace_id: workspaceId,
      } as Omit<Member, 'id' | 'created_at' | 'updated_at'>

      return create(memberData)
    },
    [orderId, workspaceId, create]
  )

  // 更新成員
  const updateMember = useCallback(
    async (id: string, updates: Partial<Member>): Promise<void> => {
      await update(id, updates)
    },
    [update]
  )

  // 刪除成員
  const deleteMember = useCallback(
    async (id: string): Promise<void> => {
      return remove(id)
    },
    [remove]
  )

  // 重新載入
  const refetchMembers = useCallback(() => {
    // Renamed from refetch
    fetchAll()
  }, [fetchAll])

  // 根據 ID 取得成員
  const getMemberById = useCallback(
    (id: string): Member | undefined => {
      return getById(id)
    },
    [getById]
  )

  // 上傳護照照片到 Supabase Storage
  // 統一使用 passport-images bucket，路徑格式：passport_{timestamp}_{random}.jpg（根目錄）
  const uploadPassportImage = useCallback(
    async (
      fileName: string,
      file: File
    ): Promise<{ data: { publicUrl: string } | null; error: Error | null }> => {
      try {
        // 統一使用 passport-images bucket 和平坦路徑
        const { error: uploadError } = await supabase.storage
          .from('passport-images')
          .upload(fileName, file, { upsert: true })

        if (uploadError) {
          logger.error('上傳護照照片失敗:', uploadError)
          return { data: null, error: uploadError }
        }

        // 取得簽名 URL（passport-images bucket 已改為 private）
        const { data: urlData, error: urlError } = await supabase.storage
          .from('passport-images')
          .createSignedUrl(fileName, 3600 * 24 * 365) // 1 year signed URL

        if (urlError) {
          return { data: { publicUrl: '' }, error: urlError }
        }

        return {
          data: { publicUrl: urlData?.signedUrl || '' },
          error: null,
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('上傳失敗')
        logger.error('上傳護照照片失敗:', error)
        return { data: null, error }
      }
    },
    []
  )

  return {
    members,
    isLoading,
    isValidating,
    error,
    workspaceId,
    createMember,
    updateMember,
    deleteMember,
    refetchMembers, // Use refetchMembers here
    getMemberById,
    uploadPassportImage,
  }
}

export default useMembers // Export default useMembers
