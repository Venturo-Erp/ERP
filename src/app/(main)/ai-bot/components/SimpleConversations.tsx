'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
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

export function SimpleConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const loadConversations = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/line/conversations')
      if (!res.ok) {
        throw new Error(`API 錯誤: ${res.status}`)
      }
      const data = await res.json()
      setConversations(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('載入對話失敗:', error)
      toast.error('載入對話紀錄失敗')
      // 返回測試資料
      setConversations([
        {
          id: '1',
          platform: 'line',
          platform_user_id: 'U209cd665bbd2faa485c38b5ffbf647b8',
          user_display_name: 'Carson',
          user_message: '你好，我想詢問日本行程',
          ai_response: '您好！很高興為您服務。我們有東京、大阪、北海道等行程。',
          created_at: new Date().toISOString(),
          follow_up_status: null,
          is_read: false,
        },
        {
          id: '2',
          platform: 'line',
          platform_user_id: 'Ufefdb5fe403c4eafcbc553e74557bdd7',
          user_display_name: 'William',
          user_message: '報名需要什麼資料？',
          ai_response: '報名需要護照影本和訂金，詳細資訊請參考網站。',
          created_at: new Date().toISOString(),
          follow_up_status: 'pending',
          is_read: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">載入對話紀錄中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">對話紀錄</h3>
          <p className="text-sm text-muted-foreground">共 {conversations.length} 筆對話</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConversations} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
      </div>

      {conversations.length === 0 ? (
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
                      <Badge
                        variant={conv.follow_up_status === 'pending' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {conv.follow_up_status || '已回覆'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <div className="font-medium min-w-[60px]">用戶:</div>
                        <div className="text-morandi-secondary">{conv.user_message}</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="font-medium min-w-[60px]">AI回覆:</div>
                        <div className="text-morandi-primary">{conv.ai_response}</div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(conv.created_at).toLocaleString('zh-TW')}
                    </div>
                  </div>

                  <Badge variant={conv.is_read ? 'outline' : 'default'} className="ml-2">
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
