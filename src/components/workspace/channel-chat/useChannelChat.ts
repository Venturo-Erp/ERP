import { useState, useEffect } from 'react'
import {
  useWorkspaceChannels,
  useWorkspaceChat,
  useWorkspaceWidgets,
  useChatStore,
} from '@/stores/workspace'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { useMessageOperations, useFileUpload, useScrollToBottom } from '../chat'
import {
  useDialogStates,
  useSelectionState,
  useChannelEditState,
  useChannelOperations,
  useChannelEffects,
  useMessageHandlers,
  useThreadState,
} from './hooks'

/**
 * Channel Chat 主 Hook
 *
 * 整合多個子 hooks 來管理頻道聊天的所有狀態和操作
 * 支援 Slack 風格討論串：點擊訊息回覆，開啟右側面板
 */
export function useChannelChat() {
  // Basic state
  const [messageText, setMessageText] = useState('')
  const [threadMessageText, setThreadMessageText] = useState('')
  const [showMemberSidebar, setShowMemberSidebar] = useState(false)

  // Dialog states (拆分到 useDialogStates)
  const dialogStates = useDialogStates()

  // Selection states (拆分到 useSelectionState)
  const selectionState = useSelectionState()

  // Use selective hooks for better performance
  const {
    channels,
    currentWorkspace,
    loading,
    selectedChannel,
    selectChannel,
    loadChannels,
    updateChannel,
    deleteChannel,
  } = useWorkspaceChannels()

  const isAdmin = useMyCapabilities().has('platform.is_admin')

  const { channelMessages, messagesLoading, loadMessages } = useWorkspaceChat()
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore()

  const {
    advanceLists,
    sharedOrderLists,
    loadAdvanceLists,
    loadSharedOrderLists,
    deleteAdvanceList,
  } = useWorkspaceWidgets()

  // 取得頻道的所有訊息
  const allMessages =
    selectedChannel?.id && channelMessages?.[selectedChannel.id]
      ? channelMessages[selectedChannel.id]
      : []

  // Slack 風格討論串狀態
  const threadState = useThreadState(allMessages)

  // 主頻道顯示的訊息（只有主訊息，沒有 parent_message_id）
  const currentMessages = threadState.mainChannelMessages
  const isMessagesLoading = selectedChannel?.id
    ? (messagesLoading?.[selectedChannel.id] ?? false)
    : false

  // Edit state (拆分到 useChannelEditState)
  const editState = useChannelEditState(dialogStates.showSettingsDialog, selectedChannel)

  // Channel operations (拆分到 useChannelOperations)
  const channelOps = useChannelOperations(
    selectedChannel,
    selectChannel,
    updateChannel,
    deleteChannel,
    dialogStates.setShowSettingsDialog
  )

  // Message operations
  const messageOps = useMessageOperations()
  const { handleSendMessage, handleReaction, handleDeleteMessage, user } = messageOps
  const {
    attachedFiles,
    setAttachedFiles,
    uploadingFiles,
    uploadProgress,
    uploadFiles,
    clearFiles,
  } = useFileUpload()
  const { messagesEndRef } = useScrollToBottom(currentMessages?.length || 0)

  // 主頻道的訊息處理（不帶 parentMessageId）
  const mainMessageHandlers = useMessageHandlers(
    messageText,
    setMessageText,
    selectedChannel,
    user,
    attachedFiles,
    currentMessages,
    uploadFiles,
    clearFiles,
    handleSendMessage,
    handleReaction,
    handleDeleteMessage,
    undefined // 主頻道不帶 parentMessageId
  )

  // 討論串的訊息處理（帶 parentMessageId）
  const threadMessageHandlers = useMessageHandlers(
    threadMessageText,
    setThreadMessageText,
    selectedChannel,
    user,
    [], // 討論串暫不支援附件
    threadState.threadReplies,
    uploadFiles,
    clearFiles,
    handleSendMessage,
    handleReaction,
    handleDeleteMessage,
    threadState.activeThreadMessage?.id // 討論串帶 parentMessageId
  )

  // Effects (拆分到 useChannelEffects)
  useChannelEffects(
    currentWorkspace,
    channels,
    selectedChannel,
    loadChannels,
    selectChannel,
    loadMessages,
    loadAdvanceLists,
    loadSharedOrderLists
  )

  // Realtime subscription 已移至 useChannelEffects.ts
  // 避免重複訂閱，這裡不再呼叫 subscribeToMessages()

  return {
    // State
    messageText,
    setMessageText,
    threadMessageText,
    setThreadMessageText,
    showMemberSidebar,
    setShowMemberSidebar,
    isSwitching: channelOps.isSwitching,

    // Dialog state (從 useDialogStates)
    ...dialogStates,

    // Selected state (從 useSelectionState)
    ...selectionState,

    // Edit state (從 useChannelEditState)
    ...editState,

    // Slack 風格討論串狀態
    activeThreadMessage: threadState.activeThreadMessage,
    threadReplies: threadState.threadReplies,
    isThreadPanelOpen: threadState.isThreadPanelOpen,
    openThread: threadState.openThread,
    closeThread: threadState.closeThread,
    getReplyCount: threadState.getReplyCount,
    getLastReplyAt: threadState.getLastReplyAt,
    getReplyUsers: threadState.getReplyUsers,

    // Store data
    channels,
    currentWorkspace,
    loading,
    selectedChannel,
    currentMessages,
    isMessagesLoading,
    advanceLists,
    sharedOrderLists,
    isAdmin, // Expose isAdmin flag

    // Store actions
    loadSharedOrderLists,
    deleteAdvanceList,

    // Message operations
    user,
    attachedFiles,
    setAttachedFiles,
    uploadingFiles,
    uploadProgress,
    messagesEndRef,

    // Handlers
    handleSubmitMessage: mainMessageHandlers.handleSubmitMessage,
    handleReactionClick: mainMessageHandlers.handleReactionClick,
    handleDeleteMessageClick: mainMessageHandlers.handleDeleteMessageClick,
    handleThreadSubmitMessage: threadMessageHandlers.handleSubmitMessage,
    handleChannelSwitch: channelOps.handleChannelSwitch,
    handleDeleteChannel: channelOps.handleDeleteChannel,
    handleUpdateChannel: () =>
      channelOps.handleUpdateChannel(editState.editChannelName, editState.editChannelDescription),
  }
}
