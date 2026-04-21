'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Channel, ChannelGroup } from '@/stores/workspace-store'
import { ChannelListSection, GroupedChannelList } from './ChannelListSection'
import { getWorkspaceMembers } from '@/lib/actions/user-actions'
import { BotSection } from './BotSection'
import { ColleaguesSection } from './ColleaguesSection'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

interface ChannelListProps {
  announcementChannels: Channel[]
  announcementGroup: ChannelGroup | undefined
  favoriteChannels: Channel[]
  userGroupedChannels: Array<{ group: ChannelGroup; channels: Channel[] }>
  ungroupedChannels: Channel[]
  unjoinedChannels: Channel[]
  archivedChannels: Channel[]
  archivedGroup: ChannelGroup | undefined
  dmMembers: Awaited<ReturnType<typeof getWorkspaceMembers>>
  selectedChannelId: string | null
  isAdmin: boolean
  expandedSections: Record<string, boolean>
  searchQuery?: string
  // Callbacks
  onSelectChannel: (channel: Channel | null) => void
  onSelectMember: (memberId: string) => void // New callback for DM
  toggleChannelFavorite: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  onJoinChannel: (id: string) => void
  onLeaveChannel: (id: string) => void
  checkIsMember: (id: string) => boolean
  toggleGroupCollapse: (groupId: string) => void
  handleDeleteGroupClick: (groupId: string) => void
  onToggleExpanded: (section: string, expanded: boolean) => void
  onDragEnd: (event: DragEndEvent) => Promise<void>
}

