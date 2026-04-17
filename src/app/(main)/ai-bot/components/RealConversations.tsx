'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, AlertCircle, MessageCircle, User } from 'lucide-react'
import { toast } from 'sonner'

// 對話列表資料類型
interface Conversation {
  id: string
  conversation_type: string
  target_id: string
  target_name: string
  last_message_at: string | null
  last_message_preview: string
  unread_count: number
  tags: string[]
  note: string | null
  created_at: string
  updated_at: string
}

// 訊息資料類型
interface Message {
  id: string
  conversation_id: string
  message_id: string
  message_type: string
  sender_type: 'user' | 'bot' | 'system'
  sender_id: string
  content: string
  media_url: string | null
  is_read: boolean
  is_ai_reply: boolean
  ai_model: string | null
  created_at: string
}

export function RealConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [conversationsError, setConversationsError] = useState<string | null>(null)

  // 載入對話列表
  const loadConversations = async () => {
    setLoadingConversations(true)
    setConversationsError(null)
    try {
      const res = await fetch('/api/line/conversations')

      if (!res.ok) {
        console.warn('API 返回狀態:', res.status)
        setConversationsError(`伺服器錯誤 (${res.status})`)
        setConversations([])
        return
      }

      const data = await res.json()

      if (!Array.isArray(data)) {
        console.warn('API 返回非陣列資料')
        setConversationsError('資料格式錯誤')
        setConversations([])
        return
      }

      if (data.length === 0) {
        setConversations([])
        toast.info('目前沒有對話紀錄')
        return
      }

      // 格式化對話資料
      const formattedConversations = data.map((item: any) => ({
        id: item.id,
        conversation_type: item.conversation_type || 'user',
        target_id: item.target_id || '',
        target_name: item.target_name || '未知用戶',
        last_message_at: item.last_message_at,
        last_message_preview: item.last_message_preview || '',
        unread_count: item.unread_count || 0,
        tags: item.tags || [],
        note: item.note,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }))

      setConversations(formattedConversations)
      toast.success(`已載入 ${formattedConversations.length} 筆對話`)
    } catch (error) {
      console.error('載入失敗:', error)
      setConversationsError('連線失敗')
      toast.error('無法載入對話紀錄')
    } finally {
      setLoadingConversations(false)
    }
  }

  // 載入對話的訊息
  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/line/messages/${conversationId}`)

      if (!res.ok) {
        console.warn('API 返回狀態:', res.status)
        toast.error('無法載入訊息')
        setMessages([])
        return
      }

      const data = await res.json()

      if (!Array.isArray(data)) {
        setMessages([])
        return
      }

      // 格式化訊息資料
      const formattedMessages = data.map((item: any) => ({
        id: item.id,
        conversation_id: item.conversation_id,
        message_id: item.message_id,
        message_type: item.message_type || 'text',
        sender_type: item.sender_type || 'user',
        sender_id: item.sender_id,
        content: item.content || '',
        media_url: item.media_url,
        is_read: item.is_read || false,
        is_ai_reply: item.is_ai_reply || false,
        ai_model: item.ai_model,
        created_at: item.created_at,
      }))

      setMessages(formattedMessages)

      // 標記為已讀
      markAsRead(conversationId)
    } catch (error) {
      console.error('載入訊息失敗:', error)
      toast.error('無法載入訊息')
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  // 標記為已讀
  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/line/messages/${conversationId}`, {
        method: 'PATCH',
      })
      // 更新本地未讀數
      setConversations(prev =>
        prev.map(conv => (conv.id === conversationId ? { ...conv, unread_count: 0 } : conv))
      )
    } catch (error) {
      console.error('標記已讀失敗:', error)
    }
  }

  // 記錄審計日誌
  const logAudit = async (action: string, targetType: string, targetId: string, metadata = {}) => {
    try {
      await fetch('/api/line/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetType, targetId, metadata }),
      })
    } catch (error) {
      console.error('記錄審計日誌失敗:', error)
    }
  }

  // 選擇對話
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv)
    loadMessages(conv.id)
    // 記錄查看對話操作
    logAudit('view_conversation', 'conversation', conv.id, { target_name: conv.target_name })
  }

  // 格式化時間
  const formatTime = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分鐘前`
    if (diffHours < 24) return `${diffHours}小時前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-TW')
  }

  useEffect(() => {
    loadConversations()
  }, [])

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* 左側：用戶列表 */}
      <div className="w-1/3 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b bg-muted/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              用戶列表
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadConversations}
              disabled={loadingConversations}
            >
              <RefreshCw className={`h-3 w-3 ${loadingConversations ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {loadingConversations ? '載入中...' : `共 ${conversations.length} 位用戶`}
          </p>
        </div>

        <ScrollArea className="flex-1">
          {conversationsError ? (
            <div className="p-4 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-status-error" />
              <p className="text-sm text-muted-foreground">{conversationsError}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadConversations}>
                重試
              </Button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">目前沒有對話紀錄</p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{conv.target_name}</span>
                        {conv.unread_count > 0 && (
                          <Badge className="bg-status-info text-white text-xs shrink-0">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.last_message_preview || '尚無訊息'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(conv.last_message_at)}
                      </p>
                    </div>
                  </div>
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {conv.tags.slice(0, 2).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 右側：訊息內容 */}
      <div className="w-2/3 flex flex-col">
        {selectedConversation ? (
          <>
            {/* 訊息header */}
            <div className="p-4 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {selectedConversation.target_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.conversation_type === 'group' ? '群組對話' : '私人對話'}
                    {selectedConversation.note && ` • ${selectedConversation.note}`}
                  </p>
                </div>
                {selectedConversation.unread_count > 0 && (
                  <Badge className="bg-status-info text-white">
                    {selectedConversation.unread_count} 未讀
                  </Badge>
                )}
              </div>
            </div>

            {/* 訊息列表 */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>尚無訊息</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender_type === 'user'
                            ? 'bg-muted'
                            : msg.is_ai_reply
                              ? 'bg-morandi-gold/20 border border-morandi-gold/30'
                              : 'bg-status-info text-white'
                        }`}
                      >
                        <div className="text-xs font-medium mb-1 flex items-center gap-2">
                          {msg.sender_type === 'user' ? (
                            <>
                              <User className="h-3 w-3" />
                              用戶
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3 w-3" />
                              {msg.is_ai_reply ? 'AI 回覆' : '系統'}
                            </>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(msg.created_at).toLocaleString('zh-TW')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>請選擇左側的對話</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
