import { logger } from '@/lib/utils/logger'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { ApiError, successResponse } from '@/lib/api/response'
import { addChannelMembersSchema, removeChannelMemberSchema } from '@/lib/validations/api-schemas'

type RouteParams = {
  params: Promise<{
    id: string
    channelId: string
  }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized()
  }

  const { id: workspaceId, channelId } = await params

  if (!workspaceId || !channelId) {
    return ApiError.validation('workspaceId and channelId are required')
  }

  if (auth.data.workspaceId !== workspaceId) {
    return ApiError.forbidden('無權存取此 workspace')
  }

  try {
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('channel_members')
      .select(
        `
          id,
          workspace_id,
          channel_id,
          employee_id,
          role,
          status,
          created_at,
          updated_at,
          employees:employee_id (
            id,
            display_name,
            english_name,
            email,
            avatar,
            status
          )
        `
      )
      .eq('workspace_id', workspaceId)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Failed to load channel members:', error)
      return ApiError.database(error.message)
    }

    const members = (data || []).map((member: Record<string, any>) => ({
      id: member.id as string,
      workspaceId: member.workspace_id as string,
      channelId: member.channel_id as string,
      employeeId: member.employee_id as string,
      role: member.role as string,
      status: member.status as string,
      invitedAt: null as string | null,
      joinedAt: member.created_at as string | null,
      lastSeenAt: member.updated_at as string | null,
      profile: member.employees
        ? {
            id: member.employees.id as string,
            displayName: member.employees.display_name as string,
            englishName: member.employees.english_name as string | null,
            email: member.employees.email as string | null,
            avatar: member.employees.avatar as string | null,
            status: member.employees.status as string | null,
          }
        : null,
    }))

    return successResponse({ members })
  } catch (error) {
    return ApiError.internal('Failed to load channel members')
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized()
  }

  const { id: workspaceId, channelId } = await params

  if (!workspaceId || !channelId) {
    return ApiError.validation('workspaceId and channelId are required')
  }

  if (auth.data.workspaceId !== workspaceId) {
    return ApiError.forbidden('無權存取此 workspace')
  }

  const body = await request.json().catch(() => ({}))
  const parsed = addChannelMembersSchema.safeParse(body)
  if (!parsed.success) {
    return ApiError.validation(
      parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    )
  }
  const { employeeIds, role } = parsed.data

  try {
    const supabase = getSupabaseAdminClient()

    const membersToInsert = employeeIds.map(employeeId => ({
      workspace_id: workspaceId,
      channel_id: channelId,
      employee_id: employeeId,
      role,
      status: 'active',
    }))

    const { data: existingMembers } = await supabase
      .from('channel_members')
      .select('employee_id')
      .eq('workspace_id', workspaceId)
      .eq('channel_id', channelId)
      .in('employee_id', employeeIds)

    const existingEmployeeIds = new Set((existingMembers || []).map(m => m.employee_id))
    const newMembers = membersToInsert.filter(m => !existingEmployeeIds.has(m.employee_id))

    if (newMembers.length === 0) {
      return successResponse({ members: [], count: 0, message: 'All members already exist' })
    }

    const { data, error } = await supabase.from('channel_members').insert(newMembers).select()

    if (error) {
      logger.error('Failed to add channel members:', error)
      return ApiError.database(error.message)
    }

    return successResponse({ members: data || [], count: data?.length || 0 })
  } catch (error) {
    return ApiError.internal('Failed to add channel members')
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized()
  }

  const { id: workspaceId, channelId } = await params

  if (!workspaceId || !channelId) {
    return ApiError.validation('workspaceId and channelId are required')
  }

  if (auth.data.workspaceId !== workspaceId) {
    return ApiError.forbidden('無權存取此 workspace')
  }

  const body = await request.json().catch(() => ({}))
  const parsed = removeChannelMemberSchema.safeParse(body)
  if (!parsed.success) {
    return ApiError.missingField('memberId')
  }
  const { memberId } = parsed.data

  try {
    const supabase = getSupabaseAdminClient()

    const { error } = await supabase
      .from('channel_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('channel_id', channelId)
      .eq('id', memberId)

    if (error) {
      logger.error('Failed to remove channel member:', error)
      return ApiError.database(error.message)
    }

    return successResponse(null)
  } catch (error) {
    return ApiError.internal('Failed to remove channel member')
  }
}
