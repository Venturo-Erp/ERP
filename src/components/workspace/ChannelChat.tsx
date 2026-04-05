'use client'

import { useState, useMemo } from 'react'
import { Hash } from 'lucide-react'
import { ChannelSidebar } from './ChannelSidebar'
import { ChannelTabs } from './ChannelTabs'
import { useChannelChat } from './channel-chat/useChannelChat'
import { ChatHeader } from './channel-chat/ChatHeader'
import { ChatMessages } from './channel-chat/ChatMessages'
import { DialogsContainer } from './channel-chat/DialogsContainer'
import { ThreadPanel } from './channel-chat/ThreadPanel'
import { useEmployeesSlim } from '@/data'
import { COMP_WORKSPACE_LABELS } from './constants/labels'

export function ChannelChat() {
  const {
    // State
    messageText,
    setMessageText,
    threadMessageText,
    setThreadMessageText,
    showMemberSidebar,
    setShowMemberSidebar,
    isSwitching,

    // Dialog state
    showShareQuoteDialog,
    setShowShareQuoteDialog,
    showShareTourDialog,
    setShowShareTourDialog,
    showNewPaymentDialog,
    setShowNewPaymentDialog,
    showNewReceiptDialog,
    setShowNewReceiptDialog,
    showNewTaskDialog,
    setShowNewTaskDialog,
    showShareAdvanceDialog,
    setShowShareAdvanceDialog,
    showShareOrdersDialog,
    setShowShareOrdersDialog,
    showCreateReceiptDialog,
    setShowCreateReceiptDialog,
    showCreatePaymentDialog,
    setShowCreatePaymentDialog,
    showSettingsDialog,
    setShowSettingsDialog,

    // Selected state
    selectedOrder,
    setSelectedOrder,
    selectedAdvanceItem,
    setSelectedAdvanceItem,
    selectedAdvanceListId,
    setSelectedAdvanceListId,

    // Edit state
    editChannelName,
    setEditChannelName,
    editChannelDescription,
    setEditChannelDescription,

    // Slack 風格討論串狀態
    activeThreadMessage,
    threadReplies,
    isThreadPanelOpen,
    openThread,
    closeThread,
    getReplyCount,

    // Store data
    channels,
    loading,
    selectedChannel,
    currentMessages,
    isMessagesLoading,
    advanceLists,
    sharedOrderLists,
    isAdmin, // Get isAdmin from the hook

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
    handleSubmitMessage,
    handleReactionClick,
    handleDeleteMessageClick,
    handleThreadSubmitMessage,
    handleChannelSwitch,
    handleDeleteChannel,
    handleUpdateChannel,
  } = useChannelChat()

  // Resolve DM channel display name
  const { items: slimEmployees = [] } = useEmployeesSlim()
  const resolvedChannelName = useMemo(() => {
    if (!selectedChannel) return ''
    if (selectedChannel.type !== 'direct') return selectedChannel.name

    const fallbackName = COMP_WORKSPACE_LABELS.私訊

    // Try dm_target_id first
    if (selectedChannel.dm_target_id) {
      const targetId =
        selectedChannel.dm_target_id === user?.id
          ? selectedChannel.created_by
          : selectedChannel.dm_target_id
      const target = slimEmployees.find(e => e.id === targetId)
      if (target) return target.display_name || target.chinese_name || fallbackName
    }

    // Parse dm:userA:userB format
    if (selectedChannel.name.startsWith('dm:')) {
      const ids = selectedChannel.name.replace('dm:', '').split(':').filter(Boolean)
      const otherId = ids.find(id => id !== user?.id)
      if (otherId) {
        const target = slimEmployees.find(e => e.id === otherId)
        if (target) return target.display_name || target.chinese_name || fallbackName
      }
    }

    return fallbackName
  }, [selectedChannel, slimEmployees, user?.id])

  // 機器人快捷操作 Dialog 狀態
  const [showCheckTicketStatusDialog, setShowCheckTicketStatusDialog] = useState(false)
  const [showTourReviewDialog, setShowTourReviewDialog] = useState(false)

  if (loading && channels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-morandi-gold border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex overflow-hidden bg-card">
      <ChannelSidebar
        selectedChannelId={selectedChannel?.id || null}
        onSelectChannel={handleChannelSwitch}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannel ? (
          <ChannelTabs
            channel={selectedChannel}
            headerActions={
              <ChatHeader
                showMemberSidebar={showMemberSidebar}
                onToggleMemberSidebar={() => setShowMemberSidebar(!showMemberSidebar)}
                tourId={selectedChannel.tour_id}
              />
            }
          >
            <ChatMessages
                channel={selectedChannel}
                isAdmin={isAdmin}
                messages={currentMessages || []}
                advanceLists={advanceLists}
                sharedOrderLists={sharedOrderLists}
                channelName={resolvedChannelName}
                currentUserId={user?.id}
                isLoading={isMessagesLoading}
                showMemberSidebar={showMemberSidebar}
                messageText={messageText}
                attachedFiles={attachedFiles}
                uploadingFiles={uploadingFiles}
                uploadProgress={uploadProgress}
                messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
                onReaction={handleReactionClick}
                onDeleteMessage={handleDeleteMessageClick}
                onReply={openThread}
                getReplyCount={getReplyCount}
                onCreatePayment={(itemId, item) => {
                  setSelectedAdvanceItem(item as Parameters<typeof setSelectedAdvanceItem>[0])
                  setSelectedAdvanceListId(
                    advanceLists.find(al => al.items?.some(i => i.id === itemId))?.id || ''
                  )
                  setShowCreatePaymentDialog(true)
                }}
                onDeleteAdvanceList={deleteAdvanceList}
                onCreateReceipt={(_orderId, order) => {
                  setSelectedOrder(order as Parameters<typeof setSelectedOrder>[0])
                  setShowCreateReceiptDialog(true)
                }}
                onMessageChange={setMessageText}
                onSubmit={handleSubmitMessage}
                onFilesChange={setAttachedFiles}
                onShowShareOrders={() => setShowShareOrdersDialog(true)}
                onShowShareQuote={() => setShowShareQuoteDialog(true)}
                onShowNewPayment={() => setShowNewPaymentDialog(true)}
                onShowNewReceipt={() => setShowNewReceiptDialog(true)}
                onShowShareAdvance={() => setShowShareAdvanceDialog(true)}
                onShowNewTask={() => setShowNewTaskDialog(true)}
                // 機器人專用 handlers
                onCheckTicketStatus={() => setShowCheckTicketStatusDialog(true)}
                onTourReview={() => setShowTourReviewDialog(true)}
              />
          </ChannelTabs>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Hash size={48} className="text-morandi-secondary/50 mx-auto mb-4" />
              <p className="text-morandi-secondary">{COMP_WORKSPACE_LABELS.SELECT_9745}</p>
            </div>
          </div>
        )}
      </div>

      {/* Slack 風格討論串側邊面板 */}
      {isThreadPanelOpen && activeThreadMessage && (
        <ThreadPanel
          parentMessage={activeThreadMessage}
          replies={threadReplies}
          onClose={closeThread}
          onSubmit={handleThreadSubmitMessage}
          messageText={threadMessageText}
          onMessageChange={setThreadMessageText}
          currentUserId={user?.id}
        />
      )}

      <DialogsContainer
        showShareAdvanceDialog={showShareAdvanceDialog}
        setShowShareAdvanceDialog={setShowShareAdvanceDialog}
        selectedChannel={selectedChannel}
        user={user}
        showShareOrdersDialog={showShareOrdersDialog}
        setShowShareOrdersDialog={setShowShareOrdersDialog}
        onShareOrdersSuccess={() => {
          setShowShareOrdersDialog(false)
          if (selectedChannel?.id) {
            loadSharedOrderLists(selectedChannel.id)
          }
        }}
        showCreateReceiptDialog={showCreateReceiptDialog}
        setShowCreateReceiptDialog={setShowCreateReceiptDialog}
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        showCreatePaymentDialog={showCreatePaymentDialog}
        setShowCreatePaymentDialog={setShowCreatePaymentDialog}
        selectedAdvanceItem={selectedAdvanceItem}
        setSelectedAdvanceItem={setSelectedAdvanceItem}
        selectedAdvanceListId={selectedAdvanceListId}
        setSelectedAdvanceListId={setSelectedAdvanceListId}
        onCreatePaymentSuccess={() => {
          setShowCreatePaymentDialog(false)
          setSelectedAdvanceItem(null)
          setSelectedAdvanceListId('')
          if (selectedChannel?.id) {
            // advanceLists; // This was an unused expression
          }
        }}
        showSettingsDialog={showSettingsDialog}
        setShowSettingsDialog={setShowSettingsDialog}
        editChannelName={editChannelName}
        setEditChannelName={setEditChannelName}
        editChannelDescription={editChannelDescription}
        setEditChannelDescription={setEditChannelDescription}
        onDeleteChannel={handleDeleteChannel}
        onUpdateChannel={handleUpdateChannel}
        showShareQuoteDialog={showShareQuoteDialog}
        setShowShareQuoteDialog={setShowShareQuoteDialog}
        showShareTourDialog={showShareTourDialog}
        setShowShareTourDialog={setShowShareTourDialog}
        showNewPaymentDialog={showNewPaymentDialog}
        setShowNewPaymentDialog={setShowNewPaymentDialog}
        showNewReceiptDialog={showNewReceiptDialog}
        setShowNewReceiptDialog={setShowNewReceiptDialog}
        showNewTaskDialog={showNewTaskDialog}
        setShowNewTaskDialog={setShowNewTaskDialog}
        // Bot-specific dialogs
        showCheckTicketStatusDialog={showCheckTicketStatusDialog}
        setShowCheckTicketStatusDialog={setShowCheckTicketStatusDialog}
        showTourReviewDialog={showTourReviewDialog}
        setShowTourReviewDialog={setShowTourReviewDialog}
        userId={user?.id}
      />
    </div>
  )
}