export function ChannelList({
  announcementChannels,
  announcementGroup,
  favoriteChannels,
  userGroupedChannels,
  ungroupedChannels,
  unjoinedChannels,
  archivedChannels,
  archivedGroup,
  dmMembers,
  selectedChannelId,
  isAdmin,
  expandedSections,
  searchQuery = '',
  onSelectChannel,
  onSelectMember,
  toggleChannelFavorite,
  onDelete,
  onEdit,
  onArchive,
  onUnarchive,
  onJoinChannel,
  onLeaveChannel,
  checkIsMember,
  toggleGroupCollapse,
  handleDeleteGroupClick,
  onToggleExpanded,
  onDragEnd,
}: ChannelListProps) {
  // 搜尋時顯示未加入的頻道
  const isSearching = searchQuery.trim().length > 0
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const allChannels = [
    ...announcementChannels,
    ...favoriteChannels,
    ...userGroupedChannels.flatMap(g => g.channels),
    ...ungroupedChannels,
    ...unjoinedChannels,
    ...archivedChannels,
  ]

  // Map dmMembers to a structure compatible with ChannelListSection
  const dmChannels = dmMembers.map(member => ({
    id: member.id, // Using user id as a key, will be handled by onSelectMember
    name: member.full_name,
    avatar_url: member.avatar_url,
    type: 'direct' as const, // Synthetic type for rendering
    // Add other required Channel properties as dummy values if needed
    group_id: null,
    is_favorite: false,
    order: 0,
    created_by: null,
    workspace_id: '',
    description: '',
    is_archived: false,
    scope: 'workspace' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={allChannels.map(ch => ch.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto">
          {/* 1. 公司公告（固定頂部） */}
          {announcementChannels.length > 0 && announcementGroup && (
            <GroupedChannelList
              group={announcementGroup}
              channels={announcementChannels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={onSelectChannel}
              toggleChannelFavorite={toggleChannelFavorite}
              onDelete={onDelete}
              onEdit={onEdit}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onJoinChannel={onJoinChannel}
              onLeaveChannel={onLeaveChannel}
              isAdmin={isAdmin}
              checkIsMember={checkIsMember}
              toggleGroupCollapse={toggleGroupCollapse}
              handleDeleteGroupClick={() => {}} // 系統群組不可刪除
            />
          )}

          {/* 1.5 VENTURO 機器人（公告下方） */}
          <BotSection onSelectBot={onSelectMember} selectedBotId={selectedChannelId} />

          {/* 🔥 2. 我的最愛（starred channels） */}
          {favoriteChannels.length > 0 && (
            <ChannelListSection
              channels={favoriteChannels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={onSelectChannel}
              toggleChannelFavorite={toggleChannelFavorite}
              onDelete={onDelete}
              onEdit={onEdit}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onJoinChannel={onJoinChannel}
              onLeaveChannel={onLeaveChannel}
              isAdmin={isAdmin}
              checkIsMember={checkIsMember}
              isExpanded={expandedSections.favorites !== false}
              onToggleExpanded={() => onToggleExpanded('favorites', !expandedSections.favorites)}
              title={COMP_WORKSPACE_LABELS.我的最愛}
              icon="star"
            />
          )}

          {/* 3. 使用者自訂群組 */}
          {userGroupedChannels.map(
            ({ group, channels: groupChannels }) =>
              groupChannels.length > 0 && (
                <GroupedChannelList
                  key={group.id}
                  group={group}
                  channels={groupChannels}
                  selectedChannelId={selectedChannelId}
                  onSelectChannel={onSelectChannel}
                  toggleChannelFavorite={toggleChannelFavorite}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onArchive={onArchive}
                  onUnarchive={onUnarchive}
                  onJoinChannel={onJoinChannel}
                  onLeaveChannel={onLeaveChannel}
                  isAdmin={isAdmin}
                  checkIsMember={checkIsMember}
                  toggleGroupCollapse={toggleGroupCollapse}
                  handleDeleteGroupClick={handleDeleteGroupClick}
                />
              )
          )}

          {/* 3. 未分組頻道 */}
          {ungroupedChannels.length > 0 && (
            <ChannelListSection
              channels={ungroupedChannels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={onSelectChannel}
              toggleChannelFavorite={toggleChannelFavorite}
              onDelete={onDelete}
              onEdit={onEdit}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onJoinChannel={onJoinChannel}
              onLeaveChannel={onLeaveChannel}
              isAdmin={isAdmin}
              checkIsMember={checkIsMember}
              isExpanded={expandedSections.ungrouped !== false}
              onToggleExpanded={() => onToggleExpanded('ungrouped', !expandedSections.ungrouped)}
              title={COMP_WORKSPACE_LABELS.頻道}
              icon="hash"
              showAddButton
              onAddClick={() => {}}
            />
          )}

          {/* 同事 */}
          <ColleaguesSection
            isExpanded={expandedSections.colleagues !== false}
            onToggleExpanded={() => onToggleExpanded('colleagues', !expandedSections.colleagues)}
            onSelectMember={onSelectMember}
            selectedMemberId={selectedChannelId}
          />

          {/* 4. 搜尋結果：未加入的頻道（只在搜尋時顯示） */}
          {isSearching && unjoinedChannels.length > 0 && (
            <ChannelListSection
              channels={unjoinedChannels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={onSelectChannel}
              toggleChannelFavorite={toggleChannelFavorite}
              onDelete={onDelete}
              onEdit={onEdit}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onJoinChannel={onJoinChannel}
              onLeaveChannel={onLeaveChannel}
              isAdmin={isAdmin}
              checkIsMember={checkIsMember}
              isExpanded={true}
              onToggleExpanded={() => {}}
              title={COMP_WORKSPACE_LABELS.可加入的頻道}
              icon="userPlus"
            />
          )}

          {/* 5. 封存（固定底部，半透明顯示） */}
          {archivedChannels.length > 0 && archivedGroup && (
            <div className="opacity-60 hover:opacity-100 transition-opacity">
              <GroupedChannelList
                group={archivedGroup}
                channels={archivedChannels}
                selectedChannelId={selectedChannelId}
                onSelectChannel={onSelectChannel}
                toggleChannelFavorite={toggleChannelFavorite}
                onDelete={onDelete}
                onEdit={onEdit}
                onArchive={onArchive}
                onUnarchive={onUnarchive}
                onJoinChannel={onJoinChannel}
                onLeaveChannel={onLeaveChannel}
                isAdmin={isAdmin}
                checkIsMember={checkIsMember}
                toggleGroupCollapse={toggleGroupCollapse}
                handleDeleteGroupClick={() => {}} // 系統群組不可刪除
              />
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
