'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Conversation {
  id: string
  platform: string
  platform_user_id: string
  user_display_name: string
  user_message: string
  ai_response: string
  created_at: string
  follow_up_status: string | null
  is_read: boolean
}

export function RealConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/line/conversations')

      if (!res.ok) {
        console.warn('API 返回狀態:', res.status)
        setError(`伺服器錯誤 (${res.status})`)
        setConversations([])
        return
      }

      const data = await res.json()

      if (!Array.isArray(data)) {
        console.warn('API 返回非陣列資料')
        setError('資料格式錯誤')
        setConversations([])
        return
      }

      if (data.length === 0) {
        setConversations([])
        toast.info('目前沒有對話紀錄')
        return
      }

      // 格式化資料
      const formattedConversations = data.map((item: any, index: number) => ({
        id: item.id || `conv-${index}`,
        platform: item.platform || 'line',
        platform_user_id: item.platform_user_id || '',
        user_display_name: item.user_display_name || '未知用戶',
        user_message: item.user_message || '',
        ai_response: item.ai_response || '',
        created_at: item.created_at || new Date().toISOString(),
        follow_up_status: item.follow_up_status || null,
        is_read: item.is_read || false,
      }))

      setConversations(formattedConversations)
      toast.success(`已載入 ${formattedConversations.length} 筆對話`)
    } catch (error) {
      console.error('載入失敗:', error)
      setError('連線失敗')
      toast.error('無法載入對話紀錄')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">對話紀錄</h3>
          <p className="text-sm text-muted-foreground">
            {loading ? '載入中...' : `共 ${conversations.length} 筆對話`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConversations} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '載入中' : '更新'}
        </Button>
      </div>

      {error ? (
        <Card className="border-status-error/30">
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-status-error" />
            <p className="text-sm font-medium mb-1">載入失敗</p>
            <p className="text-xs text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadConversations}>
              <RefreshCw className="mr-2 h-3 w-3" />
              重試
            </Button>
          </CardContent>
        </Card>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">目前還沒有對話紀錄</p>
            <Button variant="outline" className="mt-4" onClick={loadConversations}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重新整理
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversations.map(conv => (
            <Card key={conv.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-medium">{conv.user_display_name}</div>
                      <Badge variant="outline" className="text-xs">
                        {conv.platform}
                      </Badge>
                      {conv.follow_up_status === 'pending' ? (
                        <Badge className="bg-status-warning text-white text-xs">待處理</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          已回覆
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm mb-2">
                      <div className="flex gap-2">
                        <div className="font-medium min-w-[50px]">用戶:</div>
                        <div className="text-morandi-secondary flex-1">{conv.user_message}</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="font-medium min-w-[50px]">AI回覆:</div>
                        <div className="text-morandi-primary flex-1">{conv.ai_response}</div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {new Date(conv.created_at).toLocaleString('zh-TW')}
                    </div>
                  </div>

                  <Badge
                    variant={conv.is_read ? 'outline' : 'default'}
                    className={`ml-2 ${conv.is_read ? '' : 'bg-status-info'}`}
                  >
                    {conv.is_read ? '已讀' : '未讀'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
