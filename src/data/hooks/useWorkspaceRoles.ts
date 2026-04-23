import useSWR from 'swr'
import { useAuthStore } from '@/stores'

export interface WorkspaceRole {
  id: string
  name: string
}

const fetcher = async (url: string): Promise<WorkspaceRole[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

/**
 * SWR hook for fetching workspace roles with caching.
 */
export function useWorkspaceRoles() {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  const key = workspaceId ? `workspace-roles-${workspaceId}` : null

  const { data, isLoading } = useSWR<WorkspaceRole[]>(
    key,
    () => fetcher('/api/roles'),
    { revalidateOnFocus: false }
  )

  return {
    roles: data ?? [],
    loading: isLoading,
  }
}
