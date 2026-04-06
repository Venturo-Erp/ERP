'use client'

/**
 * useSupplierWorkspaces - 取得供應商類型的 Workspace
 *
 * 用於跨公司需求系統，讓旅行社選擇要發送需求單給哪個供應商
 */

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

import type { WorkspaceType } from '@/features/workspaces/types'
export type { WorkspaceType }

export type SupplierWorkspace = Database['public']['Tables']['workspaces']['Row'] & {
  type: WorkspaceType
}

// Workspace 類型配置
export const WORKSPACE_TYPE_CONFIG: Record<WorkspaceType, { label: string; color: string }> = {
  travel_agency: { label: '旅行社', color: 'bg-morandi-blue/70 text-white' },
  vehicle_supplier: { label: '車行', color: 'bg-morandi-gold/70 text-white' },
  guide_supplier: { label: '領隊公司', color: 'bg-morandi-green/70 text-white' },
}

interface UseSupplierWorkspacesOptions {
  /** 只取得特定類型的供應商 */
  types?: WorkspaceType[]
  /** 排除自己的 workspace */
  excludeCurrentWorkspace?: boolean
}

/**
 * 取得供應商 Workspace 列表
 */
export function useSupplierWorkspaces(options?: UseSupplierWorkspacesOptions) {
  const { types, excludeCurrentWorkspace = true } = options || {}

  // 預設只取得供應商類型
  const targetTypes = types || ['vehicle_supplier', 'guide_supplier']

  const fetcher = async (): Promise<SupplierWorkspace[]> => {
    let query = supabase
      .from('workspaces')
      .select(
        'id, name, code, description, legal_name, phone, email, address, tax_id, logo_url, is_active, type, created_at, updated_at'
      )
      .in('type', targetTypes)
      .order('name')
      .limit(500)

    // 如果需要排除當前 workspace
    if (excludeCurrentWorkspace) {
      try {
        const authData = localStorage.getItem('auth-storage')
        if (authData) {
          const parsed = JSON.parse(authData)
          const currentWorkspaceId = parsed?.state?.user?.workspace_id
          if (currentWorkspaceId) {
            query = query.neq('id', currentWorkspaceId)
          }
        }
      } catch {
        // 忽略解析錯誤
      }
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data || []) as SupplierWorkspace[]
  }

  const {
    data: workspaces = [],
    error,
    isLoading,
  } = useSWR(['supplier-workspaces', targetTypes.join(','), excludeCurrentWorkspace], fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 分鐘內不重複請求
  })

  return {
    workspaces,
    isLoading,
    error,
  }
}

/**
 * 根據需求類別取得對應的供應商類型
 */
export function getCategorySupplierType(category: string): WorkspaceType | null {
  switch (category) {
    case 'transport':
      return 'vehicle_supplier'
    case 'guide':
      return 'guide_supplier'
    default:
      return null
  }
}
