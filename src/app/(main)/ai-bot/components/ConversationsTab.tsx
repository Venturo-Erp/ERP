'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  Users,
  Bot,
  ChevronRight,
  Star,
  Send,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

interface ConversationThread {
  platform_user_id: string
  platform: string
  user_display_name: string | null
  last_message: string
  last_ai_response: string
  last_intent: string
  last_time: string
  message_count: number
  needs_followup_count: number
  is_potential_lead: boolean
  max_lead_score: number
  intents: string[]
  mentioned_tours: string[]
}

interface ConversationMessage {
  id: string
  platform: string
  platform_user_id: string
  user_display_name: string | null
  user_message: string
  ai_response: string
  intent: string
  mentioned_tours: string[]
  is_potential_lead: boolean
  lead_score: number
  sentiment: string | null
  created_at: string
  follow_up_status?: string | null
  follow_up_note?: string | null
}

interface Stats {
  total_30d: number
  leads_count: number
  pending_followup: number
  positive_rate: number
  negative_rate: number
  intent_distribution: Record<string, number>
  daily_trend: Record<string, number>
}

// ============================================================
// Main Component
// ============================================================

export function ConversationsTab() {
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'needs_followup' | 'leads'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showMobileThread, setShowMobileThread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ view: 'threads' })
      if (filter !== 'all') params.set('filter', filter)
      if (searchTerm) params.set('search', searchTerm)

      const res = await fetch(`/api/line/conversations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])
      }
    } catch (err) {
      logger.error('載入對話串失敗', err)
    } finally {
      setLoading(false)
    }
  }, [filter, searchTerm])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/line/conversations?stats=true')
      if (res.ok) {
        setStats(await res.json())
      }
    } catch (err) {
      logger.error('載入統計失敗', err)
    }
  }, [])

  useEffect(() => {
    loadThreads()
    loadStats()
  }, [loadThreads, loadStats])

  const selectThread = async (thread: ConversationThread) => {
    setSelectedThread(thread)
    setShowMobileThread(true)
    setMessagesLoading(true)
    try {
      const res = await fetch(
        `/api/line/conversations?user=${encodeURIComponent(thread.platform_user_id)}`
      )
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        // 滾到底部
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch (err) {
      logger.error('載入對話歷程失敗', err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const updateFollowUp = async (id: string, status: string, note?: string) => {
    try {
      const res = await fetch('/api/line/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, follow_up_status: status, follow_up_note: note }),
      })
      if (res.ok) {
        setMessages(prev =>
          prev.map(m =>
            m.id === id
              ? { ...m, follow_up_status: status, follow_up_note: note || m.follow_up_note }
              : m
          )
        )
        toast.success(status === 'done' ? '已標記處理完成' : '已更新')
        loadThreads() // 重新載入串列以更新計數
      }
    } catch {
      toast.error('更新失敗')
    }
  }

  return (
    <div className="space-y-4">
      {/* 統計摘要 */}
      {stats && <StatsBar stats={stats} />}

      {/* 主區域：左右分欄 */}
      <div className="flex gap-4 h-[calc(100vh-360px)] min-h-[500px]">
        {/* 左側：聯絡人列表 */}
        <div
          className={cn(
            'w-full md:w-[380px] md:min-w-[380px] flex flex-col gap-3',
            showMobileThread && 'hidden md:flex'
          )}
        >
          {/* 篩選列 */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜尋客人名稱、訊息內容..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                全部
              </Button>
              <Button
                variant={filter === 'needs_followup' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('needs_followup')}
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                待跟進
              </Button>
              <Button
                variant={filter === 'leads' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('leads')}
              >
                <Star className="h-3.5 w-3.5 mr-1" />
                潛在客戶
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="ml-auto h-8 w-8"
                onClick={() => {
                  loadThreads()
                  loadStats()
                }}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* 對話串列表 */}
          <ScrollArea className="flex-1 -mx-1">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">載入中...</div>
            ) : threads.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">沒有對話記錄</div>
            ) : (
              <div className="space-y-1 px-1">
                {threads.map(thread => (
                  <ThreadItem
                    key={`${thread.platform}:${thread.platform_user_id}`}
                    thread={thread}
                    isSelected={selectedThread?.platform_user_id === thread.platform_user_id}
                    onClick={() => selectThread(thread)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* 右側：對話詳情 */}
        <div className={cn('flex-1 flex flex-col', !showMobileThread && 'hidden md:flex')}>
          {selectedThread ? (
            <ThreadDetail
              thread={selectedThread}
              messages={messages}
              loading={messagesLoading}
              messagesEndRef={messagesEndRef}
              onBack={() => setShowMobileThread(false)}
              onUpdateFollowUp={updateFollowUp}
            />
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">選擇一個對話來查看完整歷程</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Stats Bar
// ============================================================

function StatsBar({ stats }: { stats: Stats }) {
  const topIntents = Object.entries(stats.intent_distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MiniStat
        icon={MessageCircle}
        label="30 天對話"
        value={stats.total_30d}
        color="text-status-info"
        bgColor="bg-status-info/10"
      />
      <MiniStat
        icon={Star}
        label="潛在客戶"
        value={stats.leads_count}
        color="text-morandi-gold"
        bgColor="bg-morandi-gold/10"
      />
      <MiniStat
        icon={AlertCircle}
        label="待跟進"
        value={stats.pending_followup}
        color="text-status-warning"
        bgColor="bg-status-warning/10"
      />
      <Card>
        <CardContent className="py-3 px-4">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            熱門意圖
          </div>
          <div className="flex flex-wrap gap-1">
            {topIntents.map(([intent, count]) => (
              <Badge key={intent} variant="outline" className="text-xs">
                {intent} ({count})
              </Badge>
            ))}
            {topIntents.length === 0 && (
              <span className="text-xs text-muted-foreground">尚無資料</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: typeof MessageCircle
  label: string
  value: number
  color: string
  bgColor: string
}) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', bgColor)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Thread List Item
// ============================================================

function ThreadItem({
  thread,
  isSelected,
  onClick,
}: {
  thread: ConversationThread
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/50',
        isSelected ? 'border-morandi-gold bg-morandi-gold/5' : 'border-border',
        thread.needs_followup_count > 0 && !isSelected && 'border-status-warning/30'
      )}
    >
      <div className="flex items-start gap-3">
        {/* 頭像 */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-morandi-container flex items-center justify-center">
          <Users className="h-4 w-4 text-morandi-secondary" />
        </div>

        <div className="flex-1 min-w-0">
          {/* 名稱 + 時間 */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {thread.user_display_name || '未知用戶'}
            </span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatRelativeTime(thread.last_time)}
            </span>
          </div>

          {/* 最後訊息預覽 */}
          <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.last_message}</p>

          {/* 標籤 */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {thread.message_count} 則
            </Badge>
            {thread.needs_followup_count > 0 && (
              <Badge className="bg-status-warning-bg text-status-warning text-[10px] px-1.5 py-0">
                {thread.needs_followup_count} 待跟進
              </Badge>
            )}
            {thread.is_potential_lead && (
              <Badge className="bg-morandi-gold/15 text-morandi-gold text-[10px] px-1.5 py-0">
                <Star className="h-2.5 w-2.5 mr-0.5" />
                潛客
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {thread.last_intent}
            </Badge>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </button>
  )
}

// ============================================================
// Thread Detail (Chat View)
// ============================================================

function ThreadDetail({
  thread,
  messages,
  loading,
  messagesEndRef,
  onBack,
  onUpdateFollowUp,
}: {
  thread: ConversationThread
  messages: ConversationMessage[]
  loading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onBack: () => void
  onUpdateFollowUp: (id: string, status: string, note?: string) => void
}) {
  const [followUpNote, setFollowUpNote] = useState<Record<string, string>>({})

  const needsFollowUp = (intent: string) =>
    ['報名流程', '客訴處理', '轉接真人', '付款方式'].includes(intent)

  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-9 h-9 rounded-full bg-morandi-container flex items-center justify-center">
          <Users className="h-4 w-4 text-morandi-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{thread.user_display_name || '未知用戶'}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{thread.platform.toUpperCase()}</span>
            <span>·</span>
            <span>{thread.message_count} 則對話</span>
            {thread.mentioned_tours.length > 0 && (
              <>
                <span>·</span>
                <span>提及: {thread.mentioned_tours.join(', ')}</span>
              </>
            )}
          </div>
        </div>
        {thread.is_potential_lead && (
          <Badge className="bg-morandi-gold/15 text-morandi-gold shrink-0">
            <Star className="h-3 w-3 mr-1" />
            潛在客戶 ({thread.max_lead_score}分)
          </Badge>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">載入中...</div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">沒有對話記錄</div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => {
              // 日期分隔
              const showDate =
                idx === 0 ||
                new Date(msg.created_at).toDateString() !==
                  new Date(messages[idx - 1].created_at).toDateString()

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleDateString('zh-TW', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  {/* 用戶訊息 (右側) */}
                  <div className="flex justify-end mb-2">
                    <div className="max-w-[75%]">
                      <div className="bg-morandi-gold/10 rounded-2xl rounded-tr-sm px-4 py-2.5">
                        <p className="text-sm">{msg.user_message}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1 px-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.intent && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {msg.intent}
                          </Badge>
                        )}
                        {msg.sentiment === 'positive' && <span className="text-[10px]">😊</span>}
                        {msg.sentiment === 'negative' && <span className="text-[10px]">😟</span>}
                      </div>
                    </div>
                  </div>

                  {/* AI 回覆 (左側) */}
                  <div className="flex justify-start mb-2">
                    <div className="max-w-[75%]">
                      <div className="flex items-end gap-2">
                        <div className="w-7 h-7 rounded-full bg-morandi-container flex items-center justify-center shrink-0">
                          <Bot className="h-3.5 w-3.5 text-morandi-secondary" />
                        </div>
                        <div className="bg-muted/60 rounded-2xl rounded-bl-sm px-4 py-2.5">
                          <p className="text-sm text-morandi-secondary">{msg.ai_response}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 跟進操作（如果需要） */}
                  {needsFollowUp(msg.intent) && msg.follow_up_status !== 'done' && (
                    <div className="ml-9 mb-3 p-3 rounded-lg border border-status-warning/30 bg-status-warning-bg/50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-3.5 w-3.5 text-status-warning" />
                        <span className="text-xs font-medium text-status-warning">
                          此對話需要人工跟進
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="備註（選填）..."
                          className="text-xs min-h-[32px] h-8 resize-none"
                          value={followUpNote[msg.id] || ''}
                          onChange={e =>
                            setFollowUpNote(prev => ({ ...prev, [msg.id]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          className="shrink-0 h-8"
                          onClick={() => onUpdateFollowUp(msg.id, 'done', followUpNote[msg.id])}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          完成
                        </Button>
                      </div>
                    </div>
                  )}

                  {msg.follow_up_status === 'done' && needsFollowUp(msg.intent) && (
                    <div className="ml-9 mb-3 flex items-center gap-1.5 text-xs text-morandi-green">
                      <CheckCircle className="h-3 w-3" />
                      已處理跟進
                      {msg.follow_up_note && (
                        <span className="text-muted-foreground">— {msg.follow_up_note}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
    </Card>
  )
}

// ============================================================
// Helpers
// ============================================================

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  if (diffHr < 24) return `${diffHr} 小時前`
  if (diffDay < 7) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
}
