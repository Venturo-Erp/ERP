'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonore

export function SimpleConversationsTab() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/line/conversations')
      const data = await res.json()
      
      if (Array.isArray(data)) {
        setConversations(data)
      } else {
        // 可能是舊格式或錯誤
        console.warn('Unexpected response format:', data)
        setConversations([])
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      toast.error('載入對話紀錄失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">載入對話紀錄中...</p>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">目前還沒有對話紀錄</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={loadConversations}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          重新整理
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">對話紀錄</h3>
          <p className="text-sm text-muted-foreground">
            共 {conversations.length} 筆對話
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadConversations}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用戶</TableHead>
                <TableHead>最後訊息時間</TableHead>
                <TableHead>最後訊息預覽</TableHead>
                <TableHead>未讀</TableHead>
                <TableHead>狀態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((conv: any) => (
                <TableRow key={conv.id}>
                  <TableCell className="font-medium">
                    {conv.user_display_name || '未知用戶'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(conv.created_at), 'yyyy-MM-dd HH:mm', { locale: zhTW })}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {conv.user_message}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {conv.is_read ? '已讀' : '未讀'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={conv.follow_up_status === 'pending' ? 'destructive' : 'secondary'}
                    >
                      {conv.follow_up_status || '無'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}