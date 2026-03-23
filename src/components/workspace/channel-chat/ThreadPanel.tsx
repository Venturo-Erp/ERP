'use client'

import React from 'react'
import { X, MessageSquare, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Message } from '@/stores/workspace/types'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

interface ThreadPanelProps {
  parentMessage: Message
  replies: Message[]
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  messageText: string
  onMessageChange: (text: string) => void
  currentUserId?: string
}

/**
 * Slack 風格討論串側邊面板
 * 顯示父訊息 + 所有回覆
 */
export function ThreadPanel({
  parentMessage,
  replies,
  onClose,
  onSubmit,
  messageText,
  onMessageChange,
  currentUserId,
}: ThreadPanelProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // 自動捲動到底部
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies.length])

  // 處理 Enter 發送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full shrink-0">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-morandi-secondary" />
          <span className="font-medium text-morandi-primary">
            {COMP_WORKSPACE_LABELS.LABEL_9507}
          </span>
          <span className="text-xs text-morandi-secondary">{replies.length} 則回覆</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* 訊息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 父訊息 */}
        <MessageItem message={parentMessage} isParent currentUserId={currentUserId} />

        {/* 分隔線 */}
        {replies.length > 0 && (
          <div className="flex items-center gap-2 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-morandi-secondary">{replies.length} 則回覆</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* 回覆列表 */}
        {replies.map(reply => (
          <MessageItem key={reply.id} message={reply} currentUserId={currentUserId} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* 輸入框 */}
      <form onSubmit={onSubmit} className="p-3 border-t border-border">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={e => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={COMP_WORKSPACE_LABELS.回覆討論串_2}
            className="min-h-[60px] max-h-[120px] pr-10 resize-none"
            rows={2}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!messageText.trim()}
            className="absolute right-2 bottom-2 h-7 w-7 p-0"
          >
            <Send size={14} />
          </Button>
        </div>
      </form>
    </div>
  )
}

// 將文字中的網址轉換成可點擊的連結
function renderMessageContent(content: string) {
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?\])'"。，；：！？」』）】])/gi
  const parts = content.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-morandi-gold hover:text-morandi-gold/80 hover:underline break-all"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

interface MessageItemProps {
  message: Message
  isParent?: boolean
  currentUserId?: string
}

function MessageItem({ message, isParent, currentUserId }: MessageItemProps) {
  const isOwn = message.author_id === currentUserId

  return (
    <div className={cn('group flex gap-2', isParent && 'pb-2')}>
      {/* 用戶頭像 */}
      <div className="w-8 h-8 bg-gradient-to-br from-morandi-gold/30 to-morandi-gold/10 rounded-md flex items-center justify-center text-xs font-semibold text-morandi-gold shrink-0">
        {message.author?.display_name?.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'font-medium text-sm',
              isOwn ? 'text-morandi-gold' : 'text-morandi-primary'
            )}
          >
            {message.author?.display_name || COMP_WORKSPACE_LABELS.未知用戶}
          </span>
          <span className="text-xs text-morandi-secondary">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: zhTW,
            })}
          </span>
        </div>
        <div
          className={cn(
            'mt-1 text-sm text-morandi-primary break-words whitespace-pre-wrap',
            isParent && 'font-medium'
          )}
        >
          {renderMessageContent(message.content)}
        </div>
      </div>
    </div>
  )
}
