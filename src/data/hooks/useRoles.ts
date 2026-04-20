import useSWR from 'swr'

export interface Role {
  id: string
  name: string
  description: string | null
  is_admin: boolean
  sort_order: number
}

const fetcher = async (url: string): Promise<Role[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

/**
 * SWR hook for fetching HR roles list with caching.
 * Wraps REST endpoint /api/roles (not a direct supabase query,
 * so createEntityHook cannot be used here).
 */
export function useRoles() {
  const { data, isLoading, mutate } = useSWR<Role[]>(
    'hr-roles-list',
    () => fetcher('/api/roles'),
    { revalidateOnFocus: false }
  )

  return {
    roles: data ?? [],
    loading: isLoading,
    mutate,
  }
}
