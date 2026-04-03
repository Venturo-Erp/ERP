'use client'

import { useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Loader2, AlertCircle, Users, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TravelerConversationType } from './useTravelerMode'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

interface TravelerMessage {
  id: string
  sender_id: string
  type: string
  content: string
  attachments: unknown[] | null
  created_at: string
  edited_at: string | null
}

interface Sender {
  id: string
  name?: string
  display_name?: string
  avatar_url?: string
}

interface TravelerMessageListProps {
  messages: TravelerMessage[]
  travelers: Sender[]
  employees: Sender[]
  isLoading: boolean
  conversationType: TravelerConversationType
  isConversationOpen: boolean
  onToggleOpen?: (isOpen: boolean) => void
  currentUserId?: string
}

export function TravelerMessageList({
  messages,
  travelers,
  employees,
  isLoading,
  conversationType,
  isConversationOpen,
  onToggleOpen,
  currentUserId,
}: TravelerMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // 取得發送者資訊
  const getSenderInfo = (
    senderId: string
  ): { name: string; isEmployee: boolean; avatar?: string } => {
    // 檢查是否為員工
    const employee = employees.find(e => e.id === senderId)
    if (employee) {
      return {
        name: employee.display_name || employee.name || COMP_WORKSPACE_LABELS.員工,
        isEmployee: true,
        avatar: employee.avatar_url,
      }
    }

    // 檢查是否為旅客
    const traveler = travelers.find(t => t.id === senderId)
    if (traveler) {
      return {
        name: traveler.name || traveler.display_name || COMP_WORKSPACE_LABELS.旅客,
        isEmployee: false,
        avatar: traveler.avatar_url,
      }
    }

    return { name: COMP_WORKSPACE_LABELS.未知用戶, isEmployee: false }
  }

  // 格式化時間
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return format(date, 'HH:mm', { locale: zhTW })
    }
    return format(date, 'MM/dd HH:mm', { locale: zhTW })
  }

  // 對話未開啟狀態
  if (!isConversationOpen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-dark-bg">
        <div className="w-16 h-16 rounded-full bg-dark-bg-elevated flex items-center justify-center mb-4">
          {conversationType === 'tour_announcement' ? (
            <Megaphone size={32} className="text-violet-400" />
          ) : (
            <Users size={32} className="text-violet-400" />
          )}
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          {conversationType === 'tour_announcement'
            ? COMP_WORKSPACE_LABELS.團公告
            : COMP_WORKSPACE_LABELS.客服對話}
          尚未開啟
        </h3>
        <p className="text-sm text-violet-300 text-center mb-4">
          {COMP_WORKSPACE_LABELS.LABEL_9993}
        </p>
        {onToggleOpen && (
          <Button
            onClick={() => onToggleOpen(true)}
            className="bg-violet-500 hover:bg-violet-600 text-white"
          >
            {COMP_WORKSPACE_LABELS.LABEL_9473}
          </Button>
        )}
      </div>
    )
  }

  // 載入中
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-bg">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    )
  }

  // 無訊息
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-dark-bg">
        <AlertCircle size={32} className="text-violet-400 mb-2" />
        <p className="text-sm text-violet-300">{COMP_WORKSPACE_LABELS.EMPTY_2029}</p>
        <p className="text-xs text-violet-400/70 mt-1">{COMP_WORKSPACE_LABELS.SENDING_1794}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-dark-bg">
      <div className="space-y-3">
        {messages.map((message, index) => {
          const senderInfo = getSenderInfo(message.sender_id)
          const isOwnMessage = message.sender_id === currentUserId || senderInfo.isEmployee

          // 檢查是否需要顯示日期分隔符
          const showDateSeparator =
            index === 0 ||
            new Date(message.created_at).toDateString() !==
              new Date(messages[index - 1].created_at).toDateString()

          return (
            <div key={message.id}>
              {/* 日期分隔符 */}
              {showDateSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-dark-bg-elevated text-violet-300 text-xs px-3 py-1 rounded-full border border-violet-500/30">
                    {format(
                      new Date(message.created_at),
                      COMP_WORKSPACE_LABELS.yyyy年MM月dd日_EEEE,
                      { locale: zhTW }
                    )}
                  </div>
                </div>
              )}

              {/* 訊息氣泡 */}
              <div className={cn('flex gap-2', isOwnMessage ? 'flex-row-reverse' : 'flex-row')}>
                {/* 頭像 */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                    senderInfo.isEmployee
                      ? 'bg-violet-500 text-white'
                      : 'bg-dark-bg-elevated text-violet-200'
                  )}
                >
                  {senderInfo.avatar ? (
                    <img
                      src={senderInfo.avatar}
                      alt={senderInfo.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    senderInfo.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* 訊息內容 */}
                <div
                  className={cn(
                    'max-w-[70%] flex flex-col',
                    isOwnMessage ? 'items-end' : 'items-start'
                  )}
                >
                  {/* 發送者名稱 */}
                  <span className="text-xs text-violet-400 mb-1">
                    {senderInfo.name}
                    {senderInfo.isEmployee && <span className="ml-1 text-violet-500">(員工)</span>}
                  </span>

                  {/* 訊息氣泡 */}
                  <div
                    className={cn(
                      'px-3 py-2 rounded-lg whitespace-pre-wrap break-words',
                      isOwnMessage
                        ? 'bg-violet-500 text-white rounded-br-none'
                        : 'bg-dark-bg-elevated text-violet-100 border border-violet-500/20 rounded-bl-none'
                    )}
                  >
                    {message.content}
                  </div>

                  {/* 時間 */}
                  <span className="text-[10px] text-violet-500 mt-1">
                    {formatTime(message.created_at)}
                    {message.edited_at && COMP_WORKSPACE_LABELS.已編輯}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
