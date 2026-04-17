'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Bot, MessageCircle, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { logger } from '@/lib/utils/logger'
import { LineSetupWizard } from './components/LineSetupWizard'
import { LineConnectionsTab } from './components/LineConnectionsTab'
import { RealConversations } from './components/RealConversations'
import { AISettingsTab } from './components/AISettingsTab'
import { KnowledgeTab } from './components/KnowledgeTab'

interface LineGroup {
  id: string
  group_id: string
  group_name: string | null
  member_count: number | null
  supplier_id: string | null
  category: string | null
  note: string | null
  joined_at: string | null
  updated_at: string | null
  suppliers: { id: string; name: string } | null
}

interface LineUser {
  id: string
  user_id: string
  display_name: string | null
  picture_url: string | null
  status_message: string | null
  supplier_id: string | null
  employee_id: string | null
  note: string | null
  followed_at: string | null
  unfollowed_at: string | null
  updated_at: string | null
  suppliers: { id: string; name: string } | null
  employees: { id: string; display_name: string; code: string } | null
}

interface Supplier {
  id: string
  name: string
}

interface LineConfig {
  setup_step: number
  is_connected: boolean
  bot_display_name?: string
  bot_basic_id?: string
}

interface MetaConfig {
  setup_step: number
  is_connected: boolean
  app_id?: string
}

export default function AIBotManagementPage() {
  const [groups, setGroups] = useState<LineGroup[]>([])
  const [users, setUsers] = useState<LineUser[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [lineConfig, setLineConfig] = useState<LineConfig>({ setup_step: 0, is_connected: false })
  const [metaConfig, setMetaConfig] = useState<MetaConfig>({ setup_step: 0, is_connected: false })
  const [activeTab, setActiveTab] = useState('platform')

  const isConnected = lineConfig.is_connected && lineConfig.setup_step >= 4
  const isMetaConnected = metaConfig.is_connected && metaConfig.setup_step >= 3

  const loadConfig = useCallback(async () => {
    try {
      const [lineRes, metaRes] = await Promise.all([
        fetch('/api/line/setup'),
        fetch('/api/meta/setup'),
      ])
      const lineData = await lineRes.json()
      const metaData = await metaRes.json()
      setLineConfig(lineData)
      setMetaConfig(metaData)
    } catch {
      // 忽略
    }
  }, [])

  const loadData = useCallback(async () => {
    // 總是載入資料，即使未連線也顯示（資料可能已存在）
    setLoading(true)
    try {
      const res = await fetch('/api/line/connections')
      const data = await res.json()
      if (data.error) {
        // 不顯示錯誤，因為可能只是未連線
        if (!data.error.includes('請先登入')) {
          toast.error(`載入失敗: ${data.error}`)
        }
      }
      setGroups(data.groups || [])
      setUsers(data.users || [])
    } catch (error) {
      // 忽略錯誤，保持現有資料
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers')
      const data = await res.json()
      // 確保 suppliers 總是陣列
      if (Array.isArray(data)) {
        setSuppliers(data)
      } else if (data && data.error) {
        // API 返回錯誤，設定為空陣列
        setSuppliers([])
      } else {
        // 其他情況，設定為空陣列
        setSuppliers([])
      }
    } catch {
      // 忽略錯誤，保持現有資料或空陣列
      setSuppliers([])
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadSuppliers()
  }, [loadConfig, loadSuppliers])

  // 連線狀態變化時重新載入資料
  useEffect(() => {
    loadData()
  }, [loadData])

  // Setup 完成後的 callback
  const handleSetupComplete = () => {
    loadConfig()
  }

  return (
    <ContentPageLayout
      title="AI & 機器人管理"
      icon={Bot}
      tabs={[
        { value: 'platform', label: '平台連線' },
        { value: 'connections', label: '群組 & 好友' },
        { value: 'conversations', label: '對話記錄' },
        { value: 'ai', label: 'AI 設定' },
        { value: 'knowledge', label: '知識庫' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={
        <Button
          onClick={() => {
            loadConfig()
            loadData()
          }}
          variant="outline"
          disabled={loading}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          重新整理
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* 平台連線 */}
        {activeTab === 'platform' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-morandi-secondary mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                LINE
              </h3>
              <LineSetupWizard onComplete={handleSetupComplete} />
            </div>

            {/* Meta 平台（Instagram + Facebook Messenger） */}
            <div>
              <h3 className="text-sm font-semibold text-morandi-secondary mb-3 flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 2.136.67 4.116 1.81 5.74L2 22l4.26-1.81A9.94 9.94 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                </svg>
                Meta 平台
              </h3>
              <Card>
                <CardContent className="py-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex gap-2">
                      <div className="p-2.5 rounded-full bg-gradient-to-br from-cat-purple via-cat-pink to-cat-orange">
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                        </svg>
                      </div>
                      <div className="p-2.5 rounded-full bg-brand-facebook">
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Instagram DM + Facebook Messenger</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        透過同一個 Meta App 同時接收 Instagram 私訊和 Facebook Messenger 訊息，由 AI
                        統一回覆。
                      </p>
                    </div>
                    {isMetaConnected ? (
                      <Badge className="shrink-0 bg-green-500">已連線</Badge>
                    ) : metaConfig.setup_step > 0 ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-orange-500 border-orange-500"
                      >
                        設定中
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        未連線
                      </Badge>
                    )}
                  </div>
                  {isMetaConnected ? (
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground">
                        已連線至 Meta 平台 (App ID: {metaConfig.app_id})
                      </p>
                    </div>
                  ) : (
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        前置作業（你可以先完成）：
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-sm text-morandi-secondary">
                        <li>
                          前往{' '}
                          <a
                            href="https://developers.facebook.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-morandi-gold underline"
                          >
                            Meta for Developers
                          </a>{' '}
                          註冊開發者帳號
                        </li>
                        <li>
                          建立一個 App → 選擇 <strong>Business</strong> 類型
                        </li>
                        <li>
                          在 App 中加入 <strong>Messenger</strong> 和 <strong>Instagram</strong>{' '}
                          產品
                        </li>
                        <li>連結你的 Facebook 粉絲專頁和 Instagram 商業帳號</li>
                      </ol>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 群組 & 好友 */}
        {activeTab === 'connections' && (
          <div className="space-y-6">
            {/* 總是顯示資料，即使未連線（資料可能已存在） */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋群組名稱或供應商..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <LineConnectionsTab
              groups={groups}
              users={users}
              suppliers={suppliers}
              searchTerm={searchTerm}
              onRefresh={loadData}
            />

            {/* 如果未連線但有資料，表示設定已成功，只是狀態顯示問題 */}
            {!isConnected && groups.length === 0 && users.length === 0 && (
              <Card className="border-status-warning/30">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-status-warning" />
                    <div>
                      <p className="text-sm font-medium">LINE Bot 設定未完成</p>
                      <p className="text-xs text-muted-foreground">
                        請至「平台連線」完成設定，以啟用 AI 自動回覆功能
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 對話記錄 */}
        {activeTab === 'conversations' && <RealConversations />}

        {/* AI 設定 */}
        {activeTab === 'ai' &&
          (isConnected ? (
            <AISettingsTab />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>請先在「平台連線」完成 LINE Bot 設定</p>
              </CardContent>
            </Card>
          ))}

        {/* 知識庫 */}
        {activeTab === 'knowledge' && <KnowledgeTab isConnected={isConnected} />}
      </div>
    </ContentPageLayout>
  )
}
