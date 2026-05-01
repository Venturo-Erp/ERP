interface ChannelMemberProfile {
  id: string
  displayName: string
  englishName?: string | null
  email?: string | null
  avatar?: string | null
  status?: string | null
}

export interface ChannelMember {
  id: string
  workspaceId: string
  channelId: string
  employeeId: string
  role: string
  status: string
  invitedAt: string | null
  joinedAt: string | null
  lastSeenAt: string | null
  profile: ChannelMemberProfile | null
}

interface ChannelMemberResponse {
  members: ChannelMember[]
}

function buildMembersEndpoint(workspaceId: string, channelId: string) {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/members`
}

export async function fetchChannelMembers(
  workspaceId: string,
  channelId: string
): Promise<ChannelMember[]> {
  const response = await fetch(buildMembersEndpoint(workspaceId, channelId), {
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Failed to load channel members (${response.status}): ${errorText || response.statusText}`
    )
  }

  const data = (await response.json()) as ChannelMemberResponse
  return data.members || []
}

export async function addChannelMembers(
  workspaceId: string,
  channelId: string,
  employeeIds: string[],
  role: string = 'member'
): Promise<ChannelMember[]> {
  const response = await fetch(buildMembersEndpoint(workspaceId, channelId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ employeeIds, role }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Failed to add channel members (${response.status}): ${errorText || response.statusText}`
    )
  }

  const data = await response.json()
  return data.members || []
}

export async function removeChannelMember(
  workspaceId: string,
  channelId: string,
  memberId: string
): Promise<void> {
  const response = await fetch(buildMembersEndpoint(workspaceId, channelId), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memberId }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Failed to remove channel member (${response.status}): ${errorText || response.statusText}`
    )
  }
}
