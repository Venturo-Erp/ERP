'use client'

import { useEffect } from 'react'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import type { ChannelSidebarProps } from './types'
import { useChannelSidebar } from './useChannelSidebar'
import { useChannelState } from './hooks/useChannelState'
import { useChannelSidebarState } from './hooks/useChannelSidebarState'
import { createChannelHandlers } from './handlers/channelHandlers'
import { processChannels } from './utils/channelProcessing'
import {
  MemberManagementDialog,
  ChannelDeleteDialog,
  GroupDeleteDialog,
} from './MemberManagementDialog'
import { WorkspaceHeader } from './WorkspaceHeader'
import { CreateGroupDialog } from './CreateGroupDialog'
import { CreateChannelDialog } from './CreateChannelDialog'
import { EditChannelDialog } from './EditChannelDialog'
import { ChannelList } from './ChannelList'

export function ChannelSidebar({ selectedChannelId, onSelectChannel }: ChannelSidebarProps) {
  // 狀態管理
  const sidebarState = useChannelSidebarState()
  const channelState = useChannelState()
  const { expandedSections, setExpandedSections, filteredChannels } = useChannelSidebar(
    sidebarState.channels,
    sidebarState.searchQuery,
    sidebarState.channelFilter
  )

  // 自動選中建立者
  useEffect(() => {
    if (
      channelState.showCreateChannelDialog &&
      sidebarState.user?.id &&
      !channelState.selectedMembers.includes(sidebarState.user.id)
    ) {
      channelState.setSelectedMembers([sidebarState.user.id])
    }
  }, [channelState.showCreateChannelDialog, sidebarState.user?.id])

  // 載入頻道成員
  useEffect(() => {
    if (!selectedChannelId || !sidebarState.currentWorkspace) return
    void sidebarState.loadChannelMembers(sidebarState.currentWorkspace.id, selectedChannelId)
  }, [selectedChannelId, sidebarState.currentWorkspace?.id])

  // 頻道處理邏輯
  const processedChannels = processChannels(
    filteredChannels,
    sidebarState.channelGroups,
    sidebarState.checkIsMember
  )

  // 操作處理函數
  const handlers = createChannelHandlers({
    channels: sidebarState.channels,
    channelGroups: sidebarState.channelGroups,
    currentWorkspace: sidebarState.currentWorkspace,
    user: sidebarState.user,
    updateChannel: sidebarState.updateChannel,
    updateChannelOrder: sidebarState.updateChannelOrder,
    createChannel: sidebarState.createChannel,
    deleteChannel: sidebarState.deleteChannel,
    deleteChannelGroup: sidebarState.deleteChannelGroup,
    loadChannels: sidebarState.loadChannels,
    createChannelGroup: sidebarState.createChannelGroup,
    selectedMembers: channelState.selectedMembers,
  })

  // 處理成員移除
  const handleRemoveMember = async () => {
    if (!channelState.memberToRemove || !selectedChannelId || !sidebarState.currentWorkspace) {
      return
    }

    channelState.setIsRemovingMember(true)
    try {
      const { removeChannelMember } = await import('@/services/workspace-members')
      await removeChannelMember(
        sidebarState.currentWorkspace.id,
        selectedChannelId,
        channelState.memberToRemove.id
      )
      channelState.closeRemoveMemberDialog()
    } catch {
      // Error handled by service
    } finally {
      channelState.setIsRemovingMember(false)
    }
  }

  // 處理選擇成員（DM）
  const handleSelectMember = async (memberId: string) => {
    const dmChannel = await sidebarState.handleSelectMember(memberId)
    if (dmChannel) {
      onSelectChannel(dmChannel)
    }
  }

  // 處理刪除頻道點擊
  const handleDeleteClick = (channelId: string) => {
    const channel = sidebarState.channels.find(ch => ch.id === channelId)
    if (channel) {
      channelState.openDeleteChannelDialog(channel)
    }
  }

  // 處理刪除群組點擊
  const handleDeleteGroupClick = (groupId: string) => {
    const group = sidebarState.channelGroups.find(g => g.id === groupId)
    if (group) {
      channelState.openDeleteGroupDialog(group)
    }
  }

  // 處理編輯點擊
  const handleEditClick = (channelId: string) => {
    const channel = sidebarState.channels.find(ch => ch.id === channelId)
    if (channel) {
      channelState.openEditChannelDialog(channel)
    }
  }

  const isAdmin = useMyCapabilities().has('platform.is_admin')

  return (
    <div className="w-[280px] bg-card border-r border-morandi-gold/20 flex flex-col shrink-0">
      {/* Workspace header with integrated search */}
      <WorkspaceHeader
        workspaceName={sidebarState.currentWorkspace?.name || ''}
        workspaceIcon={sidebarState.currentWorkspace?.icon || ''}
        channelFilter={sidebarState.channelFilter}
        onFilterChange={sidebarState.setChannelFilter}
        onCreateChannel={() => channelState.setShowCreateChannelDialog(true)}
        onCreateGroup={() => channelState.setShowNewGroupDialog(true)}
        onRefresh={() =>
          sidebarState.currentWorkspace?.id &&
          sidebarState.loadChannels(sidebarState.currentWorkspace.id)
        }
        isRefreshing={sidebarState.loading || sidebarState.isCreatingDm}
        searchQuery={sidebarState.searchQuery}
        onSearchChange={sidebarState.setSearchQuery}
      />

      {/* Channel list */}
      <ChannelList
        announcementChannels={processedChannels.announcementChannels}
        announcementGroup={processedChannels.announcementGroup}
        favoriteChannels={processedChannels.favoriteChannels}
        userGroupedChannels={processedChannels.userGroupedChannels}
        ungroupedChannels={processedChannels.ungroupedChannels}
        unjoinedChannels={processedChannels.unjoinedChannels}
        archivedChannels={processedChannels.archivedChannels}
        archivedGroup={processedChannels.archivedGroup}
        dmMembers={sidebarState.dmMembers}
        selectedChannelId={selectedChannelId}
        isAdmin={isAdmin}
        expandedSections={expandedSections}
        searchQuery={sidebarState.searchQuery}
        onSelectChannel={onSelectChannel}
        onSelectMember={handleSelectMember}
        toggleChannelFavorite={sidebarState.toggleChannelPin}
        onDelete={handleDeleteClick}
        onEdit={handleEditClick}
        onArchive={sidebarState.archiveChannel}
        onUnarchive={sidebarState.unarchiveChannel}
        onJoinChannel={sidebarState.handleJoinChannel}
        onLeaveChannel={sidebarState.handleLeaveChannel}
        checkIsMember={sidebarState.checkIsMember}
        toggleGroupCollapse={sidebarState.toggleGroupCollapse}
        handleDeleteGroupClick={handleDeleteGroupClick}
        onToggleExpanded={(section: string, expanded: boolean) => {
          setExpandedSections(prev => ({ ...prev, [section]: expanded }))
        }}
        onDragEnd={handlers.handleDragEnd}
      />

      {/* Dialogs */}
      <CreateGroupDialog
        isOpen={channelState.showNewGroupDialog}
        groupName={channelState.newGroupName}
        onGroupNameChange={channelState.setNewGroupName}
        onClose={() => channelState.setShowNewGroupDialog(false)}
        onCreate={() => {
          handlers.handleCreateGroup(channelState.newGroupName)
          channelState.setNewGroupName('')
          channelState.setShowNewGroupDialog(false)
        }}
      />

      <CreateChannelDialog
        isOpen={channelState.showCreateChannelDialog}
        channelName={channelState.newChannelName}
        channelDescription={channelState.newChannelDescription}
        channelType={channelState.newChannelType}
        channelScope={channelState.newChannelScope}
        selectedMembers={channelState.selectedMembers}
        isCreating={channelState.isCreatingChannel}
        onChannelNameChange={channelState.setNewChannelName}
        onChannelDescriptionChange={channelState.setNewChannelDescription}
        onChannelTypeChange={channelState.setNewChannelType}
        onChannelScopeChange={channelState.setNewChannelScope}
        onMembersChange={channelState.setSelectedMembers}
        onClose={channelState.resetCreateChannelDialog}
        onCreate={async () => {
          // 防止重複點擊
          if (channelState.isCreatingChannel) return
          channelState.setIsCreatingChannel(true)
          try {
            await handlers.handleCreateChannel(
              channelState.newChannelName,
              channelState.newChannelDescription,
              channelState.newChannelType,
              channelState.newChannelScope
            )
            channelState.resetCreateChannelDialog()
          } catch {
            channelState.setIsCreatingChannel(false)
          }
        }}
      />

      <EditChannelDialog
        isOpen={channelState.showEditChannelDialog}
        channelName={channelState.editChannelName}
        channelDescription={channelState.editChannelDescription}
        onChannelNameChange={channelState.setEditChannelName}
        onChannelDescriptionChange={channelState.setEditChannelDescription}
        onClose={channelState.resetEditChannelDialog}
        onSave={async () => {
          await handlers.handleEditChannel(
            channelState.channelToEdit,
            channelState.editChannelName,
            channelState.editChannelDescription
          )
          channelState.resetEditChannelDialog()
        }}
      />

      <MemberManagementDialog
        memberToRemove={channelState.memberToRemove}
        isRemoveDialogOpen={channelState.isRemoveDialogOpen}
        isRemovingMember={channelState.isRemovingMember}
        onClose={channelState.closeRemoveMemberDialog}
        onRemove={handleRemoveMember}
      />

      <ChannelDeleteDialog
        channelToDelete={channelState.channelToDelete}
        isDeleteDialogOpen={channelState.isDeleteDialogOpen}
        isDeletingChannel={channelState.isDeletingChannel}
        onClose={channelState.closeDeleteChannelDialog}
        onDelete={async () => {
          await handlers.handleDeleteChannel(channelState.channelToDelete)
          channelState.closeDeleteChannelDialog()
        }}
      />

      <GroupDeleteDialog
        groupToDelete={channelState.groupToDelete}
        isDeleteDialogOpen={channelState.isGroupDeleteDialogOpen}
        isDeletingGroup={channelState.isDeletingGroup}
        onClose={channelState.closeDeleteGroupDialog}
        onDelete={async () => {
          await handlers.handleDeleteGroup(channelState.groupToDelete)
          channelState.closeDeleteGroupDialog()
        }}
      />
    </div>
  )
}
